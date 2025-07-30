-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'premium');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'premium', 'enterprise');
CREATE TYPE risk_level AS ENUM ('conservative', 'moderate', 'aggressive');
CREATE TYPE bot_status AS ENUM ('stopped', 'running', 'paused', 'error');
CREATE TYPE bot_strategy AS ENUM ('scalping', 'dca', 'grid', 'trend_following', 'arbitrage', 'custom');
CREATE TYPE trade_action AS ENUM ('buy', 'sell');
CREATE TYPE trade_status AS ENUM ('pending', 'filled', 'cancelled', 'failed');

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'user',
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMPTZ,
    
    -- Trading Configuration
    max_drawdown DECIMAL(5,4) DEFAULT 0.10,
    max_daily_loss DECIMAL(5,4) DEFAULT 0.05,
    max_position_size DECIMAL(5,4) DEFAULT 0.02,
    default_lot_size DECIMAL(10,5) DEFAULT 0.01,
    risk_level risk_level DEFAULT 'moderate',
    
    -- Account Statistics
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    total_profit DECIMAL(15,2) DEFAULT 0,
    total_loss DECIMAL(15,2) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    profit_factor DECIMAL(10,4) DEFAULT 0,
    max_drawdown_reached DECIMAL(5,4) DEFAULT 0,
    
    -- Subscription Info
    subscription_plan subscription_plan DEFAULT 'free',
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    subscription_is_active BOOLEAN DEFAULT true,
    
    -- Notification Preferences
    email_notifications JSONB DEFAULT '{"trades": true, "profits": true, "losses": true, "systemAlerts": true}',
    push_notifications JSONB DEFAULT '{"trades": false, "profits": false, "losses": true, "systemAlerts": true}',
    
    -- Login tracking
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broker connections table
CREATE TABLE broker_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    broker_id VARCHAR(100) NOT NULL,
    broker_name VARCHAR(100) NOT NULL,
    account_id VARCHAR(100) NOT NULL,
    is_demo BOOLEAN DEFAULT true,
    balance DECIMAL(15,2),
    equity DECIMAL(15,2),
    margin DECIMAL(15,2),
    free_margin DECIMAL(15,2),
    is_connected BOOLEAN DEFAULT false,
    last_sync TIMESTAMPTZ,
    
    -- Encrypted credentials
    login_encrypted TEXT,
    password_encrypted TEXT,
    server VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading bots table
CREATE TABLE trading_bots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    broker_connection_id UUID REFERENCES broker_connections(id) ON DELETE SET NULL,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    strategy bot_strategy NOT NULL,
    status bot_status DEFAULT 'stopped',
    
    -- Trading parameters
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) DEFAULT '1h',
    lot_size DECIMAL(10,5) NOT NULL,
    stop_loss DECIMAL(10,5),
    take_profit DECIMAL(10,5),
    max_spread DECIMAL(8,5),
    
    -- Strategy-specific configuration
    strategy_config JSONB DEFAULT '{}',
    
    -- Risk management
    max_daily_trades INTEGER DEFAULT 10,
    max_concurrent_trades INTEGER DEFAULT 3,
    daily_loss_limit DECIMAL(15,2),
    
    -- Performance tracking
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    total_profit DECIMAL(15,2) DEFAULT 0,
    current_drawdown DECIMAL(5,4) DEFAULT 0,
    
    -- Operational
    is_active BOOLEAN DEFAULT true,
    last_trade_time TIMESTAMPTZ,
    last_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table
CREATE TABLE trades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID REFERENCES trading_bots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Trade details
    symbol VARCHAR(20) NOT NULL,
    action trade_action NOT NULL,
    volume DECIMAL(10,5) NOT NULL,
    open_price DECIMAL(12,5),
    close_price DECIMAL(12,5),
    stop_loss DECIMAL(12,5),
    take_profit DECIMAL(12,5),
    
    -- Status and timing
    status trade_status DEFAULT 'pending',
    open_time TIMESTAMPTZ,
    close_time TIMESTAMPTZ,
    
    -- Financial results
    profit DECIMAL(15,2) DEFAULT 0,
    commission DECIMAL(10,2) DEFAULT 0,
    swap DECIMAL(10,2) DEFAULT 0,
    
    -- External references
    broker_trade_id VARCHAR(100),
    magic_number INTEGER,
    
    -- Additional data
    comment TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market data table for storing historical prices
CREATE TABLE market_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    
    open_price DECIMAL(12,5) NOT NULL,
    high_price DECIMAL(12,5) NOT NULL,
    low_price DECIMAL(12,5) NOT NULL,
    close_price DECIMAL(12,5) NOT NULL,
    volume DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, timeframe, timestamp)
);

-- Bot performance snapshots for analytics
CREATE TABLE bot_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID REFERENCES trading_bots(id) ON DELETE CASCADE,
    
    -- Performance metrics
    total_trades INTEGER NOT NULL,
    winning_trades INTEGER NOT NULL,
    total_profit DECIMAL(15,2) NOT NULL,
    total_loss DECIMAL(15,2) NOT NULL,
    win_rate DECIMAL(5,2) NOT NULL,
    profit_factor DECIMAL(10,4) NOT NULL,
    max_drawdown DECIMAL(5,4) NOT NULL,
    
    -- Time period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System logs for debugging and monitoring
CREATE TABLE system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level VARCHAR(20) NOT NULL, -- info, warning, error, debug
    category VARCHAR(50) NOT NULL, -- trading, auth, system, etc.
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    bot_id UUID REFERENCES trading_bots(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_plan, subscription_is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_broker_connections_user_id ON broker_connections(user_id);
CREATE INDEX idx_broker_connections_is_connected ON broker_connections(is_connected);

CREATE INDEX idx_trading_bots_user_id ON trading_bots(user_id);
CREATE INDEX idx_trading_bots_status ON trading_bots(status);
CREATE INDEX idx_trading_bots_strategy ON trading_bots(strategy);

CREATE INDEX idx_trades_bot_id ON trades(bot_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_open_time ON trades(open_time);

CREATE INDEX idx_market_data_symbol_timeframe ON market_data(symbol, timeframe);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp);

CREATE INDEX idx_bot_performance_bot_id ON bot_performance(bot_id);
CREATE INDEX idx_bot_performance_period ON bot_performance(period_start, period_end);

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_broker_connections_updated_at BEFORE UPDATE ON broker_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trading_bots_updated_at BEFORE UPDATE ON trading_bots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Broker connections
CREATE POLICY "Users can manage own broker connections" ON broker_connections FOR ALL USING (auth.uid() = user_id);

-- Trading bots
CREATE POLICY "Users can manage own bots" ON trading_bots FOR ALL USING (auth.uid() = user_id);

-- Trades
CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert trades" ON trades FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update trades" ON trades FOR UPDATE WITH CHECK (true);

-- Bot performance
CREATE POLICY "Users can view own bot performance" ON bot_performance FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM trading_bots WHERE id = bot_id)
);

-- Market data is public (read-only)
CREATE POLICY "Anyone can read market data" ON market_data FOR SELECT TO authenticated USING (true);