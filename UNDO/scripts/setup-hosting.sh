#!/bin/bash

# Firebase Hosting Setup Script
# This script sets up Firebase hosting targets for the Madas platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Firebase Hosting for Madas Platform${NC}"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed. Please install it first:${NC}"
    echo -e "${YELLOW}npm install -g firebase-tools${NC}"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}🔐 Please log in to Firebase:${NC}"
    firebase login
fi

# Function to create hosting target
create_hosting_target() {
    local target_name=$1
    local site_name=$2
    local environment=$3
    
    echo -e "${BLUE}📋 Creating hosting target: ${target_name}${NC}"
    
    # Create the hosting target
    firebase target:apply hosting ${target_name} ${site_name} --project ${environment}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Hosting target ${target_name} created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create hosting target ${target_name}${NC}"
        exit 1
    fi
}

# Function to setup environment
setup_environment() {
    local environment=$1
    local project_id=$2
    
    echo -e "${BLUE}🌍 Setting up environment: ${environment}${NC}"
    
    # Set Firebase project
    firebase use ${project_id}
    
    # Create hosting targets for each app
    create_hosting_target "marketing" "${project_id}-marketing" ${project_id}
    create_hosting_target "dashboard" "${project_id}-dashboard" ${project_id}
    create_hosting_target "webbuilder" "${project_id}-webbuilder" ${project_id}
    create_hosting_target "admin" "${project_id}-admin" ${project_id}
    
    echo -e "${GREEN}✅ Environment ${environment} setup completed${NC}"
}

# Setup production environment
echo -e "${BLUE}🏭 Setting up production environment...${NC}"
setup_environment "production" "madas-platform"

# Setup staging environment
echo -e "${BLUE}🧪 Setting up staging environment...${NC}"
setup_environment "staging" "madas-platform-staging"

# Setup development environment
echo -e "${BLUE}🔧 Setting up development environment...${NC}"
setup_environment "development" "madas-platform-dev"

echo -e "${GREEN}🎉 Firebase Hosting setup completed successfully!${NC}"

# Show next steps
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. Configure custom domains in Firebase Console"
echo -e "2. Set up SSL certificates"
echo -e "3. Configure CDN settings"
echo -e "4. Test deployment with: ./scripts/deploy.sh development marketing"
echo -e "5. Deploy to production with: ./scripts/deploy.sh production all"

# Show hosting targets
echo -e "${BLUE}📋 Hosting targets created:${NC}"
echo -e "  Production:"
echo -e "    - marketing: madas-platform-marketing"
echo -e "    - dashboard: madas-platform-dashboard"
echo -e "    - webbuilder: madas-platform-webbuilder"
echo -e "    - admin: madas-platform-admin"
echo -e "  Staging:"
echo -e "    - marketing: madas-platform-staging-marketing"
echo -e "    - dashboard: madas-platform-staging-dashboard"
echo -e "    - webbuilder: madas-platform-staging-webbuilder"
echo -e "    - admin: madas-platform-staging-admin"
echo -e "  Development:"
echo -e "    - marketing: madas-platform-dev-marketing"
echo -e "    - dashboard: madas-platform-dev-dashboard"
echo -e "    - webbuilder: madas-platform-dev-webbuilder"
echo -e "    - admin: madas-platform-dev-admin"
