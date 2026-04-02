// Notification system
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.container = null;
    this.init();
  }

  init() {
    // Create notification container
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 1000;
      max-width: 400px; pointer-events: none;
    `;
    document.body.appendChild(this.container);

    // Request permission for push notifications
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        this.requestPermission();
      }, 5000);
    }
  }

  requestPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }

  show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px 20px; margin-bottom: 10px;
      box-shadow: var(--shadow); pointer-events: auto; position: relative;
      animation: slideInRight 0.3s ease-out;
      border-left: 4px solid ${this.getColor(type)};
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div class="notification-icon">${this.getIcon(type)}</div>
        <div style="flex: 1;">
          <div class="notification-message" style="font-size: 14px; line-height: 1.4;">${message}</div>
        </div>
        <button class="notification-close" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1;" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    this.container.appendChild(notification);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentElement) {
          notification.style.animation = 'slideOutRight 0.3s ease-in';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }

    return notification;
  }

  getColor(type) {
    const colors = {
      success: 'var(--green)',
      error: 'var(--red)',
      warning: 'var(--yellow)',
      info: 'var(--blue)'
    };
    return colors[type] || colors.info;
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  // Browser notification
  notify(title, body, icon = '/favicon.ico') {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon });
    }
  }
}

// Global notification manager
const notifications = new NotificationManager();

// Override showToast to use notifications
window.showToast = (message, type = 'info', duration = 5000) => {
  notifications.show(message, type, duration);
};