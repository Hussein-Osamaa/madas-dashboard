/**
 * MADAS Marketing Website Server - Simplified Version
 * Works with Firebase client SDK (no service account required)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from marketing website
app.use(express.static(__dirname));

// Serve static files from parent directory (for dashboard assets)
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));
app.use('/E-comm', express.static(path.join(__dirname, '..', 'E-comm')));

// Routes for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'pricing.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve the main dashboard (from parent directory)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/**
 * POST /api/register
 * Register new business account (simplified version)
 */
app.post('/api/register', async (req, res) => {
  try {
    const {
      businessName,
      industry,
      businessEmail,
      phone,
      companySize,
      plan,
      userName,
      userEmail,
      password
    } = req.body;

    console.log('📝 Registration Data Received:');
    console.log('Business:', businessName, industry, companySize);
    console.log('Contact:', businessEmail, phone);
    console.log('Plan:', plan);
    console.log('User:', userName, userEmail);

    // Validation
    if (!businessName || !businessEmail || !industry || !companySize) {
      return res.status(400).json({ 
        error: 'Missing required business information' 
      });
    }

    if (!plan || !['basic', 'professional', 'enterprise'].includes(plan)) {
      return res.status(400).json({ 
        error: 'Invalid plan selected' 
      });
    }

    if (!userName || !userEmail || !password) {
      return res.status(400).json({ 
        error: 'Missing required account information' 
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock data
    const businessId = 'business_' + Date.now();
    const userId = 'user_' + Date.now();
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Mock successful response
    const response = {
      success: true,
      message: 'Account created successfully! Your 14-day trial has started.',
      user: {
        userId: userId,
        email: userEmail,
        name: userName
      },
      business: {
        businessId: businessId,
        businessName: businessName,
        plan: plan,
        trialEnds: trialEnd.toISOString(),
        industry: industry,
        companySize: companySize
      },
      token: 'token_' + Date.now(),
      firebase: false,
      mockData: {
        // This is what would be saved to Firebase
        business: {
          businessId,
          businessName,
          industry,
          companySize,
          contact: {
            email: businessEmail,
            phone: phone || ''
          },
          plan: {
            type: plan,
            status: 'trial',
            expiresAt: trialEnd.toISOString()
          },
          features: {
            pos: true,
            inventory: true,
            orders: true,
            customers: true,
            analytics: true,
            reports: true,
            advanced_reports: plan !== 'basic',
            gamification: plan !== 'basic',
            loyalty: plan !== 'basic',
            api_access: plan !== 'basic'
          },
          limits: {
            maxStaff: plan === 'basic' ? 5 : (plan === 'professional' ? 20 : -1),
            maxProducts: plan === 'basic' ? 500 : (plan === 'professional' ? 1000 : -1),
            maxStorage: plan === 'basic' ? 1 : (plan === 'professional' ? 50 : 500)
          }
        },
        user: {
          userId,
          name: userName,
          email: userEmail,
          businessId,
          role: 'owner'
        }
      }
    };

    console.log('✅ Registration completed successfully');
    console.log('📊 Business ID:', businessId);
    console.log('👤 User ID:', userId);
    console.log('🎯 Plan:', plan);
    console.log('📅 Trial ends:', trialEnd.toLocaleDateString());

    res.status(201).json(response);

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
        name: email.split('@')[0], // Mock name from email
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
    console.log('From:', name, email);
    console.log('Subject:', subject);
    console.log('Message:', message.substring(0, 100) + '...');

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log('✅ Contact form submitted successfully');

    res.json({
      success: true,
      message: 'Message sent successfully. We\'ll get back to you soon!'
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to send message. Please try again.' 
    });
  }
});

/**
 * POST /api/newsletter/subscribe
 * Newsletter subscription
 */
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;

    console.log('📰 Newsletter Subscription:', email, name);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('✅ Newsletter subscription successful');

    res.json({
      success: true,
      message: 'Successfully subscribed to our newsletter!'
    });

  } catch (error) {
    console.error('❌ Newsletter error:', error);
    res.status(500).json({ 
      error: 'Failed to subscribe. Please try again.' 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'simplified',
    timestamp: new Date().toISOString() 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Page Not Found</title>
      <style>
        body {
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
          color: white;
        }
        .container {
          text-align: center;
        }
        h1 { font-size: 4rem; margin: 0; }
        p { font-size: 1.5rem; margin: 1rem 0; }
        a {
          display: inline-block;
          margin-top: 2rem;
          padding: 1rem 2rem;
          background: white;
          color: #6366F1;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
        }
        a:hover { transform: translateY(-2px); }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404</h1>
        <p>Oops! Page not found.</p>
        <a href="/">Go Home</a>
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 MADAS Marketing Website (Simplified)                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

✅ Server running on:
   → Local:   http://localhost:${PORT}
   → Network: http://${localIP}:${PORT}

📄 Available Pages:
   → Landing:   http://localhost:${PORT}/
   → Pricing:   http://localhost:${PORT}/pricing
   → Signup:    http://localhost:${PORT}/signup
   → Login:     http://localhost:${PORT}/login
   → Dashboard: http://localhost:${PORT}/dashboard ⭐
   → About:     http://localhost:${PORT}/about
   → Contact:   http://localhost:${PORT}/contact

🔧 API Endpoints (Working):
   → POST /api/register ✅
   → POST /api/login ✅
   → POST /api/contact ✅
   → POST /api/newsletter/subscribe ✅

💡 Health Check:
   → GET /health

🎯 Ready to test your signup form!
📊 Registration data will be logged to console

Press Ctrl+C to stop the server
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
  });
});

 * Works with Firebase client SDK (no service account required)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from marketing website
app.use(express.static(__dirname));

// Serve static files from parent directory (for dashboard assets)
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));
app.use('/E-comm', express.static(path.join(__dirname, '..', 'E-comm')));

