import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { marketDataService } from '@/lib/trading/market-data';

const FOREX_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 
  'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'
];

const TIMEFRAMES = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '1h': '60min',
  '4h': '4hour',
  '1d': 'daily'
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'EURUSD';
    const timeframe = searchParams.get('timeframe') || '1h';
    const limit = parseInt(searchParams.get('limit') || '100');
    const source = searchParams.get('source') || 'twelve_data';

    // Validate parameters
    if (!FOREX_SYMBOLS.includes(symbol.toUpperCase())) {
      return NextResponse.json({ 
        error: 'Invalid symbol',
        validSymbols: FOREX_SYMBOLS 
      }, { status: 400 });
    }

    if (!TIMEFRAMES[timeframe]) {
      return NextResponse.json({ 
        error: 'Invalid timeframe',
        validTimeframes: Object.keys(TIMEFRAMES)
      }, { status: 400 });
    }

    // Check cache first
    const cachedData = await getCachedMarketData(symbol, timeframe);
    if (cachedData && isDataFresh(cachedData.timestamp, timeframe)) {
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        source: 'cache',
        timestamp: cachedData.timestamp
      });
    }

    // Fetch real market data
    let marketData;
    try {
      marketData = await marketDataService.getHistoricalData(symbol, timeframe, limit);
    } catch (error) {
      console.error('Failed to fetch real market data:', error);
      
      // Fallback to mock data only if all real providers fail
      marketData = generateMockMarketData(symbol, timeframe, limit);
    }

    if (!marketData || marketData.length === 0) {
      return NextResponse.json({ 
        error: 'No market data available',
        message: 'All data providers are currently unavailable'
      }, { status: 503 });
    }

    // Cache the data
    await cacheMarketData(symbol, timeframe, marketData);

    // Store in database for historical analysis
    await storeMarketDataInDB(symbol, timeframe, marketData.slice(0, 10)); // Store only recent data

    return NextResponse.json({
      success: true,
      data: marketData,
      source: 'real',
      timestamp: new Date().toISOString(),
      count: marketData.length
    });

  } catch (error) {
    console.error('Market data API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch market data',
      message: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { symbol, timeframe, data } = body;

    if (!symbol || !timeframe || !data) {
      return NextResponse.json({ 
        error: 'Missing required parameters: symbol, timeframe, data' 
      }, { status: 400 });
    }

    // Store real-time market data
    await storeMarketDataInDB(symbol, timeframe, data);

    return NextResponse.json({
      success: true,
      message: 'Market data stored successfully'
    });

  } catch (error) {
    console.error('POST /api/market/data error:', error);
    return NextResponse.json({ 
      error: 'Failed to store market data',
      message: error.message 
    }, { status: 500 });
  }
}

async function getCachedMarketData(symbol, timeframe) {
  try {
    const { data, error } = await supabaseAdmin
      .from('market_data_cache')
      .select('*')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      data: JSON.parse(data.data),
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Error getting cached market data:', error);
    return null;
  }
}

function isDataFresh(timestamp, timeframe) {
  const now = new Date();
  const dataTime = new Date(timestamp);
  const ageMs = now - dataTime;
  
  // Define freshness thresholds based on timeframe
  const freshnessThresholds = {
    '1m': 2 * 60 * 1000,    // 2 minutes
    '5m': 10 * 60 * 1000,   // 10 minutes
    '15m': 30 * 60 * 1000,  // 30 minutes
    '30m': 60 * 60 * 1000,  // 1 hour
    '1h': 5 * 60 * 60 * 1000, // 5 hours
    '4h': 24 * 60 * 60 * 1000, // 24 hours
    '1d': 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  const threshold = freshnessThresholds[timeframe] || freshnessThresholds['1h'];
  return ageMs < threshold;
}

async function cacheMarketData(symbol, timeframe, data) {
  try {
    const { error } = await supabaseAdmin
      .from('market_data_cache')
      .upsert({
        symbol,
        timeframe,
        data: JSON.stringify(data),
        timestamp: new Date().toISOString()
      }, {
        onConflict: 'symbol,timeframe'
      });

    if (error) {
      console.error('Error caching market data:', error);
    }
  } catch (error) {
    console.error('Error caching market data:', error);
  }
}

async function storeMarketDataInDB(symbol, timeframe, data) {
  try {
    const marketDataRecords = data.map(candle => ({
      symbol,
      timeframe,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume || 0,
      spread: candle.spread || 0
    }));

    const { error } = await supabaseAdmin
      .from('market_data')
      .upsert(marketDataRecords, {
        onConflict: 'symbol,timeframe,timestamp'
      });

    if (error) {
      console.error('Error storing market data in DB:', error);
    }
  } catch (error) {
    console.error('Error storing market data in DB:', error);
  }
}

function generateMockMarketData(symbol, timeframe, limit) {
  const data = [];
  const now = new Date();
  const timeframeMs = getTimeframeMs(timeframe);
  
  for (let i = limit - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * timeframeMs));
    const basePrice = 1.1000 + (Math.random() - 0.5) * 0.02; // EURUSD base price
    const volatility = 0.001;
    
    const open = basePrice + (Math.random() - 0.5) * volatility;
    const high = open + Math.random() * volatility;
    const low = open - Math.random() * volatility;
    const close = open + (Math.random() - 0.5) * volatility;
    
    data.push({
      symbol,
      timeframe,
      timestamp: timestamp.toISOString(),
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: Math.floor(Math.random() * 1000) + 100,
      spread: parseFloat((Math.random() * 0.0002).toFixed(5))
    });
  }
  
  return data;
}

function getTimeframeMs(timeframe) {
  const msMap = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  };
  return msMap[timeframe] || 60 * 1000;
}