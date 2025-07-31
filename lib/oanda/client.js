import axios from 'axios';
import { OANDA_CONFIG } from './config';

/**
 * OANDA API Client untuk Platform Trading Indonesia
 * Menyediakan akses lengkap ke OANDA REST API dan Streaming API
 */
class OandaClient {
  constructor(apiKey, accountId, isLive = false) {
    this.apiKey = apiKey;
    this.accountId = accountId;
    this.isLive = isLive;
    this.baseUrl = isLive ? OANDA_CONFIG.LIVE_URL : OANDA_CONFIG.PRACTICE_URL;
    this.streamUrl = isLive ? OANDA_CONFIG.STREAM_LIVE_URL : OANDA_CONFIG.STREAM_PRACTICE_URL;
    
    // Setup axios instance
    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: OANDA_CONFIG.DEFAULT_TIMEOUT,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept-Datetime-Format': 'RFC3339'
      }
    });

    // Setup retry logic
    this.setupRetryLogic();
  }

  setupRetryLogic() {
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry < OANDA_CONFIG.MAX_RETRIES && 
            (error.response?.status >= 500 || error.code === 'ECONNABORTED')) {
          config.retry++;
          
          // Exponential backoff
          const delay = Math.pow(2, config.retry) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.api(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Mendapatkan informasi akun
   */
  async getAccountInfo() {
    try {
      const response = await this.api.get(`/v3/accounts/${this.accountId}`);
      return {
        success: true,
        data: response.data.account
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Mendapatkan daftar instrumen yang tersedia
   */
  async getInstruments() {
    try {
      const response = await this.api.get(`/v3/accounts/${this.accountId}/instruments`);
      return {
        success: true,
        data: response.data.instruments
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Mendapatkan harga terkini untuk instrumen
   */
  async getCurrentPrices(instruments) {
    try {
      const instrumentsParam = Array.isArray(instruments) ? instruments.join(',') : instruments;
      const response = await this.api.get(`/v3/accounts/${this.accountId}/pricing`, {
        params: { instruments: instrumentsParam }
      });
      
      return {
        success: true,
        data: response.data.prices
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Mendapatkan data historis (candlestick)
   */
  async getHistoricalData(instrument, granularity = 'H1', count = 500, from = null, to = null) {
    try {
      const params = {
        granularity,
        count
      };

      if (from) params.from = from;
      if (to) params.to = to;

      const response = await this.api.get(`/v3/instruments/${instrument}/candles`, {
        params
      });

      return {
        success: true,
        data: response.data.candles
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Membuat order market
   */
  async createMarketOrder(instrument, units, stopLoss = null, takeProfit = null) {
    try {
      const orderData = {
        order: {
          type: 'MARKET',
          instrument,
          units: units.toString(),
          timeInForce: 'FOK',
          positionFill: 'DEFAULT'
        }
      };

      // Tambahkan stop loss jika ada
      if (stopLoss) {
        orderData.order.stopLossOnFill = {
          price: stopLoss.toString()
        };
      }

      // Tambahkan take profit jika ada
      if (takeProfit) {
        orderData.order.takeProfitOnFill = {
          price: takeProfit.toString()
        };
      }

      const response = await this.api.post(`/v3/accounts/${this.accountId}/orders`, orderData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Membuat order limit
   */
  async createLimitOrder(instrument, units, price, stopLoss = null, takeProfit = null) {
    try {
      const orderData = {
        order: {
          type: 'LIMIT',
          instrument,
          units: units.toString(),
          price: price.toString(),
          timeInForce: 'GTC',
          positionFill: 'DEFAULT'
        }
      };

      if (stopLoss) {
        orderData.order.stopLossOnFill = {
          price: stopLoss.toString()
        };
      }

      if (takeProfit) {
        orderData.order.takeProfitOnFill = {
          price: takeProfit.toString()
        };
      }

      const response = await this.api.post(`/v3/accounts/${this.accountId}/orders`, orderData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Menutup posisi
   */
  async closePosition(instrument, units = 'ALL') {
    try {
      const endpoint = `/v3/accounts/${this.accountId}/positions/${instrument}/close`;

      const data = units === 'ALL' 
        ? { longUnits: 'ALL', shortUnits: 'ALL' }
        : units > 0 
          ? { longUnits: units.toString() }
          : { shortUnits: Math.abs(units).toString() };

      const response = await this.api.put(endpoint, data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Mendapatkan posisi terbuka
   */
  async getOpenPositions() {
    try {
      const response = await this.api.get(`/v3/accounts/${this.accountId}/openPositions`);
      return {
        success: true,
        data: response.data.positions
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Mendapatkan order yang pending
   */
  async getPendingOrders() {
    try {
      const response = await this.api.get(`/v3/accounts/${this.accountId}/pendingOrders`);
      return {
        success: true,
        data: response.data.orders
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Membatalkan order
   */
  async cancelOrder(orderId) {
    try {
      const response = await this.api.put(`/v3/accounts/${this.accountId}/orders/${orderId}/cancel`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Mendapatkan riwayat transaksi
   */
  async getTransactionHistory(from = null, to = null, pageSize = 100) {
    try {
      const params = { pageSize };
      if (from) params.from = from;
      if (to) params.to = to;

      const response = await this.api.get(`/v3/accounts/${this.accountId}/transactions`, {
        params
      });
      
      return {
        success: true,
        data: response.data.transactions
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Stream pricing data real-time
   */
  createPriceStream(instruments, onPrice, onError) {
    const instrumentsParam = Array.isArray(instruments) ? instruments.join(',') : instruments;
    const url = `${this.streamUrl}/v3/accounts/${this.accountId}/pricing/stream?instruments=${instrumentsParam}`;
    
    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'PRICE') {
          onPrice(data);
        }
      } catch (error) {
        onError && onError(error);
      }
    };

    eventSource.onerror = (error) => {
      onError && onError(error);
    };

    return eventSource;
  }

  /**
   * Menghitung ukuran posisi berdasarkan risiko
   */
  calculatePositionSize(accountBalance, riskPercent, stopLossPips, pipValue) {
    const riskAmount = accountBalance * (riskPercent / 100);
    const positionSize = riskAmount / (stopLossPips * pipValue);
    return Math.round(positionSize * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validasi instrumen trading
   */
  isValidInstrument(instrument) {
    return OANDA_CONFIG.INSTRUMENTS.includes(instrument);
  }

  /**
   * Handle error dengan format yang konsisten
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.errorMessage || 'Kesalahan server',
        code: error.response.status,
        details: error.response.data
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Tidak dapat terhubung ke server OANDA',
        code: 'NETWORK_ERROR',
        details: error.message
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'Terjadi kesalahan tidak diketahui',
        code: 'UNKNOWN_ERROR',
        details: error
      };
    }
  }
}

export default OandaClient;