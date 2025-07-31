import axios from 'axios';
import { io } from 'socket.io-client';

class MarketDataService {
  constructor() {
    this.subscribers = new Map();
    this.connections = new Map();
    this.cache = new Map();
    this.providers = {
      alpha_vantage: {
        apiKey: process.env.ALPHA_VANTAGE_API_KEY,
        baseUrl: 'https://www.alphavantage.co/query'
      },
      twelve_data: {
        apiKey: process.env.TWELVE_DATA_API_KEY,
        baseUrl: 'https://api.twelvedata.com'
      },
      finhub: {
        apiKey: process.env.FINHUB_API_KEY,
        baseUrl: 'https://finnhub.io/api/v1'
      },
      oanda: {
        apiKey: process.env.OANDA_API_KEY,
        baseUrl: 'https://api-fxtrade.oanda.com'
      }
    };
  }

  // Real-time data streaming
  async connectToStream(symbol, callback) {
    try {
      // Connect to WebSocket for real-time data
      const socket = io('wss://ws.twelvedata.com/v1/quotes/price', {
        auth: {
          apikey: this.providers.twelve_data.apiKey
        }
      });

      socket.on('connect', () => {
        console.log('Connected to real-time data stream');
        socket.emit('subscribe', { symbol });
      });

      socket.on('price', (data) => {
        const marketData = this.processRealTimeData(data);
        callback(marketData);
        this.updateCache(symbol, marketData);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from real-time stream');
        setTimeout(() => this.connectToStream(symbol, callback), 5000);
      });

      this.connections.set(symbol, socket);
      return socket;

    } catch (error) {
      console.error('Failed to connect to real-time stream:', error);
      throw error;
    }
  }

  // Get historical data from real providers
  async getHistoricalData(symbol, timeframe, limit = 100) {
    try {
      // Try multiple providers for redundancy
      const providers = ['twelve_data', 'alpha_vantage', 'finhub'];
      
      for (const provider of providers) {
        try {
          const data = await this.fetchFromProvider(provider, symbol, timeframe, limit);
          if (data && data.length > 0) {
            return this.processHistoricalData(data, symbol, timeframe);
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${provider}:`, error.message);
          continue;
        }
      }

      throw new Error('All data providers failed');

    } catch (error) {
      console.error('Failed to get historical data:', error);
      throw error;
    }
  }

  async fetchFromProvider(provider, symbol, timeframe, limit) {
    const config = this.providers[provider];
    
    switch (provider) {
      case 'twelve_data':
        return await this.fetchTwelveData(config, symbol, timeframe, limit);
      case 'alpha_vantage':
        return await this.fetchAlphaVantage(config, symbol, timeframe, limit);
      case 'finhub':
        return await this.fetchFinhub(config, symbol, timeframe, limit);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async fetchTwelveData(config, symbol, timeframe, limit) {
    const response = await axios.get(`${config.baseUrl}/time_series`, {
      params: {
        symbol: symbol,
        interval: this.convertTimeframe(timeframe),
        outputsize: limit,
        apikey: config.apiKey,
        format: 'JSON'
      },
      timeout: 10000
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message);
    }

    return response.data.values || [];
  }

  async fetchAlphaVantage(config, symbol, timeframe, limit) {
    const response = await axios.get(config.baseUrl, {
      params: {
        function: 'FX_INTRADAY',
        from_symbol: symbol.substring(0, 3),
        to_symbol: symbol.substring(3, 6),
        interval: this.convertTimeframe(timeframe),
        outputsize: 'compact',
        apikey: config.apiKey
      },
      timeout: 10000
    });

    if (response.data['Error Message']) {
      throw new Error(response.data['Error Message']);
    }

    const timeSeriesKey = `Time Series FX (${this.convertTimeframe(timeframe)})`;
    const timeSeries = response.data[timeSeriesKey];
    
    if (!timeSeries) {
      throw new Error('No data available');
    }

    return Object.entries(timeSeries).slice(0, limit).map(([timestamp, data]) => ({
      datetime: timestamp,
      open: parseFloat(data['1. open']),
      high: parseFloat(data['2. high']),
      low: parseFloat(data['3. low']),
      close: parseFloat(data['4. close']),
      volume: parseFloat(data['5. volume'])
    }));
  }

  async fetchFinhub(config, symbol, timeframe, limit) {
    const response = await axios.get(`${config.baseUrl}/forex/candle`, {
      params: {
        symbol: symbol,
        resolution: this.convertTimeframe(timeframe),
        from: Math.floor((Date.now() - (limit * this.getTimeframeMs(timeframe))) / 1000),
        to: Math.floor(Date.now() / 1000),
        token: config.apiKey
      },
      timeout: 10000
    });

    if (response.data.s !== 'ok') {
      throw new Error('Failed to fetch data from Finhub');
    }

    return response.data.t.map((timestamp, index) => ({
      datetime: new Date(timestamp * 1000).toISOString(),
      open: response.data.o[index],
      high: response.data.h[index],
      low: response.data.l[index],
      close: response.data.c[index],
      volume: response.data.v[index]
    }));
  }

  convertTimeframe(timeframe) {
    const conversions = {
      '1m': '1min',
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '60min',
      '4h': '4hour',
      '1d': 'daily'
    };
    return conversions[timeframe] || timeframe;
  }

  getTimeframeMs(timeframe) {
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

  processRealTimeData(data) {
    return {
      symbol: data.symbol,
      price: parseFloat(data.price),
      bid: parseFloat(data.bid),
      ask: parseFloat(data.ask),
      spread: parseFloat(data.ask) - parseFloat(data.bid),
      timestamp: new Date().toISOString(),
      volume: parseFloat(data.volume || 0),
      change: parseFloat(data.change || 0),
      changePercent: parseFloat(data.change_percent || 0)
    };
  }

  processHistoricalData(data, symbol, timeframe) {
    return data.map(candle => ({
      symbol,
      timeframe,
      timestamp: new Date(candle.datetime).toISOString(),
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume || 0),
      spread: parseFloat(candle.spread || 0)
    }));
  }

  updateCache(symbol, data) {
    const key = `${symbol}_${data.timeframe || 'realtime'}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCachedData(symbol, timeframe) {
    const key = `${symbol}_${timeframe}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.data;
    }
    
    return null;
  }

  disconnect(symbol) {
    const connection = this.connections.get(symbol);
    if (connection) {
      connection.disconnect();
      this.connections.delete(symbol);
    }
  }

  disconnectAll() {
    for (const [symbol, connection] of this.connections) {
      connection.disconnect();
    }
    this.connections.clear();
  }
}

export const marketDataService = new MarketDataService();