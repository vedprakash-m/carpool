#!/bin/bash

# Local CI Validation Script
# Replicates CI environment validation locally to catch issues before push

set -e  # Exit on any error

echo "🔄 Starting Local CI Validation (replicating CI environment)"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo -e "[$(date +'%H:%M:%S')] $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate environment
log "${YELLOW}🔍 Validating environment...${NC}"

if ! command_exists npm; then
    log "${RED}❌ npm not found. Please install Node.js${NC}"
    exit 1
fi

if ! command_exists docker; then
    log "${RED}❌ Docker not found. Please install Docker${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    log "${RED}❌ docker-compose not found. Please install Docker Compose${NC}"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log "${RED}❌ Node.js version 18+ required. Current: $(node --version)${NC}"
    exit 1
fi

log "${GREEN}✅ Environment validation passed${NC}"

# Step 1: Clean environment (replicate CI fresh state)
log "${YELLOW}🧹 Cleaning environment (replicating CI fresh state)...${NC}"
npm run clean 2>/dev/null || true

# Note: Keep package-lock.json for CI mode (npm ci requires it)
rm -rf node_modules 2>/dev/null || true
rm -rf backend/node_modules 2>/dev/null || true
rm -rf frontend/node_modules 2>/dev/null || true
rm -rf shared/node_modules 2>/dev/null || true
rm -rf e2e/node_modules 2>/dev/null || true

# Step 2: Install dependencies (exactly like CI)
log "${YELLOW}📦 Installing dependencies (CI mode)...${NC}"
# First ensure we have a lock file (if missing, generate it)
if [ ! -f "package-lock.json" ]; then
    log "   📝 Generating package-lock.json..."
    npm install --package-lock-only
fi
npm ci --ignore-scripts

# Step 3: Build shared package first (critical for module resolution)
log "${YELLOW}🔨 Building shared package...${NC}"
npm run build --workspace=shared

# Verify shared package was built correctly
if [ ! -f "shared/dist/index.js" ]; then
    log "${RED}❌ Shared package build failed - index.js not found${NC}"
    exit 1
fi

if [ ! -f "shared/dist/index.d.ts" ]; then
    log "${RED}❌ Shared package build failed - index.d.ts not found${NC}"
    exit 1
fi

log "${GREEN}✅ Shared package built successfully${NC}"

# Step 4: Validate code quality (exactly like CI)
log "${YELLOW}🔍 Running validation checks...${NC}"

# Type checking
log "   🔤 Type checking..."
npm run type-check

# Linting
log "   🧹 Linting..."
npm run lint

# Security scan
log "   🔒 Security scanning..."
npm audit --audit-level high

# Step 5: Run tests (exactly like CI matrix)
log "${YELLOW}🧪 Running test suites...${NC}"

# Unit tests
log "   🔬 Unit tests..."
cd backend
npm test -- --coverage --passWithNoTests --ci --watchAll=false
cd ..

# Integration tests
log "   🔗 Integration tests..."
cd backend
npm run test:integration || {
    log "${RED}❌ Integration tests failed${NC}"
    log "${RED}   Check Jest config references and module mappings${NC}"
    exit 1
}
cd ..

# Step 6: E2E tests with Docker (exactly like CI)
log "${YELLOW}🌐 Running E2E tests with Docker...${NC}"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    log "${RED}❌ Docker is not running. Please start Docker Desktop${NC}"
    exit 1
fi

# Clean up any existing containers
docker-compose -f docker-compose.e2e.yml down -v 2>/dev/null || true

# Start services
log "   🐳 Starting Docker services..."
docker-compose -f docker-compose.e2e.yml up -d

# Wait for services to be ready with proper health checks
log "   ⏳ Waiting for services to be ready..."
timeout 300 bash -c 'until docker-compose -f docker-compose.e2e.yml exec -T mongo mongosh --eval "db.adminCommand(\"ismaster\")" >/dev/null 2>&1; do echo "Waiting for MongoDB..."; sleep 5; done' || {
    log "${RED}❌ MongoDB failed to start${NC}"
    docker-compose -f docker-compose.e2e.yml logs mongo
    docker-compose -f docker-compose.e2e.yml down
    exit 1
}

