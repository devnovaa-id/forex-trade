/**
 * Engine Backtesting untuk Platform Trading OANDA MT5
 * Mendukung berbagai strategi trading dan analisis performa
 */

class BacktestingEngine {
  constructor(options = {}) {
    this.initialBalance = options.initialBalance || 10000;
    this.leverage = options.leverage || 50;
    this.commission = options.commission || 0.0001; // 1 pip
    this.slippage = options.slippage || 0.0001; // 1 pip
    
    // State backtesting
    this.balance = this.initialBalance;
    this.equity = this.initialBalance;
    this.positions = [];
    this.trades = [];
    this.drawdownHistory = [];
    this.equityHistory = [];
    
    // Metrics
    this.maxDrawdown = 0;
    this.maxDrawdownPercent = 0;
    this.totalTrades = 0;
    this.winningTrades = 0;
    this.losingTrades = 0;
    this.totalProfit = 0;
    this.totalLoss = 0;
    this.largestWin = 0;
    this.largestLoss = 0;
    
    // Callback untuk progress
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
  }

  /**
   * Jalankan backtesting dengan data historis
   */
  async runBacktest(historicalData, strategy, options = {}) {
    try {
      this.reset();
      
      const startTime = new Date();
      const totalBars = historicalData.length;
      
      console.log(`Memulai backtesting dengan ${totalBars} bar data...`);
      
      for (let i = 0; i < totalBars; i++) {
        const currentBar = historicalData[i];
        const previousBars = historicalData.slice(0, i + 1);
        
        // Update posisi yang ada
        this.updatePositions(currentBar);
        
        // Jalankan strategi
        const signals = await strategy.analyze(previousBars, currentBar);
        
        // Proses sinyal trading
        if (signals && signals.length > 0) {
          for (const signal of signals) {
            this.processSignal(signal, currentBar);
          }
        }
        
        // Update equity history
        this.updateEquityHistory(currentBar);
        
        // Update progress
        if (i % 100 === 0) {
          const progress = (i / totalBars) * 100;
          this.onProgress({
            progress,
            currentBar: i,
            totalBars,
            currentEquity: this.equity,
            currentDrawdown: this.getCurrentDrawdown()
          });
        }
      }
      
      const endTime = new Date();
      const duration = endTime - startTime;
      
      const results = this.calculateResults();
      results.duration = duration;
      results.startTime = startTime;
      results.endTime = endTime;
      
      console.log(`Backtesting selesai dalam ${duration}ms`);
      
      if (this.onComplete) {
        this.onComplete(results);
      }
      
      return results;
      
    } catch (error) {
      console.error('Error dalam backtesting:', error);
      throw error;
    }
  }

  /**
   * Reset state backtesting
   */
  reset() {
    this.balance = this.initialBalance;
    this.equity = this.initialBalance;
    this.positions = [];
    this.trades = [];
    this.drawdownHistory = [];
    this.equityHistory = [];
    
    this.maxDrawdown = 0;
    this.maxDrawdownPercent = 0;
    this.totalTrades = 0;
    this.winningTrades = 0;
    this.losingTrades = 0;
    this.totalProfit = 0;
    this.totalLoss = 0;
    this.largestWin = 0;
    this.largestLoss = 0;
  }

  /**
   * Proses sinyal trading
   */
  processSignal(signal, currentBar) {
    const { action, instrument, lotSize, stopLoss, takeProfit, price } = signal;
    
    if (action === 'BUY' || action === 'SELL') {
      this.openPosition({
        instrument,
        action,
        lotSize: lotSize || 0.01,
        openPrice: price || (action === 'BUY' ? currentBar.high : currentBar.low),
        stopLoss,
        takeProfit,
        openTime: currentBar.time,
        bar: currentBar
      });
    } else if (action === 'CLOSE') {
      this.closePosition(signal.positionId || 'all', currentBar);
    }
  }

  /**
   * Buka posisi baru
   */
  openPosition(positionData) {
    const {
      instrument,
      action,
      lotSize,
      openPrice,
      stopLoss,
      takeProfit,
      openTime,
      bar
    } = positionData;

    // Hitung margin yang diperlukan
    const positionValue = lotSize * 100000 * openPrice;
    const marginRequired = positionValue / this.leverage;
    
    // Cek apakah margin mencukupi
    if (marginRequired > this.balance) {
      console.log('Margin tidak mencukupi untuk membuka posisi');
      return false;
    }

    // Simulasi slippage
    const actualOpenPrice = this.applySlippage(openPrice, action);
    
    // Hitung commission
    const commission = positionValue * this.commission;

    const position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      instrument,
      action,
      lotSize,
      openPrice: actualOpenPrice,
      stopLoss,
      takeProfit,
      openTime,
      marginUsed: marginRequired,
      commission,
      unrealizedPnL: 0,
      status: 'open'
    };

    this.positions.push(position);
    this.balance -= commission; // Kurangi commission dari balance
    
    console.log(`Posisi dibuka: ${action} ${lotSize} ${instrument} @ ${actualOpenPrice}`);
    
