const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const config = require('./config/env');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const scanLogRoutes = require('./routes/scanLogs');
const returnRoutes = require('./routes/returns');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');

const app = express();

// CORS first (before other middleware) - allow localhost origins in dev
const origins = (config.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (reqOrigin, callback) => {
      // Allow requests with no origin (e.g. Postman, same-origin)
      if (!reqOrigin) return callback(null, true);
      // In development, allow localhost and common local IPs (e.g. 192.168.x.x for network access)
      if (config.NODE_ENV === 'development') {
        const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/;
        if (localOrigin.test(reqOrigin)) return callback(null, true);
      }
      // Check configured origins
      if (origins.length === 0 || origins.includes('*') || origins.includes(reqOrigin)) {
        return callback(null, origins.includes('*') ? '*' : reqOrigin);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(mongoSanitize());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limit
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'XDIGIX API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/scan-logs', scanLogRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Central error handler
app.use(errorHandler);

module.exports = app;
