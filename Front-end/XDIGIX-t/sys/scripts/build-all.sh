#!/bin/bash

# Build script to build all apps and prepare for unified deployment
# This script builds all apps and copies them to a unified dist directory

set -e  # Exit on error

echo "🚀 Building all XDIGIX apps..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIFIED_DIST="${ROOT_DIR}/dist-unified"

# Clean unified dist
echo -e "${BLUE}Cleaning unified dist directory...${NC}"
rm -rf "${UNIFIED_DIST}"
mkdir -p "${UNIFIED_DIST}"

# Build Marketing (root)
echo -e "${GREEN}Building Marketing app...${NC}"
cd "${ROOT_DIR}/apps/marketing"
npm run build
cp -r dist/* "${UNIFIED_DIST}/"

# Build Dashboard (/dashboard)
echo -e "${GREEN}Building Dashboard app...${NC}"
cd "${ROOT_DIR}/apps/dashboard"
npm run build
mkdir -p "${UNIFIED_DIST}/dashboard"
cp -r dist/* "${UNIFIED_DIST}/dashboard/"

# Build Finance (/finance)
echo -e "${GREEN}Building Finance app...${NC}"
cd "${ROOT_DIR}/apps/finance"
npm run build
mkdir -p "${UNIFIED_DIST}/finance"
cp -r dist/* "${UNIFIED_DIST}/finance/"

# Build Digix Admin (/admin)
echo -e "${GREEN}Building Digix Admin app...${NC}"
cd "${ROOT_DIR}/apps/digix-admin"
npm run build
mkdir -p "${UNIFIED_DIST}/admin"
cp -r dist/* "${UNIFIED_DIST}/admin/"

echo -e "${GREEN}✅ All apps built successfully!${NC}"
echo -e "${BLUE}Unified dist directory: ${UNIFIED_DIST}${NC}"



# Build script to build all apps and prepare for unified deployment
# This script builds all apps and copies them to a unified dist directory

set -e  # Exit on error

echo "🚀 Building all XDIGIX apps..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIFIED_DIST="${ROOT_DIR}/dist-unified"

# Clean unified dist
echo -e "${BLUE}Cleaning unified dist directory...${NC}"
rm -rf "${UNIFIED_DIST}"
mkdir -p "${UNIFIED_DIST}"

# Build Marketing (root)
echo -e "${GREEN}Building Marketing app...${NC}"
cd "${ROOT_DIR}/apps/marketing"
npm run build
cp -r dist/* "${UNIFIED_DIST}/"

# Build Dashboard (/dashboard)
echo -e "${GREEN}Building Dashboard app...${NC}"
cd "${ROOT_DIR}/apps/dashboard"
npm run build
mkdir -p "${UNIFIED_DIST}/dashboard"
cp -r dist/* "${UNIFIED_DIST}/dashboard/"

# Build Finance (/finance)
echo -e "${GREEN}Building Finance app...${NC}"
cd "${ROOT_DIR}/apps/finance"
npm run build
mkdir -p "${UNIFIED_DIST}/finance"
cp -r dist/* "${UNIFIED_DIST}/finance/"

# Build Digix Admin (/admin)
echo -e "${GREEN}Building Digix Admin app...${NC}"
cd "${ROOT_DIR}/apps/digix-admin"
npm run build
mkdir -p "${UNIFIED_DIST}/admin"
cp -r dist/* "${UNIFIED_DIST}/admin/"

echo -e "${GREEN}✅ All apps built successfully!${NC}"
echo -e "${BLUE}Unified dist directory: ${UNIFIED_DIST}${NC}"