// Routes for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'pricing.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve the main dashboard (from parent directory)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/**
 * POST /api/register
 * Register new business account (simplified version)
 */
app.post('/api/register', async (req, res) => {
  try {
    const {
      businessName,
      industry,
      businessEmail,
      phone,
      companySize,
      plan,
      userName,
      userEmail,
      password
    } = req.body;

    console.log('📝 Registration Data Received:');
    console.log('Business:', businessName, industry, companySize);
    console.log('Contact:', businessEmail, phone);
    console.log('Plan:', plan);
    console.log('User:', userName, userEmail);

    // Validation
    if (!businessName || !businessEmail || !industry || !companySize) {
      return res.status(400).json({ 
        error: 'Missing required business information' 
      });
    }

    if (!plan || !['basic', 'professional', 'enterprise'].includes(plan)) {
      return res.status(400).json({ 
        error: 'Invalid plan selected' 
      });
    }

    if (!userName || !userEmail || !password) {
      return res.status(400).json({ 
        error: 'Missing required account information' 
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock data
    const businessId = 'business_' + Date.now();
    const userId = 'user_' + Date.now();
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Mock successful response
    const response = {
      success: true,
      message: 'Account created successfully! Your 14-day trial has started.',
      user: {
        userId: userId,
        email: userEmail,
        name: userName
      },
      business: {
        businessId: businessId,
        businessName: businessName,
        plan: plan,
        trialEnds: trialEnd.toISOString(),
        industry: industry,
        companySize: companySize
      },
      token: 'token_' + Date.now(),
      firebase: false,
      mockData: {
        // This is what would be saved to Firebase
        business: {
          businessId,
          businessName,
          industry,
          companySize,
          contact: {
            email: businessEmail,
            phone: phone || ''
          },
          plan: {
            type: plan,
            status: 'trial',
            expiresAt: trialEnd.toISOString()
          },
          features: {
            pos: true,
            inventory: true,
            orders: true,
            customers: true,
            analytics: true,
            reports: true,
            advanced_reports: plan !== 'basic',
            gamification: plan !== 'basic',
            loyalty: plan !== 'basic',
            api_access: plan !== 'basic'
          },
          limits: {
            maxStaff: plan === 'basic' ? 5 : (plan === 'professional' ? 20 : -1),
            maxProducts: plan === 'basic' ? 500 : (plan === 'professional' ? 1000 : -1),
            maxStorage: plan === 'basic' ? 1 : (plan === 'professional' ? 50 : 500)
          }
        },
        user: {
          userId,
          name: userName,
          email: userEmail,
          businessId,
          role: 'owner'
        }
      }
    };

    console.log('✅ Registration completed successfully');
    console.log('📊 Business ID:', businessId);
    console.log('👤 User ID:', userId);
    console.log('🎯 Plan:', plan);
    console.log('📅 Trial ends:', trialEnd.toLocaleDateString());

    res.status(201).json(response);

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
        name: email.split('@')[0], // Mock name from email
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
    console.log('From:', name, email);
    console.log('Subject:', subject);
    console.log('Message:', message.substring(0, 100) + '...');

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log('✅ Contact form submitted successfully');

    res.json({
      success: true,
      message: 'Message sent successfully. We\'ll get back to you soon!'
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to send message. Please try again.' 
    });
  }
});

/**
 * POST /api/newsletter/subscribe
 * Newsletter subscription
 */
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;

    console.log('📰 Newsletter Subscription:', email, name);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('✅ Newsletter subscription successful');

    res.json({
      success: true,
      message: 'Successfully subscribed to our newsletter!'
    });

  } catch (error) {
    console.error('❌ Newsletter error:', error);
    res.status(500).json({ 
      error: 'Failed to subscribe. Please try again.' 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'simplified',
    timestamp: new Date().toISOString() 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Page Not Found</title>
      <style>
        body {
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
          color: white;
        }
        .container {
          text-align: center;
        }
        h1 { font-size: 4rem; margin: 0; }
        p { font-size: 1.5rem; margin: 1rem 0; }
        a {
          display: inline-block;
          margin-top: 2rem;
          padding: 1rem 2rem;
          background: white;
          color: #6366F1;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
        }
        a:hover { transform: translateY(-2px); }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404</h1>
        <p>Oops! Page not found.</p>
        <a href="/">Go Home</a>
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 MADAS Marketing Website (Simplified)                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

✅ Server running on:
   → Local:   http://localhost:${PORT}
   → Network: http://${localIP}:${PORT}

📄 Available Pages:
   → Landing:   http://localhost:${PORT}/
   → Pricing:   http://localhost:${PORT}/pricing
   → Signup:    http://localhost:${PORT}/signup
   → Login:     http://localhost:${PORT}/login
   → Dashboard: http://localhost:${PORT}/dashboard ⭐
   → About:     http://localhost:${PORT}/about
   → Contact:   http://localhost:${PORT}/contact

🔧 API Endpoints (Working):
   → POST /api/register ✅
   → POST /api/login ✅
   → POST /api/contact ✅
   → POST /api/newsletter/subscribe ✅

💡 Health Check:
   → GET /health

🎯 Ready to test your signup form!
📊 Registration data will be logged to console

Press Ctrl+C to stop the server
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
  });
});