# Additional health checks for backend service
timeout 300 bash -c 'until curl -f http://localhost:7072/api/health >/dev/null 2>&1; do echo "Waiting for backend..."; sleep 5; done' || {
    log "${YELLOW}⚠️  Backend health check failed, continuing with E2E tests anyway${NC}"
}

# Run E2E tests
log "   🎭 Running Playwright E2E tests..."
cd e2e
npm ci
npx playwright install --with-deps chromium
npx playwright test || {
    log "${RED}❌ E2E tests failed${NC}"
    cd ..
    docker-compose -f docker-compose.e2e.yml down
    exit 1
}
cd ..

# Cleanup Docker services
log "   🧹 Cleaning up Docker services..."
docker-compose -f docker-compose.e2e.yml down -v

# Step 7: Build applications (exactly like CI)
log "${YELLOW}🔨 Building applications...${NC}"

# Backend build
log "   ⚙️  Building backend..."
cd backend
npm run build
cd ..

# Frontend build
log "   🌐 Building frontend..."
cd frontend
npm run build
cd ..

# Step 8: Validate build artifacts
log "${YELLOW}📋 Validating build artifacts...${NC}"

# Check backend build
if [ ! -d "backend/dist" ]; then
    log "${RED}❌ Backend build artifacts missing${NC}"
    exit 1
fi

# Check frontend build
if [ ! -d "frontend/.next" ]; then
    log "${RED}❌ Frontend build artifacts missing${NC}"
    exit 1
fi

log "${GREEN}✅ Build artifacts validated${NC}"

# Step 9: Configuration validation
log "${YELLOW}⚙️  Validating configurations...${NC}"

# Check Jest configs exist
if [ ! -f "backend/jest.config.js" ]; then
    log "${RED}❌ Backend jest.config.js missing${NC}"
    exit 1
fi

if [ ! -f "backend/jest.config.integration.json" ]; then
    log "${RED}❌ Backend jest.config.integration.json missing${NC}"
    exit 1
fi

# Check package.json scripts
if ! grep -q "jest.config.integration.json" backend/package.json; then
    log "${RED}❌ Backend package.json has incorrect integration test config reference${NC}"
    exit 1
fi

# Validate shared package module resolution
log "   📦 Validating @carpool/shared module resolution..."
if [ ! -f "shared/dist/index.js" ]; then
    log "${RED}❌ @carpool/shared not built - required for module resolution${NC}"
    exit 1
fi

# Check Jest module mapping for @carpool/shared
if ! grep -q "@carpool/shared" backend/jest.config.js; then
    log "${RED}❌ Jest config missing @carpool/shared module mapping${NC}"
    exit 1
fi

if ! grep -q "@carpool/shared" backend/jest.config.integration.json; then
    log "${RED}❌ Jest integration config missing @carpool/shared module mapping${NC}"
    exit 1
fi

# Validate imports in test files
log "   🔍 Validating @carpool/shared imports in test files..."
FAILED_IMPORTS=$(grep -r "@carpool/shared" backend/src/__tests__/ || true)
if [ -n "$FAILED_IMPORTS" ]; then
    log "${GREEN}✅ Found @carpool/shared imports in test files (expected)${NC}"
else
    log "${YELLOW}⚠️  No @carpool/shared imports found in test files${NC}"
fi

log "${GREEN}✅ Configuration validation passed${NC}"

# Final summary
log ""
log "${GREEN}🎉 Local CI Validation PASSED${NC}"
log "${GREEN}=============================================${NC}"
log "${GREEN}✅ Environment setup${NC}"
log "${GREEN}✅ Dependencies installed${NC}"
log "${GREEN}✅ Shared package built${NC}"
log "${GREEN}✅ Code quality checks${NC}"
log "${GREEN}✅ Unit tests${NC}"
log "${GREEN}✅ Integration tests${NC}"
log "${GREEN}✅ E2E tests with Docker${NC}"
log "${GREEN}✅ Build artifacts${NC}"
log "${GREEN}✅ Configuration validation${NC}"
log ""
log "${GREEN}🚀 Ready for CI/CD pipeline!${NC}"
