/**
 * Professional Scalping Bot Algorithm
 * Menggunakan kombinasi indikator teknis dan price action untuk scalping dengan winrate tinggi
 */

import { SMA, EMA, RSI, MACD, BollingerBands, Stochastic } from 'technicalindicators';

class ScalpingBot {
  constructor(options = {}) {
    this.name = 'Professional Scalping Bot';
    this.timeframe = options.timeframe || 'M1'; // 1 menit untuk scalping
    this.riskPercent = options.riskPercent || 1; // 1% risk per trade
    this.stopLossPips = options.stopLossPips || 10; // 10 pips SL
    this.takeProfitPips = options.takeProfitPips || 15; // 15 pips TP (1:1.5 RR)
    this.maxSpreadPips = options.maxSpreadPips || 2; // Max 2 pips spread
    
    // Indikator parameters
    this.emaFast = options.emaFast || 8;
    this.emaSlow = options.emaSlow || 21;
    this.rsiPeriod = options.rsiPeriod || 14;
    this.bbPeriod = options.bbPeriod || 20;
    this.stochPeriod = options.stochPeriod || 14;
    
    // Scalping specific settings
    this.minVolatility = options.minVolatility || 0.0005; // Min volatility untuk trade
    this.maxVolatility = options.maxVolatility || 0.002; // Max volatility
    this.momentumThreshold = options.momentumThreshold || 0.7;
    
    // State tracking
    this.lastSignal = null;
    this.signalCount = 0;
    this.consecutiveLosses = 0;
    this.maxConsecutiveLosses = 3;
    
    // Performance tracking
    this.totalSignals = 0;
    this.successfulSignals = 0;
  }

  /**
   * Analisis data dan generate trading signals
   */
  async analyze(historicalData, currentBar) {
    try {
      if (historicalData.length < 50) {
        return []; // Butuh minimal 50 bar untuk analisis
      }

      const closes = historicalData.map(bar => parseFloat(bar.close));
      const highs = historicalData.map(bar => parseFloat(bar.high));
      const lows = historicalData.map(bar => parseFloat(bar.low));
      const volumes = historicalData.map(bar => parseFloat(bar.volume || 1000));

      // Hitung indikator teknis
      const indicators = await this.calculateIndicators(closes, highs, lows, volumes);
      
      // Analisis kondisi pasar
      const marketCondition = this.analyzeMarketCondition(indicators, currentBar);
      
      // Generate signals berdasarkan strategi scalping
      const signals = this.generateScalpingSignals(indicators, marketCondition, currentBar);
      
      return signals;

    } catch (error) {
      console.error('Error in scalping analysis:', error);
      return [];
    }
  }

  /**
   * Hitung semua indikator teknis yang diperlukan
   */
  async calculateIndicators(closes, highs, lows, volumes) {
    const indicators = {};

    try {
      // Moving Averages
      indicators.emaFast = EMA.calculate({ period: this.emaFast, values: closes });
      indicators.emaSlow = EMA.calculate({ period: this.emaSlow, values: closes });
      indicators.sma50 = SMA.calculate({ period: 50, values: closes });

      // RSI
      indicators.rsi = RSI.calculate({ period: this.rsiPeriod, values: closes });

      // MACD
      const macdData = MACD.calculate({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        values: closes
      });
      indicators.macd = macdData.map(d => d.MACD);
      indicators.macdSignal = macdData.map(d => d.signal);
      indicators.macdHistogram = macdData.map(d => d.histogram);

      // Bollinger Bands
      const bbData = BollingerBands.calculate({
        period: this.bbPeriod,
        stdDev: 2,
        values: closes
      });
      indicators.bbUpper = bbData.map(d => d.upper);
      indicators.bbMiddle = bbData.map(d => d.middle);
      indicators.bbLower = bbData.map(d => d.lower);

      // Stochastic
      const stochData = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: this.stochPeriod,
        signalPeriod: 3
      });
      indicators.stochK = stochData.map(d => d.k);
      indicators.stochD = stochData.map(d => d.d);

      // Price Action Indicators
      indicators.volatility = this.calculateVolatility(closes);
      indicators.momentum = this.calculateMomentum(closes);
      indicators.pricePosition = this.calculatePricePosition(closes, highs, lows);
      indicators.volumeProfile = this.calculateVolumeProfile(volumes, closes);

