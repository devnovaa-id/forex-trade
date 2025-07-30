import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import axios from 'axios';

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
    const source = searchParams.get('source') || 'alpha_vantage';

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

    // Fetch fresh data based on source
    let marketData;
    switch (source) {
      case 'alpha_vantage':
        marketData = await fetchAlphaVantageData(symbol, timeframe, limit);
        break;
      case 'twelve_data':
        marketData = await fetchTwelveDataData(symbol, timeframe, limit);
        break;
      case 'finhub':
        marketData = await fetchFinhubData(symbol, timeframe, limit);
        break;
      default:
        return NextResponse.json({ error: 'Invalid data source' }, { status: 400 });
    }

    if (!marketData || marketData.length === 0) {
      return NextResponse.json({ error: 'No market data available' }, { status: 404 });
    }

    // Cache the data
    await cacheMarketData(symbol, timeframe, marketData);

    // Store in database for historical analysis
    await storeMarketDataInDB(symbol, timeframe, marketData.slice(0, 10)); // Store only recent data

    return NextResponse.json({
      success: true,
      data: marketData,
      source: source,
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
    const { symbols, timeframe = '1h', source = 'alpha_vantage' } = body;

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: 'Symbols array is required' }, { status: 400 });
    }

    const results = {};
    const promises = symbols.map(async (symbol) => {
      try {
        const data = await fetchMarketDataBySource(symbol, timeframe, source);
        results[symbol] = {
          success: true,
          data: data,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk market data API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch bulk market data',
      message: error.message 
    }, { status: 500 });
  }
}

// Alpha Vantage API integration
async function fetchAlphaVantageData(symbol, timeframe, limit) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Alpha Vantage API key not configured');
  }

  const function_name = timeframe === '1d' ? 'FX_DAILY' : 'FX_INTRADAY';
  const interval = TIMEFRAMES[timeframe];
  
  const url = `https://www.alphavantage.co/query?function=${function_name}&from_symbol=${symbol.slice(0,3)}&to_symbol=${symbol.slice(3,6)}&interval=${interval}&apikey=${apiKey}&outputsize=compact`;

  const response = await axios.get(url);
  const data = response.data;

  if (data['Error Message']) {
    throw new Error(data['Error Message']);
  }

  if (data['Note']) {
    throw new Error('API call frequency limit reached');
  }

  const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
  if (!timeSeriesKey) {
    throw new Error('Invalid response format from Alpha Vantage');
  }

  const timeSeries = data[timeSeriesKey];
  const marketData = Object.entries(timeSeries)
    .slice(0, limit)
    .map(([timestamp, values]) => ({
      timestamp: timestamp,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: values['5. volume'] ? parseInt(values['5. volume']) : 0
    }))
    .reverse(); // Most recent first

  return marketData;
}

// Twelve Data API integration
async function fetchTwelveDataData(symbol, timeframe, limit) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('Twelve Data API key not configured');
  }

  const interval = TIMEFRAMES[timeframe];
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${limit}&apikey=${apiKey}`;

  const response = await axios.get(url);
  const data = response.data;

  if (data.status === 'error') {
    throw new Error(data.message);
  }

  if (!data.values) {
    throw new Error('No data available from Twelve Data');
  }

  const marketData = data.values.map(item => ({
    timestamp: item.datetime,
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    close: parseFloat(item.close),
    volume: item.volume ? parseInt(item.volume) : 0
  })).reverse();

  return marketData;
}

// Finhub API integration
async function fetchFinhubData(symbol, timeframe, limit) {
  const apiKey = process.env.FINHUB_API_KEY;
  if (!apiKey) {
    throw new Error('Finhub API key not configured');
  }

  // Finhub uses different symbol format
  const finhubSymbol = `OANDA:${symbol}_USD`;
  const resolution = getFinHubResolution(timeframe);
  const to = Math.floor(Date.now() / 1000);
  const from = to - (limit * getTimeframeSeconds(timeframe));

  const url = `https://finnhub.io/api/v1/forex/candle?symbol=${finhubSymbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;

  const response = await axios.get(url);
  const data = response.data;

  if (data.s === 'no_data') {
    throw new Error('No data available from Finhub');
  }

  if (!data.c || data.c.length === 0) {
    throw new Error('Invalid response from Finhub');
  }

  const marketData = data.c.map((close, index) => ({
    timestamp: new Date(data.t[index] * 1000).toISOString(),
    open: data.o[index],
    high: data.h[index],
    low: data.l[index],
    close: close,
    volume: data.v ? data.v[index] : 0
  }));

  return marketData;
}

// Helper functions
function getFinHubResolution(timeframe) {
  const resolutionMap = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '4h': '240',
    '1d': 'D'
  };
  return resolutionMap[timeframe] || '60';
}

function getTimeframeSeconds(timeframe) {
  const secondsMap = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400
  };
  return secondsMap[timeframe] || 3600;
}

async function getCachedMarketData(symbol, timeframe) {
  try {
    const { data, error } = await supabaseAdmin
      .from('market_data')
      .select('data, timestamp')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    return null;
  }
}

function isDataFresh(timestamp, timeframe) {
  const now = new Date();
  const dataTime = new Date(timestamp);
  const diffMinutes = (now - dataTime) / (1000 * 60);

  const freshnessThreshold = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '1d': 1440
  };

  return diffMinutes < (freshnessThreshold[timeframe] || 60);
}

async function cacheMarketData(symbol, timeframe, data) {
  try {
    await supabaseAdmin
      .from('market_data')
      .upsert({
        symbol,
        timeframe,
        data: data,
        timestamp: new Date().toISOString()
      }, {
        onConflict: 'symbol,timeframe'
      });
  } catch (error) {
    console.error('Error caching market data:', error);
  }
}

async function storeMarketDataInDB(symbol, timeframe, data) {
  try {
    const records = data.map(item => ({
      symbol,
      timeframe,
      timestamp: item.timestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      created_at: new Date().toISOString()
    }));

    await supabaseAdmin
      .from('market_data')
      .upsert(records, {
        onConflict: 'symbol,timeframe,timestamp'
      });
  } catch (error) {
    console.error('Error storing market data:', error);
  }
}

async function fetchMarketDataBySource(symbol, timeframe, source) {
  switch (source) {
    case 'alpha_vantage':
      return await fetchAlphaVantageData(symbol, timeframe, 100);
    case 'twelve_data':
      return await fetchTwelveDataData(symbol, timeframe, 100);
    case 'finhub':
      return await fetchFinhubData(symbol, timeframe, 100);
    default:
      throw new Error('Invalid data source');
  }
}