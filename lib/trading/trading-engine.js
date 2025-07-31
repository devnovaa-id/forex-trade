import { marketDataService } from './market-data';
import { brokerIntegration } from './broker-integration';
import { ScalpingStrategy, DCAStrategy, GridStrategy } from './strategies';
import { RiskManager } from './risk-management';

class TradingEngine {
  constructor() {
    this.activeBots = new Map();
    this.marketDataStreams = new Map();
    this.brokerConnections = new Map();
    this.riskManager = new RiskManager();
    this.isRunning = false;
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      sharpeRatio: 0
    };
  }

  async initializeBot(botConfig) {
    try {
      const {
        id,
        userId,
        name,
        strategy,
        symbol,
        brokerId,
        brokerCredentials,
        config,
        riskConfig
      } = botConfig;

      // Connect to broker
      const brokerConnection = await brokerIntegration.connectToBroker(
        brokerId,
        brokerCredentials,
        config.isDemo || true
      );

      // Initialize strategy
      const strategyInstance = this.createStrategy(strategy, config);
      
      // Connect to market data stream
      const marketDataStream = await marketDataService.connectToStream(
        symbol,
        (data) => this.handleMarketDataUpdate(id, data)
      );

      // Create bot instance
      const bot = {
        id,
        userId,
        name,
        strategy: strategyInstance,
        symbol,
        brokerConnection,
        marketDataStream,
        config,
        riskConfig,
        status: 'initialized',
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          totalProfit: 0,
          totalLoss: 0,
          winRate: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          currentDrawdown: 0,
          sharpeRatio: 0
        },
        positions: new Map(),
        orders: new Map(),
        signals: [],
        lastUpdate: new Date().toISOString()
      };

      this.activeBots.set(id, bot);
      this.brokerConnections.set(id, brokerConnection);
      this.marketDataStreams.set(id, marketDataStream);

      console.log(`Bot ${name} initialized successfully`);
      return bot;

    } catch (error) {
      console.error(`Failed to initialize bot ${botConfig.name}:`, error);
      throw error;
    }
  }

  createStrategy(strategyType, config) {
    switch (strategyType) {
      case 'scalping':
        return new ScalpingStrategy(config);
      case 'dca':
        return new DCAStrategy(config);
      case 'grid':
        return new GridStrategy(config);
      default:
        throw new Error(`Unknown strategy type: ${strategyType}`);
    }
  }

  async startBot(botId) {
    const bot = this.activeBots.get(botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    try {
      // Start the strategy
      bot.strategy.start();
      bot.status = 'running';
      bot.lastUpdate = new Date().toISOString();

      console.log(`Bot ${bot.name} started`);
      return bot;

    } catch (error) {
      console.error(`Failed to start bot ${bot.name}:`, error);
      bot.status = 'error';
      throw error;
    }
  }

  async stopBot(botId) {
    const bot = this.activeBots.get(botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    try {
      // Stop the strategy
      bot.strategy.stop();
      bot.status = 'stopped';
      bot.lastUpdate = new Date().toISOString();

      console.log(`Bot ${bot.name} stopped`);
      return bot;

    } catch (error) {
      console.error(`Failed to stop bot ${bot.name}:`, error);
      throw error;
    }
  }

  async handleMarketDataUpdate(botId, marketData) {
    const bot = this.activeBots.get(botId);
    if (!bot || bot.status !== 'running') {
      return;
    }

    try {
      // Update bot's last market data
      bot.lastMarketData = marketData;
      bot.lastUpdate = new Date().toISOString();

      // Analyze market data with strategy
      const signal = await bot.strategy.analyze(marketData);
      
      if (signal) {
        // Apply risk management
        const validatedSignal = this.riskManager.validateSignal(signal, bot.positions, bot.riskConfig);
        
        if (validatedSignal) {
          await this.executeSignal(bot, validatedSignal);
        }
      }

      // Update performance metrics
      this.updateBotPerformance(bot);

    } catch (error) {
      console.error(`Error handling market data for bot ${bot.name}:`, error);
      bot.status = 'error';
    }
  }

  async executeSignal(bot, signal) {
    try {
      const { direction, price, lotSize, stopLoss, takeProfit, confidence } = signal;
      
      // Calculate position size based on risk management
      const positionSize = this.riskManager.calculatePositionSize(
        bot.brokerConnection.accountInfo.balance,
        lotSize,
        bot.riskConfig
      );

      // Prepare order parameters
      const orderParams = {
        symbol: bot.symbol,
        side: direction,
        units: positionSize,
        type: 'MARKET',
        price: price,
        stopLoss: stopLoss,
        takeProfit: takeProfit
      };

      // Place order with broker
      const orderResult = await brokerIntegration.placeOrder(
        bot.brokerConnection,
        orderParams
      );

      // Record the trade
      const trade = {
        id: orderResult.orderID || `trade_${Date.now()}`,
        botId: bot.id,
        symbol: bot.symbol,
        direction: direction,
        lotSize: positionSize,
        entryPrice: price,
        stopLoss: stopLoss,
        takeProfit: takeProfit,
        status: 'open',
        openTime: new Date().toISOString(),
        confidence: confidence,
        signal: signal
      };

      bot.positions.set(trade.id, trade);
      bot.performance.totalTrades++;

      // Store trade in database
      await this.storeTrade(trade);

      console.log(`Executed ${direction} order for ${bot.name}: ${positionSize} lots at ${price}`);

      return trade;

    } catch (error) {
      console.error(`Failed to execute signal for bot ${bot.name}:`, error);
      throw error;
    }
  }

  async closePosition(bot, positionId, exitPrice, reason = 'manual') {
    try {
      const position = bot.positions.get(positionId);
      if (!position) {
        throw new Error(`Position ${positionId} not found`);
      }

      // Calculate profit/loss
      const profit = this.calculateProfit(position, exitPrice);
      
      // Update position
      position.exitPrice = exitPrice;
      position.closeTime = new Date().toISOString();
      position.status = 'closed';
      position.profit = profit;
      position.reason = reason;

      // Update performance
      if (profit > 0) {
        bot.performance.winningTrades++;
        bot.performance.totalProfit += profit;
      } else {
        bot.performance.losingTrades++;
        bot.performance.totalLoss += Math.abs(profit);
      }

      bot.performance.winRate = (bot.performance.winningTrades / bot.performance.totalTrades) * 100;
      bot.performance.profitFactor = bot.performance.totalProfit / (bot.performance.totalLoss || 1);

      // Remove from active positions
      bot.positions.delete(positionId);

      // Update trade in database
      await this.updateTrade(position);

      console.log(`Closed position for ${bot.name}: ${profit > 0 ? '+' : ''}${profit.toFixed(2)}`);

      return position;

    } catch (error) {
      console.error(`Failed to close position for bot ${bot.name}:`, error);
      throw error;
    }
  }

  calculateProfit(position, exitPrice) {
    const { direction, lotSize, entryPrice } = position;
    
    if (direction === 'BUY') {
      return (exitPrice - entryPrice) * lotSize;
    } else {
      return (entryPrice - exitPrice) * lotSize;
    }
  }

  updateBotPerformance(bot) {
    const { performance } = bot;
    
    // Calculate current drawdown
    const totalPnL = performance.totalProfit - performance.totalLoss;
    if (totalPnL < performance.maxDrawdown) {
      performance.maxDrawdown = totalPnL;
    }
    performance.currentDrawdown = totalPnL;

    // Calculate Sharpe ratio (simplified)
    if (performance.totalTrades > 0) {
      const avgReturn = totalPnL / performance.totalTrades;
      const returns = bot.strategy.getTrades().map(trade => trade.profit || 0);
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
      performance.sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;
    }
  }

  async storeTrade(trade) {
    try {
      // Store in database
      const { supabaseAdmin } = await import('@/lib/supabase/client');
      
      const { error } = await supabaseAdmin
        .from('trades')
        .insert({
          id: trade.id,
          bot_id: trade.botId,
          user_id: trade.userId,
          symbol: trade.symbol,
          direction: trade.direction,
          lot_size: trade.lotSize,
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          stop_loss: trade.stopLoss,
          take_profit: trade.takeProfit,
          status: trade.status,
          profit: trade.profit,
          open_time: trade.openTime,
          close_time: trade.closeTime,
          confidence: trade.confidence
        });

      if (error) {
        console.error('Failed to store trade:', error);
      }

    } catch (error) {
      console.error('Failed to store trade:', error);
    }
  }

  async updateTrade(trade) {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase/client');
      
      const { error } = await supabaseAdmin
        .from('trades')
        .update({
          exit_price: trade.exitPrice,
          status: trade.status,
          profit: trade.profit,
          close_time: trade.closeTime,
          reason: trade.reason
        })
        .eq('id', trade.id);

      if (error) {
        console.error('Failed to update trade:', error);
      }

    } catch (error) {
      console.error('Failed to update trade:', error);
    }
  }

  async getBotStatus(botId) {
    const bot = this.activeBots.get(botId);
    if (!bot) {
      return null;
    }

    return {
      id: bot.id,
      name: bot.name,
      status: bot.status,
      symbol: bot.symbol,
      performance: bot.performance,
      positions: Array.from(bot.positions.values()),
      lastUpdate: bot.lastUpdate,
      lastMarketData: bot.lastMarketData
    };
  }

  async getAllBotsStatus() {
    const bots = [];
    for (const [botId, bot] of this.activeBots) {
      bots.push(await this.getBotStatus(botId));
    }
    return bots;
  }

  async cleanupBot(botId) {
    const bot = this.activeBots.get(botId);
    if (!bot) {
      return;
    }

    try {
      // Stop the bot
      await this.stopBot(botId);

      // Disconnect market data stream
      const stream = this.marketDataStreams.get(botId);
      if (stream) {
        marketDataService.disconnect(bot.symbol);
        this.marketDataStreams.delete(botId);
      }

      // Disconnect broker connection
      const brokerConnection = this.brokerConnections.get(botId);
      if (brokerConnection) {
        brokerIntegration.disconnect(brokerConnection.brokerId);
        this.brokerConnections.delete(botId);
      }

      // Remove from active bots
      this.activeBots.delete(botId);

      console.log(`Bot ${bot.name} cleaned up successfully`);

    } catch (error) {
      console.error(`Failed to cleanup bot ${bot.name}:`, error);
    }
  }

  async shutdown() {
    console.log('Shutting down trading engine...');
    
    // Stop all bots
    for (const [botId, bot] of this.activeBots) {
      await this.cleanupBot(botId);
    }

    // Disconnect all streams
    marketDataService.disconnectAll();
    
    // Disconnect all broker connections
    brokerIntegration.disconnectAll();

    this.isRunning = false;
    console.log('Trading engine shutdown complete');
  }

  getPerformance() {
    return this.performance;
  }

  isRunning() {
    return this.isRunning;
  }
}

export const tradingEngine = new TradingEngine();