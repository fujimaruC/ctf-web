// Rate limiting for flag submissions

class RateLimiter {
  constructor(maxAttempts = 10, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = {};
  }

  isLimited(key) {
    const now = Date.now();
    if (!this.attempts[key]) {
      this.attempts[key] = [now];
      return false;
    }

    const recentAttempts = this.attempts[key].filter(t => now - t < this.windowMs);
    this.attempts[key] = recentAttempts;

    if (recentAttempts.length >= this.maxAttempts) {
      return true;
    }

    recentAttempts.push(now);
    this.attempts[key] = recentAttempts;
    return false;
  }

  getRemainingTime(key) {
    if (!this.attempts[key] || this.attempts[key].length === 0) return 0;
    const oldest = Math.min(...this.attempts[key]);
    return Math.max(0, this.windowMs - (Date.now() - oldest));
  }

  reset(key) {
    delete this.attempts[key];
  }
}

// Global rate limiter instance
const flagSubmissionLimiter = new RateLimiter(10, 60000);

function checkFlagRateLimit(userId) {
  if (flagSubmissionLimiter.isLimited(userId)) {
    const remaining = Math.ceil(flagSubmissionLimiter.getRemainingTime(userId) / 1000);
    showToast(`Too many attempts. Try again in ${remaining}s.`, 'error');
    return false;
  }
  return true;
}
