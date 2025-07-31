/**
 * Optional Notification Manager
 * Sistem notifikasi yang dapat diaktifkan/nonaktifkan sesuai preferensi user
 */

import toast from 'react-hot-toast';

class NotificationManager {
  constructor() {
    this.channels = {
      browser: true,
      email: false,
      whatsapp: false,
      telegram: false,
      sound: true
    };
    
    this.preferences = {
      tradingSignals: true,
      priceAlerts: true,
      orderExecutions: true,
      systemAlerts: true,
      marketNews: false,
      performance: true
    };

    this.sounds = {
      success: '/sounds/success.mp3',
      warning: '/sounds/warning.mp3',
      error: '/sounds/error.mp3',
      signal: '/sounds/signal.mp3'
    };

    this.init();
  }

  /**
   * Initialize notification system
   */
  async init() {
    try {
      // Load user preferences from localStorage
      this.loadPreferences();
      
      // Request browser notification permission if enabled
      if (this.channels.browser && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }

      console.log('Notification Manager initialized');
    } catch (error) {
      console.error('Error initializing notification manager:', error);
    }
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences() {
    try {
      const savedChannels = localStorage.getItem('notification_channels');
      const savedPreferences = localStorage.getItem('notification_preferences');

      if (savedChannels) {
        this.channels = { ...this.channels, ...JSON.parse(savedChannels) };
      }

      if (savedPreferences) {
        this.preferences = { ...this.preferences, ...JSON.parse(savedPreferences) };
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences() {
    try {
      localStorage.setItem('notification_channels', JSON.stringify(this.channels));
      localStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  }

  /**
   * Update notification channels
   */
  updateChannels(channels) {
    this.channels = { ...this.channels, ...channels };
    this.savePreferences();
  }

  /**
   * Update notification preferences
   */
  updatePreferences(preferences) {
    this.preferences = { ...this.preferences, ...preferences };
    this.savePreferences();
  }

  /**
   * Send notification based on type and user preferences
   */
  async notify(type, title, message, options = {}) {
    try {
      // Check if this type of notification is enabled
      if (!this.preferences[type]) {
        return;
      }

      const notificationData = {
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        ...options
      };

      // Send through enabled channels
      const promises = [];

      if (this.channels.browser) {
        promises.push(this.sendBrowserNotification(notificationData));
      }

      if (this.channels.sound) {
        promises.push(this.playSound(notificationData.priority || 'info'));
      }

      // Always show toast notification
      this.showToast(notificationData);

      // Optional channels (require configuration)
      if (this.channels.email && options.email) {
        promises.push(this.sendEmailNotification(notificationData));
      }

      if (this.channels.whatsapp && options.whatsapp) {
        promises.push(this.sendWhatsAppNotification(notificationData));
      }

      if (this.channels.telegram && options.telegram) {
        promises.push(this.sendTelegramNotification(notificationData));
      }

      await Promise.allSettled(promises);

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send browser notification
   */
  async sendBrowserNotification(data) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      const notification = new Notification(data.title, {
        body: data.message,
        icon: data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.type,
        requireInteraction: data.priority === 'high',
        actions: data.actions || []
      });

      // Auto close after 5 seconds unless high priority
      if (data.priority !== 'high') {
        setTimeout(() => notification.close(), 5000);
      }

      notification.onclick = () => {
        window.focus();
        if (data.onClick) {
          data.onClick();
        }
        notification.close();
      };

    } catch (error) {
      console.error('Error sending browser notification:', error);
    }
  }

  /**
   * Show toast notification
   */
  showToast(data) {
    try {
      const toastOptions = {
        duration: data.priority === 'high' ? 8000 : 4000,
        position: 'top-right',
        style: {
          background: this.getToastColor(data.priority),
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px'
        }
      };

      switch (data.priority) {
        case 'high':
        case 'error':
          toast.error(data.message, toastOptions);
          break;
        case 'warning':
          toast.error(data.message, { ...toastOptions, style: { ...toastOptions.style, background: '#f59e0b' } });
          break;
        case 'success':
          toast.success(data.message, toastOptions);
          break;
        default:
          toast(data.message, toastOptions);
      }

    } catch (error) {
      console.error('Error showing toast:', error);
    }
  }

  /**
   * Play notification sound
   */
  async playSound(priority) {
    try {
      if (!this.channels.sound) return;

      let soundFile;
      switch (priority) {
        case 'error':
        case 'high':
          soundFile = this.sounds.error;
          break;
        case 'warning':
          soundFile = this.sounds.warning;
          break;
        case 'success':
          soundFile = this.sounds.success;
          break;
        default:
          soundFile = this.sounds.signal;
      }

      const audio = new Audio(soundFile);
      audio.volume = 0.3; // 30% volume
      await audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      });

    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  /**
   * Send email notification (optional)
   */
  async sendEmailNotification(data) {
    try {
      if (!data.email) return;

      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: data.email,
          subject: data.title,
          message: data.message,
          type: data.type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email notification');
      }

    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  /**
   * Send WhatsApp notification (optional)
   */
  async sendWhatsAppNotification(data) {
    try {
      if (!data.whatsapp) return;

      const response = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: data.whatsapp,
          message: `*${data.title}*\n\n${data.message}`,
          type: data.type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send WhatsApp notification');
      }

    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }
  }

  /**
   * Send Telegram notification (optional)
   */
  async sendTelegramNotification(data) {
    try {
      if (!data.telegram) return;

      const response = await fetch('/api/notifications/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId: data.telegram,
          message: `<b>${data.title}</b>\n\n${data.message}`,
          type: data.type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send Telegram notification');
      }

    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }

  /**
   * Get toast color based on priority
   */
  getToastColor(priority) {
    switch (priority) {
      case 'high':
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'success':
        return '#10b981';
      default:
        return '#3b82f6';
    }
  }

  /**
   * Trading signal notification
   */
  async notifyTradingSignal(signal) {
    await this.notify('tradingSignals', 
      `Signal Trading: ${signal.action}`,
      `${signal.instrument} - ${signal.action} pada ${signal.price}\nSL: ${signal.stopLoss} | TP: ${signal.takeProfit}\nConfidence: ${Math.round(signal.confidence * 100)}%`,
      {
        priority: 'high',
        icon: '/icons/signal.png',
        onClick: () => window.location.href = '/dashboard/trading'
      }
    );
  }

  /**
   * Price alert notification
   */
  async notifyPriceAlert(alert) {
    await this.notify('priceAlerts',
      `Price Alert: ${alert.instrument}`,
      `Harga ${alert.instrument} telah mencapai ${alert.targetPrice}`,
      {
        priority: 'warning',
        icon: '/icons/alert.png'
      }
    );
  }

  /**
   * Order execution notification
   */
  async notifyOrderExecution(order) {
    const isProfit = order.profit > 0;
    await this.notify('orderExecutions',
      `Order ${order.action}: ${isProfit ? 'Profit' : 'Loss'}`,
      `${order.instrument} - ${order.action}\nP&L: ${order.profit > 0 ? '+' : ''}${order.profit.toFixed(2)} USD`,
      {
        priority: isProfit ? 'success' : 'warning',
        icon: isProfit ? '/icons/profit.png' : '/icons/loss.png'
      }
    );
  }

  /**
   * System alert notification
   */
  async notifySystemAlert(alert) {
    await this.notify('systemAlerts',
      `System Alert: ${alert.title}`,
      alert.message,
      {
        priority: alert.level || 'info',
        icon: '/icons/system.png'
      }
    );
  }

  /**
   * Performance update notification
   */
  async notifyPerformance(performance) {
    await this.notify('performance',
      'Performance Update',
      `Win Rate: ${performance.winRate}%\nTotal Profit: ${performance.totalProfit.toFixed(2)} USD\nDrawdown: ${performance.drawdown}%`,
      {
        priority: 'info',
        icon: '/icons/performance.png'
      }
    );
  }

  /**
   * Get current preferences
   */
  getPreferences() {
    return {
      channels: { ...this.channels },
      preferences: { ...this.preferences }
    };
  }

  /**
   * Test notification
   */
  async testNotification() {
    await this.notify('systemAlerts',
      'Test Notification',
      'Sistem notifikasi berfungsi dengan baik!',
      {
        priority: 'success',
        icon: '/icons/test.png'
      }
    );
  }

  /**
   * Enable/disable all notifications
   */
  toggleAll(enabled) {
    Object.keys(this.preferences).forEach(key => {
      this.preferences[key] = enabled;
    });
    this.savePreferences();
  }

  /**
   * Get notification statistics
   */
  getStats() {
    const sent = parseInt(localStorage.getItem('notifications_sent') || '0');
    const clicked = parseInt(localStorage.getItem('notifications_clicked') || '0');
    
    return {
      sent,
      clicked,
      clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : 0
    };
  }

  /**
   * Increment notification stats
   */
  incrementStats(type) {
    const current = parseInt(localStorage.getItem(`notifications_${type}`) || '0');
    localStorage.setItem(`notifications_${type}`, (current + 1).toString());
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

export default notificationManager;