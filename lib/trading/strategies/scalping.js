import { BaseStrategy } from './base';
import { TechnicalIndicators } from '../indicators';
import { RiskManager } from '../risk-management';

export class ScalpingStrategy extends BaseStrategy {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      timeframe: '1m',
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbDeviation: 2,
      atrPeriod: 14,
      volumeThreshold: 1.5,
      maxSpread: 3,
      minProfitPips: 5,
      maxLossPips: 15,
      trailingStop: true,
      trailingStopPips: 3,
      maxPositions: 3,
      riskPerTrade: 0.02,
      ...config
    };

    this.indicators = new TechnicalIndicators();
    this.riskManager = new RiskManager(this.config);
    this.positions = new Map();
    this.signals = [];
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0
    };
  }

  async analyze(marketData) {
    const { symbol, prices, volume, timestamp } = marketData;
    
    if (!this.validateMarketConditions(marketData)) {
      return null;
    }

    // Calculate technical indicators
    const indicators = await this.calculateIndicators(prices);
    
    // Generate trading signals
    const signal = this.generateSignal(indicators, marketData);
    
    if (signal) {
      // Apply risk management
      const validatedSignal = this.riskManager.validateSignal(signal, this.positions);
      
      if (validatedSignal) {
        this.signals.push({
          ...validatedSignal,
          timestamp,
          indicators
        });
        
        return validatedSignal;
      }
    }

    // Check for exit signals on existing positions
    await this.checkExitSignals(indicators, marketData);
    
    return null;
  }

  async calculateIndicators(prices) {
    const closes = prices.map(p => p.close);
    const highs = prices.map(p => p.high);
    const lows = prices.map(p => p.low);
    const volumes = prices.map(p => p.volume);

    return {
      rsi: this.indicators.rsi(closes, this.config.rsiPeriod),
      macd: this.indicators.macd(closes, this.config.macdFast, this.config.macdSlow, this.config.macdSignal),
      bb: this.indicators.bollingerBands(closes, this.config.bbPeriod, this.config.bbDeviation),
      atr: this.indicators.atr(highs, lows, closes, this.config.atrPeriod),
      ema: {
        fast: this.indicators.ema(closes, 9),
        slow: this.indicators.ema(closes, 21)
      },
      stochastic: this.indicators.stochastic(highs, lows, closes, 14, 3, 3),
      williams: this.indicators.williamsR(highs, lows, closes, 14),
      volumeProfile: this.indicators.volumeProfile(prices, volumes),
      support: this.indicators.supportResistance(highs, lows, closes),
      momentum: this.indicators.momentum(closes, 10)
    };
  }

  generateSignal(indicators, marketData) {
    const { close, spread, volume } = marketData;
    const currentRSI = indicators.rsi[indicators.rsi.length - 1];
    const currentMACD = indicators.macd.histogram[indicators.macd.histogram.length - 1];
    const currentBB = indicators.bb[indicators.bb.length - 1];
    const currentATR = indicators.atr[indicators.atr.length - 1];
    const fastEMA = indicators.ema.fast[indicators.ema.fast.length - 1];
    const slowEMA = indicators.ema.slow[indicators.ema.slow.length - 1];
    const stoch = indicators.stochastic;
    const currentStochK = stoch.k[stoch.k.length - 1];
    const currentStochD = stoch.d[stoch.d.length - 1];

    // Scalping conditions
    const conditions = {
      // Trend conditions
      uptrend: fastEMA > slowEMA,
      downtrend: fastEMA < slowEMA,
      
      // Momentum conditions
      bullishMomentum: currentMACD > 0 && currentRSI > 50,
      bearishMomentum: currentMACD < 0 && currentRSI < 50,
      
      // Oversold/Overbought conditions
      oversold: currentRSI < this.config.rsiOversold && currentStochK < 20,
      overbought: currentRSI > this.config.rsiOverbought && currentStochK > 80,
      
      // Bollinger Bands conditions
      nearLowerBB: close < currentBB.lower * 1.001,
      nearUpperBB: close > currentBB.upper * 0.999,
      
      // Volume conditions
      highVolume: volume > indicators.volumeProfile.avgVolume * this.config.volumeThreshold,
      
      // Spread conditions
      lowSpread: spread <= this.config.maxSpread
    };

    // Long signal conditions
    if (conditions.uptrend && 
        conditions.oversold && 
        conditions.nearLowerBB && 
        conditions.highVolume && 
        conditions.lowSpread &&
        currentStochK > currentStochD) {
      
      return this.createSignal('BUY', close, currentATR, marketData);
    }

    // Short signal conditions
    if (conditions.downtrend && 
        conditions.overbought && 
        conditions.nearUpperBB && 
        conditions.highVolume && 
        conditions.lowSpread &&
        currentStochK < currentStochD) {
      
      return this.createSignal('SELL', close, currentATR, marketData);
    }

    return null;
  }

  createSignal(direction, price, atr, marketData) {
    const stopLoss = direction === 'BUY' 
      ? price - (this.config.maxLossPips * marketData.pipValue)
      : price + (this.config.maxLossPips * marketData.pipValue);

    const takeProfit = direction === 'BUY'
      ? price + (this.config.minProfitPips * marketData.pipValue)
      : price - (this.config.minProfitPips * marketData.pipValue);

    const lotSize = this.riskManager.calculateLotSize(
      price, 
      stopLoss, 
      this.config.riskPerTrade
    );

    return {
      strategy: 'scalping',
      direction,
      symbol: marketData.symbol,
      entryPrice: price,
      stopLoss,
      takeProfit,
      lotSize,
      confidence: this.calculateConfidence(marketData),
      timestamp: new Date().toISOString(),
      metadata: {
        atr: atr,
        spread: marketData.spread,
        volume: marketData.volume,
        timeframe: this.config.timeframe
      }
    };
  }

  calculateConfidence(marketData) {
    // Implement confidence calculation based on multiple factors
    let confidence = 0.5; // Base confidence
    
    // Add confidence based on various factors
    // This is a simplified version - in reality, this would be much more complex
    confidence += 0.1; // Placeholder
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  async checkExitSignals(indicators, marketData) {
    const currentPrice = marketData.close;
    
    for (const [positionId, position] of this.positions) {
      const signal = this.shouldExit(position, currentPrice, indicators);
      
      if (signal) {
        await this.closePosition(positionId, signal);
      } else if (this.config.trailingStop) {
        await this.updateTrailingStop(positionId, currentPrice);
      }
    }
  }

  shouldExit(position, currentPrice, indicators) {
    const currentRSI = indicators.rsi[indicators.rsi.length - 1];
    
    // Exit conditions for long positions
    if (position.direction === 'BUY') {
      if (currentRSI > this.config.rsiOverbought || 
          currentPrice <= position.stopLoss ||
          currentPrice >= position.takeProfit) {
        return {
          reason: currentPrice <= position.stopLoss ? 'stop_loss' : 
                  currentPrice >= position.takeProfit ? 'take_profit' : 'rsi_exit',
          price: currentPrice
        };
      }
    }
    
    // Exit conditions for short positions
    if (position.direction === 'SELL') {
      if (currentRSI < this.config.rsiOversold || 
          currentPrice >= position.stopLoss ||
          currentPrice <= position.takeProfit) {
        return {
          reason: currentPrice >= position.stopLoss ? 'stop_loss' : 
                  currentPrice <= position.takeProfit ? 'take_profit' : 'rsi_exit',
          price: currentPrice
        };
      }
    }
    
    return null;
  }

  async closePosition(positionId, exitSignal) {
    const position = this.positions.get(positionId);
    if (!position) return;

    const profit = this.calculateProfit(position, exitSignal.price);
    
    // Update performance metrics
    this.updatePerformance(profit, exitSignal.reason);
    
    // Remove position
    this.positions.delete(positionId);
    
    return {
      positionId,
      exitPrice: exitSignal.price,
      profit,
      reason: exitSignal.reason,
      timestamp: new Date().toISOString()
    };
  }

  calculateProfit(position, exitPrice) {
    if (position.direction === 'BUY') {
      return (exitPrice - position.entryPrice) * position.lotSize;
    } else {
      return (position.entryPrice - exitPrice) * position.lotSize;
    }
  }

  updatePerformance(profit, reason) {
    this.performance.totalTrades++;
    this.performance.totalProfit += profit;
    
    if (profit > 0) {
      this.performance.winningTrades++;
    } else {
      this.performance.losingTrades++;
    }
    
    this.performance.winRate = this.performance.winningTrades / this.performance.totalTrades;
    
    // Update other metrics...
  }

  validateMarketConditions(marketData) {
    // Check if market conditions are suitable for scalping
    return marketData.spread <= this.config.maxSpread &&
           marketData.volume > 0 &&
           this.positions.size < this.config.maxPositions;
  }

  getMetrics() {
    return {
      ...this.performance,
      activePositions: this.positions.size,
      totalSignals: this.signals.length,
      strategy: 'scalping'
    };
  }

  isActive() {
    return this.active;
  }

  start() {
    this.active = true;
  }

  stop() {
    this.active = false;
  }
}