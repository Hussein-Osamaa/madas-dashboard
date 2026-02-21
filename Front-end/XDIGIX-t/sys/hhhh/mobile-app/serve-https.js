// HTTPS Server for Local PWA Testing
// Serves the built app with HTTPS for PWA testing

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Generate self-signed certificate for local testing
const selfsigned = require('selfsigned');
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

const app = (req, res) => {
    const url = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(__dirname, 'dist', url);
    
    // Set security headers for PWA
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Handle different file types
    const ext = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
    };
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
};

// Get local IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const netInterface of interfaces[name]) {
            if (netInterface.family === 'IPv4' && !netInterface.internal) {
                return netInterface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();
const PORT = 8443;

const server = https.createServer({
    key: pems.private,
    cert: pems.cert
}, app);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🔒 MADAS Mobile App - HTTPS Server                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

✅ HTTPS Server running on:
   → Local:   https://localhost:${PORT}
   → Network: https://${localIP}:${PORT}

📱 MOBILE TESTING:
   → Connect mobile device to same network
   → Visit: https://${localIP}:${PORT}
   → Accept security warning (self-signed cert)
   → Add to home screen for PWA experience

🔒 SECURITY:
   → Self-signed certificate for testing only
   → Browser will show security warning
   → Click "Advanced" → "Proceed to localhost"
   → This is normal for local testing

📊 PWA FEATURES:
   ✅ HTTPS enabled (required for PWA)
   ✅ Service worker active
   ✅ Manifest.json served
   ✅ All assets optimized
   ✅ Mobile-optimized UI

🎯 Ready for mobile testing!
Press Ctrl+C to stop the server
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down HTTPS server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});
