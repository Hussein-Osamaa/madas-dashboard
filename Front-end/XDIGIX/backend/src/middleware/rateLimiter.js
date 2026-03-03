const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/**
 * General API rate limit
 */
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Don't count preflight
});

/**
 * Stricter limit for login to prevent brute force
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.LOGIN_RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many reset requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, loginLimiter, forgotPasswordLimiter };
