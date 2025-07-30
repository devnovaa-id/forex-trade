// Email validation
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password validation
export function validatePassword(password) {
  return password && password.length >= 6;
}

// Name validation
export function validateName(name) {
  return name && name.trim().length >= 2 && name.trim().length <= 50;
}

// Trading configuration validation
export function validateTradingConfig(config) {
  const errors = {};

  if (config.maxDrawdown !== undefined) {
    if (typeof config.maxDrawdown !== 'number' || config.maxDrawdown < 0 || config.maxDrawdown > 1) {
      errors.maxDrawdown = 'Max drawdown must be a number between 0 and 1';
    }
  }

  if (config.maxDailyLoss !== undefined) {
    if (typeof config.maxDailyLoss !== 'number' || config.maxDailyLoss < 0 || config.maxDailyLoss > 1) {
      errors.maxDailyLoss = 'Max daily loss must be a number between 0 and 1';
    }
  }

  if (config.maxPositionSize !== undefined) {
    if (typeof config.maxPositionSize !== 'number' || config.maxPositionSize < 0 || config.maxPositionSize > 1) {
      errors.maxPositionSize = 'Max position size must be a number between 0 and 1';
    }
  }

  if (config.defaultLotSize !== undefined) {
    if (typeof config.defaultLotSize !== 'number' || config.defaultLotSize <= 0) {
      errors.defaultLotSize = 'Default lot size must be a positive number';
    }
  }

  if (config.riskLevel !== undefined) {
    const validRiskLevels = ['conservative', 'moderate', 'aggressive'];
    if (!validRiskLevels.includes(config.riskLevel)) {
      errors.riskLevel = 'Risk level must be one of: conservative, moderate, aggressive';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Bot configuration validation
export function validateBotConfig(config) {
  const errors = {};

  // Basic required fields
  if (!config.name || config.name.trim().length < 3) {
    errors.name = 'Bot name must be at least 3 characters long';
  }

  if (config.name && config.name.length > 50) {
    errors.name = 'Bot name must be less than 50 characters';
  }

  if (!config.strategy_type) {
    errors.strategy_type = 'Trading strategy is required';
  }

  const validStrategies = ['scalping', 'dca', 'grid', 'trend_following', 'martingale', 'breakout', 'mean_reversion', 'arbitrage'];
  if (config.strategy_type && !validStrategies.includes(config.strategy_type)) {
    errors.strategy_type = `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`;
  }

  if (!config.symbol) {
    errors.symbol = 'Trading symbol is required';
  }

  const validSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'];
  if (config.symbol && !validSymbols.includes(config.symbol.toUpperCase())) {
    errors.symbol = `Invalid symbol. Must be one of: ${validSymbols.join(', ')}`;
  }

  if (!config.timeframe) {
    errors.timeframe = 'Timeframe is required';
  }

  const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
  if (config.timeframe && !validTimeframes.includes(config.timeframe)) {
    errors.timeframe = `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`;
  }

  // Strategy-specific validation
  if (config.strategy_type === 'scalping' && config.config) {
    const scalpingConfig = config.config;
    if (scalpingConfig.maxPositions && (scalpingConfig.maxPositions < 1 || scalpingConfig.maxPositions > 10)) {
      errors.maxPositions = 'Scalping max positions must be between 1 and 10';
    }
    if (scalpingConfig.riskPerTrade && (scalpingConfig.riskPerTrade < 0.005 || scalpingConfig.riskPerTrade > 0.05)) {
      errors.riskPerTrade = 'Scalping risk per trade must be between 0.5% and 5%';
    }
    if (!['1m', '5m'].includes(config.timeframe)) {
      errors.timeframe = 'Scalping strategy requires 1m or 5m timeframe';
    }
  }

  if (config.strategy_type === 'dca' && config.config) {
    const dcaConfig = config.config;
    if (dcaConfig.maxSafetyOrders && (dcaConfig.maxSafetyOrders < 1 || dcaConfig.maxSafetyOrders > 20)) {
      errors.maxSafetyOrders = 'DCA max safety orders must be between 1 and 20';
    }
    if (dcaConfig.priceDeviation && (dcaConfig.priceDeviation < 0.5 || dcaConfig.priceDeviation > 10)) {
      errors.priceDeviation = 'DCA price deviation must be between 0.5% and 10%';
    }
    if (dcaConfig.takeProfitPercentage && (dcaConfig.takeProfitPercentage < 0.5 || dcaConfig.takeProfitPercentage > 20)) {
      errors.takeProfitPercentage = 'DCA take profit percentage must be between 0.5% and 20%';
    }
  }

  if (config.strategy_type === 'grid' && config.config) {
    const gridConfig = config.config;
    if (gridConfig.gridLevels && (gridConfig.gridLevels < 3 || gridConfig.gridLevels > 50)) {
      errors.gridLevels = 'Grid levels must be between 3 and 50';
    }
    if (gridConfig.gridSpacing && (gridConfig.gridSpacing < 5 || gridConfig.gridSpacing > 500)) {
      errors.gridSpacing = 'Grid spacing must be between 5 and 500 pips';
    }
    if (gridConfig.maxGridOrders && (gridConfig.maxGridOrders < 5 || gridConfig.maxGridOrders > 100)) {
      errors.maxGridOrders = 'Max grid orders must be between 5 and 100';
    }
  }

  // Risk configuration validation
  if (config.risk_config) {
    const riskConfig = config.risk_config;
    
    if (riskConfig.maxRiskPerTrade && (riskConfig.maxRiskPerTrade < 0.005 || riskConfig.maxRiskPerTrade > 0.1)) {
      errors.maxRiskPerTrade = 'Max risk per trade must be between 0.5% and 10%';
    }
    
    if (riskConfig.maxDailyRisk && (riskConfig.maxDailyRisk < 0.01 || riskConfig.maxDailyRisk > 0.2)) {
      errors.maxDailyRisk = 'Max daily risk must be between 1% and 20%';
    }
    
    if (riskConfig.maxDrawdown && (riskConfig.maxDrawdown < 0.05 || riskConfig.maxDrawdown > 0.5)) {
      errors.maxDrawdown = 'Max drawdown must be between 5% and 50%';
    }
    
    if (riskConfig.maxPositions && (riskConfig.maxPositions < 1 || riskConfig.maxPositions > 20)) {
      errors.maxPositions = 'Max positions must be between 1 and 20';
    }
    
    if (riskConfig.maxLeverage && (riskConfig.maxLeverage < 1 || riskConfig.maxLeverage > 100)) {
      errors.maxLeverage = 'Max leverage must be between 1 and 100';
    }
    
    if (riskConfig.accountBalance && riskConfig.accountBalance < 100) {
      errors.accountBalance = 'Account balance must be at least $100';
    }
  }

  // Legacy fields for backward compatibility
  if (config.lotSize !== undefined) {
    if (typeof config.lotSize !== 'number' || config.lotSize <= 0) {
      errors.lotSize = 'Lot size must be a positive number';
    }
  }

  if (config.stopLoss !== undefined) {
    if (typeof config.stopLoss !== 'number' || config.stopLoss <= 0) {
      errors.stopLoss = 'Stop loss must be a positive number';
    }
  }

  if (config.takeProfit !== undefined) {
    if (typeof config.takeProfit !== 'number' || config.takeProfit <= 0) {
      errors.takeProfit = 'Take profit must be a positive number';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Sanitize user input
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

// Validate trade parameters
export function validateTradeParams(params) {
  const errors = {};

  if (!params.symbol) {
    errors.symbol = 'Symbol is required';
  }

  if (!params.action || !['buy', 'sell'].includes(params.action.toLowerCase())) {
    errors.action = 'Action must be either "buy" or "sell"';
  }

  if (typeof params.volume !== 'number' || params.volume <= 0) {
    errors.volume = 'Volume must be a positive number';
  }

  if (params.stopLoss !== undefined && (typeof params.stopLoss !== 'number' || params.stopLoss <= 0)) {
    errors.stopLoss = 'Stop loss must be a positive number';
  }

  if (params.takeProfit !== undefined && (typeof params.takeProfit !== 'number' || params.takeProfit <= 0)) {
    errors.takeProfit = 'Take profit must be a positive number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validate market data request
export function validateMarketDataRequest(params) {
  const errors = {};

  if (!params.symbol) {
    errors.symbol = 'Symbol is required';
  }

  if (params.timeframe) {
    const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
    if (!validTimeframes.includes(params.timeframe)) {
      errors.timeframe = `Timeframe must be one of: ${validTimeframes.join(', ')}`;
    }
  }

  if (params.limit !== undefined) {
    if (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 5000) {
      errors.limit = 'Limit must be an integer between 1 and 5000';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}