      return indicators;

    } catch (error) {
      console.error('Error calculating indicators:', error);
      return {};
    }
  }

  /**
   * Hitung volatilitas pasar
   */
  calculateVolatility(closes, period = 20) {
    if (closes.length < period + 1) return [];
    
    const volatility = [];
    for (let i = period; i < closes.length; i++) {
      const slice = closes.slice(i - period, i);
      const returns = [];
      
      for (let j = 1; j < slice.length; j++) {
        returns.push(Math.log(slice[j] / slice[j - 1]));
      }
      
      const mean = returns.reduce((a, b) => a + b) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      volatility.push(Math.sqrt(variance * 252)); // Annualized volatility
    }
    
    return volatility;
  }

  /**
   * Hitung momentum harga
   */
  calculateMomentum(closes, period = 10) {
    if (closes.length < period + 1) return [];
    
    const momentum = [];
    for (let i = period; i < closes.length; i++) {
      const currentPrice = closes[i];
      const pastPrice = closes[i - period];
      momentum.push((currentPrice - pastPrice) / pastPrice);
    }
    
    return momentum;
  }

  /**
   * Hitung posisi harga dalam range
   */
  calculatePricePosition(closes, highs, lows, period = 20) {
    if (closes.length < period) return [];
    
    const positions = [];
    for (let i = period - 1; i < closes.length; i++) {
      const slice = closes.slice(i - period + 1, i + 1);
      const highSlice = highs.slice(i - period + 1, i + 1);
      const lowSlice = lows.slice(i - period + 1, i + 1);
      
      const highest = Math.max(...highSlice);
      const lowest = Math.min(...lowSlice);
      const current = closes[i];
      
      const position = (current - lowest) / (highest - lowest);
      positions.push(position);
    }
    
    return positions;
  }

  /**
   * Analisis volume profile
   */
  calculateVolumeProfile(volumes, closes) {
    if (volumes.length !== closes.length) return [];
    
    const profile = [];
    const period = 20;
    
    for (let i = period - 1; i < volumes.length; i++) {
      const volumeSlice = volumes.slice(i - period + 1, i + 1);
      const priceSlice = closes.slice(i - period + 1, i + 1);
      
      const avgVolume = volumeSlice.reduce((a, b) => a + b) / volumeSlice.length;
      const currentVolume = volumes[i];
      const volumeRatio = currentVolume / avgVolume;
      
      profile.push({
        volumeRatio,
        avgVolume,
        currentVolume
      });
    }
    
    return profile;
  }

  /**
   * Analisis kondisi pasar
   */
  analyzeMarketCondition(indicators, currentBar) {
    const latest = indicators.emaFast.length - 1;
    
    const condition = {
      trend: 'sideways',
      strength: 0,
      volatility: 'normal',
      momentum: 'neutral',
      volume: 'normal',
      quality: 0
    };

    try {
      // Analisis trend
      if (indicators.emaFast[latest] > indicators.emaSlow[latest]) {
        condition.trend = 'bullish';
        condition.strength += 0.3;
      } else if (indicators.emaFast[latest] < indicators.emaSlow[latest]) {
        condition.trend = 'bearish';
        condition.strength += 0.3;
      }

      // Analisis RSI
      const rsi = indicators.rsi[indicators.rsi.length - 1];
      if (rsi > 70) {
        condition.momentum = 'overbought';
      } else if (rsi < 30) {
        condition.momentum = 'oversold';
      } else if (rsi > 45 && rsi < 55) {
        condition.momentum = 'neutral';
        condition.strength += 0.2;
      }

      // Analisis volatilitas
      const volatility = indicators.volatility[indicators.volatility.length - 1];
      if (volatility > this.maxVolatility) {
        condition.volatility = 'high';
        condition.quality -= 0.3;
      } else if (volatility < this.minVolatility) {
        condition.volatility = 'low';
        condition.quality -= 0.2;
      } else {
        condition.volatility = 'optimal';
        condition.strength += 0.3;
      }

      // Analisis MACD
      const macd = indicators.macd[indicators.macd.length - 1];
      const macdSignal = indicators.macdSignal[indicators.macdSignal.length - 1];
      if (macd > macdSignal) {
        condition.strength += 0.2;
      }

      // Quality score
      condition.quality = Math.max(0, Math.min(1, condition.strength));

      return condition;

    } catch (error) {
      console.error('Error analyzing market condition:', error);
      return condition;
    }
  }

  /**
   * Generate scalping signals dengan multiple confirmations
   */
  generateScalpingSignals(indicators, marketCondition, currentBar) {
    const signals = [];
    
    try {
      const latest = indicators.emaFast.length - 1;
      
      // Filter 1: Market quality harus baik
      if (marketCondition.quality < 0.6) {
        return signals;
      }

      // Filter 2: Volatilitas harus optimal
      if (marketCondition.volatility !== 'optimal') {
        return signals;
      }

      // Filter 3: Cek consecutive losses
      if (this.consecutiveLosses >= this.maxConsecutiveLosses) {
        return signals;
      }

      const currentPrice = parseFloat(currentBar.close);
      const emaFast = indicators.emaFast[latest];
      const emaSlow = indicators.emaSlow[latest];
      const rsi = indicators.rsi[indicators.rsi.length - 1];
      const bbUpper = indicators.bbUpper[indicators.bbUpper.length - 1];
      const bbLower = indicators.bbLower[indicators.bbLower.length - 1];
      const stochK = indicators.stochK[indicators.stochK.length - 1];
      const stochD = indicators.stochD[indicators.stochD.length - 1];

      // LONG SIGNAL CONDITIONS
      const longConditions = [
        emaFast > emaSlow, // Trend bullish
        rsi > 40 && rsi < 60, // RSI dalam zona netral
        currentPrice > indicators.bbMiddle[indicators.bbMiddle.length - 1], // Price di atas BB middle
        stochK > stochD && stochK < 80, // Stoch bullish tapi tidak overbought
        indicators.momentum[indicators.momentum.length - 1] > 0, // Momentum positif
        marketCondition.trend === 'bullish'
      ];

      // SHORT SIGNAL CONDITIONS
      const shortConditions = [
        emaFast < emaSlow, // Trend bearish
        rsi > 40 && rsi < 60, // RSI dalam zona netral
        currentPrice < indicators.bbMiddle[indicators.bbMiddle.length - 1], // Price di bawah BB middle
        stochK < stochD && stochK > 20, // Stoch bearish tapi tidak oversold
        indicators.momentum[indicators.momentum.length - 1] < 0, // Momentum negatif
        marketCondition.trend === 'bearish'
      ];

      // Hitung confidence score
      const longScore = longConditions.filter(Boolean).length / longConditions.length;
      const shortScore = shortConditions.filter(Boolean).length / shortConditions.length;

      // Generate LONG signal
      if (longScore >= 0.8) { // 80% confidence minimum
        const signal = this.createScalpingSignal('BUY', currentBar, indicators);
        if (signal) {
          signals.push(signal);
          this.totalSignals++;
        }
      }

      // Generate SHORT signal
      if (shortScore >= 0.8) { // 80% confidence minimum
        const signal = this.createScalpingSignal('SELL', currentBar, indicators);
        if (signal) {
          signals.push(signal);
          this.totalSignals++;
        }
      }

      return signals;

    } catch (error) {
      console.error('Error generating scalping signals:', error);
      return [];
    }
  }

  /**
   * Buat scalping signal dengan SL/TP yang optimal
   */
  createScalpingSignal(action, currentBar, indicators) {
    try {
      const currentPrice = parseFloat(currentBar.close);
      const atr = this.calculateATR([currentBar], 14); // Average True Range
      
      let stopLoss, takeProfit;
      
      if (action === 'BUY') {
        // Dynamic SL/TP berdasarkan ATR dan support/resistance
        const support = this.findNearestSupport(indicators, currentPrice);
        stopLoss = Math.max(
          currentPrice - (this.stopLossPips * 0.0001),
          support - (2 * 0.0001) // 2 pips buffer dari support
        );
        takeProfit = currentPrice + (this.takeProfitPips * 0.0001);
        
      } else { // SELL
        const resistance = this.findNearestResistance(indicators, currentPrice);
        stopLoss = Math.min(
          currentPrice + (this.stopLossPips * 0.0001),
          resistance + (2 * 0.0001) // 2 pips buffer dari resistance
        );
        takeProfit = currentPrice - (this.takeProfitPips * 0.0001);
      }

      // Validasi risk/reward ratio
      const risk = Math.abs(currentPrice - stopLoss);
      const reward = Math.abs(takeProfit - currentPrice);
      const rrRatio = reward / risk;

      if (rrRatio < 1.2) { // Minimum 1:1.2 RR ratio
        return null;
      }

      return {
        action,
        instrument: 'EUR_USD', // Default instrument
        lotSize: this.calculateLotSize(currentPrice, stopLoss),
        price: currentPrice,
        stopLoss: parseFloat(stopLoss.toFixed(5)),
        takeProfit: parseFloat(takeProfit.toFixed(5)),
        confidence: this.calculateConfidence(indicators),
        timestamp: currentBar.time,
        strategy: 'scalping',
        rrRatio: parseFloat(rrRatio.toFixed(2)),
        metadata: {
          atr: atr,
          marketCondition: this.analyzeMarketCondition(indicators, currentBar),
          signalId: `scalp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      };

    } catch (error) {
      console.error('Error creating scalping signal:', error);
      return null;
    }
  }

  /**
   * Hitung lot size berdasarkan risk management
   */
  calculateLotSize(entryPrice, stopLoss) {
    const accountBalance = 10000; // Default, should come from account data
    const riskAmount = accountBalance * (this.riskPercent / 100);
    const pipRisk = Math.abs(entryPrice - stopLoss) * 10000;
    const pipValue = 1; // $1 per pip for standard lot
    
    const lotSize = riskAmount / (pipRisk * pipValue);
    return Math.max(0.01, Math.min(1.0, Math.round(lotSize * 100) / 100));
  }

  /**
   * Cari nearest support level
   */
  findNearestSupport(indicators, currentPrice) {
    try {
      const bbLower = indicators.bbLower[indicators.bbLower.length - 1];
      const emaFast = indicators.emaFast[indicators.emaFast.length - 1];
      
      // Support bisa dari BB lower atau EMA fast
      return Math.max(bbLower, emaFast);
    } catch (error) {
      return currentPrice - (this.stopLossPips * 0.0001);
    }
  }

  /**
   * Cari nearest resistance level
   */
  findNearestResistance(indicators, currentPrice) {
    try {
      const bbUpper = indicators.bbUpper[indicators.bbUpper.length - 1];
      const emaFast = indicators.emaFast[indicators.emaFast.length - 1];
      
      // Resistance bisa dari BB upper atau EMA fast
      return Math.min(bbUpper, emaFast);
    } catch (error) {
      return currentPrice + (this.stopLossPips * 0.0001);
    }
  }

  /**
   * Hitung confidence score
   */
  calculateConfidence(indicators) {
    try {
      let confidence = 0.5; // Base confidence
      
      // Add confidence berdasarkan indikator alignment
      const latest = indicators.emaFast.length - 1;
      const rsi = indicators.rsi[indicators.rsi.length - 1];
      
      // RSI dalam zona optimal
      if (rsi > 40 && rsi < 60) confidence += 0.2;
      
      // MACD alignment
      const macd = indicators.macd[indicators.macd.length - 1];
      const macdSignal = indicators.macdSignal[indicators.macdSignal.length - 1];
      if (Math.abs(macd - macdSignal) < 0.0001) confidence += 0.1;
      
      // Volatility optimal
      const volatility = indicators.volatility[indicators.volatility.length - 1];
      if (volatility >= this.minVolatility && volatility <= this.maxVolatility) {
        confidence += 0.2;
      }
      
      return Math.min(0.95, Math.max(0.5, confidence));
    } catch (error) {
      return 0.6;
    }
  }

  /**
   * Calculate Average True Range
   */
  calculateATR(data, period = 14) {
    if (data.length < period) return 0.001;
    
    try {
      const trueRanges = [];
      for (let i = 1; i < data.length; i++) {
        const high = parseFloat(data[i].high);
        const low = parseFloat(data[i].low);
        const prevClose = parseFloat(data[i-1].close);
        
        const tr = Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose)
        );
        trueRanges.push(tr);
      }
      
      const atr = trueRanges.slice(-period).reduce((a, b) => a + b) / period;
      return atr;
    } catch (error) {
      return 0.001;
    }
  }

  /**
   * Update performance tracking
   */
  updatePerformance(tradeResult) {
    if (tradeResult.profit > 0) {
      this.successfulSignals++;
      this.consecutiveLosses = 0;
    } else {
      this.consecutiveLosses++;
    }
  }

  /**
   * Get current win rate
   */
  getWinRate() {
    if (this.totalSignals === 0) return 0;
    return (this.successfulSignals / this.totalSignals) * 100;
  }

  /**
   * Get strategy info
   */
  getInfo() {
    return {
      name: this.name,
      timeframe: this.timeframe,
      winRate: this.getWinRate(),
      totalSignals: this.totalSignals,
      successfulSignals: this.successfulSignals,
      riskRewardRatio: `1:${this.takeProfitPips / this.stopLossPips}`,
      description: 'Algoritma scalping profesional dengan multiple confirmations dan risk management ketat'
    };
  }
}

export default ScalpingBot;