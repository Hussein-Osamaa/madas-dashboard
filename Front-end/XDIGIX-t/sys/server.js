/**
 * DIGIX Complete System Server
 * Serves both Marketing Website and Dashboard Application
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin (lazy-loaded via helper)
require('./lib/firebaseAdmin');
const workspaceOrgAuth = require('./middleware/workspaceOrgAuth');
const financeAccountsRouter = require('./api/finance/accounts');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add CSP headers for development
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; connect-src 'self' https: wss: ws: http://localhost:* http://127.0.0.1:*; img-src 'self' data: https:; font-src 'self' https:; style-src 'self' 'unsafe-inline' https:;");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// STATIC FILE SERVING
// ============================================================================

// Serve Dashboard application at /dashboard
app.use('/dashboard', express.static(path.join(__dirname, 'Dashboard')));

// Also serve Dashboard static files at root (for /pages/, /assets/, /js/, /css/ paths)
app.use('/pages', express.static(path.join(__dirname, 'Dashboard', 'pages')));
app.use('/assets', express.static(path.join(__dirname, 'Dashboard', 'assets')));
app.use('/js', express.static(path.join(__dirname, 'Dashboard', 'js')));
app.use('/css', express.static(path.join(__dirname, 'Dashboard', 'css')));

// Dashboard root route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'Dashboard', 'index.html'));
});

// Dashboard root route with trailing slash
app.get('/dashboard/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Dashboard', 'index.html'));
});

// Serve Finance React build if available
const financeDistPath = path.join(__dirname, 'apps', 'finance', 'dist');
if (fs.existsSync(financeDistPath)) {
  app.use(
    '/finance',
    express.static(financeDistPath, {
      maxAge: '1h'
    })
  );

  app.get(['/finance', '/finance/*'], (req, res) => {
    res.sendFile(path.join(financeDistPath, 'index.html'));
  });
}

// Serve Marketing Website
app.use(express.static(path.join(__dirname, 'marketing-website-standalone')));

// ============================================================================
// MARKETING WEBSITE ROUTES
// ============================================================================

// Root route - serve marketing website (only if not already handled by static files)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketing-website-standalone', 'index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketing-website-standalone', 'pricing.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketing-website-standalone', 'signup.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve admin login page
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/setup-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketing-website-standalone', 'setup-password.html'));
});

app.get('/create-test-user', (req, res) => {
  res.sendFile(path.join(__dirname, 'create-test-user.html'));
});

app.get('/initialize-multi-tenancy', (req, res) => {
  res.sendFile(path.join(__dirname, 'Dashboard/multi-tenancy/initialize-data.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketing-website-standalone', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'marketing-website-standalone', 'contact.html'));
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content - prevents 404 errors
});

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'Dashboard', 'index.html'));
});

app.get('/dashboard/no-access', (req, res) => {
  res.sendFile(path.join(__dirname, 'Dashboard', 'no-access.html'));
});

// Fix double slash issue in dashboard routes
app.get('/dashboard//*', (req, res) => {
  const cleanPath = req.path.replace(/\/+/g, '/'); // Remove multiple slashes
  res.redirect(cleanPath);
});

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.use('/api/:workspaceId/:orgId/finance/accounts', workspaceOrgAuth, financeAccountsRouter);

/**
 * POST /api/register
 * Register new business account
 */
app.post('/api/register', async (req, res) => {
  try {
    const {
      businessName, industry, businessEmail, phone, companySize,
      plan,
      userName, userEmail, password
    } = req.body;

    console.log('📝 Registration Data Received:');
    console.log('Business:', businessName, industry, companySize);
    console.log('Contact:', businessEmail, phone);
    console.log('Plan:', plan);
    console.log('User:', userName, userEmail);

    // Validate required fields
    if (!businessName || !businessEmail || !plan || !userName || !userEmail || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Please fill in all required fields.' 
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock successful registration
    const mockBusinessId = `business_${Date.now()}`;
    const mockUserId = `user_${Date.now()}`;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14 day trial

    console.log('✅ Registration completed successfully');
    console.log('📊 Business ID:', mockBusinessId);
    console.log('👤 User ID:', mockUserId);
    console.log('🎯 Plan:', plan);
    console.log('📅 Trial ends:', trialEnd.toISOString());

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        userId: mockUserId,
        email: userEmail,
        name: userName,
        role: 'owner'
      },
      business: {
        businessId: mockBusinessId,
        businessName: businessName,
        plan: plan,
        trialEnds: trialEnd.toISOString()
      },
      token: `token_${Date.now()}`
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.' 
    });
  }
});

