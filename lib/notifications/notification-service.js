import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { supabaseAdmin } from '@/lib/supabase/client';

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.smsClient = null;
    this.initializeServices();
  }

  async initializeServices() {
    try {
      // Initialize email service
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.emailTransporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      }

      // Initialize SMS service
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.smsClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      }

      console.log('Notification services initialized');
    } catch (error) {
      console.error('Failed to initialize notification services:', error);
    }
  }

  async sendTradeNotification(userId, tradeData) {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { email_notifications, push_notifications } = user;
      const notifications = [];

      // Email notifications
      if (email_notifications.trades) {
        notifications.push(this.sendTradeEmail(user, tradeData));
      }

      if (email_notifications.profits && tradeData.profit > 0) {
        notifications.push(this.sendProfitEmail(user, tradeData));
      }

      if (email_notifications.losses && tradeData.profit < 0) {
        notifications.push(this.sendLossEmail(user, tradeData));
      }

      // SMS notifications
      if (user.phone && push_notifications.trades) {
        notifications.push(this.sendTradeSMS(user, tradeData));
      }

      if (user.phone && push_notifications.losses && tradeData.profit < 0) {
        notifications.push(this.sendLossSMS(user, tradeData));
      }

      // Push notifications
      if (push_notifications.trades) {
        notifications.push(this.sendPushNotification(user, tradeData));
      }

      // Store notification in database
      await this.storeNotification(userId, tradeData);

      // Send all notifications
      await Promise.allSettled(notifications);

      console.log(`Sent ${notifications.length} notifications for trade ${tradeData.id}`);

    } catch (error) {
      console.error('Failed to send trade notification:', error);
    }
  }

  async sendSystemAlert(userId, alertData) {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { email_notifications, push_notifications } = user;
      const notifications = [];

      // Email system alerts
      if (email_notifications.systemAlerts) {
        notifications.push(this.sendSystemEmail(user, alertData));
      }

      // SMS system alerts
      if (user.phone && push_notifications.systemAlerts) {
        notifications.push(this.sendSystemSMS(user, alertData));
      }

      // Push system alerts
      if (push_notifications.systemAlerts) {
        notifications.push(this.sendSystemPushNotification(user, alertData));
      }

      // Store alert in database
      await this.storeAlert(userId, alertData);

      // Send all notifications
      await Promise.allSettled(notifications);

      console.log(`Sent ${notifications.length} system alerts for user ${userId}`);

    } catch (error) {
      console.error('Failed to send system alert:', error);
    }
  }

  async sendTradeEmail(user, tradeData) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const { name, email } = user;
    const { symbol, direction, lotSize, entryPrice, exitPrice, profit, status } = tradeData;

    const subject = `Trade ${status}: ${direction} ${symbol}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Trade Notification</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: ${profit >= 0 ? '#28a745' : '#dc3545'}">
            ${direction} ${symbol}
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${status}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Lot Size:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${lotSize}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Entry Price:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${entryPrice}</td>
            </tr>
            ${exitPrice ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Exit Price:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${exitPrice}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Profit/Loss:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; color: ${profit >= 0 ? '#28a745' : '#dc3545'};">
                ${profit >= 0 ? '+' : ''}${profit?.toFixed(2) || 'N/A'}
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          This is an automated notification from your forex trading bot.
        </p>
      </div>
    `;

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@forexbot.com',
      to: email,
      subject,
      html
    });
  }

  async sendProfitEmail(user, tradeData) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const { name, email } = user;
    const { symbol, profit } = tradeData;

    const subject = `🎉 Profitable Trade: +${profit.toFixed(2)} on ${symbol}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">🎉 Profitable Trade!</h2>
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; border: 1px solid #c3e6cb;">
          <h3 style="margin-top: 0; color: #155724;">
            Congratulations! Your bot made a profitable trade.
          </h3>
          <p style="font-size: 18px; color: #155724;">
            <strong>Profit:</strong> +${profit.toFixed(2)}
          </p>
          <p style="font-size: 16px; color: #155724;">
            <strong>Symbol:</strong> ${symbol}
          </p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Keep up the great work! Your trading bot is performing well.
        </p>
      </div>
    `;

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@forexbot.com',
      to: email,
      subject,
      html
    });
  }

  async sendLossEmail(user, tradeData) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const { name, email } = user;
    const { symbol, profit } = tradeData;

    const subject = `⚠️ Loss Alert: ${profit.toFixed(2)} on ${symbol}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">⚠️ Loss Alert</h2>
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; border: 1px solid #f5c6cb;">
          <h3 style="margin-top: 0; color: #721c24;">
            Your bot experienced a loss on this trade.
          </h3>
          <p style="font-size: 18px; color: #721c24;">
            <strong>Loss:</strong> ${profit.toFixed(2)}
          </p>
          <p style="font-size: 16px; color: #721c24;">
            <strong>Symbol:</strong> ${symbol}
          </p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Don't worry, losses are part of trading. Your risk management is in place.
        </p>
      </div>
    `;

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@forexbot.com',
      to: email,
      subject,
      html
    });
  }

  async sendSystemEmail(user, alertData) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const { name, email } = user;
    const { type, message, severity } = alertData;

    const subject = `🚨 System Alert: ${type}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${severity === 'high' ? '#dc3545' : severity === 'medium' ? '#ffc107' : '#17a2b8'}">
          🚨 System Alert
        </h2>
        <div style="background-color: ${severity === 'high' ? '#f8d7da' : severity === 'medium' ? '#fff3cd' : '#d1ecf1'}; 
                    padding: 20px; border-radius: 8px; 
                    border: 1px solid ${severity === 'high' ? '#f5c6cb' : severity === 'medium' ? '#ffeaa7' : '#bee5eb'};">
          <h3 style="margin-top: 0; color: ${severity === 'high' ? '#721c24' : severity === 'medium' ? '#856404' : '#0c5460'};">
            ${type}
          </h3>
          <p style="font-size: 16px; color: ${severity === 'high' ? '#721c24' : severity === 'medium' ? '#856404' : '#0c5460'};">
            ${message}
          </p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Please check your trading bot dashboard for more details.
        </p>
      </div>
    `;

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@forexbot.com',
      to: email,
      subject,
      html
    });
  }

  async sendTradeSMS(user, tradeData) {
    if (!this.smsClient || !user.phone) {
      throw new Error('SMS service not configured or user phone not available');
    }

    const { symbol, direction, profit, status } = tradeData;
    const message = `Trade ${status}: ${direction} ${symbol} ${profit >= 0 ? '+' : ''}${profit?.toFixed(2) || 'N/A'}`;

    await this.smsClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phone
    });
  }

  async sendLossSMS(user, tradeData) {
    if (!this.smsClient || !user.phone) {
      throw new Error('SMS service not configured or user phone not available');
    }

    const { symbol, profit } = tradeData;
    const message = `⚠️ Loss Alert: ${symbol} ${profit.toFixed(2)}`;

    await this.smsClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phone
    });
  }

  async sendSystemSMS(user, alertData) {
    if (!this.smsClient || !user.phone) {
      throw new Error('SMS service not configured or user phone not available');
    }

    const { type, message } = alertData;
    const smsMessage = `🚨 ${type}: ${message}`;

    await this.smsClient.messages.create({
      body: smsMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phone
    });
  }

  async sendPushNotification(user, tradeData) {
    // Implementation would depend on the push notification service
    // (Firebase, OneSignal, etc.)
    console.log('Push notification not implemented yet');
  }

  async sendSystemPushNotification(user, alertData) {
    // Implementation would depend on the push notification service
    console.log('System push notification not implemented yet');
  }

  async getUser(userId) {
    try {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return user;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  async storeNotification(userId, tradeData) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'trade',
          title: `Trade ${tradeData.status}`,
          message: `${tradeData.direction} ${tradeData.symbol} ${tradeData.profit >= 0 ? '+' : ''}${tradeData.profit?.toFixed(2) || 'N/A'}`,
          data: tradeData,
          read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to store notification:', error);
      }
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  async storeAlert(userId, alertData) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'system',
          title: alertData.type,
          message: alertData.message,
          data: alertData,
          read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to store alert:', error);
      }
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Failed to mark notification as read:', error);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async getUserNotifications(userId, limit = 50) {
    try {
      const { data: notifications, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return notifications;
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      return [];
    }
  }
}

export const notificationService = new NotificationService();