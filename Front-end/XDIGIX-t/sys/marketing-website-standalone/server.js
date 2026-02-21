/**
 * MADAS Marketing Website Server
 * Serves static HTML pages and handles API requests
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase (if credentials are available)
try {
  if (process.env.FIREBASE_PROJECT_ID) {
    // Using environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('✅ Firebase initialized with environment variables');
  } else if (require('fs').existsSync('./serviceAccountKey.json')) {
    // Using service account file
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase initialized with service account file');
  } else {
    console.log('⚠️  Firebase not initialized - set credentials to enable backend features');
  }
} catch (error) {
  console.log('⚠️  Firebase initialization skipped:', error.message);
}

// Serve static files (HTML pages)
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'pricing-new.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup-new.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about-new.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact-new.html'));
});

// API Routes
const registrationRoutes = require('./api/registration');
app.use('/api', registrationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    firebase: admin.apps.length > 0,
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

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🌐 MADAS Marketing Website Server                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

✅ Server running on: http://localhost:${PORT}

📄 Available Pages:
   → Landing:  http://localhost:${PORT}/
   → Pricing:  http://localhost:${PORT}/pricing-new.html
   → Signup:   http://localhost:${PORT}/signup-new.html
   → About:    http://localhost:${PORT}/about-new.html
   → Contact:  http://localhost:${PORT}/contact-new.html

🔧 API Endpoints:
   → POST /api/register
   → POST /api/contact
   → POST /api/newsletter/subscribe

💡 Health Check:
   → GET /health

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

 * MADAS Marketing Website Server
 * Serves static HTML pages and handles API requests
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase (if credentials are available)
try {
  if (process.env.FIREBASE_PROJECT_ID) {
    // Using environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('✅ Firebase initialized with environment variables');
  } else if (require('fs').existsSync('./serviceAccountKey.json')) {
    // Using service account file
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase initialized with service account file');
  } else {
    console.log('⚠️  Firebase not initialized - set credentials to enable backend features');
  }
} catch (error) {
  console.log('⚠️  Firebase initialization skipped:', error.message);
}

// Serve static files (HTML pages)
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'pricing-new.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup-new.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about-new.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact-new.html'));
});

// API Routes
const registrationRoutes = require('./api/registration');
app.use('/api', registrationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    firebase: admin.apps.length > 0,
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

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🌐 MADAS Marketing Website Server                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

✅ Server running on: http://localhost:${PORT}

📄 Available Pages:
   → Landing:  http://localhost:${PORT}/
   → Pricing:  http://localhost:${PORT}/pricing-new.html
   → Signup:   http://localhost:${PORT}/signup-new.html
   → About:    http://localhost:${PORT}/about-new.html
   → Contact:  http://localhost:${PORT}/contact-new.html

🔧 API Endpoints:
   → POST /api/register
   → POST /api/contact
   → POST /api/newsletter/subscribe

💡 Health Check:
   → GET /health

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
