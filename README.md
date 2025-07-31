# Platform Trading OANDA MT5 Indonesia

Platform trading forex terdepan dengan integrasi OANDA dan teknologi MT5 untuk trader Indonesia. Dilengkapi dengan visual trading yang menawan, backtesting akurat, dan interface responsif dalam bahasa Indonesia.

## 🚀 Features

### Real Market Data Integration
- **Multiple Data Providers**: Alpha Vantage, Twelve Data, Finhub, OANDA
- **Real-time Streaming**: WebSocket connections for live price updates
- **Historical Data**: Comprehensive historical data for backtesting
- **Data Caching**: Intelligent caching system for optimal performance

### Real Broker Integration
- **OANDA**: Full API integration with demo and live accounts
- **FXCM**: Complete trading API support
- **IG Markets**: Professional trading platform integration
- **Real Order Execution**: Actual trade placement and management

### Advanced Trading Strategies
- **Scalping**: High-frequency trading with precise entry/exit
- **DCA (Dollar Cost Averaging)**: Systematic investment strategy
- **Grid Trading**: Profit from market volatility
- **Custom Strategies**: Extensible strategy framework

### Risk Management
- **Position Sizing**: Dynamic lot size calculation
- **Stop Loss/Take Profit**: Automated risk controls
- **Drawdown Protection**: Maximum loss limits
- **Daily Loss Limits**: Per-day risk management

### Real-time Notifications
- **Email Alerts**: SMTP integration for trade notifications
- **SMS Notifications**: Twilio integration for urgent alerts
- **Push Notifications**: Real-time mobile alerts
- **System Alerts**: Bot status and error notifications

### Performance Analytics
- **Real-time Metrics**: Live performance tracking
- **Trade History**: Comprehensive trade logging
- **Risk Analytics**: Advanced risk metrics
- **Performance Reports**: Detailed analytics dashboard

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Node.js, Express (API routes)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Real-time**: Socket.io, WebSockets
- **Trading**: CCXT, Technical Indicators
- **Notifications**: Nodemailer, Twilio
- **Queue Management**: Bull, Redis
- **Logging**: Winston
- **UI**: Tailwind CSS, Radix UI, Framer Motion

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database (Supabase)
- Redis server (for job queues)
- SMTP email service
- Twilio account (for SMS)
- Market data provider accounts
- Broker API credentials

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/forex-trading-bot.git
cd forex-trading-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

```env
# Required: Authentication & Database
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required: Market Data (at least one)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
TWELVE_DATA_API_KEY=your_twelve_data_key

# Required: Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Optional: SMS Notifications
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Optional: Broker Integration
OANDA_API_KEY=your_oanda_key
FXCM_API_KEY=your_fxcm_key
```

### 4. Database Setup

Run the database migrations:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL in supabase/migrations/001_initial_schema.sql
```

### 5. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🔧 Configuration

### Market Data Providers

The bot supports multiple market data providers for redundancy:

1. **Alpha Vantage** (Free tier available)
   - Sign up at [alphavantage.co](https://www.alphavantage.co/)
   - Get API key from dashboard

2. **Twelve Data** (Free tier available)
   - Sign up at [twelvedata.com](https://twelvedata.com/)
   - Get API key from dashboard

3. **Finhub** (Free tier available)
   - Sign up at [finnhub.io](https://finnhub.io/)
   - Get API key from dashboard

### Broker Integration

#### OANDA
1. Create account at [oanda.com](https://www.oanda.com/)
2. Generate API key from account settings
3. Use demo account for testing

#### FXCM
1. Create account at [fxcm.com](https://www.fxcm.com/)
2. Generate API credentials
3. Use demo account for testing

### Email Notifications

#### Gmail Setup
1. Enable 2-factor authentication
2. Generate app password
3. Use app password in SMTP_PASS

#### Other SMTP Providers
Update SMTP settings in `.env.local`:
```env
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

### SMS Notifications (Optional)

1. Create Twilio account at [twilio.com](https://www.twilio.com/)
2. Get Account SID and Auth Token
3. Purchase phone number
4. Add credentials to `.env.local`

## 📊 Usage

### Creating a Trading Bot

1. **Sign up** and log in to the application
2. **Connect broker** account in dashboard
3. **Create bot** with desired strategy
4. **Configure risk management** settings
5. **Start bot** to begin automated trading

### Supported Strategies

#### Scalping Bot
- High-frequency trading
- Quick profit taking
- Tight stop losses
- Best for volatile markets

#### DCA Bot
- Dollar Cost Averaging
- Systematic investment
- Lower risk approach
- Good for trending markets

#### Grid Trading
- Profit from volatility
- Multiple price levels
- Automated rebalancing
- Suitable for range-bound markets

### Risk Management

The bot includes comprehensive risk management:

- **Maximum Drawdown**: 5-10% of account
- **Daily Loss Limit**: 2-5% of account
- **Position Sizing**: 1-2% risk per trade
- **Stop Loss**: Automatic stop loss placement
- **Take Profit**: Automated profit taking

## 🔒 Security

### Data Protection
- All credentials encrypted in database
- API keys stored securely
- HTTPS encryption for all communications
- Regular security audits

### Trading Safety
- Demo mode available for testing
- Real-time risk monitoring
- Automatic emergency stops
- Comprehensive logging

## 📈 Performance Monitoring

### Real-time Metrics
- Win rate tracking
- Profit/loss monitoring
- Drawdown analysis
- Sharpe ratio calculation

### Alerts & Notifications
- Trade execution alerts
- Profit/loss notifications
- System status updates
- Error and warning alerts

## 🚨 Important Notes

### Risk Disclaimer
- **Trading involves substantial risk**
- **Past performance doesn't guarantee future results**
- **Start with demo accounts**
- **Never risk more than you can afford to lose**

### Legal Compliance
- Check local regulations before trading
- Ensure broker compliance
- Follow tax reporting requirements
- Consult financial advisors

### System Requirements
- Stable internet connection
- 24/7 server availability
- Regular backups
- Monitoring and alerting

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/yourusername/forex-trading-bot/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/forex-trading-bot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/forex-trading-bot/discussions)
- **Email**: support@forexbot.com

## 🔄 Updates

Stay updated with the latest features and security patches:

```bash
git pull origin main
npm install
npm run build
```

---

**⚠️ Warning**: This is a real trading application. Use with caution and always test thoroughly before live trading.
