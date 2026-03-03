#!/usr/bin/env python3
"""
Simple HTTP server for the Next Gen Coders website
Run with: python3 server.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        # Serve index.html for root path
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

def main():
    # Change to the directory containing this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Check if port is available
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print("=" * 60)
            print("🚀 NEXT GEN CODERS - FUTURISTIC WEBSITE")
            print("=" * 60)
            print(f"🌐 Server running at: http://localhost:{PORT}")
            print(f"📁 Serving files from: {os.getcwd()}")
            print("=" * 60)
            print("✨ Features:")
            print("   • Liquid glass design")
            print("   • Smooth animations")
            print("   • Responsive layout")
            print("   • Interactive effects")
            print("=" * 60)
            print("🛑 Press Ctrl+C to stop the server")
            print("=" * 60)
            
            # Try to open browser automatically
            try:
                webbrowser.open(f'http://localhost:{PORT}')
                print("🌐 Browser opened automatically")
            except:
                print("⚠️  Could not open browser automatically")
                print(f"   Please open: http://localhost:{PORT}")
            
            print("\n🎉 Website is ready!")
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use")
            print("   Try closing other servers or use a different port")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        print("👋 Thanks for using Next Gen Coders!")

if __name__ == "__main__":
    main()






