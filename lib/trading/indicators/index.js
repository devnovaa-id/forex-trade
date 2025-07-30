export class TechnicalIndicators {
  constructor() {
    this.cache = new Map();
  }

  // Simple Moving Average
  sma(data, period) {
    const key = `sma_${period}_${data.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    
    this.cache.set(key, result);
    return result;
  }

  // Exponential Moving Average
  ema(data, period) {
    const key = `ema_${period}_${data.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const multiplier = 2 / (period + 1);
    const result = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      result.push((data[i] * multiplier) + (result[i - 1] * (1 - multiplier)));
    }
    
    this.cache.set(key, result);
    return result;
  }

  // Relative Strength Index
  rsi(data, period = 14) {
    const key = `rsi_${period}_${data.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const gains = [];
    const losses = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGains = this.sma(gains, period);
    const avgLosses = this.sma(losses, period);
    
    const result = avgGains.map((gain, i) => {
      const rs = gain / avgLosses[i];
      return 100 - (100 / (1 + rs));
    });
    
    this.cache.set(key, result);
    return result;
  }

  // MACD (Moving Average Convergence Divergence)
  macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const key = `macd_${fastPeriod}_${slowPeriod}_${signalPeriod}_${data.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const fastEMA = this.ema(data, fastPeriod);
    const slowEMA = this.ema(data, slowPeriod);
    
    const macdLine = [];
    const start = Math.max(fastEMA.length, slowEMA.length) - Math.min(fastEMA.length, slowEMA.length);
    
    for (let i = start; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
    
    const signalLine = this.ema(macdLine, signalPeriod);
    const histogram = [];
    
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i]);
    }
    
    const result = {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
    
    this.cache.set(key, result);
    return result;
  }

  // Bollinger Bands
  bollingerBands(data, period = 20, deviation = 2) {
    const key = `bb_${period}_${deviation}_${data.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const sma = this.sma(data, period);
    const result = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      result.push({
        upper: mean + (stdDev * deviation),
        middle: mean,
        lower: mean - (stdDev * deviation)
      });
    }
    
    this.cache.set(key, result);
    return result;
  }

  // Average True Range
  atr(highs, lows, closes, period = 14) {
    const key = `atr_${period}_${highs.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const trueRanges = [];
    
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    const result = this.sma(trueRanges, period);
    this.cache.set(key, result);
    return result;
  }

  // Stochastic Oscillator
  stochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3, smoothing = 3) {
    const key = `stoch_${kPeriod}_${dPeriod}_${smoothing}_${highs.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const kValues = [];
    
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(k);
    }
    
    const smoothedK = this.sma(kValues, smoothing);
    const dValues = this.sma(smoothedK, dPeriod);
    
    const result = {
      k: smoothedK,
      d: dValues
    };
    
    this.cache.set(key, result);
    return result;
  }

  // Williams %R
  williamsR(highs, lows, closes, period = 14) {
    const key = `williams_${period}_${highs.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const result = [];
    
    for (let i = period - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      const wr = ((highestHigh - closes[i]) / (highestHigh - lowestLow)) * -100;
      result.push(wr);
    }
    
    this.cache.set(key, result);
    return result;
  }

  // Commodity Channel Index
  cci(highs, lows, closes, period = 20) {
    const key = `cci_${period}_${highs.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const typicalPrices = [];
    for (let i = 0; i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    
    const smaTP = this.sma(typicalPrices, period);
    const result = [];
    
    for (let i = period - 1; i < typicalPrices.length; i++) {
      const slice = typicalPrices.slice(i - period + 1, i + 1);
      const mean = smaTP[i - period + 1];
      const meanDeviation = slice.reduce((sum, val) => sum + Math.abs(val - mean), 0) / period;
      const cci = (typicalPrices[i] - mean) / (0.015 * meanDeviation);
      result.push(cci);
    }
    
    this.cache.set(key, result);
    return result;
  }

  // Money Flow Index
  mfi(highs, lows, closes, volumes, period = 14) {
    const key = `mfi_${period}_${highs.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const typicalPrices = [];
    const moneyFlows = [];
    
    for (let i = 0; i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    
    for (let i = 1; i < typicalPrices.length; i++) {
      const rawMoneyFlow = typicalPrices[i] * volumes[i];
      moneyFlows.push({
        value: rawMoneyFlow,
        positive: typicalPrices[i] > typicalPrices[i - 1]
      });
    }
    
    const result = [];
    
    for (let i = period - 1; i < moneyFlows.length; i++) {
      const slice = moneyFlows.slice(i - period + 1, i + 1);
      const positiveFlow = slice.filter(mf => mf.positive).reduce((sum, mf) => sum + mf.value, 0);
      const negativeFlow = slice.filter(mf => !mf.positive).reduce((sum, mf) => sum + mf.value, 0);
      
      const moneyRatio = positiveFlow / negativeFlow;
      const mfi = 100 - (100 / (1 + moneyRatio));
      result.push(mfi);
    }
    
    this.cache.set(key, result);
    return result;
  }

  // Parabolic SAR
  parabolicSAR(highs, lows, acceleration = 0.02, maximum = 0.2) {
    const key = `psar_${acceleration}_${maximum}_${highs.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const result = [];
    let trend = 1; // 1 for uptrend, -1 for downtrend
    let sar = lows[0];
    let ep = highs[0]; // Extreme point
    let af = acceleration; // Acceleration factor
    
    result.push(sar);
    
    for (let i = 1; i < highs.length; i++) {
      // Calculate new SAR
      sar = sar + af * (ep - sar);
      
      if (trend === 1) { // Uptrend
        if (lows[i] <= sar) {
          // Trend reversal
          trend = -1;
          sar = ep;
          ep = lows[i];
          af = acceleration;
        } else {
          if (highs[i] > ep) {
            ep = highs[i];
            af = Math.min(af + acceleration, maximum);
          }
        }
      } else { // Downtrend
        if (highs[i] >= sar) {
          // Trend reversal
          trend = 1;
          sar = ep;
          ep = highs[i];
          af = acceleration;
        } else {
          if (lows[i] < ep) {
            ep = lows[i];
            af = Math.min(af + acceleration, maximum);
          }
        }
      }
      
      result.push(sar);
    }
    
    this.cache.set(key, result);
    return result;
  }

  // Fibonacci Retracement Levels
  fibonacciRetracement(high, low) {
    const diff = high - low;
    return {
      level0: high,
      level236: high - (diff * 0.236),
      level382: high - (diff * 0.382),
      level500: high - (diff * 0.500),
      level618: high - (diff * 0.618),
      level786: high - (diff * 0.786),
      level100: low
    };
  }

  // Volume Profile
  volumeProfile(prices, volumes) {
    const key = `volume_profile_${prices.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    const avgVolume = totalVolume / volumes.length;
    
    const volumeByPrice = new Map();
    
    prices.forEach((price, i) => {
      const priceLevel = Math.round(price.close * 10000) / 10000; // Round to 4 decimals
      if (!volumeByPrice.has(priceLevel)) {
        volumeByPrice.set(priceLevel, 0);
      }
      volumeByPrice.set(priceLevel, volumeByPrice.get(priceLevel) + volumes[i]);
    });
    
    const sortedByVolume = Array.from(volumeByPrice.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const result = {
      totalVolume,
      avgVolume,
      poc: sortedByVolume[0] ? sortedByVolume[0][0] : 0, // Point of Control
      highVolumeNodes: sortedByVolume.slice(0, 5),
      volumeDistribution: Object.fromEntries(volumeByPrice)
    };
    
    this.cache.set(key, result);
    return result;
  }

  // Support and Resistance Levels
  supportResistance(highs, lows, closes, lookback = 20) {
    const key = `support_resistance_${lookback}_${highs.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const levels = [];
    
    for (let i = lookback; i < highs.length - lookback; i++) {
      const isResistance = highs.slice(i - lookback, i).every(h => h <= highs[i]) &&
                          highs.slice(i + 1, i + lookback + 1).every(h => h <= highs[i]);
      
      const isSupport = lows.slice(i - lookback, i).every(l => l >= lows[i]) &&
                       lows.slice(i + 1, i + lookback + 1).every(l => l >= lows[i]);
      
      if (isResistance) {
        levels.push({ type: 'resistance', price: highs[i], index: i });
      }
      
      if (isSupport) {
        levels.push({ type: 'support', price: lows[i], index: i });
      }
    }
    
    const result = {
      levels,
      resistanceLevels: levels.filter(l => l.type === 'resistance'),
      supportLevels: levels.filter(l => l.type === 'support')
    };
    
    this.cache.set(key, result);
    return result;
  }

  // Momentum
  momentum(data, period = 10) {
    const key = `momentum_${period}_${data.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const result = [];
    
    for (let i = period; i < data.length; i++) {
      result.push(data[i] - data[i - period]);
    }
    
    this.cache.set(key, result);
    return result;
  }

  // Rate of Change
  roc(data, period = 12) {
    const key = `roc_${period}_${data.length}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const result = [];
    
    for (let i = period; i < data.length; i++) {
      const roc = ((data[i] - data[i - period]) / data[i - period]) * 100;
      result.push(roc);
    }
    
    this.cache.set(key, result);
    return result;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache size
  getCacheSize() {
    return this.cache.size;
  }
}