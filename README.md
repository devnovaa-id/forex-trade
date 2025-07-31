# Forex Trading Bot

A professional forex trading bot application built with Next.js, featuring AI-powered trading strategies, real-time market data, and comprehensive risk management.

## Features

- 🤖 **AI-Powered Trading**: Advanced algorithms for market analysis
- 📊 **Real-time Analytics**: Live market data and performance metrics
- 🛡️ **Risk Management**: Comprehensive risk controls and monitoring
- 👤 **User Authentication**: Secure user management with Clerk
- 🗄️ **Database Integration**: Supabase for data persistence
- 📱 **Responsive Dashboard**: Modern, mobile-friendly interface

## Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd forex-trading-bot
npm install
```

### 2. Environment Setup
Copy the example environment file and configure your variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your actual values. See `SETUP.md` for detailed configuration instructions.

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Demo Mode

The application includes a demo mode that works without external APIs:
- Mock market data generation
- Simulated trading operations
- No real trading occurs

## Documentation

- 📖 [Setup Guide](SETUP.md) - Detailed setup instructions
- 🔧 [API Documentation](SETUP.md#api-endpoints) - API endpoints reference
- 🗄️ [Database Schema](SETUP.md#database-schema) - Database structure

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