    return position;
  }

  /**
   * Tutup posisi
   */
  closePosition(positionId, currentBar) {
    let positionsToClose = [];
    
    if (positionId === 'all') {
      positionsToClose = [...this.positions];
    } else {
      const position = this.positions.find(p => p.id === positionId);
      if (position) {
        positionsToClose = [position];
      }
    }

    for (const position of positionsToClose) {
      const closePrice = this.getClosePrice(position, currentBar);
      const actualClosePrice = this.applySlippage(closePrice, position.action === 'BUY' ? 'SELL' : 'BUY');
      
      // Hitung profit/loss
      const pnl = this.calculatePnL(position, actualClosePrice);
      
      // Hitung commission untuk closing
      const positionValue = position.lotSize * 100000 * actualClosePrice;
      const closeCommission = positionValue * this.commission;
      
      const totalPnL = pnl - position.commission - closeCommission;
      
      // Update balance
      this.balance += position.marginUsed + totalPnL;
      
      // Buat record trade
      const trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        instrument: position.instrument,
        action: position.action,
        lotSize: position.lotSize,
        openPrice: position.openPrice,
        closePrice: actualClosePrice,
        openTime: position.openTime,
        closeTime: currentBar.time,
        pnl: totalPnL,
        commission: position.commission + closeCommission,
        duration: currentBar.time - position.openTime,
        pips: this.calculatePips(position.openPrice, actualClosePrice, position.action),
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit
      };
      
      this.trades.push(trade);
      
      // Update statistics
      this.updateTradeStatistics(trade);
      
      // Remove position dari array
      this.positions = this.positions.filter(p => p.id !== position.id);
      
      console.log(`Posisi ditutup: ${position.action} ${position.lotSize} ${position.instrument} | P&L: ${totalPnL.toFixed(2)}`);
    }
  }

  /**
   * Update posisi yang ada (cek stop loss, take profit)
   */
  updatePositions(currentBar) {
    const positionsToClose = [];
    
    for (const position of this.positions) {
      // Update unrealized P&L
      const currentPrice = this.getCurrentPrice(position, currentBar);
      position.unrealizedPnL = this.calculatePnL(position, currentPrice);
      
      // Cek Stop Loss
      if (position.stopLoss) {
        const shouldCloseOnSL = this.shouldCloseOnStopLoss(position, currentBar);
        if (shouldCloseOnSL) {
          positionsToClose.push(position.id);
          continue;
        }
      }
      
      // Cek Take Profit
      if (position.takeProfit) {
        const shouldCloseOnTP = this.shouldCloseOnTakeProfit(position, currentBar);
        if (shouldCloseOnTP) {
          positionsToClose.push(position.id);
          continue;
        }
      }
    }
    
    // Tutup posisi yang memenuhi kondisi
    for (const positionId of positionsToClose) {
      this.closePosition(positionId, currentBar);
    }
    
    // Update equity
    this.updateEquity();
  }

  /**
   * Cek apakah posisi harus ditutup karena stop loss
   */
  shouldCloseOnStopLoss(position, currentBar) {
    if (!position.stopLoss) return false;
    
    if (position.action === 'BUY') {
      return currentBar.low <= position.stopLoss;
    } else {
      return currentBar.high >= position.stopLoss;
    }
  }

  /**
   * Cek apakah posisi harus ditutup karena take profit
   */
  shouldCloseOnTakeProfit(position, currentBar) {
    if (!position.takeProfit) return false;
    
    if (position.action === 'BUY') {
      return currentBar.high >= position.takeProfit;
    } else {
      return currentBar.low <= position.takeProfit;
    }
  }

  /**
   * Dapatkan harga penutupan untuk posisi
   */
  getClosePrice(position, currentBar) {
    // Jika ada stop loss atau take profit yang triggered
    if (position.stopLoss && this.shouldCloseOnStopLoss(position, currentBar)) {
      return position.stopLoss;
    }
    
    if (position.takeProfit && this.shouldCloseOnTakeProfit(position, currentBar)) {
      return position.takeProfit;
    }
    
    // Default ke harga close
    return currentBar.close;
  }

  /**
   * Dapatkan harga saat ini untuk posisi
   */
  getCurrentPrice(position, currentBar) {
    return position.action === 'BUY' ? currentBar.close : currentBar.close;
  }

  /**
   * Hitung profit/loss untuk posisi
   */
  calculatePnL(position, closePrice) {
    const { action, lotSize, openPrice } = position;
    const units = lotSize * 100000;
    
    if (action === 'BUY') {
      return (closePrice - openPrice) * units;
    } else {
      return (openPrice - closePrice) * units;
    }
  }

  /**
   * Hitung pips
   */
  calculatePips(openPrice, closePrice, action) {
    const priceDiff = action === 'BUY' ? (closePrice - openPrice) : (openPrice - closePrice);
    return priceDiff * 10000; // Untuk pair dengan 4 decimal places
  }

  /**
   * Terapkan slippage
   */
  applySlippage(price, action) {
    const slippageDirection = action === 'BUY' ? 1 : -1;
    return price + (this.slippage * slippageDirection);
  }

  /**
   * Update equity
   */
  updateEquity() {
    let totalUnrealizedPnL = 0;
    
    for (const position of this.positions) {
      totalUnrealizedPnL += position.unrealizedPnL;
    }
    
    this.equity = this.balance + totalUnrealizedPnL;
  }

  /**
   * Update equity history
   */
  updateEquityHistory(currentBar) {
    this.equityHistory.push({
      time: currentBar.time,
      equity: this.equity,
      balance: this.balance,
      drawdown: this.getCurrentDrawdown(),
      drawdownPercent: this.getCurrentDrawdownPercent()
    });
    
    // Update max drawdown
    const currentDrawdown = this.getCurrentDrawdown();
    const currentDrawdownPercent = this.getCurrentDrawdownPercent();
    
    if (currentDrawdown > this.maxDrawdown) {
      this.maxDrawdown = currentDrawdown;
    }
    
    if (currentDrawdownPercent > this.maxDrawdownPercent) {
      this.maxDrawdownPercent = currentDrawdownPercent;
    }
  }

  /**
   * Dapatkan drawdown saat ini
   */
  getCurrentDrawdown() {
    if (this.equityHistory.length === 0) return 0;
    
    const peakEquity = Math.max(...this.equityHistory.map(h => h.equity));
    return Math.max(0, peakEquity - this.equity);
  }

  /**
   * Dapatkan drawdown percent saat ini
   */
  getCurrentDrawdownPercent() {
    if (this.equityHistory.length === 0) return 0;
    
    const peakEquity = Math.max(...this.equityHistory.map(h => h.equity));
    if (peakEquity === 0) return 0;
    
    return Math.max(0, ((peakEquity - this.equity) / peakEquity) * 100);
  }

  /**
   * Update statistik trading
   */
  updateTradeStatistics(trade) {
    this.totalTrades++;
    
    if (trade.pnl > 0) {
      this.winningTrades++;
      this.totalProfit += trade.pnl;
      
      if (trade.pnl > this.largestWin) {
        this.largestWin = trade.pnl;
      }
    } else {
      this.losingTrades++;
      this.totalLoss += Math.abs(trade.pnl);
      
      if (Math.abs(trade.pnl) > this.largestLoss) {
        this.largestLoss = Math.abs(trade.pnl);
      }
    }
  }

  /**
   * Hitung hasil backtesting
   */
  calculateResults() {
    const finalBalance = this.balance;
    const totalReturn = finalBalance - this.initialBalance;
    const totalReturnPercent = (totalReturn / this.initialBalance) * 100;
    
    const winRate = this.totalTrades > 0 ? (this.winningTrades / this.totalTrades) * 100 : 0;
    const averageWin = this.winningTrades > 0 ? this.totalProfit / this.winningTrades : 0;
    const averageLoss = this.losingTrades > 0 ? this.totalLoss / this.losingTrades : 0;
    const profitFactor = this.totalLoss > 0 ? this.totalProfit / this.totalLoss : 0;
    
    // Hitung Sharpe Ratio (simplified)
    const returns = this.equityHistory.map((h, i) => {
      if (i === 0) return 0;
      return (h.equity - this.equityHistory[i - 1].equity) / this.equityHistory[i - 1].equity;
    }).slice(1);
    
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const returnVariance = returns.length > 0 ? 
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
    const returnStdDev = Math.sqrt(returnVariance);
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    // Hitung recovery factor
    const recoveryFactor = this.maxDrawdown > 0 ? totalReturn / this.maxDrawdown : 0;
    
    // Hitung Calmar Ratio
    const calmarRatio = this.maxDrawdownPercent > 0 ? (totalReturnPercent / this.maxDrawdownPercent) : 0;

    return {
      // Balance & Equity
      initialBalance: this.initialBalance,
      finalBalance,
      finalEquity: this.equity,
      totalReturn,
      totalReturnPercent,
      
      // Trading Statistics
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate,
      
      // Profit & Loss
      totalProfit: this.totalProfit,
      totalLoss: this.totalLoss,
      netProfit: this.totalProfit - this.totalLoss,
      averageWin,
      averageLoss,
      largestWin: this.largestWin,
      largestLoss: this.largestLoss,
      profitFactor,
      
      // Risk Metrics
      maxDrawdown: this.maxDrawdown,
      maxDrawdownPercent: this.maxDrawdownPercent,
      sharpeRatio,
      recoveryFactor,
      calmarRatio,
      
      // Data
      trades: this.trades,
      equityHistory: this.equityHistory,
      
      // Summary
      summary: {
        profitable: totalReturn > 0,
        riskAdjustedReturn: sharpeRatio,
        consistency: winRate,
        riskManagement: this.maxDrawdownPercent < 20 ? 'Baik' : 'Perlu Perbaikan'
      }
    };
  }
}

export default BacktestingEngine;