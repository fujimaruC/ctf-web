// Offline support and service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Cache API responses when offline
const cache = {
  set: (key, data) => {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {}
  },

  get: (key, maxAge = 5 * 60 * 1000) => { // 5 minutes default
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return parsed.data;
    } catch (e) {
      return null;
    }
  }
};

// Network status
let isOnline = navigator.onLine;
window.addEventListener('online', () => {
  isOnline = true;
  showToast('Back online!', 'success');
  // Retry failed requests
});

window.addEventListener('offline', () => {
  isOnline = false;
  showToast('You are offline. Some features may not work.', 'warning');
});

// Modified fetch with offline fallback
function offlineFetch(url, options = {}) {
  if (!isOnline) {
    const cached = cache.get(url);
    if (cached) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(cached)
      });
    }
    return Promise.reject(new Error('Offline and no cache available'));
  }

  return fetch(url, options)
    .then(response => {
      if (response.ok) {
        response.clone().json().then(data => cache.set(url, data));
      }
      return response;
    });
}