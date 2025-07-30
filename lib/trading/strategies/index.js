import { ScalpingStrategy } from './scalping';
import { DCAStrategy } from './dca';
import { GridStrategy } from './grid';
import { TrendFollowingStrategy } from './trend-following';
import { MartingaleStrategy } from './martingale';
import { BreakoutStrategy } from './breakout';
import { MeanReversionStrategy } from './mean-reversion';
import { ArbitrageStrategy } from './arbitrage';

export const STRATEGY_TYPES = {
  SCALPING: 'scalping',
  DCA: 'dca',
  GRID: 'grid',
  TREND_FOLLOWING: 'trend_following',
  MARTINGALE: 'martingale',
  BREAKOUT: 'breakout',
  MEAN_REVERSION: 'mean_reversion',
  ARBITRAGE: 'arbitrage'
};

export const strategies = {
  [STRATEGY_TYPES.SCALPING]: ScalpingStrategy,
  [STRATEGY_TYPES.DCA]: DCAStrategy,
  [STRATEGY_TYPES.GRID]: GridStrategy,
  [STRATEGY_TYPES.TREND_FOLLOWING]: TrendFollowingStrategy,
  [STRATEGY_TYPES.MARTINGALE]: MartingaleStrategy,
  [STRATEGY_TYPES.BREAKOUT]: BreakoutStrategy,
  [STRATEGY_TYPES.MEAN_REVERSION]: MeanReversionStrategy,
  [STRATEGY_TYPES.ARBITRAGE]: ArbitrageStrategy
};

export class StrategyManager {
  constructor(config = {}) {
    this.config = config;
    this.activeStrategies = new Map();
  }

  createStrategy(type, config) {
    const StrategyClass = strategies[type];
    if (!StrategyClass) {
      throw new Error(`Unknown strategy type: ${type}`);
    }
    
    return new StrategyClass(config);
  }

  addStrategy(id, type, config) {
    const strategy = this.createStrategy(type, config);
    this.activeStrategies.set(id, strategy);
    return strategy;
  }

  removeStrategy(id) {
    const strategy = this.activeStrategies.get(id);
    if (strategy && strategy.stop) {
      strategy.stop();
    }
    return this.activeStrategies.delete(id);
  }

  getStrategy(id) {
    return this.activeStrategies.get(id);
  }

  getAllStrategies() {
    return Array.from(this.activeStrategies.values());
  }

  async executeAll(marketData) {
    const results = [];
    
    for (const [id, strategy] of this.activeStrategies) {
      try {
        if (strategy.isActive()) {
          const signal = await strategy.analyze(marketData);
          if (signal) {
            results.push({
              strategyId: id,
              signal,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error(`Strategy ${id} execution error:`, error);
        results.push({
          strategyId: id,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  getPerformanceMetrics() {
    const metrics = {};
    
    for (const [id, strategy] of this.activeStrategies) {
      metrics[id] = strategy.getMetrics ? strategy.getMetrics() : {};
    }
    
    return metrics;
  }
}

export default StrategyManager;