// Global error handling and boundaries
class ErrorHandler {
  static init() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.logError(event.error, 'global');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.logError(event.reason, 'promise');
    });

    // Firebase error handler
    if (typeof firebase !== 'undefined') {
      firebase.auth().onAuthStateChanged(() => {}, (error) => {
        console.error('Auth error:', error);
        this.logError(error, 'auth');
      });
    }
  }

  static logError(error, context) {
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // In production, send to error reporting service
    console.error('Error logged:', errorData);

    // Show user-friendly error for critical errors
    if (this.isCriticalError(error)) {
      this.showCriticalError(error);
    }
  }

  static isCriticalError(error) {
    const criticalMessages = [
      'auth/network-request-failed',
      'firestore/unavailable',
      'permission-denied'
    ];

    return criticalMessages.some(msg => error.message?.includes(msg));
  }

  static showCriticalError(error) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
    `;

    overlay.innerHTML = `
      <div style="background: var(--bg-primary); padding: 32px; border-radius: 8px; max-width: 400px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="margin-bottom: 16px; color: var(--text-primary);">Something went wrong</h3>
        <p style="color: var(--text-muted); margin-bottom: 24px;">${error.message || 'An unexpected error occurred. Please refresh the page.'}</p>
        <button onclick="location.reload()" style="background: var(--accent); color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer;">Refresh Page</button>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  static async withErrorBoundary(fn, fallbackMessage = 'Operation failed') {
    try {
      return await fn();
    } catch (error) {
      console.error('Error boundary caught:', error);
      this.logError(error, 'boundary');
      throw new Error(fallbackMessage);
    }
  }
}

// Initialize error handling
ErrorHandler.init();