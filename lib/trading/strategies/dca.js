import { BaseStrategy } from './base';
import { TechnicalIndicators } from '../indicators';
import { RiskManager } from '../risk-management';

export class DCAStrategy extends BaseStrategy {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      timeframe: '1h',
      entryInterval: 24, // Hours between entries
      maxPositions: 10,
      baseOrderSize: 0.1, // Base lot size
      safetyOrderSize: 0.2, // Safety order lot size
      priceDeviation: 2.5, // Percentage deviation for safety orders
      safetyOrderStepScale: 1.05, // Multiplier for safety order step
      safetyOrderVolumeScale: 1.2, // Multiplier for safety order volume
      takeProfitPercentage: 3.0, // Take profit percentage
      maxSafetyOrders: 5,
      dealStartCondition: 'rsi_oversold', // 'rsi_oversold', 'ema_cross', 'manual'
      stopLossPercentage: 15.0, // Stop loss percentage (optional)
      cooldownPeriod: 6, // Hours to wait after closing a deal
      ...config
    };

    this.indicators = new TechnicalIndicators();
    this.riskManager = new RiskManager(this.config);
    this.activeDeals = new Map();
    this.dealHistory = [];
    this.lastDealClose = null;
  }

  async analyze(marketData) {
    const { symbol, prices, timestamp } = marketData;
    
    if (!this.validateMarketConditions(marketData)) {
      return null;
    }

    // Check cooldown period
    if (this.isInCooldown()) {
      return null;
    }

    // Calculate indicators
    const indicators = await this.calculateIndicators(prices);
    
    // Check for new deal start conditions
    const startSignal = this.checkDealStartCondition(indicators, marketData);
    if (startSignal && !this.hasActiveDeal(symbol)) {
      return this.createBaseOrder(startSignal, marketData);
    }

    // Check existing deals for safety orders or take profit
    const dealSignals = await this.procesActiveDeals(indicators, marketData);
    
    return dealSignals.length > 0 ? dealSignals[0] : null;
  }

  async calculateIndicators(prices) {
    const closes = prices.map(p => p.close);
    const highs = prices.map(p => p.high);
    const lows = prices.map(p => p.low);

    return {
      rsi: this.indicators.rsi(closes, 14),
      ema: {
        fast: this.indicators.ema(closes, 12),
        slow: this.indicators.ema(closes, 26)
      },
      bb: this.indicators.bollingerBands(closes, 20, 2),
      atr: this.indicators.atr(highs, lows, closes, 14),
      support: this.indicators.supportResistance(highs, lows, closes)
    };
  }

  checkDealStartCondition(indicators, marketData) {
    const { close } = marketData;
    const currentRSI = indicators.rsi[indicators.rsi.length - 1];
    const fastEMA = indicators.ema.fast[indicators.ema.fast.length - 1];
    const slowEMA = indicators.ema.slow[indicators.ema.slow.length - 1];
    const currentBB = indicators.bb[indicators.bb.length - 1];

    switch (this.config.dealStartCondition) {
      case 'rsi_oversold':
        return currentRSI < 30 && close < currentBB.lower;
      
      case 'ema_cross':
        const prevFastEMA = indicators.ema.fast[indicators.ema.fast.length - 2];
        const prevSlowEMA = indicators.ema.slow[indicators.ema.slow.length - 2];
        return fastEMA > slowEMA && prevFastEMA <= prevSlowEMA;
      
      case 'support_bounce':
        const supportLevels = indicators.support.supportLevels;
        return supportLevels.some(level => 
          Math.abs(close - level.price) / close < 0.005 // Within 0.5%
        );
      
      default:
        return false;
    }
  }

  createBaseOrder(startSignal, marketData) {
    const { symbol, close, timestamp } = marketData;
    
    const dealId = this.generateDealId();
    const baseOrder = {
      dealId,
      orderType: 'base',
      strategy: 'dca',
      direction: 'BUY', // DCA typically goes long
      symbol,
      entryPrice: close,
      lotSize: this.config.baseOrderSize,
      timestamp,
      takeProfitPrice: close * (1 + this.config.takeProfitPercentage / 100),
      stopLossPrice: this.config.stopLossPercentage ? 
        close * (1 - this.config.stopLossPercentage / 100) : null
    };

    // Initialize deal tracking
    this.activeDeals.set(dealId, {
      id: dealId,
      symbol,
      direction: 'BUY',
      baseOrder,
      safetyOrders: [],
      totalVolume: this.config.baseOrderSize,
      averagePrice: close,
      totalInvested: close * this.config.baseOrderSize,
      takeProfitPrice: baseOrder.takeProfitPrice,
      stopLossPrice: baseOrder.stopLossPrice,
      maxSafetyOrders: this.config.maxSafetyOrders,
      nextSafetyOrderPrice: this.calculateNextSafetyOrderPrice(close, 1),
      safetyOrderCount: 0,
      status: 'active',
      createdAt: timestamp
    });

    return baseOrder;
  }

  async procesActiveDeals(indicators, marketData) {
    const signals = [];
    const { close, timestamp } = marketData;

    for (const [dealId, deal] of this.activeDeals) {
      if (deal.symbol !== marketData.symbol) continue;

      // Check for take profit
      if (close >= deal.takeProfitPrice) {
        const closeSignal = this.createCloseSignal(deal, close, 'take_profit', timestamp);
        signals.push(closeSignal);
        this.closeDeal(dealId, close, 'take_profit', timestamp);
        continue;
      }

      // Check for stop loss
      if (deal.stopLossPrice && close <= deal.stopLossPrice) {
        const closeSignal = this.createCloseSignal(deal, close, 'stop_loss', timestamp);
        signals.push(closeSignal);
        this.closeDeal(dealId, close, 'stop_loss', timestamp);
        continue;
      }

      // Check for safety order
      if (deal.safetyOrderCount < deal.maxSafetyOrders && 
          close <= deal.nextSafetyOrderPrice) {
        
        const safetyOrderSignal = this.createSafetyOrder(deal, close, timestamp);
        signals.push(safetyOrderSignal);
        this.addSafetyOrder(dealId, safetyOrderSignal);
      }
    }

    return signals;
  }

  createSafetyOrder(deal, currentPrice, timestamp) {
    const safetyOrderNumber = deal.safetyOrderCount + 1;
    const volume = this.config.safetyOrderSize * 
      Math.pow(this.config.safetyOrderVolumeScale, safetyOrderNumber - 1);

    return {
      dealId: deal.id,
      orderType: 'safety',
      safetyOrderNumber,
      strategy: 'dca',
      direction: 'BUY',
      symbol: deal.symbol,
      entryPrice: currentPrice,
      lotSize: volume,
      timestamp
    };
  }

  addSafetyOrder(dealId, safetyOrder) {
    const deal = this.activeDeals.get(dealId);
    if (!deal) return;

    // Update deal statistics
    const newTotalVolume = deal.totalVolume + safetyOrder.lotSize;
    const newTotalInvested = deal.totalInvested + (safetyOrder.entryPrice * safetyOrder.lotSize);
    const newAveragePrice = newTotalInvested / newTotalVolume;

    deal.safetyOrders.push(safetyOrder);
    deal.safetyOrderCount++;
    deal.totalVolume = newTotalVolume;
    deal.totalInvested = newTotalInvested;
    deal.averagePrice = newAveragePrice;
    
    // Update take profit based on new average price
    deal.takeProfitPrice = newAveragePrice * (1 + this.config.takeProfitPercentage / 100);
    
    // Calculate next safety order price
    if (deal.safetyOrderCount < deal.maxSafetyOrders) {
      deal.nextSafetyOrderPrice = this.calculateNextSafetyOrderPrice(
        deal.baseOrder.entryPrice, 
        deal.safetyOrderCount + 1
      );
    }

    this.activeDeals.set(dealId, deal);
  }

  calculateNextSafetyOrderPrice(basePrice, safetyOrderNumber) {
    const deviation = this.config.priceDeviation;
    const stepScale = this.config.safetyOrderStepScale;
    
    let totalDeviation = 0;
    for (let i = 1; i <= safetyOrderNumber; i++) {
      totalDeviation += deviation * Math.pow(stepScale, i - 1);
    }
    
    return basePrice * (1 - totalDeviation / 100);
  }

  createCloseSignal(deal, closePrice, reason, timestamp) {
    const profit = this.calculateDealProfit(deal, closePrice);
    
    return {
      dealId: deal.id,
      orderType: 'close',
      strategy: 'dca',
      direction: 'SELL',
      symbol: deal.symbol,
      exitPrice: closePrice,
      lotSize: deal.totalVolume,
      profit,
      reason,
      timestamp,
      dealSummary: {
        baseOrder: deal.baseOrder,
        safetyOrders: deal.safetyOrders,
        averagePrice: deal.averagePrice,
        totalVolume: deal.totalVolume,
        totalInvested: deal.totalInvested
      }
    };
  }

  calculateDealProfit(deal, closePrice) {
    const totalValue = closePrice * deal.totalVolume;
    return totalValue - deal.totalInvested;
  }

  closeDeal(dealId, closePrice, reason, timestamp) {
    const deal = this.activeDeals.get(dealId);
    if (!deal) return;

    const profit = this.calculateDealProfit(deal, closePrice);
    
    // Update performance metrics
    this.updatePerformanceMetrics({
      dealId,
      profit,
      closePrice,
      reason,
      closeTime: timestamp,
      duration: new Date(timestamp) - new Date(deal.createdAt),
      safetyOrdersUsed: deal.safetyOrderCount
    });

    // Move to history
    this.dealHistory.push({
      ...deal,
      closePrice,
      profit,
      reason,
      closedAt: timestamp,
      status: 'closed'
    });

    // Remove from active deals
    this.activeDeals.delete(dealId);
    this.lastDealClose = timestamp;
  }

  hasActiveDeal(symbol) {
    return Array.from(this.activeDeals.values()).some(deal => 
      deal.symbol === symbol && deal.status === 'active'
    );
  }

  isInCooldown() {
    if (!this.lastDealClose || !this.config.cooldownPeriod) return false;
    
    const cooldownMs = this.config.cooldownPeriod * 60 * 60 * 1000; // Convert hours to ms
    const timeSinceLastClose = Date.now() - new Date(this.lastDealClose).getTime();
    
    return timeSinceLastClose < cooldownMs;
  }

  generateDealId() {
    return `dca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateMarketConditions(marketData) {
    return marketData.symbol && 
           marketData.close > 0 && 
           this.activeDeals.size < this.config.maxPositions;
  }

  getMetrics() {
    const baseMetrics = super.getMetrics();
    
    const dcaMetrics = {
      activeDeals: this.activeDeals.size,
      totalDeals: this.dealHistory.length,
      averageSafetyOrders: this.dealHistory.length > 0 ? 
        this.dealHistory.reduce((sum, deal) => sum + deal.safetyOrderCount, 0) / this.dealHistory.length : 0,
      profitableDeals: this.dealHistory.filter(deal => deal.profit > 0).length,
      maxSafetyOrdersUsed: Math.max(...this.dealHistory.map(deal => deal.safetyOrderCount), 0),
      averageDealDuration: this.calculateAverageDealDuration(),
      totalInvestedCapital: Array.from(this.activeDeals.values())
        .reduce((sum, deal) => sum + deal.totalInvested, 0)
    };

    return { ...baseMetrics, ...dcaMetrics };
  }

  calculateAverageDealDuration() {
    if (this.dealHistory.length === 0) return 0;
    
    const totalDuration = this.dealHistory.reduce((sum, deal) => {
      const duration = new Date(deal.closedAt) - new Date(deal.createdAt);
      return sum + duration;
    }, 0);
    
    return totalDuration / this.dealHistory.length / (1000 * 60 * 60); // Convert to hours
  }

  getActiveDeals() {
    return Array.from(this.activeDeals.values());
  }

  getDealHistory(limit = 50) {
    return this.dealHistory.slice(-limit);
  }

  // Configuration updates
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update existing deals if necessary
    for (const deal of this.activeDeals.values()) {
      if (newConfig.takeProfitPercentage) {
        deal.takeProfitPrice = deal.averagePrice * (1 + newConfig.takeProfitPercentage / 100);
      }
      if (newConfig.stopLossPercentage) {
        deal.stopLossPrice = deal.averagePrice * (1 - newConfig.stopLossPercentage / 100);
      }
    }
  }

  // Emergency close all deals
  closeAllDeals(currentPrice, reason = 'emergency') {
    const closeSignals = [];
    const timestamp = new Date().toISOString();
    
    for (const [dealId, deal] of this.activeDeals) {
      const closeSignal = this.createCloseSignal(deal, currentPrice, reason, timestamp);
      closeSignals.push(closeSignal);
      this.closeDeal(dealId, currentPrice, reason, timestamp);
    }
    
    return closeSignals;
  }
}