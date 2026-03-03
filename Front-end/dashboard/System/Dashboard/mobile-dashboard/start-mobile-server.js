// Mobile Server Starter for MADAS Mobile Dashboard
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

// Create server
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    
    // Default to index.html
    if (filePath === './') {
        filePath = './index.html';
    }
    
    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';
    
    // Read file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found, serve index.html for SPA routing
                fs.readFile('./index.html', (error, content) => {
                    if (error) {
                        res.writeHead(500);
                        res.end('Server Error: ' + error.code);
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf-8');
        }
    });
});

// Start server
const PORT = 3001; // Different port for mobile dashboard
const IP = getLocalIP();

server.listen(PORT, () => {
    console.log('📱 MADAS Mobile Dashboard Server Started!');
    console.log('');
    console.log('📱 Access your Mobile Dashboard on your phone:');
    console.log(`   http://${IP}:${PORT}`);
    console.log('');
    console.log('🔧 Server Details:');
    console.log(`   Local IP: ${IP}`);
    console.log(`   Port: ${PORT}`);
    console.log('');
    console.log('📋 Mobile Setup Instructions:');
    console.log('1. Make sure your phone and computer are on the same WiFi network');
    console.log('2. Open your phone browser and go to the URL above');
    console.log('3. Add to home screen for app-like experience');
    console.log('');
    console.log('🎯 Mobile Features:');
    console.log('   • PWA (Progressive Web App) support');
    console.log('   • Offline functionality');
    console.log('   • Touch gestures');
    console.log('   • Mobile-optimized interface');
    console.log('   • Push notifications');
    console.log('');
    console.log('🛑 Press Ctrl+C to stop the server');
    console.log('');
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('❌ Port 3001 is already in use. Please try a different port.');
        console.log('   You can change the PORT variable in this file.');
    } else {
        console.error('❌ Server error:', err);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down mobile server...');
    server.close(() => {
        console.log('✅ Mobile server stopped.');
        process.exit(0);
    });
});