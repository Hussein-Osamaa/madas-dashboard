#!/bin/bash

# Start Local Server for Addict Website
# This fixes the CORS error

echo "🚀 Starting local server for Addict website..."
echo ""
echo "Choose your method:"
echo "1. Python 3 (recommended)"
echo "2. Python 2"
echo "3. Node.js (npx serve)"
echo "4. PHP"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo "Starting Python 3 server on port 8000..."
        python3 -m http.server 8000
        ;;
    2)
        echo "Starting Python 2 server on port 8000..."
        python -m SimpleHTTPServer 8000
        ;;
    3)
        echo "Starting Node.js server..."
        npx serve .
        ;;
    4)
        echo "Starting PHP server on port 8000..."
        php -S localhost:8000
        ;;
    *)
        echo "Invalid choice. Starting Python 3 server..."
        python3 -m http.server 8000
        ;;
esac

echo ""
echo "✅ Server started!"
echo "🌐 Open your browser and go to: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"