/**
 * POST /api/login
 * Handle user login
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    console.log('🔐 Login attempt:', { email, rememberMe });

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful login
    const response = {
      success: true,
      message: 'Login successful',
      user: {
        userId: 'user_' + Date.now(),
        email: email,
        name: email.split('@')[0],
        role: 'owner'
      },
      business: {
        businessId: 'business_' + Date.now(),
        businessName: 'Sample Business',
        plan: 'professional'
      },
      token: 'token_' + Date.now(),
      rememberMe: rememberMe
    };

    console.log('✅ Login successful for:', email);

    res.json(response);

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(401).json({ 
      error: 'Invalid email or password',
      message: 'Please check your credentials and try again.'
    });
  }
});

/**
 * POST /api/contact
 * Handle contact form submissions
 */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    console.log('📧 Contact Form Received:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Subject:', subject);

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('✅ Contact form processed');

    res.json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.'
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      message: 'Please try again later.'
    });
  }
});

/**
 * POST /api/newsletter/subscribe
 * Newsletter subscription
 */
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📬 Newsletter subscription:', email);

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('✅ Newsletter subscription successful');

    res.json({
      success: true,
      message: 'Successfully subscribed to newsletter!'
    });

  } catch (error) {
    console.error('❌ Newsletter subscription error:', error);
    res.status(500).json({ 
      error: 'Subscription failed',
      message: 'Please try again later.'
    });
  }
});

/**
 * POST /api/send-invitation
 * Send staff invitation email
 */
const sendInvitationHandler = require('./Dashboard/api/send-invitation');
app.post('/api/send-invitation', sendInvitationHandler);

/**
 * POST /api/setup-password
 * Setup password for invited staff
 */
const setupPasswordHandler = require('./Dashboard/api/setup-password');
app.post('/api/setup-password', setupPasswordHandler);

// ============================================================================
// WEBSITE BUILDER API
// ============================================================================

const { publishWebsite } = require('./api/website/publish');
app.post('/api/website/publish', publishWebsite);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'production',
    timestamp: new Date().toISOString(),
    services: {
      marketing: 'running',
      dashboard: 'running',
      api: 'running'
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Page Not Found</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
          color: white;
        }
        .container {
          text-align: center;
        }
        h1 { font-size: 6rem; margin: 0; }
        p { font-size: 1.5rem; }
        a {
          color: white;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404</h1>
        <p>Page not found</p>
        <a href="/">Return to homepage</a>
      </div>
    </body>
    </html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// ============================================================================
// SERVER START
// ============================================================================

// Get local IP address
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// ============================================================================
// 404 HANDLER - MUST BE LAST
// ============================================================================

// Handle all unmatched routes
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  
  // If it's a dashboard route that doesn't exist, redirect to dashboard
  if (req.path.startsWith('/dashboard')) {
    return res.redirect('/dashboard');
  }
  
  // Otherwise redirect to marketing website home
  res.redirect('/');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 DIGIX Complete System Server                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

✅ Server running on:
   → Local:   http://localhost:${PORT}
   → Network: http://${localIP}:${PORT}

📱 MARKETING WEBSITE:
   → Landing:   http://${localIP}:${PORT}/
   → Pricing:   http://${localIP}:${PORT}/pricing
   → Signup:    http://${localIP}:${PORT}/signup
   → Login:     http://${localIP}:${PORT}/login
   → Admin:     http://${localIP}:${PORT}/admin-login 🔐
   → About:     http://${localIP}:${PORT}/about
   → Contact:   http://${localIP}:${PORT}/contact

💼 DASHBOARD APPLICATION:
   → Dashboard: http://${localIP}:${PORT}/dashboard ⭐
   → Orders:    http://${localIP}:${PORT}/dashboard/pages/orders.html
   → POS:       http://${localIP}:${PORT}/dashboard/pages/pos.html
   → Products:  http://${localIP}:${PORT}/dashboard/pages/products.html
   → Customers: http://${localIP}:${PORT}/dashboard/pages/Customer.html
   → Staff:     http://${localIP}:${PORT}/dashboard/pages/Admin.html

🔧 API ENDPOINTS:
   → POST /api/register ✅
   → POST /api/login ✅
   → POST /api/contact ✅
   → POST /api/newsletter/subscribe ✅
   → POST /api/send-invitation ✅ 📧
   → POST /api/setup-password ✅ 🔐
   → POST /api/website/publish ✅ 🌐

💡 HEALTH CHECK:
   → GET /health

📊 Features:
   ✅ Marketing Website (Public)
   ✅ Dashboard Application (Authenticated)
   ✅ Multi-Tenancy System
   ✅ Complete API Suite

🎯 Ready for testing!
Press Ctrl+C to stop the server
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down gracefully...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down gracefully...');
  process.exit(0);
});
