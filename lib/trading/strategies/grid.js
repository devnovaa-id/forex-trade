import { BaseStrategy } from './base';
import { TechnicalIndicators } from '../indicators';
import { RiskManager } from '../risk-management';

export class GridStrategy extends BaseStrategy {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      timeframe: '1h',
      gridType: 'arithmetic', // 'arithmetic' or 'geometric'
      gridLevels: 10,
      gridSpacing: 50, // Pips between grid levels
      gridSpacingPercentage: 0.5, // Alternative to pips for percentage-based spacing
      baseOrderSize: 0.1,
      gridOrderSize: 0.1,
      takeProfitPips: 30,
      stopLossPips: 500, // Wide stop loss for grid trading
      maxGridOrders: 20,
      centerPrice: null, // Auto-calculated if null
      upperBound: null, // Auto-calculated if null
      lowerBound: null, // Auto-calculated if null
      rebalanceOnBreakout: true,
      hedging: false, // Enable hedging mode
      martingaleMultiplier: 1.0, // Multiplier for grid order sizes
      dynamicSpacing: true, // Adjust spacing based on volatility
      ...config
    };

    this.indicators = new TechnicalIndicators();
    this.riskManager = new RiskManager(this.config);
    this.gridOrders = new Map();
    this.gridLevels = [];
    this.isInitialized = false;
    this.lastRebalance = null;
  }

  async analyze(marketData) {
    const { symbol, prices, timestamp } = marketData;
    
    if (!this.validateMarketConditions(marketData)) {
      return null;
    }

    // Initialize grid if not done
    if (!this.isInitialized) {
      await this.initializeGrid(marketData);
      return null; // Wait for next tick to start trading
    }

    // Calculate indicators for decision making
    const indicators = await this.calculateIndicators(prices);
    
    // Check for grid rebalancing
    if (this.shouldRebalanceGrid(marketData, indicators)) {
      return await this.rebalanceGrid(marketData, indicators);
    }

    // Check for grid order triggers
    const gridSignals = this.checkGridOrders(marketData);
    
    // Check for take profit/stop loss on existing positions
    const exitSignals = await this.checkExitSignals(marketData);
    
    // Return the most relevant signal
    return gridSignals || exitSignals || null;
  }

  async initializeGrid(marketData) {
    const { close, symbol } = marketData;
    const indicators = await this.calculateIndicators(marketData.prices);
    
    // Calculate grid bounds
    const bounds = this.calculateGridBounds(close, indicators);
    this.config.centerPrice = close;
    this.config.upperBound = bounds.upper;
    this.config.lowerBound = bounds.lower;
    
    // Generate grid levels
    this.gridLevels = this.generateGridLevels(bounds);
    
    // Initialize grid orders
    this.initializeGridOrders(symbol);
    
    this.isInitialized = true;
    console.log(`Grid initialized for ${symbol}: ${this.gridLevels.length} levels`);
  }

  calculateGridBounds(currentPrice, indicators) {
    const atr = indicators.atr[indicators.atr.length - 1];
    const bb = indicators.bb[indicators.bb.length - 1];
    
    let upper, lower;
    
    if (this.config.upperBound && this.config.lowerBound) {
      // Use configured bounds
      upper = this.config.upperBound;
      lower = this.config.lowerBound;
    } else {
      // Calculate bounds based on volatility and support/resistance
      const volatilityRange = atr * 10; // 10x ATR for grid range
      const bbRange = bb.upper - bb.lower;
      
      const range = Math.max(volatilityRange, bbRange);
      
      upper = currentPrice + (range / 2);
      lower = currentPrice - (range / 2);
      
      // Adjust based on support/resistance levels
      const supportLevels = indicators.support.supportLevels;
      const resistanceLevels = indicators.support.resistanceLevels;
      
      if (resistanceLevels.length > 0) {
        const nearestResistance = resistanceLevels
          .filter(level => level.price > currentPrice)
          .sort((a, b) => a.price - b.price)[0];
        if (nearestResistance) {
          upper = Math.min(upper, nearestResistance.price);
        }
      }
      
      if (supportLevels.length > 0) {
        const nearestSupport = supportLevels
          .filter(level => level.price < currentPrice)
          .sort((a, b) => b.price - a.price)[0];
        if (nearestSupport) {
          lower = Math.max(lower, nearestSupport.price);
        }
      }
    }
    
    return { upper, lower };
  }

  generateGridLevels(bounds) {
    const levels = [];
    const { upper, lower } = bounds;
    const totalRange = upper - lower;
    
    if (this.config.gridType === 'arithmetic') {
      // Arithmetic progression
      const spacing = totalRange / (this.config.gridLevels - 1);
      
      for (let i = 0; i < this.config.gridLevels; i++) {
        const price = lower + (spacing * i);
        levels.push({
          id: `grid_${i}`,
          price: price,
          level: i,
          type: i === 0 ? 'lower_bound' : 
                i === this.config.gridLevels - 1 ? 'upper_bound' : 'grid',
          hasOrder: false,
          orderType: price < this.config.centerPrice ? 'BUY' : 'SELL'
        });
      }
    } else {
      // Geometric progression
      const ratio = Math.pow(upper / lower, 1 / (this.config.gridLevels - 1));
      
      for (let i = 0; i < this.config.gridLevels; i++) {
        const price = lower * Math.pow(ratio, i);
        levels.push({
          id: `grid_${i}`,
          price: price,
          level: i,
          type: i === 0 ? 'lower_bound' : 
                i === this.config.gridLevels - 1 ? 'upper_bound' : 'grid',
          hasOrder: false,
          orderType: price < this.config.centerPrice ? 'BUY' : 'SELL'
        });
      }
    }
    
    return levels;
  }

  initializeGridOrders(symbol) {
    this.gridLevels.forEach(level => {
      if (level.type !== 'lower_bound' && level.type !== 'upper_bound') {
        const orderId = `${level.id}_${Date.now()}`;
        
        this.gridOrders.set(orderId, {
          id: orderId,
          symbol: symbol,
          level: level,
          direction: level.orderType,
          entryPrice: level.price,
          lotSize: this.calculateGridOrderSize(level),
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        
        level.hasOrder = true;
      }
    });
  }

  calculateGridOrderSize(level) {
    let baseSize = this.config.gridOrderSize;
    
    // Apply martingale multiplier based on distance from center
    if (this.config.martingaleMultiplier !== 1.0) {
      const distanceFromCenter = Math.abs(level.level - Math.floor(this.config.gridLevels / 2));
      baseSize *= Math.pow(this.config.martingaleMultiplier, distanceFromCenter);
    }
    
    return baseSize;
  }

  checkGridOrders(marketData) {
    const { close, timestamp } = marketData;
    
    for (const [orderId, order] of this.gridOrders) {
      if (order.status !== 'pending') continue;
      
      // Check if price has hit the grid level
      const priceHit = order.direction === 'BUY' ? 
        close <= order.entryPrice : 
        close >= order.entryPrice;
      
      if (priceHit) {
        // Execute grid order
        const signal = this.executeGridOrder(order, close, timestamp);
        return signal;
      }
    }
    
    return null;
  }

  executeGridOrder(order, executionPrice, timestamp) {
    // Update order status
    order.status = 'filled';
    order.executionPrice = executionPrice;
    order.executionTime = timestamp;
    
    // Calculate take profit and stop loss
    const takeProfitPrice = order.direction === 'BUY' ?
      executionPrice + (this.config.takeProfitPips * this.getPipValue()) :
      executionPrice - (this.config.takeProfitPips * this.getPipValue());
    
    const stopLossPrice = this.config.stopLossPips ? (
      order.direction === 'BUY' ?
        executionPrice - (this.config.stopLossPips * this.getPipValue()) :
        executionPrice + (this.config.stopLossPips * this.getPipValue())
    ) : null;
    
    // Create position
    const positionId = `pos_${order.id}`;
    this.addPosition(positionId, {
      ...order,
      id: positionId,
      orderId: order.id,
      takeProfitPrice,
      stopLossPrice,
      unrealizedPnL: 0
    });
    
    // Place opposite grid order if hedging is enabled
    if (this.config.hedging) {
      this.placeOppositeGridOrder(order);
    }
    
    return {
      strategy: 'grid',
      direction: order.direction,
      symbol: order.symbol,
      entryPrice: executionPrice,
      lotSize: order.lotSize,
      takeProfitPrice,
      stopLossPrice,
      gridLevel: order.level.level,
      timestamp,
      metadata: {
        gridOrderId: order.id,
        gridType: this.config.gridType
      }
    };
  }

  placeOppositeGridOrder(executedOrder) {
    const oppositeDirection = executedOrder.direction === 'BUY' ? 'SELL' : 'BUY';
    const spacing = this.calculateDynamicSpacing();
    
    const oppositePrice = executedOrder.direction === 'BUY' ?
      executedOrder.executionPrice + spacing :
      executedOrder.executionPrice - spacing;
    
    // Check if opposite price is within grid bounds
    if (oppositePrice >= this.config.lowerBound && 
        oppositePrice <= this.config.upperBound) {
      
      const orderId = `opposite_${executedOrder.id}_${Date.now()}`;
      
      this.gridOrders.set(orderId, {
        id: orderId,
        symbol: executedOrder.symbol,
        level: { ...executedOrder.level, price: oppositePrice },
        direction: oppositeDirection,
        entryPrice: oppositePrice,
        lotSize: executedOrder.lotSize,
        status: 'pending',
        createdAt: new Date().toISOString(),
        isOpposite: true,
        parentOrderId: executedOrder.id
      });
    }
  }

  calculateDynamicSpacing() {
    if (!this.config.dynamicSpacing) {
      return this.config.gridSpacing * this.getPipValue();
    }
    
    // Adjust spacing based on volatility (ATR)
    // This would require current market data, simplified for now
    return this.config.gridSpacing * this.getPipValue();
  }

  async checkExitSignals(marketData) {
    const { close, timestamp } = marketData;
    
    for (const [positionId, position] of this.positions) {
      if (position.strategy !== 'grid') continue;
      
      // Check take profit
      if (position.takeProfitPrice) {
        const takeProfitHit = position.direction === 'BUY' ?
          close >= position.takeProfitPrice :
          close <= position.takeProfitPrice;
        
        if (takeProfitHit) {
          return this.createExitSignal(position, close, 'take_profit', timestamp);
        }
      }
      
      // Check stop loss
      if (position.stopLossPrice) {
        const stopLossHit = position.direction === 'BUY' ?
          close <= position.stopLossPrice :
          close >= position.stopLossPrice;
        
        if (stopLossHit) {
          return this.createExitSignal(position, close, 'stop_loss', timestamp);
        }
      }
    }
    
    return null;
  }

  createExitSignal(position, exitPrice, reason, timestamp) {
    const profit = this.calculatePositionPnL(position, exitPrice);
    
    // Close position
    this.removePosition(position.id);
    
    // Update performance
    this.updatePerformanceMetrics({
      profit,
      reason,
      closeTime: timestamp,
      positionId: position.id
    });
    
    // Place new grid order at the same level if within bounds
    if (reason === 'take_profit') {
      this.replaceGridOrder(position);
    }
    
    return {
      strategy: 'grid',
      direction: position.direction === 'BUY' ? 'SELL' : 'BUY',
      symbol: position.symbol,
      exitPrice,
      lotSize: position.lotSize,
      profit,
      reason,
      timestamp,
      metadata: {
        gridLevel: position.level?.level,
        positionId: position.id
      }
    };
  }

  replaceGridOrder(closedPosition) {
    // Create new grid order at the same level
    const orderId = `replace_${closedPosition.orderId}_${Date.now()}`;
    
    this.gridOrders.set(orderId, {
      id: orderId,
      symbol: closedPosition.symbol,
      level: closedPosition.level,
      direction: closedPosition.level.orderType,
      entryPrice: closedPosition.level.price,
      lotSize: this.calculateGridOrderSize(closedPosition.level),
      status: 'pending',
      createdAt: new Date().toISOString(),
      isReplacement: true,
      parentPositionId: closedPosition.id
    });
  }

  shouldRebalanceGrid(marketData, indicators) {
    if (!this.config.rebalanceOnBreakout) return false;
    if (this.lastRebalance && 
        Date.now() - new Date(this.lastRebalance).getTime() < 3600000) { // 1 hour cooldown
      return false;
    }
    
    const { close } = marketData;
    
    // Check for breakout beyond grid bounds
    const breakoutUpper = close > this.config.upperBound;
    const breakoutLower = close < this.config.lowerBound;
    
    // Check for significant volatility change
    const currentATR = indicators.atr[indicators.atr.length - 1];
    const previousATR = indicators.atr[indicators.atr.length - 10]; // 10 periods ago
    const volatilityChange = Math.abs(currentATR - previousATR) / previousATR;
    
    return breakoutUpper || breakoutLower || volatilityChange > 0.3;
  }

  async rebalanceGrid(marketData, indicators) {
    console.log('Rebalancing grid...');
    
    // Close all pending grid orders
    for (const [orderId, order] of this.gridOrders) {
      if (order.status === 'pending') {
        this.gridOrders.delete(orderId);
      }
    }
    
    // Recalculate grid bounds and levels
    const bounds = this.calculateGridBounds(marketData.close, indicators);
    this.config.centerPrice = marketData.close;
    this.config.upperBound = bounds.upper;
    this.config.lowerBound = bounds.lower;
    
    this.gridLevels = this.generateGridLevels(bounds);
    this.initializeGridOrders(marketData.symbol);
    
    this.lastRebalance = new Date().toISOString();
    
    return {
      strategy: 'grid',
      action: 'rebalance',
      symbol: marketData.symbol,
      newBounds: bounds,
      gridLevels: this.gridLevels.length,
      timestamp: new Date().toISOString()
    };
  }

  async calculateIndicators(prices) {
    const closes = prices.map(p => p.close);
    const highs = prices.map(p => p.high);
    const lows = prices.map(p => p.low);

    return {
      atr: this.indicators.atr(highs, lows, closes, 14),
      bb: this.indicators.bollingerBands(closes, 20, 2),
      support: this.indicators.supportResistance(highs, lows, closes),
      rsi: this.indicators.rsi(closes, 14),
      ema: this.indicators.ema(closes, 20)
    };
  }

  getPipValue() {
    // Simplified pip value calculation
    // In reality, this would depend on the symbol and account currency
    return 0.0001; // For major forex pairs
  }

  validateMarketConditions(marketData) {
    return marketData.symbol && 
           marketData.close > 0 && 
           this.gridOrders.size < this.config.maxGridOrders;
  }

  getMetrics() {
    const baseMetrics = super.getMetrics();
    
    const gridMetrics = {
      gridLevels: this.gridLevels.length,
      pendingOrders: Array.from(this.gridOrders.values())
        .filter(order => order.status === 'pending').length,
      filledOrders: Array.from(this.gridOrders.values())
        .filter(order => order.status === 'filled').length,
      upperBound: this.config.upperBound,
      lowerBound: this.config.lowerBound,
      centerPrice: this.config.centerPrice,
      gridSpacing: this.config.gridSpacing,
      lastRebalance: this.lastRebalance,
      hedgingEnabled: this.config.hedging
    };

    return { ...baseMetrics, ...gridMetrics };
  }

  getGridStatus() {
    return {
      isInitialized: this.isInitialized,
      gridLevels: this.gridLevels,
      activeOrders: Array.from(this.gridOrders.values()),
      bounds: {
        upper: this.config.upperBound,
        lower: this.config.lowerBound,
        center: this.config.centerPrice
      }
    };
  }

  // Manual grid management
  addGridLevel(price, orderType) {
    const levelId = `manual_${Date.now()}`;
    const level = {
      id: levelId,
      price: price,
      level: this.gridLevels.length,
      type: 'manual',
      hasOrder: false,
      orderType: orderType
    };
    
    this.gridLevels.push(level);
    
    const orderId = `${levelId}_order`;
    this.gridOrders.set(orderId, {
      id: orderId,
      symbol: this.config.symbol,
      level: level,
      direction: orderType,
      entryPrice: price,
      lotSize: this.config.gridOrderSize,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isManual: true
    });
    
    level.hasOrder = true;
    return orderId;
  }

  removeGridLevel(levelId) {
    // Remove from grid levels
    this.gridLevels = this.gridLevels.filter(level => level.id !== levelId);
    
    // Remove associated orders
    for (const [orderId, order] of this.gridOrders) {
      if (order.level.id === levelId) {
        this.gridOrders.delete(orderId);
      }
    }
  }

  // Emergency close all grid positions
  closeAllGridPositions(currentPrice, reason = 'emergency') {
    const closeSignals = [];
    const timestamp = new Date().toISOString();
    
    for (const [positionId, position] of this.positions) {
      if (position.strategy === 'grid') {
        const closeSignal = this.createExitSignal(position, currentPrice, reason, timestamp);
        closeSignals.push(closeSignal);
      }
    }
    
    // Clear all pending grid orders
    this.gridOrders.clear();
    
    return closeSignals;
  }
}