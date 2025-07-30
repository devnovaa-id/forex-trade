export class RiskManager {
  constructor(config = {}) {
    this.config = {
      maxRiskPerTrade: 0.02, // 2% per trade
      maxDailyRisk: 0.05, // 5% per day
      maxDrawdown: 0.15, // 15% maximum drawdown
      maxPositions: 5,
      maxLeverage: 10,
      minRiskRewardRatio: 1.5,
      stopLossPercentage: 0.02, // 2%
      takeProfitPercentage: 0.04, // 4%
      trailingStopPercentage: 0.01, // 1%
      correlationLimit: 0.7, // Maximum correlation between positions
      volatilityMultiplier: 2,
      accountBalance: 10000,
      ...config
    };

    this.dailyLosses = [];
    this.currentDrawdown = 0;
    this.maxDrawdownReached = 0;
    this.dailyRiskUsed = 0;
    this.positionCorrelations = new Map();
  }

  // Validate if a signal meets risk criteria
  validateSignal(signal, currentPositions) {
    const validations = [
      this.checkMaxPositions(currentPositions),
      this.checkDailyRisk(),
      this.checkDrawdown(),
      this.checkRiskRewardRatio(signal),
      this.checkPositionCorrelation(signal, currentPositions),
      this.checkVolatility(signal),
      this.checkLeverage(signal)
    ];

    const failedValidations = validations.filter(v => !v.passed);
    
    if (failedValidations.length > 0) {
      console.log('Signal rejected:', failedValidations.map(v => v.reason));
      return null;
    }

    // Calculate position size based on risk
    const positionSize = this.calculatePositionSize(signal);
    
    return {
      ...signal,
      lotSize: positionSize,
      riskAmount: this.calculateRiskAmount(signal, positionSize),
      validatedAt: new Date().toISOString()
    };
  }

  // Check maximum number of positions
  checkMaxPositions(currentPositions) {
    const activePositions = Array.from(currentPositions.values()).filter(p => p.status === 'open');
    return {
      passed: activePositions.length < this.config.maxPositions,
      reason: `Max positions: ${activePositions.length}/${this.config.maxPositions}`
    };
  }

  // Check daily risk limit
  checkDailyRisk() {
    return {
      passed: this.dailyRiskUsed < this.config.maxDailyRisk,
      reason: `Daily risk used: ${(this.dailyRiskUsed * 100).toFixed(2)}%/${(this.config.maxDailyRisk * 100)}%`
    };
  }

  // Check drawdown limit
  checkDrawdown() {
    return {
      passed: this.currentDrawdown < this.config.maxDrawdown,
      reason: `Current drawdown: ${(this.currentDrawdown * 100).toFixed(2)}%/${(this.config.maxDrawdown * 100)}%`
    };
  }

  // Check risk-reward ratio
  checkRiskRewardRatio(signal) {
    const risk = Math.abs(signal.entryPrice - signal.stopLoss);
    const reward = Math.abs(signal.takeProfit - signal.entryPrice);
    const ratio = reward / risk;
    
    return {
      passed: ratio >= this.config.minRiskRewardRatio,
      reason: `Risk-reward ratio: ${ratio.toFixed(2)}/${this.config.minRiskRewardRatio}`
    };
  }

  // Check position correlation
  checkPositionCorrelation(signal, currentPositions) {
    for (const position of currentPositions.values()) {
      if (position.symbol === signal.symbol) {
        return {
          passed: false,
          reason: `Already have position in ${signal.symbol}`
        };
      }

      const correlation = this.calculateCorrelation(signal.symbol, position.symbol);
      if (correlation > this.config.correlationLimit) {
        return {
          passed: false,
          reason: `High correlation (${correlation.toFixed(2)}) with ${position.symbol}`
        };
      }
    }

    return { passed: true, reason: 'Correlation check passed' };
  }

  // Check volatility
  checkVolatility(signal) {
    const volatility = signal.metadata?.atr || 0;
    const maxVolatility = signal.entryPrice * 0.05; // 5% of entry price
    
    return {
      passed: volatility <= maxVolatility,
      reason: `Volatility: ${volatility.toFixed(5)}/${maxVolatility.toFixed(5)}`
    };
  }

  // Check leverage
  checkLeverage(signal) {
    const leverage = signal.lotSize * signal.entryPrice / this.config.accountBalance;
    
    return {
      passed: leverage <= this.config.maxLeverage,
      reason: `Leverage: ${leverage.toFixed(2)}x/${this.config.maxLeverage}x`
    };
  }

  // Calculate position size based on risk
  calculatePositionSize(signal) {
    const riskAmount = this.config.accountBalance * this.config.maxRiskPerTrade;
    const stopLossDistance = Math.abs(signal.entryPrice - signal.stopLoss);
    
    if (stopLossDistance === 0) return 0;
    
    const positionSize = riskAmount / stopLossDistance;
    
    // Apply additional constraints
    const maxPositionByBalance = this.config.accountBalance * 0.1; // Max 10% of balance per position
    const maxPositionByLeverage = (this.config.accountBalance * this.config.maxLeverage) / signal.entryPrice;
    
    return Math.min(positionSize, maxPositionByBalance, maxPositionByLeverage);
  }

  // Calculate risk amount for a position
  calculateRiskAmount(signal, positionSize) {
    const stopLossDistance = Math.abs(signal.entryPrice - signal.stopLoss);
    return positionSize * stopLossDistance;
  }

  // Calculate lot size based on risk percentage
  calculateLotSize(entryPrice, stopLoss, riskPercentage = null) {
    const risk = riskPercentage || this.config.maxRiskPerTrade;
    const riskAmount = this.config.accountBalance * risk;
    const stopLossDistance = Math.abs(entryPrice - stopLoss);
    
    if (stopLossDistance === 0) return 0;
    
    return riskAmount / stopLossDistance;
  }

  // Update daily risk tracking
  updateDailyRisk(riskAmount) {
    const today = new Date().toDateString();
    const lastEntry = this.dailyLosses[this.dailyLosses.length - 1];
    
    if (!lastEntry || lastEntry.date !== today) {
      this.dailyLosses.push({
        date: today,
        totalRisk: riskAmount
      });
      this.dailyRiskUsed = riskAmount / this.config.accountBalance;
    } else {
      lastEntry.totalRisk += riskAmount;
      this.dailyRiskUsed = lastEntry.totalRisk / this.config.accountBalance;
    }

    // Clean old entries (keep last 30 days)
    if (this.dailyLosses.length > 30) {
      this.dailyLosses = this.dailyLosses.slice(-30);
    }
  }

  // Update drawdown tracking
  updateDrawdown(currentBalance) {
    const highWaterMark = Math.max(this.config.accountBalance, currentBalance);
    this.currentDrawdown = (highWaterMark - currentBalance) / highWaterMark;
    
    if (this.currentDrawdown > this.maxDrawdownReached) {
      this.maxDrawdownReached = this.currentDrawdown;
    }
  }

  // Calculate correlation between two symbols
  calculateCorrelation(symbol1, symbol2) {
    // This is a simplified correlation calculation
    // In a real implementation, you would use historical price data
    const correlationMap = {
      'EURUSD_GBPUSD': 0.8,
      'EURUSD_EURGBP': 0.6,
      'GBPUSD_EURGBP': -0.7,
      'USDJPY_EURJPY': 0.75,
      'AUDUSD_NZDUSD': 0.85
    };

    const pair1 = `${symbol1}_${symbol2}`;
    const pair2 = `${symbol2}_${symbol1}`;
    
    return correlationMap[pair1] || correlationMap[pair2] || 0;
  }

  // Dynamic stop loss calculation
  calculateDynamicStopLoss(signal, atr, volatilityMultiplier = null) {
    const multiplier = volatilityMultiplier || this.config.volatilityMultiplier;
    const atrStopDistance = atr * multiplier;
    
    if (signal.direction === 'BUY') {
      return signal.entryPrice - atrStopDistance;
    } else {
      return signal.entryPrice + atrStopDistance;
    }
  }

  // Dynamic take profit calculation
  calculateDynamicTakeProfit(signal, atr, riskRewardRatio = null) {
    const ratio = riskRewardRatio || this.config.minRiskRewardRatio;
    const stopLossDistance = Math.abs(signal.entryPrice - signal.stopLoss);
    const takeProfitDistance = stopLossDistance * ratio;
    
    if (signal.direction === 'BUY') {
      return signal.entryPrice + takeProfitDistance;
    } else {
      return signal.entryPrice - takeProfitDistance;
    }
  }

  // Trailing stop calculation
  calculateTrailingStop(position, currentPrice, atr) {
    const trailingDistance = atr * this.config.volatilityMultiplier;
    
    if (position.direction === 'BUY') {
      const newStopLoss = currentPrice - trailingDistance;
      return Math.max(position.stopLoss, newStopLoss);
    } else {
      const newStopLoss = currentPrice + trailingDistance;
      return Math.min(position.stopLoss, newStopLoss);
    }
  }

  // Position sizing based on Kelly Criterion
  calculateKellyPositionSize(winRate, averageWin, averageLoss) {
    if (averageLoss === 0) return 0;
    
    const kellyPercentage = (winRate * averageWin - (1 - winRate) * averageLoss) / averageWin;
    const conservativeKelly = Math.max(0, Math.min(kellyPercentage * 0.25, this.config.maxRiskPerTrade));
    
    return this.config.accountBalance * conservativeKelly;
  }

  // Portfolio heat calculation
  calculatePortfolioHeat(positions) {
    let totalRisk = 0;
    
    for (const position of positions.values()) {
      const positionRisk = this.calculateRiskAmount(position, position.lotSize);
      totalRisk += positionRisk;
    }
    
    return totalRisk / this.config.accountBalance;
  }

  // Emergency stop conditions
  checkEmergencyStop(currentBalance, positions) {
    const conditions = {
      maxDrawdownExceeded: this.currentDrawdown >= this.config.maxDrawdown,
      dailyLossLimitExceeded: this.dailyRiskUsed >= this.config.maxDailyRisk,
      portfolioHeatTooHigh: this.calculatePortfolioHeat(positions) >= 0.2, // 20%
      consecutiveLosses: this.getConsecutiveLosses() >= 5
    };

    const triggeredConditions = Object.keys(conditions).filter(key => conditions[key]);
    
    return {
      shouldStop: triggeredConditions.length > 0,
      reasons: triggeredConditions,
      conditions
    };
  }

  // Get consecutive losses count
  getConsecutiveLosses() {
    // This would be implemented with actual trade history
    return 0;
  }

  // Risk metrics calculation
  getRiskMetrics(positions, trades = []) {
    const portfolioHeat = this.calculatePortfolioHeat(positions);
    const avgWin = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0) / Math.max(1, trades.filter(t => t.profit > 0).length);
    const avgLoss = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)) / Math.max(1, trades.filter(t => t.profit < 0).length);
    const winRate = trades.filter(t => t.profit > 0).length / Math.max(1, trades.length);

    return {
      portfolioHeat: portfolioHeat,
      currentDrawdown: this.currentDrawdown,
      maxDrawdownReached: this.maxDrawdownReached,
      dailyRiskUsed: this.dailyRiskUsed,
      activePositions: positions.size,
      avgWin: avgWin || 0,
      avgLoss: avgLoss || 0,
      winRate: winRate || 0,
      kellyOptimalSize: this.calculateKellyPositionSize(winRate, avgWin, avgLoss),
      riskAdjustedReturn: trades.length > 0 ? 
        trades.reduce((sum, t) => sum + t.profit, 0) / Math.max(0.01, this.maxDrawdownReached) : 0
    };
  }

  // Reset daily risk tracking
  resetDailyRisk() {
    this.dailyRiskUsed = 0;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current risk settings
  getRiskSettings() {
    return { ...this.config };
  }
}