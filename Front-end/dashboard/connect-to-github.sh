#!/bin/bash

# MADAS SaaS Platform - Connect to GitHub Repository using SSH
# Repository: git@github.com:Hussein-Osamaa/Undo.git
# This script runs from the main dashboard directory and navigates to sys

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

echo "🔐 MADAS SaaS Platform - Connect to GitHub Repository using SSH"
echo "Repository: git@github.com:Hussein-Osamaa/Undo.git"
echo "====================================================================="
echo ""

# Check if we're in the right directory and sys exists
if [ ! -d "sys" ]; then
    print_error "sys directory not found. Please run this script from the dashboard directory."
    echo "Current directory: $(pwd)"
    echo "Expected to find: sys/marketing-website, sys/admin-dashboard, sys/client-app, sys/shared"
    exit 1
fi

print_header "Step 1: Navigate to sys directory"
cd sys
print_success "Changed to sys directory"

# Check if we're in the right directory now
if [ ! -d "marketing-website" ] || [ ! -d "admin-dashboard" ] || [ ! -d "client-app" ] || [ ! -d "shared" ]; then
    print_error "Required project directories not found in sys/"
    echo "Expected: marketing-website/, admin-dashboard/, client-app/, shared/"
    exit 1
fi

print_success "All project directories found"

# Check SSH connection to GitHub
print_header "Step 2: Verify SSH Connection to GitHub"

print_status "Testing SSH connection to GitHub..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    print_success "SSH connection to GitHub verified"
elif ssh -T git@github.com 2>&1 | grep -q "Permission denied"; then
    print_warning "SSH key not set up or not authenticated"
    echo ""
    echo "To set up SSH authentication:"
    echo "1. Generate SSH key: ssh-keygen -t ed25519 -C 'your_email@example.com'"
    echo "2. Add to SSH agent: ssh-add ~/.ssh/id_ed25519"
    echo "3. Add to GitHub: cat ~/.ssh/id_ed25519.pub"
    echo "4. Copy the public key and add it to your GitHub account"
    echo ""
    echo "Or use HTTPS instead:"
    echo "git remote add origin https://github.com/Hussein-Osamaa/Undo.git"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_warning "Could not verify SSH connection, but continuing..."
fi

print_header "Step 3: Initialize Git Repository"

# Initialize Git repository
if [ ! -d ".git" ]; then
    print_status "Initializing Git repository..."
    git init
    print_success "Git repository initialized"
else
    print_warning "Git repository already exists"
fi

print_header "Step 4: Add Files to Git"

# Add all files
print_status "Adding files to Git..."
git add .

print_header "Step 5: Create Initial Commit"

# Commit changes
print_status "Creating initial commit..."
git commit -m "feat: Complete MADAS SaaS Platform

🏗️ Architecture:
- Marketing Website: Public-facing website for lead generation
- Admin Dashboard: Platform administration and management  
- Client App: Business management application for clients
- Shared Library: Common components, types, and utilities

✅ Features Completed:
- Marketing website with responsive design
- Admin dashboard with comprehensive management tools
- Client app with product management system
- Shared component library with reusable UI components
- Firebase integration with authentication and database
- Deployment configurations for all projects
- Sample data and testing tools
- Complete documentation and setup guides

🚀 Tech Stack:
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Firebase for backend services
- Vercel for deployment
- Multi-tenant SaaS architecture

📦 Projects:
- marketing-website/ (Port: 3000)
- admin-dashboard/ (Port: 3001)  
- client-app/ (Port: 3002)
- shared/ (Library)

Ready for production deployment and development!"

print_success "Initial commit created"

print_header "Step 6: Connect to GitHub Repository using SSH"

# Add remote origin using SSH
print_status "Adding SSH remote origin..."
git remote add origin git@github.com:Hussein-Osamaa/Undo.git

print_success "SSH remote origin added: git@github.com:Hussein-Osamaa/Undo.git"

print_header "Step 7: Push to GitHub using SSH"

print_status "Pushing to GitHub repository using SSH..."
git push -u origin main

print_success "Successfully pushed to GitHub using SSH!"

echo ""
echo "🎉 MADAS SaaS Platform is now connected to GitHub using SSH!"
echo ""
echo "📁 Repository: git@github.com:Hussein-Osamaa/Undo.git"
echo "🌐 Web URL: https://github.com/Hussein-Osamaa/Undo.git"
echo ""
echo "📊 What you've uploaded:"
echo "├── marketing-website/     # Public marketing website"
echo "├── admin-dashboard/       # Admin panel for platform management"
echo "├── client-app/           # Client business management application"
echo "├── shared/               # Shared components and utilities"
echo "├── README.md             # Complete project documentation"
echo "├── CONTRIBUTING.md       # Contribution guidelines"
echo "├── LICENSE               # MIT License"
echo "└── .gitignore            # Git ignore rules"
echo ""
echo "🚀 Next Steps:"
echo "1. Visit your repository: https://github.com/Hussein-Osamaa/Undo.git"
echo "2. Deploy to production using the deployment commands"
echo "3. Set up GitHub Actions for CI/CD"
echo "4. Share with your team"
echo ""
echo "🎯 Demo Credentials:"
echo "Admin Dashboard: admin@madas.com / admin123"
echo "Client App: demo@madas.com / demo123"
echo ""
echo "Your MADAS SaaS Platform is now live on GitHub using SSH! 🚀"
