#!/bin/bash

# Digix Dashboard - Quick Deployment Script
# This script automates the deployment process to Firebase Hosting

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════╗"
echo "║   Digix Dashboard - Firebase Deployment Script   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
echo -e "${BLUE}[1/8]${NC} Checking Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}✗ Firebase CLI not found!${NC}"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi
echo -e "${GREEN}✓ Firebase CLI installed${NC}"
echo ""

# Check if logged in to Firebase
echo -e "${BLUE}[2/8]${NC} Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ Not logged in to Firebase${NC}"
    echo "Logging in..."
    firebase login
else
    echo -e "${GREEN}✓ Authenticated with Firebase${NC}"
fi
echo ""

# Verify project
echo -e "${BLUE}[3/8]${NC} Verifying Firebase project..."
if [ ! -f ".firebaserc" ]; then
    echo -e "${RED}✗ .firebaserc not found!${NC}"
    echo "Run: firebase init hosting"
    exit 1
fi
PROJECT_ID=$(grep -o '"default": "[^"]*' .firebaserc | grep -o '[^"]*$')
echo -e "${GREEN}✓ Project: ${PROJECT_ID}${NC}"
echo ""

# Pre-deployment checks
echo -e "${BLUE}[4/8]${NC} Running pre-deployment checks..."

# Check for node_modules in subdirectories (should be excluded)
if [ -d "mobile-app/node_modules" ] || [ -d "multi-tenancy/node_modules" ]; then
    echo -e "${YELLOW}⚠ Warning: node_modules found in subdirectories${NC}"
    echo "  These will be excluded from deployment (configured in firebase.json)"
fi

# Check for .env file (should not be deployed)
if [ -f "../../../.env" ]; then
    echo -e "${YELLOW}⚠ Warning: .env file found in parent directory${NC}"
    echo "  Make sure it's in .gitignore and not being deployed"
fi

echo -e "${GREEN}✓ Pre-deployment checks passed${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}[5/8]${NC} Deployment target: ${PROJECT_ID}"
echo -e "      Hosting URL: https://${PROJECT_ID}.web.app"
echo ""
read -p "Continue with deployment? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}✗ Deployment cancelled${NC}"
    exit 1
fi

# Test locally first (optional)
echo ""
echo -e "${BLUE}[6/8]${NC} Would you like to test locally first?"
read -p "Start local server? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting Firebase emulator..."
    echo "Press Ctrl+C when done testing, then run this script again"
    firebase serve
    exit 0
fi

# Deploy
echo ""
echo -e "${BLUE}[7/8]${NC} Deploying to Firebase Hosting..."
echo ""
firebase deploy --only hosting

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ Deployment Successful!            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}[8/8]${NC} Post-deployment information:"
    echo ""
    echo -e "  🌐 Live URL: ${GREEN}https://${PROJECT_ID}.web.app${NC}"
    echo -e "  📊 Console: https://console.firebase.google.com/project/${PROJECT_ID}/hosting"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Test the live deployment"
    echo "  2. Verify login/logout works"
    echo "  3. Check Firebase Console for usage metrics"
    echo "  4. Share the URL with your team!"
    echo ""

    # Ask if user wants to open in browser
    read -p "Open deployment in browser? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Detect OS and open browser
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "https://${PROJECT_ID}.web.app"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open "https://${PROJECT_ID}.web.app"
        elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
            start "https://${PROJECT_ID}.web.app"
        fi
    fi
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ✗ Deployment Failed                 ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Check the error messages above and try again."
    echo "Common issues:"
    echo "  - Not logged in (run: firebase login)"
    echo "  - Wrong project (run: firebase use ${PROJECT_ID})"
    echo "  - Quota exceeded (check Firebase Console)"
    echo ""
    exit 1
fi
