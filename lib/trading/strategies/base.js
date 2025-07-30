export class BaseStrategy {
  constructor(config = {}) {
    this.config = config;
    this.active = false;
    this.positions = new Map();
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      maxProfit: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0
    };
    this.trades = [];
    this.signals = [];
  }

  // Abstract methods that must be implemented by subclasses
  async analyze(marketData) {
    throw new Error('analyze method must be implemented by subclass');
  }

  generateSignal(indicators, marketData) {
    throw new Error('generateSignal method must be implemented by subclass');
  }

  // Common methods
  isActive() {
    return this.active;
  }

  start() {
    this.active = true;
    console.log(`${this.constructor.name} started`);
  }

  stop() {
    this.active = false;
    console.log(`${this.constructor.name} stopped`);
  }

  addPosition(positionId, position) {
    this.positions.set(positionId, {
      ...position,
      openTime: new Date().toISOString(),
      unrealizedPnL: 0
    });
  }

  removePosition(positionId) {
    return this.positions.delete(positionId);
  }

  getPosition(positionId) {
    return this.positions.get(positionId);
  }

  getAllPositions() {
    return Array.from(this.positions.values());
  }

  updatePosition(positionId, updates) {
    const position = this.positions.get(positionId);
    if (position) {
      this.positions.set(positionId, { ...position, ...updates });
    }
  }

  calculateUnrealizedPnL(currentPrice) {
    let totalUnrealized = 0;
    
    for (const [positionId, position] of this.positions) {
      const unrealized = this.calculatePositionPnL(position, currentPrice);
      this.updatePosition(positionId, { unrealizedPnL: unrealized });
      totalUnrealized += unrealized;
    }
    
    return totalUnrealized;
  }

  calculatePositionPnL(position, currentPrice) {
    if (position.direction === 'BUY') {
      return (currentPrice - position.entryPrice) * position.lotSize;
    } else {
      return (position.entryPrice - currentPrice) * position.lotSize;
    }
  }

  updatePerformanceMetrics(trade) {
    const profit = trade.profit;
    
    this.performance.totalTrades++;
    this.performance.totalProfit += profit;
    
    if (profit > 0) {
      this.performance.winningTrades++;
      this.performance.consecutiveWins++;
      this.performance.consecutiveLosses = 0;
      this.performance.maxConsecutiveWins = Math.max(
        this.performance.maxConsecutiveWins, 
        this.performance.consecutiveWins
      );
      
      if (profit > this.performance.largestWin) {
        this.performance.largestWin = profit;
      }
    } else {
      this.performance.losingTrades++;
      this.performance.consecutiveLosses++;
      this.performance.consecutiveWins = 0;
      this.performance.maxConsecutiveLosses = Math.max(
        this.performance.maxConsecutiveLosses, 
        this.performance.consecutiveLosses
      );
      
      if (profit < this.performance.largestLoss) {
        this.performance.largestLoss = profit;
      }
    }

    // Update drawdown
    if (this.performance.totalProfit > this.performance.maxProfit) {
      this.performance.maxProfit = this.performance.totalProfit;
      this.performance.currentDrawdown = 0;
    } else {
      this.performance.currentDrawdown = this.performance.maxProfit - this.performance.totalProfit;
      if (this.performance.currentDrawdown > this.performance.maxDrawdown) {
        this.performance.maxDrawdown = this.performance.currentDrawdown;
      }
    }

    // Calculate ratios
    this.performance.winRate = this.performance.winningTrades / this.performance.totalTrades;
    
    this.performance.averageWin = this.performance.winningTrades > 0 
      ? this.trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0) / this.performance.winningTrades
      : 0;
      
    this.performance.averageLoss = this.performance.losingTrades > 0 
      ? Math.abs(this.trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)) / this.performance.losingTrades
      : 0;
    
    this.performance.profitFactor = this.performance.averageLoss > 0 
      ? this.performance.averageWin / this.performance.averageLoss 
      : 0;

    // Calculate Sharpe ratio (simplified)
    if (this.trades.length > 1) {
      const returns = this.trades.map(t => t.profit);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
      const stdDev = Math.sqrt(variance);
      this.performance.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    }

    this.trades.push(trade);
  }

  getMetrics() {
    return {
      ...this.performance,
      activePositions: this.positions.size,
      totalSignals: this.signals.length,
      strategy: this.constructor.name.toLowerCase().replace('strategy', '')
    };
  }

  getDetailedMetrics() {
    const basic = this.getMetrics();
    
    return {
      ...basic,
      recentTrades: this.trades.slice(-10),
      recentSignals: this.signals.slice(-5),
      positionSizes: Array.from(this.positions.values()).map(p => p.lotSize),
      profitDistribution: this.calculateProfitDistribution(),
      monthlyPerformance: this.calculateMonthlyPerformance(),
      riskMetrics: this.calculateRiskMetrics()
    };
  }

  calculateProfitDistribution() {
    const profits = this.trades.map(t => t.profit);
    profits.sort((a, b) => a - b);
    
    const percentiles = [10, 25, 50, 75, 90, 95, 99];
    const distribution = {};
    
    percentiles.forEach(p => {
      const index = Math.floor((p / 100) * profits.length);
      distribution[`p${p}`] = profits[index] || 0;
    });
    
    return distribution;
  }

  calculateMonthlyPerformance() {
    const monthly = {};
    
    this.trades.forEach(trade => {
      const month = trade.closeTime.substring(0, 7); // YYYY-MM
      if (!monthly[month]) {
        monthly[month] = { profit: 0, trades: 0, wins: 0 };
      }
      monthly[month].profit += trade.profit;
      monthly[month].trades++;
      if (trade.profit > 0) monthly[month].wins++;
    });
    
    return monthly;
  }

  calculateRiskMetrics() {
    const profits = this.trades.map(t => t.profit);
    
    if (profits.length === 0) return {};
    
    const sortedProfits = [...profits].sort((a, b) => a - b);
    const var95 = sortedProfits[Math.floor(0.05 * sortedProfits.length)] || 0;
    const var99 = sortedProfits[Math.floor(0.01 * sortedProfits.length)] || 0;
    
    // Calculate Expected Shortfall (Conditional VaR)
    const tailLosses = sortedProfits.filter(p => p <= var95);
    const expectedShortfall = tailLosses.length > 0 
      ? tailLosses.reduce((sum, p) => sum + p, 0) / tailLosses.length 
      : 0;
    
    return {
      valueAtRisk95: Math.abs(var95),
      valueAtRisk99: Math.abs(var99),
      expectedShortfall: Math.abs(expectedShortfall),
      maxDrawdownPercent: this.performance.maxDrawdown / Math.max(this.performance.maxProfit, 1) * 100,
      calmarRatio: this.performance.maxDrawdown > 0 
        ? (this.performance.totalProfit / this.trades.length) / this.performance.maxDrawdown 
        : 0
    };
  }

  reset() {
    this.positions.clear();
    this.trades = [];
    this.signals = [];
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      maxProfit: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0
    };
  }

  toJSON() {
    return {
      name: this.constructor.name,
      config: this.config,
      active: this.active,
      performance: this.performance,
      positionsCount: this.positions.size,
      tradesCount: this.trades.length,
      signalsCount: this.signals.length
    };
  }
}