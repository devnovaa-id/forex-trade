#!/usr/bin/env node

/**
 * Platform Trading OANDA MT5 Indonesia - Setup Script
 * Script untuk setup initial platform dengan konfigurasi production-ready
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

class PlatformSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {};
    this.requiredEnvVars = [
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OANDA_API_KEY',
      'OANDA_ACCOUNT_ID'
    ];
  }

  async run() {
    console.log('\n🚀 Platform Trading OANDA MT5 Indonesia - Setup');
    console.log('=' .repeat(60));
    
    try {
      await this.checkPrerequisites();
      await this.collectConfiguration();
      await this.setupEnvironment();
      await this.installDependencies();
      await this.setupDatabase();
      await this.setupOANDA();
      await this.setupClerk();
      await this.createDirectories();
      await this.generateKeys();
      await this.finalizeSetup();
      
      console.log('\n✅ Setup berhasil diselesaikan!');
      console.log('\n📋 Langkah selanjutnya:');
      console.log('   1. npm run dev - untuk development');
      console.log('   2. npm run build - untuk production build');
      console.log('   3. Akses http://localhost:3000 untuk melihat platform');
      console.log('\n🎯 Happy Trading! 📈');
      
    } catch (error) {
      console.error('\n❌ Setup gagal:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async checkPrerequisites() {
    console.log('\n📋 Memeriksa prerequisites...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ diperlukan. Versi saat ini: ${nodeVersion}`);
    }
    
    console.log(`✅ Node.js ${nodeVersion} - OK`);
    
    // Check npm
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log(`✅ npm ${npmVersion} - OK`);
    } catch (error) {
      throw new Error('npm tidak ditemukan. Pastikan npm terinstall.');
    }
    
    // Check if .env.example exists
    if (!fs.existsSync('.env.example')) {
      throw new Error('.env.example tidak ditemukan. Pastikan Anda berada di root directory project.');
    }
    
    console.log('✅ Prerequisites check - OK');
  }

  async collectConfiguration() {
    console.log('\n⚙️  Mengumpulkan konfigurasi...');
    
    // Environment type
    this.config.environment = await this.askQuestion(
      'Environment (development/production) [development]: ',
      'development'
    );
    
    // Database configuration
    console.log('\n📊 Konfigurasi Database (Supabase):');
    this.config.supabaseUrl = await this.askQuestion('Supabase URL: ');
    this.config.supabaseAnonKey = await this.askQuestion('Supabase Anon Key: ');
    this.config.supabaseServiceKey = await this.askQuestion('Supabase Service Role Key: ');
    
    // OANDA configuration
    console.log('\n💱 Konfigurasi OANDA:');
    this.config.oandaApiKey = await this.askQuestion('OANDA API Key: ');
    this.config.oandaAccountId = await this.askQuestion('OANDA Account ID: ');
    this.config.oandaEnvironment = await this.askQuestion(
      'OANDA Environment (practice/live) [practice]: ',
      'practice'
    );
    
    // Clerk authentication
    console.log('\n🔐 Konfigurasi Clerk Authentication:');
    this.config.clerkPublishableKey = await this.askQuestion('Clerk Publishable Key: ');
    this.config.clerkSecretKey = await this.askQuestion('Clerk Secret Key: ');
    
    // Optional configurations
    console.log('\n📧 Konfigurasi Opsional (tekan Enter untuk skip):');
    this.config.emailService = await this.askQuestion('Email Service (gmail/sendgrid) [skip]: ', '');
    if (this.config.emailService) {
      this.config.emailApiKey = await this.askQuestion('Email API Key: ');
      this.config.emailFrom = await this.askQuestion('Email From Address: ');
    }
    
    this.config.telegramBotToken = await this.askQuestion('Telegram Bot Token [skip]: ', '');
    this.config.whatsappApiKey = await this.askQuestion('WhatsApp API Key [skip]: ', '');
  }

  async setupEnvironment() {
    console.log('\n🔧 Membuat file environment...');
    
    const envContent = this.generateEnvContent();
    
    // Backup existing .env if exists
    if (fs.existsSync('.env')) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync('.env', `.env.backup.${timestamp}`);
      console.log('📦 Backup .env lama dibuat');
    }
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ File .env berhasil dibuat');
  }

  generateEnvContent() {
    const isProduction = this.config.environment === 'production';
    
    return `# Platform Trading OANDA MT5 Indonesia - Environment Configuration
# Generated on: ${new Date().toISOString()}
# Environment: ${this.config.environment.toUpperCase()}

# ============================================================================
# DATABASE CONFIGURATION (Supabase)
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL="${this.config.supabaseUrl}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${this.config.supabaseAnonKey}"
SUPABASE_SERVICE_ROLE_KEY="${this.config.supabaseServiceKey}"

# ============================================================================
# AUTHENTICATION (Clerk)
# ============================================================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${this.config.clerkPublishableKey}"
CLERK_SECRET_KEY="${this.config.clerkSecretKey}"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/subscription"

# ============================================================================
# OANDA API CONFIGURATION
# ============================================================================
OANDA_API_KEY="${this.config.oandaApiKey}"
OANDA_ACCOUNT_ID="${this.config.oandaAccountId}"
OANDA_ENVIRONMENT="${this.config.oandaEnvironment}"
OANDA_PRACTICE_URL="https://api-fxpractice.oanda.com"
OANDA_LIVE_URL="https://api-fxtrade.oanda.com"
OANDA_STREAM_PRACTICE_URL="https://stream-fxpractice.oanda.com"
OANDA_STREAM_LIVE_URL="https://stream-fxtrade.oanda.com"

# ============================================================================
# TRADING CONFIGURATION
# ============================================================================
DEFAULT_RISK_PERCENT=1
MAX_DAILY_TRADES=50
MAX_OPEN_POSITIONS=10
DEFAULT_STOP_LOSS_PIPS=20
DEFAULT_TAKE_PROFIT_PIPS=40
MAX_SPREAD_PIPS=3
MIN_LOT_SIZE=0.01
MAX_LOT_SIZE=10

# ============================================================================
# REDIS CONFIGURATION (for caching and sessions)
# ============================================================================
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
REDIS_DB=0

# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================
NEXTAUTH_SECRET="${this.generateRandomString(32)}"
NEXTAUTH_URL="${isProduction ? 'https://yourdomain.com' : 'http://localhost:3000'}"
JWT_SECRET="${this.generateRandomString(32)}"
ENCRYPTION_KEY="${this.generateRandomString(32)}"

# ============================================================================
# EMAIL CONFIGURATION (Optional)
# ============================================================================
${this.config.emailService ? `EMAIL_SERVICE="${this.config.emailService}"` : '# EMAIL_SERVICE=""'}
${this.config.emailApiKey ? `EMAIL_API_KEY="${this.config.emailApiKey}"` : '# EMAIL_API_KEY=""'}
${this.config.emailFrom ? `EMAIL_FROM="${this.config.emailFrom}"` : '# EMAIL_FROM=""'}

# ============================================================================
# NOTIFICATION SERVICES (Optional)
# ============================================================================
${this.config.telegramBotToken ? `TELEGRAM_BOT_TOKEN="${this.config.telegramBotToken}"` : '# TELEGRAM_BOT_TOKEN=""'}
${this.config.whatsappApiKey ? `WHATSAPP_API_KEY="${this.config.whatsappApiKey}"` : '# WHATSAPP_API_KEY=""'}

# ============================================================================
# LOGGING & MONITORING
# ============================================================================
LOG_LEVEL="${isProduction ? 'warn' : 'debug'}"
LOG_FILE_PATH="./logs/platform.log"
ENABLE_PERFORMANCE_MONITORING=true
SENTRY_DSN=""

# ============================================================================
# DEVELOPMENT SETTINGS
# ============================================================================
NODE_ENV="${this.config.environment}"
DEBUG=${isProduction ? 'false' : 'true'}
ENABLE_MOCK_DATA=${isProduction ? 'false' : 'false'}
ENABLE_API_RATE_LIMITING=${isProduction ? 'true' : 'false'}

# ============================================================================
# PRODUCTION SETTINGS
# ============================================================================
${isProduction ? 'FORCE_HTTPS=true' : '# FORCE_HTTPS=false'}
${isProduction ? 'ENABLE_COMPRESSION=true' : '# ENABLE_COMPRESSION=false'}
${isProduction ? 'ENABLE_CACHING=true' : '# ENABLE_CACHING=false'}

# ============================================================================
# FEATURE FLAGS
# ============================================================================
ENABLE_SCALPING_BOT=true
ENABLE_BACKTESTING=true
ENABLE_NOTIFICATIONS=true
ENABLE_PREMIUM_FEATURES=true
ENABLE_MOBILE_APP=true

# ============================================================================
# THIRD PARTY INTEGRATIONS
# ============================================================================
TRADINGVIEW_WIDGET_KEY=""
GOOGLE_ANALYTICS_ID=""
FACEBOOK_PIXEL_ID=""

# ============================================================================
# MAINTENANCE & BACKUP
# ============================================================================
MAINTENANCE_MODE=false
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
AUTO_UPDATE_ENABLED=false
`;
  }

  async installDependencies() {
    console.log('\n📦 Installing dependencies...');
    
    try {
      console.log('   Installing production dependencies...');
      execSync('npm install', { stdio: 'inherit' });
      
      console.log('   Installing development dependencies...');
      execSync('npm install --save-dev', { stdio: 'inherit' });
      
      console.log('✅ Dependencies berhasil diinstall');
    } catch (error) {
      throw new Error('Gagal menginstall dependencies: ' + error.message);
    }
  }

  async setupDatabase() {
    console.log('\n🗄️  Setting up database...');
    
    try {
      // Check if Supabase CLI is available
      try {
        execSync('supabase --version', { stdio: 'pipe' });
        console.log('   Running database migrations...');
        execSync('supabase db push', { stdio: 'inherit' });
      } catch (error) {
        console.log('⚠️  Supabase CLI tidak ditemukan. Silakan jalankan migrasi manual:');
        console.log('   1. Install Supabase CLI: npm install -g supabase');
        console.log('   2. Login: supabase login');
        console.log('   3. Link project: supabase link --project-ref YOUR_PROJECT_REF');
        console.log('   4. Push migrations: supabase db push');
      }
      
      console.log('✅ Database setup selesai');
    } catch (error) {
      console.log('⚠️  Database setup gagal:', error.message);
      console.log('   Silakan setup database secara manual');
    }
  }

  async setupOANDA() {
    console.log('\n💱 Testing OANDA connection...');
    
    try {
      // Test OANDA API connection
      const testScript = `
        const axios = require('axios');
        const baseUrl = '${this.config.oandaEnvironment === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com'}';
        
        axios.get(baseUrl + '/v3/accounts/${this.config.oandaAccountId}', {
          headers: {
            'Authorization': 'Bearer ${this.config.oandaApiKey}',
            'Content-Type': 'application/json'
          }
        }).then(response => {
          console.log('✅ OANDA connection successful');
          console.log('   Account Currency:', response.data.account.currency);
          console.log('   Account Balance:', response.data.account.balance);
        }).catch(error => {
          console.log('❌ OANDA connection failed:', error.response?.data?.errorMessage || error.message);
        });
      `;
      
      fs.writeFileSync('temp_test_oanda.js', testScript);
      execSync('node temp_test_oanda.js', { stdio: 'inherit' });
      fs.unlinkSync('temp_test_oanda.js');
      
    } catch (error) {
      console.log('⚠️  OANDA connection test gagal:', error.message);
      console.log('   Pastikan API Key dan Account ID benar');
    }
  }

  async setupClerk() {
    console.log('\n🔐 Validating Clerk configuration...');
    
    if (!this.config.clerkPublishableKey.startsWith('pk_')) {
      console.log('⚠️  Clerk Publishable Key format tidak valid');
    } else if (!this.config.clerkSecretKey.startsWith('sk_')) {
      console.log('⚠️  Clerk Secret Key format tidak valid');
    } else {
      console.log('✅ Clerk configuration valid');
    }
  }

  async createDirectories() {
    console.log('\n📁 Creating required directories...');
    
    const directories = [
      'logs',
      'uploads',
      'backups',
      'public/sounds',
      'public/icons',
      'public/avatars',
      'temp'
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   Created: ${dir}`);
      }
    });
    
    console.log('✅ Directories created');
  }

  async generateKeys() {
    console.log('\n🔑 Generating security keys...');
    
    // Create .gitignore if not exists
    if (!fs.existsSync('.gitignore')) {
      const gitignoreContent = `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# IDE
.vscode/
.idea/

# Logs
logs/
*.log

# Uploads
uploads/
temp/
backups/

# Cache
.cache/
.parcel-cache/
`;
      fs.writeFileSync('.gitignore', gitignoreContent);
      console.log('   Created .gitignore');
    }
    
    console.log('✅ Security keys generated');
  }

  async finalizeSetup() {
    console.log('\n🎉 Finalizing setup...');
    
    // Create initial admin user script
    const adminSetupScript = `
// Run this script to create initial admin user
// node scripts/create-admin.js

const { createClerkClient } = require('@clerk/clerk-sdk-node');

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function createAdmin() {
  try {
    // Update user role to premium in Clerk
    console.log('Setup admin user manually in Clerk dashboard');
    console.log('Set user metadata: { "role": "premium" }');
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  createAdmin();
}
`;
    
    fs.writeFileSync('scripts/create-admin.js', adminSetupScript);
    
    // Create package.json scripts if not exists
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    packageJson.scripts = {
      ...packageJson.scripts,
      'setup': 'node scripts/setup.js',
      'create-admin': 'node scripts/create-admin.js',
      'test-oanda': 'node scripts/test-oanda.js',
      'backup-db': 'node scripts/backup-db.js'
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    
    console.log('✅ Setup finalized');
  }

  generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  askQuestion(question, defaultValue = '') {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new PlatformSetup();
  setup.run().catch(console.error);
}

module.exports = PlatformSetup;