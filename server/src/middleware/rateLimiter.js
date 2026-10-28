const config = require('../config/env');
const AppError = require('../errors/AppError');

// Simple in-memory sliding window rate limiter
const requestCounts = new Map();

// Periodic cleanup of expired window entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now - record.startTime > config.rateLimit.windowMs) {
      requestCounts.delete(key);
    }
  }
}, 120000).unref();

function rateLimiter(options = {}) {
  const windowMs = options.windowMs || config.rateLimit.windowMs;
  const max = options.max || config.rateLimit.max;

  return (req, res, next) => {
    // In test environment, bypass rate limiting
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';
    const key = `${ip}:${req.baseUrl || ''}`;
    const now = Date.now();

    const record = requestCounts.get(key);

    if (!record || now - record.startTime > windowMs) {
      requestCounts.set(key, { count: 1, startTime: now });
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      return next(
        AppError.rateLimit(
          `Too many requests from this IP. Please wait before trying again. Limit: ${max} req/${windowMs / 1000}s.`
        )
      );
    }

    next();
  };
}

module.exports = rateLimiter;
