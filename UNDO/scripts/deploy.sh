#!/bin/bash

# Madas Platform Deployment Script
# Usage: ./scripts/deploy.sh [environment] [app]
# Environment: production, staging, development
# App: marketing, dashboard, webbuilder, admin, functions, all

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-production}
APP=${2:-all}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
    echo -e "${RED}Error: Invalid environment. Use: production, staging, or development${NC}"
    exit 1
fi

# Validate app
if [[ ! "$APP" =~ ^(marketing|dashboard|webbuilder|admin|functions|all)$ ]]; then
    echo -e "${RED}Error: Invalid app. Use: marketing, dashboard, webbuilder, admin, functions, or all${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Starting deployment for ${APP} to ${ENVIRONMENT}${NC}"

# Set Firebase project
case $ENVIRONMENT in
    production)
        FIREBASE_PROJECT="madas-platform"
        ;;
    staging)
        FIREBASE_PROJECT="madas-platform-staging"
        ;;
    development)
        FIREBASE_PROJECT="madas-platform-dev"
        ;;
esac

echo -e "${YELLOW}📋 Using Firebase project: ${FIREBASE_PROJECT}${NC}"

# Function to deploy app
deploy_app() {
    local app_name=$1
    local target_name=$2
    
    echo -e "${BLUE}📦 Building ${app_name}...${NC}"
    
    # Build the app
    cd "apps/${app_name}"
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${app_name} built successfully${NC}"
    else
        echo -e "${RED}❌ Failed to build ${app_name}${NC}"
        exit 1
    fi
    
    cd ../..
    
    # Deploy to Firebase
    echo -e "${BLUE}🚀 Deploying ${app_name} to ${ENVIRONMENT}...${NC}"
    firebase deploy --only hosting:${target_name} --project ${FIREBASE_PROJECT}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${app_name} deployed successfully to ${ENVIRONMENT}${NC}"
    else
        echo -e "${RED}❌ Failed to deploy ${app_name}${NC}"
        exit 1
    fi
}

# Function to deploy functions
deploy_functions() {
    echo -e "${BLUE}📦 Building functions...${NC}"
    
    cd backend
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Functions built successfully${NC}"
    else
        echo -e "${RED}❌ Failed to build functions${NC}"
        exit 1
    fi
    
    cd ..
    
    # Deploy functions
    echo -e "${BLUE}🚀 Deploying functions to ${ENVIRONMENT}...${NC}"
    firebase deploy --only functions --project ${FIREBASE_PROJECT}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Functions deployed successfully to ${ENVIRONMENT}${NC}"
    else
        echo -e "${RED}❌ Failed to deploy functions${NC}"
        exit 1
    fi
}

# Deploy based on app parameter
case $APP in
    marketing)
        deploy_app "marketing" "marketing"
        ;;
    dashboard)
        deploy_app "dashboard" "dashboard"
        ;;
    webbuilder)
        deploy_app "webbuilder" "webbuilder"
        ;;
    admin)
        deploy_app "admin" "admin"
        ;;
    functions)
        deploy_functions
        ;;
    all)
        echo -e "${BLUE}🚀 Deploying all apps to ${ENVIRONMENT}...${NC}"
        deploy_app "marketing" "marketing"
        deploy_app "dashboard" "dashboard"
        deploy_app "webbuilder" "webbuilder"
        deploy_app "admin" "admin"
        deploy_functions
        ;;
esac

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"

# Show deployment URLs
echo -e "${BLUE}📋 Deployment URLs:${NC}"
case $ENVIRONMENT in
    production)
        echo -e "  Marketing: https://madas.com"
        echo -e "  Dashboard: https://dashboard.madas.com"
        echo -e "  Webbuilder: https://builder.madas.com"
        echo -e "  Admin: https://admin.madas.com"
        ;;
    staging)
        echo -e "  Marketing: https://staging.madas.com"
        echo -e "  Dashboard: https://staging-dashboard.madas.com"
        echo -e "  Webbuilder: https://staging-builder.madas.com"
        echo -e "  Admin: https://staging-admin.madas.com"
        ;;
    development)
        echo -e "  Marketing: https://dev.madas.com"
        echo -e "  Dashboard: https://dev-dashboard.madas.com"
        echo -e "  Webbuilder: https://dev-builder.madas.com"
        echo -e "  Admin: https://dev-admin.madas.com"
        ;;
esac
