// Rate limiting for forms and API calls
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  canAttempt(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(time => now - time < this.windowMs);

    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Add new attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);

    return true;
  }

  getRemainingTime(key) {
    const userAttempts = this.attempts.get(key) || [];
    if (userAttempts.length === 0) return 0;

    const now = Date.now();
    const oldestAttempt = Math.min(...userAttempts);
    const timeLeft = this.windowMs - (now - oldestAttempt);

    return Math.max(0, timeLeft);
  }

  reset(key) {
    this.attempts.delete(key);
  }
}

// Global rate limiters
const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const registerLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour
const flagSubmitLimiter = new RateLimiter(10, 5 * 60 * 1000); // 10 attempts per 5 minutes

// Rate limit wrapper for async functions
function withRateLimit(limiter, key, fn, errorMessage = 'Too many attempts. Please try again later.') {
  return async (...args) => {
    if (!limiter.canAttempt(key)) {
      const remainingMs = limiter.getRemainingTime(key);
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      throw new Error(`${errorMessage} Try again in ${remainingMinutes} minute(s).`);
    }

    try {
      const result = await fn(...args);
      // Reset on success for login/register
      if (limiter === loginLimiter || limiter === registerLimiter) {
        limiter.reset(key);
      }
      return result;
    } catch (error) {
      // Don't reset on failure
      throw error;
    }
  };
}