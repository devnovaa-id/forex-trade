// Konfigurasi OANDA API untuk Platform Trading Indonesia
export const OANDA_CONFIG = {
  // Environment URLs
  PRACTICE_URL: 'https://api-fxpractice.oanda.com',
  LIVE_URL: 'https://api-fxtrade.oanda.com',
  STREAM_PRACTICE_URL: 'https://stream-fxpractice.oanda.com',
  STREAM_LIVE_URL: 'https://stream-fxtrade.oanda.com',
  
  // Default settings
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  
  // Supported instruments (pasangan mata uang utama)
  INSTRUMENTS: [
    'EUR_USD', 'GBP_USD', 'USD_JPY', 'USD_CHF', 'USD_CAD',
    'AUD_USD', 'NZD_USD', 'EUR_GBP', 'EUR_JPY', 'GBP_JPY',
    'CHF_JPY', 'CAD_JPY', 'AUD_JPY', 'NZD_JPY', 'EUR_CHF',
    'GBP_CHF', 'AUD_CHF', 'NZD_CHF', 'EUR_CAD', 'GBP_CAD',
    'AUD_CAD', 'NZD_CAD', 'EUR_AUD', 'GBP_AUD', 'EUR_NZD',
    'GBP_NZD', 'AUD_NZD'
  ],
  
  // Timeframes yang didukung
  TIMEFRAMES: {
    'S5': '5 detik',
    'S10': '10 detik', 
    'S15': '15 detik',
    'S30': '30 detik',
    'M1': '1 menit',
    'M2': '2 menit',
    'M4': '4 menit',
    'M5': '5 menit',
    'M10': '10 menit',
    'M15': '15 menit',
    'M30': '30 menit',
    'H1': '1 jam',
    'H2': '2 jam',
    'H3': '3 jam',
    'H4': '4 jam',
    'H6': '6 jam',
    'H8': '8 jam',
    'H12': '12 jam',
    'D': '1 hari',
    'W': '1 minggu',
    'M': '1 bulan'
  },
  
  // Order types
  ORDER_TYPES: {
    MARKET: 'MARKET',
    LIMIT: 'LIMIT',
    STOP: 'STOP',
    MARKET_IF_TOUCHED: 'MARKET_IF_TOUCHED',
    TAKE_PROFIT: 'TAKE_PROFIT',
    STOP_LOSS: 'STOP_LOSS',
    TRAILING_STOP_LOSS: 'TRAILING_STOP_LOSS'
  },
  
  // Risk management defaults
  RISK_MANAGEMENT: {
    MAX_LEVERAGE: 50,
    MIN_LOT_SIZE: 0.01,
    MAX_LOT_SIZE: 100,
    DEFAULT_STOP_LOSS: 50, // pips
    DEFAULT_TAKE_PROFIT: 100, // pips
    MAX_SPREAD: 5 // pips
  },

  // Instrument labels dalam bahasa Indonesia
  INSTRUMENT_LABELS: {
    'EUR_USD': 'Euro/Dolar AS',
    'GBP_USD': 'Pound Sterling/Dolar AS',
    'USD_JPY': 'Dolar AS/Yen Jepang',
    'USD_CHF': 'Dolar AS/Franc Swiss',
    'USD_CAD': 'Dolar AS/Dolar Kanada',
    'AUD_USD': 'Dolar Australia/Dolar AS',
    'NZD_USD': 'Dolar Selandia Baru/Dolar AS',
    'EUR_GBP': 'Euro/Pound Sterling',
    'EUR_JPY': 'Euro/Yen Jepang',
    'GBP_JPY': 'Pound Sterling/Yen Jepang'
  }
};

// Fungsi untuk mendapatkan URL berdasarkan environment
export const getOandaUrl = (isLive = false) => {
  return isLive ? OANDA_CONFIG.LIVE_URL : OANDA_CONFIG.PRACTICE_URL;
};

// Fungsi untuk mendapatkan stream URL
export const getOandaStreamUrl = (isLive = false) => {
  return isLive ? OANDA_CONFIG.STREAM_LIVE_URL : OANDA_CONFIG.STREAM_PRACTICE_URL;
};

// Validasi instrument
export const isValidInstrument = (instrument) => {
  return OANDA_CONFIG.INSTRUMENTS.includes(instrument);
};

// Validasi timeframe
export const isValidTimeframe = (timeframe) => {
  return Object.keys(OANDA_CONFIG.TIMEFRAMES).includes(timeframe);
};

// Mendapatkan label instrumen dalam bahasa Indonesia
export const getInstrumentLabel = (instrument) => {
  return OANDA_CONFIG.INSTRUMENT_LABELS[instrument] || instrument;
};
