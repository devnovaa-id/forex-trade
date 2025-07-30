import axios from 'axios';
import { supabaseAdmin } from '@/lib/supabase/client';

export class NotificationManager {
  constructor(config = {}) {
    this.config = {
      telegram: {
        enabled: false,
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: null,
        parseMode: 'HTML'
      },
      discord: {
        enabled: false,
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
        username: 'ForexBot Pro',
        avatarUrl: null
      },
      email: {
        enabled: false,
        provider: 'resend', // 'resend', 'sendgrid', 'nodemailer'
        apiKey: process.env.RESEND_API_KEY,
        fromEmail: 'noreply@forexbot.pro',
        fromName: 'ForexBot Pro'
      },
      webhook: {
        enabled: false,
        url: null,
        headers: {}
      },
      ...config
    };

    this.notificationQueue = [];
    this.isProcessing = false;
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  // Main notification sending method
  async sendNotification(type, data, userId = null, channels = ['all']) {
    const notification = {
      id: this.generateNotificationId(),
      type,
      data,
      userId,
      channels,
      timestamp: new Date().toISOString(),
      attempts: 0,
      status: 'pending'
    };

    // Add to queue
    this.notificationQueue.push(notification);

    // Start processing if not already running
    if (!this.isProcessing) {
      await this.processQueue();
    }

    // Log notification
    await this.logNotification(notification);

    return notification.id;
  }

  // Process notification queue
  async processQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) return;

    this.isProcessing = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      
      try {
        await this.processNotification(notification);
        notification.status = 'sent';
      } catch (error) {
        console.error('Notification failed:', error);
        notification.status = 'failed';
        notification.error = error.message;
        
        // Retry logic
        if (notification.attempts < this.retryAttempts) {
          notification.attempts++;
          notification.status = 'retrying';
          
          // Add back to queue with delay
          setTimeout(() => {
            this.notificationQueue.push(notification);
          }, this.retryDelay * notification.attempts);
        }
      }

