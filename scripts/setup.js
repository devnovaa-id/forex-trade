#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Forex Trading Bot Setup');
console.log('==========================\n');

const questions = [
  {
    name: 'clerk_publishable',
    message: 'Enter your Clerk Publishable Key:',
    required: true
  },
  {
    name: 'clerk_secret',
    message: 'Enter your Clerk Secret Key:',
    required: true
  },
  {
    name: 'supabase_url',
    message: 'Enter your Supabase URL:',
    required: true
  },
  {
    name: 'supabase_anon',
    message: 'Enter your Supabase Anon Key:',
    required: true
  },
  {
    name: 'supabase_service',
    message: 'Enter your Supabase Service Role Key:',
    required: true
  },
  {
    name: 'alpha_vantage',
    message: 'Enter your Alpha Vantage API Key (optional):',
    required: false
  },
  {
    name: 'twelve_data',
    message: 'Enter your Twelve Data API Key (optional):',
    required: false
  },
  {
    name: 'finhub',
    message: 'Enter your Finhub API Key (optional):',
    required: false
  },
  {
    name: 'smtp_host',
    message: 'Enter SMTP Host (e.g., smtp.gmail.com):',
    required: true
  },
  {
    name: 'smtp_user',
    message: 'Enter SMTP Username (email):',
    required: true
  },
  {
    name: 'smtp_pass',
    message: 'Enter SMTP Password (app password):',
    required: true
  },
  {
    name: 'twilio_sid',
    message: 'Enter Twilio Account SID (optional):',
    required: false
  },
  {
    name: 'twilio_token',
    message: 'Enter Twilio Auth Token (optional):',
    required: false
  },
  {
    name: 'twilio_phone',
    message: 'Enter Twilio Phone Number (optional):',
    required: false
  }
];

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question.message, (answer) => {
      if (question.required && !answer.trim()) {
        console.log('❌ This field is required. Please try again.');
        resolve(askQuestion(question));
      } else {
        resolve(answer.trim());
      }
    });
  });
}

async function runSetup() {
  try {
    console.log('📋 Please provide the following configuration details:\n');

    const answers = {};
    
    for (const question of questions) {
      answers[question.name] = await askQuestion(question);
    }

    // Generate .env.local content
    const envContent = `# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${answers.clerk_publishable}
CLERK_SECRET_KEY=${answers.clerk_secret}

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=${answers.supabase_url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${answers.supabase_anon}
SUPABASE_SERVICE_ROLE_KEY=${answers.supabase_service}

# Market Data Providers
${answers.alpha_vantage ? `ALPHA_VANTAGE_API_KEY=${answers.alpha_vantage}` : '# ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key'}
${answers.twelve_data ? `TWELVE_DATA_API_KEY=${answers.twelve_data}` : '# TWELVE_DATA_API_KEY=your_twelve_data_api_key'}
${answers.finhub ? `FINHUB_API_KEY=${answers.finhub}` : '# FINHUB_API_KEY=your_finhub_api_key'}

# Email Configuration (SMTP)
SMTP_HOST=${answers.smtp_host}
SMTP_PORT=587
SMTP_USER=${answers.smtp_user}
SMTP_PASS=${answers.smtp_pass}
SMTP_FROM=${answers.smtp_user}
SMTP_SECURE=false

# SMS Configuration (Twilio) - Optional
${answers.twilio_sid ? `TWILIO_ACCOUNT_SID=${answers.twilio_sid}` : '# TWILIO_ACCOUNT_SID=your_twilio_account_sid'}
${answers.twilio_token ? `TWILIO_AUTH_TOKEN=${answers.twilio_token}` : '# TWILIO_AUTH_TOKEN=your_twilio_auth_token'}
${answers.twilio_phone ? `TWILIO_PHONE_NUMBER=${answers.twilio_phone}` : '# TWILIO_PHONE_NUMBER=+1234567890'}

# Development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Trading Configuration
MAX_CONCURRENT_BOTS=10
MAX_DAILY_TRADES=100
RISK_MANAGEMENT_ENABLED=true
DEMO_MODE_ENABLED=true

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
METRICS_COLLECTION_INTERVAL=60000

# Security
JWT_SECRET=${generateRandomString(32)}
ENCRYPTION_KEY=${generateRandomString(32)}
`;

    // Write .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    fs.writeFileSync(envPath, envContent);

    console.log('\n✅ Configuration completed successfully!');
    console.log('📁 Created .env.local file');
    
    console.log('\n📋 Next steps:');
    console.log('1. Run database migrations:');
    console.log('   npm run db:migrate');
    console.log('2. Install dependencies:');
    console.log('   npm install');
    console.log('3. Start development server:');
    console.log('   npm run dev');
    console.log('4. Visit http://localhost:3000');
    
    console.log('\n⚠️  Important:');
    console.log('- Test with demo accounts first');
    console.log('- Never risk more than you can afford to lose');
    console.log('- Monitor your bots regularly');
    console.log('- Keep your API keys secure');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check if .env.local already exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  rl.question('⚠️  .env.local already exists. Overwrite? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      runSetup();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  runSetup();
}