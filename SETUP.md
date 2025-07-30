# Forex Trading Bot - Setup Guide

## Overview
This is a Next.js-based forex trading bot application with AI-powered trading strategies, real-time market data, and comprehensive risk management.

## Features
- 🤖 AI-powered trading strategies (Scalping, DCA, Grid Trading)
- 📊 Real-time market data and analytics
- 🛡️ Comprehensive risk management
- 👤 User authentication with Clerk
- 🗄️ Database integration with Supabase
- 📱 Responsive dashboard interface

## Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for database)
- Clerk account (for authentication)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file and configure your variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your actual values. The `.env.example` file contains all required variables with descriptions and example values.

**Required Variables:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication (get from https://clerk.com)
- `CLERK_SECRET_KEY` - Clerk secret key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (get from https://supabase.com)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

**Optional Variables (for demo mode):**
- Trading API keys for real trading integration
- Market data API keys for real market data
- Monitoring and analytics keys

### 3. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Demo Mode
The application includes a demo mode that works without external APIs:
- Mock market data is generated automatically
- Bot operations are simulated
- No real trading occurs

## API Endpoints

### Health Check
- `GET /api/health` - Application health status

### Market Data
- `GET /api/market/data?symbol=EURUSD&timeframe=1h` - Get market data
- `POST /api/market/data` - Batch market data request

### Trading Bots
- `GET /api/bots` - List user's trading bots
- `POST /api/bots` - Create new trading bot
- `PUT /api/bots/:id` - Update bot configuration
- `DELETE /api/bots/:id` - Delete bot

## Database Schema (Supabase)

### Required Tables
```sql
-- Trading Bots
CREATE TABLE trading_bots (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  config JSONB,
  risk_config JSONB,
  description TEXT,
  status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bot Performance
CREATE TABLE bot_performance (
  id SERIAL PRIMARY KEY,
  bot_id INTEGER REFERENCES trading_bots(id),
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  total_profit DECIMAL DEFAULT 0,
  total_loss DECIMAL DEFAULT 0,
  win_rate DECIMAL DEFAULT 0,
  profit_factor DECIMAL DEFAULT 0,
  max_drawdown DECIMAL DEFAULT 0,
  sharpe_ratio DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Market Data
CREATE TABLE market_data (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  open DECIMAL,
  high DECIMAL,
  low DECIMAL,
  close DECIMAL,
  volume INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- System Logs
CREATE TABLE system_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Troubleshooting

### Common Issues

1. **Environment Variables Missing**
   - Ensure all required environment variables are set in `.env.local`
   - The app will work in demo mode without external APIs

2. **Database Connection Issues**
   - Check Supabase credentials
   - The app includes fallback mock data

3. **Authentication Issues**
   - Verify Clerk configuration
   - Check public routes in middleware.js

4. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check for dependency conflicts

### Development Commands
```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Security Notes
- Never commit `.env.local` to version control
- Use environment variables for all sensitive data
- Implement proper CORS policies for production
- Add rate limiting for API endpoints

## Production Deployment
1. Set up environment variables in your hosting platform
2. Configure Clerk and Supabase for production
3. Set up proper SSL certificates
4. Configure monitoring and logging

## Support
For issues or questions, check the application logs or create an issue in the repository.