      // Update notification status in database
      await this.updateNotificationStatus(notification);
    }

    this.isProcessing = false;
  }

  // Process individual notification
  async processNotification(notification) {
    const { type, data, channels } = notification;
    const message = this.formatMessage(type, data);
    
    const enabledChannels = channels.includes('all') 
      ? ['telegram', 'discord', 'email', 'webhook']
      : channels;

    const results = {};

    for (const channel of enabledChannels) {
      if (!this.config[channel]?.enabled) continue;

      try {
        switch (channel) {
          case 'telegram':
            results.telegram = await this.sendTelegram(message, data);
            break;
          case 'discord':
            results.discord = await this.sendDiscord(message, data);
            break;
          case 'email':
            results.email = await this.sendEmail(message, data, notification.userId);
            break;
          case 'webhook':
            results.webhook = await this.sendWebhook(message, data);
            break;
        }
      } catch (error) {
        results[channel] = { success: false, error: error.message };
      }
    }

    notification.results = results;
    return results;
  }

  // Format message based on notification type
  formatMessage(type, data) {
    const templates = {
      trade_signal: {
        title: '📊 Trading Signal',
        telegram: this.formatTelegramTradeSignal(data),
        discord: this.formatDiscordTradeSignal(data),
        email: this.formatEmailTradeSignal(data)
      },
      trade_executed: {
        title: '✅ Trade Executed',
        telegram: this.formatTelegramTradeExecuted(data),
        discord: this.formatDiscordTradeExecuted(data),
        email: this.formatEmailTradeExecuted(data)
      },
      trade_closed: {
        title: '🎯 Trade Closed',
        telegram: this.formatTelegramTradeClosed(data),
        discord: this.formatDiscordTradeClosed(data),
        email: this.formatEmailTradeClosed(data)
      },
      bot_started: {
        title: '🚀 Bot Started',
        telegram: this.formatTelegramBotStatus(data, 'started'),
        discord: this.formatDiscordBotStatus(data, 'started'),
        email: this.formatEmailBotStatus(data, 'started')
      },
      bot_stopped: {
        title: '⏹️ Bot Stopped',
        telegram: this.formatTelegramBotStatus(data, 'stopped'),
        discord: this.formatDiscordBotStatus(data, 'stopped'),
        email: this.formatEmailBotStatus(data, 'stopped')
      },
      risk_alert: {
        title: '⚠️ Risk Alert',
        telegram: this.formatTelegramRiskAlert(data),
        discord: this.formatDiscordRiskAlert(data),
        email: this.formatEmailRiskAlert(data)
      },
      performance_update: {
        title: '📈 Performance Update',
        telegram: this.formatTelegramPerformance(data),
        discord: this.formatDiscordPerformance(data),
        email: this.formatEmailPerformance(data)
      }
    };

    return templates[type] || {
      title: '📢 Notification',
      telegram: JSON.stringify(data),
      discord: JSON.stringify(data),
      email: JSON.stringify(data)
    };
  }

  // Telegram formatting methods
  formatTelegramTradeSignal(data) {
    return `
🔔 <b>New Trading Signal</b>

📈 <b>Strategy:</b> ${data.strategy?.toUpperCase()}
💱 <b>Symbol:</b> ${data.symbol}
📊 <b>Direction:</b> ${data.direction === 'BUY' ? '🟢 BUY' : '🔴 SELL'}
💰 <b>Entry Price:</b> ${data.entryPrice}
🛑 <b>Stop Loss:</b> ${data.stopLoss}
🎯 <b>Take Profit:</b> ${data.takeProfit}
📦 <b>Lot Size:</b> ${data.lotSize}
⭐ <b>Confidence:</b> ${(data.confidence * 100).toFixed(1)}%

⏰ <i>${new Date(data.timestamp).toLocaleString()}</i>
    `.trim();
  }

  formatTelegramTradeExecuted(data) {
    return `
✅ <b>Trade Executed</b>

📈 <b>Strategy:</b> ${data.strategy?.toUpperCase()}
💱 <b>Symbol:</b> ${data.symbol}
📊 <b>Direction:</b> ${data.direction === 'BUY' ? '🟢 BUY' : '🔴 SELL'}
💰 <b>Execution Price:</b> ${data.executionPrice}
📦 <b>Lot Size:</b> ${data.lotSize}
🆔 <b>Position ID:</b> ${data.positionId}

⏰ <i>${new Date(data.timestamp).toLocaleString()}</i>
    `.trim();
  }

  formatTelegramTradeClosed(data) {
    const profitEmoji = data.profit > 0 ? '💰' : '💸';
    const profitColor = data.profit > 0 ? '🟢' : '🔴';
    
    return `
${profitEmoji} <b>Trade Closed</b>

💱 <b>Symbol:</b> ${data.symbol}
📊 <b>Direction:</b> ${data.direction === 'BUY' ? '🟢 BUY' : '🔴 SELL'}
💰 <b>Exit Price:</b> ${data.exitPrice}
${profitColor} <b>P&L:</b> $${data.profit.toFixed(2)}
📝 <b>Reason:</b> ${data.reason}
⏱️ <b>Duration:</b> ${data.duration || 'N/A'}

⏰ <i>${new Date(data.timestamp).toLocaleString()}</i>
    `.trim();
  }

  formatTelegramBotStatus(data, status) {
    const emoji = status === 'started' ? '🚀' : '⏹️';
    
    return `
${emoji} <b>Bot ${status.charAt(0).toUpperCase() + status.slice(1)}</b>

🤖 <b>Bot Name:</b> ${data.botName}
📈 <b>Strategy:</b> ${data.strategy?.toUpperCase()}
💱 <b>Symbol:</b> ${data.symbol}
⚙️ <b>Status:</b> ${status.toUpperCase()}

⏰ <i>${new Date().toLocaleString()}</i>
    `.trim();
  }

  formatTelegramRiskAlert(data) {
    return `
⚠️ <b>RISK ALERT</b>

🚨 <b>Alert Type:</b> ${data.alertType}
📊 <b>Current Value:</b> ${data.currentValue}
🎯 <b>Threshold:</b> ${data.threshold}
📝 <b>Description:</b> ${data.description}

⚡ <b>Action Required:</b> ${data.actionRequired || 'Review and adjust settings'}

⏰ <i>${new Date().toLocaleString()}</i>
    `.trim();
  }

  formatTelegramPerformance(data) {
    return `
📈 <b>Performance Update</b>

💰 <b>Total Profit:</b> $${data.totalProfit?.toFixed(2)}
📊 <b>Win Rate:</b> ${(data.winRate * 100)?.toFixed(1)}%
📈 <b>Total Trades:</b> ${data.totalTrades}
📉 <b>Max Drawdown:</b> ${(data.maxDrawdown * 100)?.toFixed(1)}%
⭐ <b>Sharpe Ratio:</b> ${data.sharpeRatio?.toFixed(2)}

⏰ <i>${new Date().toLocaleString()}</i>
    `.trim();
  }

  // Discord formatting methods
  formatDiscordTradeSignal(data) {
    return {
      embeds: [{
        title: '📊 New Trading Signal',
        color: data.direction === 'BUY' ? 0x00ff00 : 0xff0000,
        fields: [
          { name: 'Strategy', value: data.strategy?.toUpperCase(), inline: true },
          { name: 'Symbol', value: data.symbol, inline: true },
          { name: 'Direction', value: data.direction, inline: true },
          { name: 'Entry Price', value: data.entryPrice.toString(), inline: true },
          { name: 'Stop Loss', value: data.stopLoss.toString(), inline: true },
          { name: 'Take Profit', value: data.takeProfit.toString(), inline: true },
          { name: 'Lot Size', value: data.lotSize.toString(), inline: true },
          { name: 'Confidence', value: `${(data.confidence * 100).toFixed(1)}%`, inline: true }
        ],
        timestamp: data.timestamp,
        footer: { text: 'ForexBot Pro' }
      }]
    };
  }

  formatDiscordTradeExecuted(data) {
    return {
      embeds: [{
        title: '✅ Trade Executed',
        color: 0x00ff00,
        fields: [
          { name: 'Strategy', value: data.strategy?.toUpperCase(), inline: true },
          { name: 'Symbol', value: data.symbol, inline: true },
          { name: 'Direction', value: data.direction, inline: true },
          { name: 'Execution Price', value: data.executionPrice.toString(), inline: true },
          { name: 'Lot Size', value: data.lotSize.toString(), inline: true },
          { name: 'Position ID', value: data.positionId, inline: true }
        ],
        timestamp: data.timestamp,
        footer: { text: 'ForexBot Pro' }
      }]
    };
  }

  formatDiscordTradeClosed(data) {
    const color = data.profit > 0 ? 0x00ff00 : 0xff0000;
    
    return {
      embeds: [{
        title: data.profit > 0 ? '💰 Profitable Trade Closed' : '💸 Trade Closed with Loss',
        color: color,
        fields: [
          { name: 'Symbol', value: data.symbol, inline: true },
          { name: 'Direction', value: data.direction, inline: true },
          { name: 'Exit Price', value: data.exitPrice.toString(), inline: true },
          { name: 'P&L', value: `$${data.profit.toFixed(2)}`, inline: true },
          { name: 'Reason', value: data.reason, inline: true },
          { name: 'Duration', value: data.duration || 'N/A', inline: true }
        ],
        timestamp: data.timestamp,
        footer: { text: 'ForexBot Pro' }
      }]
    };
  }

  formatDiscordBotStatus(data, status) {
    return {
      embeds: [{
        title: `🤖 Bot ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        color: status === 'started' ? 0x00ff00 : 0xff0000,
        fields: [
          { name: 'Bot Name', value: data.botName, inline: true },
          { name: 'Strategy', value: data.strategy?.toUpperCase(), inline: true },
          { name: 'Symbol', value: data.symbol, inline: true },
          { name: 'Status', value: status.toUpperCase(), inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'ForexBot Pro' }
      }]
    };
  }

  formatDiscordRiskAlert(data) {
    return {
      embeds: [{
        title: '⚠️ RISK ALERT',
        color: 0xff0000,
        fields: [
          { name: 'Alert Type', value: data.alertType, inline: true },
          { name: 'Current Value', value: data.currentValue.toString(), inline: true },
          { name: 'Threshold', value: data.threshold.toString(), inline: true },
          { name: 'Description', value: data.description, inline: false },
          { name: 'Action Required', value: data.actionRequired || 'Review and adjust settings', inline: false }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'ForexBot Pro' }
      }]
    };
  }

  formatDiscordPerformance(data) {
    return {
      embeds: [{
        title: '📈 Performance Update',
        color: data.totalProfit > 0 ? 0x00ff00 : 0xff0000,
        fields: [
          { name: 'Total Profit', value: `$${data.totalProfit?.toFixed(2)}`, inline: true },
          { name: 'Win Rate', value: `${(data.winRate * 100)?.toFixed(1)}%`, inline: true },
          { name: 'Total Trades', value: data.totalTrades?.toString(), inline: true },
          { name: 'Max Drawdown', value: `${(data.maxDrawdown * 100)?.toFixed(1)}%`, inline: true },
          { name: 'Sharpe Ratio', value: data.sharpeRatio?.toFixed(2), inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'ForexBot Pro' }
      }]
    };
  }

  // Email formatting methods
  formatEmailTradeSignal(data) {
    return {
      subject: `📊 New Trading Signal - ${data.symbol} ${data.direction}`,
      html: `
        <h2>📊 New Trading Signal</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Strategy:</strong></td><td>${data.strategy?.toUpperCase()}</td></tr>
          <tr><td><strong>Symbol:</strong></td><td>${data.symbol}</td></tr>
          <tr><td><strong>Direction:</strong></td><td>${data.direction}</td></tr>
          <tr><td><strong>Entry Price:</strong></td><td>${data.entryPrice}</td></tr>
          <tr><td><strong>Stop Loss:</strong></td><td>${data.stopLoss}</td></tr>
          <tr><td><strong>Take Profit:</strong></td><td>${data.takeProfit}</td></tr>
          <tr><td><strong>Lot Size:</strong></td><td>${data.lotSize}</td></tr>
          <tr><td><strong>Confidence:</strong></td><td>${(data.confidence * 100).toFixed(1)}%</td></tr>
        </table>
        <p><em>Generated at: ${new Date(data.timestamp).toLocaleString()}</em></p>
      `
    };
  }

  formatEmailTradeExecuted(data) {
    return {
      subject: `✅ Trade Executed - ${data.symbol} ${data.direction}`,
      html: `
        <h2>✅ Trade Executed</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Strategy:</strong></td><td>${data.strategy?.toUpperCase()}</td></tr>
          <tr><td><strong>Symbol:</strong></td><td>${data.symbol}</td></tr>
          <tr><td><strong>Direction:</strong></td><td>${data.direction}</td></tr>
          <tr><td><strong>Execution Price:</strong></td><td>${data.executionPrice}</td></tr>
          <tr><td><strong>Lot Size:</strong></td><td>${data.lotSize}</td></tr>
          <tr><td><strong>Position ID:</strong></td><td>${data.positionId}</td></tr>
        </table>
        <p><em>Executed at: ${new Date(data.timestamp).toLocaleString()}</em></p>
      `
    };
  }

  formatEmailTradeClosed(data) {
    const profitClass = data.profit > 0 ? 'color: green;' : 'color: red;';
    
    return {
      subject: `🎯 Trade Closed - ${data.symbol} P&L: $${data.profit.toFixed(2)}`,
      html: `
        <h2>🎯 Trade Closed</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Symbol:</strong></td><td>${data.symbol}</td></tr>
          <tr><td><strong>Direction:</strong></td><td>${data.direction}</td></tr>
          <tr><td><strong>Exit Price:</strong></td><td>${data.exitPrice}</td></tr>
          <tr><td><strong>P&L:</strong></td><td style="${profitClass}">$${data.profit.toFixed(2)}</td></tr>
          <tr><td><strong>Reason:</strong></td><td>${data.reason}</td></tr>
          <tr><td><strong>Duration:</strong></td><td>${data.duration || 'N/A'}</td></tr>
        </table>
        <p><em>Closed at: ${new Date(data.timestamp).toLocaleString()}</em></p>
      `
    };
  }

  formatEmailBotStatus(data, status) {
    return {
      subject: `🤖 Bot ${status.charAt(0).toUpperCase() + status.slice(1)} - ${data.botName}`,
      html: `
        <h2>🤖 Bot ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Bot Name:</strong></td><td>${data.botName}</td></tr>
          <tr><td><strong>Strategy:</strong></td><td>${data.strategy?.toUpperCase()}</td></tr>
          <tr><td><strong>Symbol:</strong></td><td>${data.symbol}</td></tr>
          <tr><td><strong>Status:</strong></td><td>${status.toUpperCase()}</td></tr>
        </table>
        <p><em>Status changed at: ${new Date().toLocaleString()}</em></p>
      `
    };
  }

  formatEmailRiskAlert(data) {
    return {
      subject: `⚠️ RISK ALERT - ${data.alertType}`,
      html: `
        <h2 style="color: red;">⚠️ RISK ALERT</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Alert Type:</strong></td><td>${data.alertType}</td></tr>
          <tr><td><strong>Current Value:</strong></td><td>${data.currentValue}</td></tr>
          <tr><td><strong>Threshold:</strong></td><td>${data.threshold}</td></tr>
          <tr><td><strong>Description:</strong></td><td>${data.description}</td></tr>
          <tr><td><strong>Action Required:</strong></td><td>${data.actionRequired || 'Review and adjust settings'}</td></tr>
        </table>
        <p><em>Alert triggered at: ${new Date().toLocaleString()}</em></p>
      `
    };
  }

  formatEmailPerformance(data) {
    return {
      subject: `📈 Performance Update - Total P&L: $${data.totalProfit?.toFixed(2)}`,
      html: `
        <h2>📈 Performance Update</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Total Profit:</strong></td><td>$${data.totalProfit?.toFixed(2)}</td></tr>
          <tr><td><strong>Win Rate:</strong></td><td>${(data.winRate * 100)?.toFixed(1)}%</td></tr>
          <tr><td><strong>Total Trades:</strong></td><td>${data.totalTrades}</td></tr>
          <tr><td><strong>Max Drawdown:</strong></td><td>${(data.maxDrawdown * 100)?.toFixed(1)}%</td></tr>
          <tr><td><strong>Sharpe Ratio:</strong></td><td>${data.sharpeRatio?.toFixed(2)}</td></tr>
        </table>
        <p><em>Report generated at: ${new Date().toLocaleString()}</em></p>
      `
    };
  }

  // Channel-specific sending methods
  async sendTelegram(message, data) {
    if (!this.config.telegram.enabled || !this.config.telegram.botToken) {
      throw new Error('Telegram not configured');
    }

    const url = `https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`;
    
    const payload = {
      chat_id: this.config.telegram.chatId,
      text: message.telegram,
      parse_mode: this.config.telegram.parseMode,
      disable_web_page_preview: true
    };

    const response = await axios.post(url, payload);
    return { success: true, messageId: response.data.result.message_id };
  }

  async sendDiscord(message, data) {
    if (!this.config.discord.enabled || !this.config.discord.webhookUrl) {
      throw new Error('Discord not configured');
    }

    const payload = {
      username: this.config.discord.username,
      avatar_url: this.config.discord.avatarUrl,
      ...message.discord
    };

    const response = await axios.post(this.config.discord.webhookUrl, payload);
    return { success: true, response: response.status };
  }

  async sendEmail(message, data, userId) {
    if (!this.config.email.enabled) {
      throw new Error('Email not configured');
    }

    // Get user email from database
    const userEmail = await this.getUserEmail(userId);
    if (!userEmail) {
      throw new Error('User email not found');
    }

    const emailData = message.email;
    
    switch (this.config.email.provider) {
      case 'resend':
        return await this.sendResendEmail(userEmail, emailData);
      case 'sendgrid':
        return await this.sendSendGridEmail(userEmail, emailData);
      default:
        throw new Error('Email provider not configured');
    }
  }

  async sendWebhook(message, data) {
    if (!this.config.webhook.enabled || !this.config.webhook.url) {
      throw new Error('Webhook not configured');
    }

    const payload = {
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(this.config.webhook.url, payload, {
      headers: this.config.webhook.headers
    });

    return { success: true, response: response.status };
  }

  // Email provider implementations
  async sendResendEmail(toEmail, emailData) {
    const response = await axios.post('https://api.resend.com/emails', {
      from: `${this.config.email.fromName} <${this.config.email.fromEmail}>`,
      to: [toEmail],
      subject: emailData.subject,
      html: emailData.html
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.email.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return { success: true, messageId: response.data.id };
  }

  async sendSendGridEmail(toEmail, emailData) {
    const response = await axios.post('https://api.sendgrid.com/v3/mail/send', {
      personalizations: [{
        to: [{ email: toEmail }]
      }],
      from: {
        email: this.config.email.fromEmail,
        name: this.config.email.fromName
      },
      subject: emailData.subject,
      content: [{
        type: 'text/html',
        value: emailData.html
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.email.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return { success: true, messageId: response.headers['x-message-id'] };
  }

  // Utility methods
  async getUserEmail(userId) {
    if (!userId) return null;

    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('clerk_user_id', userId)
        .single();

      if (error) throw error;
      return data?.email;
    } catch (error) {
      console.error('Error fetching user email:', error);
      return null;
    }
  }

  async logNotification(notification) {
    try {
      await supabaseAdmin
        .from('system_logs')
        .insert({
          user_id: notification.userId,
          event_type: 'notification_sent',
          details: {
            notification_id: notification.id,
            type: notification.type,
            channels: notification.channels,
            status: notification.status
          },
          created_at: notification.timestamp
        });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  async updateNotificationStatus(notification) {
    try {
      await supabaseAdmin
        .from('system_logs')
        .update({
          details: {
            ...notification,
            updated_at: new Date().toISOString()
          }
        })
        .eq('event_type', 'notification_sent')
        .eq('details->>notification_id', notification.id);
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Configuration methods
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  enableChannel(channel, config = {}) {
    if (this.config[channel]) {
      this.config[channel] = { ...this.config[channel], enabled: true, ...config };
    }
  }

  disableChannel(channel) {
    if (this.config[channel]) {
      this.config[channel].enabled = false;
    }
  }

  getConfig() {
    return { ...this.config };
  }

  // Quick notification methods for common use cases
  async notifyTradeSignal(signalData, userId) {
    return await this.sendNotification('trade_signal', signalData, userId);
  }

  async notifyTradeExecuted(tradeData, userId) {
    return await this.sendNotification('trade_executed', tradeData, userId);
  }

  async notifyTradeClosed(tradeData, userId) {
    return await this.sendNotification('trade_closed', tradeData, userId);
  }

  async notifyBotStarted(botData, userId) {
    return await this.sendNotification('bot_started', botData, userId);
  }

  async notifyBotStopped(botData, userId) {
    return await this.sendNotification('bot_stopped', botData, userId);
  }

  async notifyRiskAlert(alertData, userId) {
    return await this.sendNotification('risk_alert', alertData, userId, ['telegram', 'email']);
  }

  async notifyPerformanceUpdate(performanceData, userId) {
    return await this.sendNotification('performance_update', performanceData, userId);
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();

export default NotificationManager;