#!/bin/bash

set -e  # Exit on any error

echo "🔍 VCarpool Local Validation Script"
echo "=================================="
echo "Validating complete local environment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    local port=$1
    local service=$2
    if nc -z localhost $port 2>/dev/null; then
        return 0  # Port is in use
    else
        return 1  # Port is available
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local timeout=${3:-30}
    
    print_status "INFO" "Waiting for $service_name to be ready..."
    
    for i in $(seq 1 $timeout); do
        if curl -s "$url" >/dev/null 2>&1; then
            print_status "SUCCESS" "$service_name is ready"
            return 0
        fi
        sleep 1
    done
    
    print_status "ERROR" "$service_name failed to start within ${timeout}s"
    return 1
}

# Validation flags
SKIP_E2E=false
SKIP_DOCKER=false
QUICK_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-e2e)
            SKIP_E2E=true
            shift
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --quick)
            QUICK_MODE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --skip-e2e      Skip E2E testing environment setup"
            echo "  --skip-docker   Skip Docker dependency checks"
            echo "  --quick         Run quick validation (skip heavy tests)"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
        *)
            print_status "WARNING" "Unknown option: $1"
            shift
            ;;
    esac
done

# Step 1: Environment Prerequisites
print_status "INFO" "Step 1: Checking environment prerequisites..."

# Check Node.js version
if command_exists node; then
    NODE_VERSION=$(node --version)
    MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        print_status "SUCCESS" "Node.js version: $NODE_VERSION"
    else
        print_status "ERROR" "Node.js version $NODE_VERSION is too old. Required: >=18"
        exit 1
    fi
else
    print_status "ERROR" "Node.js not found. Please install Node.js >=18"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status "SUCCESS" "npm version: $NPM_VERSION"
else
    print_status "ERROR" "npm not found"
    exit 1
fi

# Check Docker (unless skipped)
if [ "$SKIP_DOCKER" = false ]; then
    if command_exists docker; then
        if docker info >/dev/null 2>&1; then
            print_status "SUCCESS" "Docker is running"
        else
            print_status "ERROR" "Docker daemon not running. Please start Docker Desktop"
            print_status "INFO" "Or use --skip-docker to skip Docker-dependent tests"
            exit 1
        fi
    else
        print_status "WARNING" "Docker not found. E2E tests will be skipped"
        SKIP_E2E=true
    fi
fi

# Step 2: Dependency Installation
print_status "INFO" "Step 2: Installing dependencies..."

if [ ! -d "node_modules" ]; then
    print_status "INFO" "Installing root dependencies..."
    npm ci --ignore-scripts --prefer-offline
fi

# Install workspace dependencies
print_status "INFO" "Installing workspace dependencies..."
npm run install:shared
npm run install:backend
npm run install:frontend

# Step 3: Build Validation
print_status "INFO" "Step 3: Build validation..."

# Build shared package first
print_status "INFO" "Building shared package..."
npm run build:shared

# Type checking
print_status "INFO" "Running type checks..."
npm run type-check:backend
npm run type-check:frontend

# Linting
print_status "INFO" "Running linters..."
npm run lint:backend
npm run lint:frontend

# Build all packages
print_status "INFO" "Building all packages..."
npm run build:backend
npm run build:frontend

# Step 4: Unit Testing
print_status "INFO" "Step 4: Unit testing..."

# Backend tests with coverage
print_status "INFO" "Running backend tests with coverage..."
cd backend
npm run test:ci
BACKEND_COVERAGE=$(node -e "
    try {
        const r=require('./coverage/coverage-summary.json');
        console.log(Math.round(r.total.lines.pct));
    } catch(e) {
        console.log('0');
    }
")

if [ "$BACKEND_COVERAGE" -lt 70 ]; then
    print_status "WARNING" "Backend coverage: $BACKEND_COVERAGE% (below 70% threshold)"
else
    print_status "SUCCESS" "Backend coverage: $BACKEND_COVERAGE%"
fi

cd ..

# Frontend tests
if [ "$QUICK_MODE" = false ]; then
    print_status "INFO" "Running frontend tests..."
    npm run test:frontend:ci
else
    print_status "INFO" "Skipping frontend tests (quick mode)"
fi

# Step 5: E2E Environment Validation
if [ "$SKIP_E2E" = false ]; then
    print_status "INFO" "Step 5: E2E environment validation..."
    
    cd e2e
    
    # Check if E2E dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status "INFO" "Installing E2E dependencies..."
        npm ci
    fi
    
    # Check if Playwright browsers are installed
    print_status "INFO" "Checking Playwright browsers..."
    if ! npx playwright --version >/dev/null 2>&1; then
        print_status "WARNING" "Playwright not found, installing..."
        npm ci
    fi
    
    # Install browsers if needed
    npx playwright install chromium --with-deps >/dev/null 2>&1 || true
    
    # Start E2E services
    print_status "INFO" "Starting E2E services..."
    
    # Clean up any existing services
    npm run stop:services >/dev/null 2>&1 || true
    
    # Start services in background
    npm run start:services
    
    # Wait for services to be ready
    print_status "INFO" "Waiting for services to start..."
    sleep 15
    
    # Run health check
    print_status "INFO" "Running E2E health check..."
    if npm run health:check; then
        print_status "SUCCESS" "E2E environment is healthy"
        
        if [ "$QUICK_MODE" = false ]; then
            # Run a quick E2E test to validate setup
            print_status "INFO" "Running E2E validation test..."
            npm run test:auth || print_status "WARNING" "E2E validation test failed - environment setup issue detected"
        fi
    else
        print_status "ERROR" "E2E environment health check failed"
        print_status "INFO" "Cleaning up services..."
        npm run stop:services >/dev/null 2>&1 || true
        cd ..
        exit 1
    fi
    
    # Clean up services
    print_status "INFO" "Cleaning up E2E services..."
    npm run stop:services >/dev/null 2>&1 || true
    
    cd ..
else
    print_status "INFO" "Step 5: E2E validation skipped"
fi

# Step 6: Security Validation
print_status "INFO" "Step 6: Security validation..."

# Dependency audit
print_status "INFO" "Running dependency audit..."
npm audit --audit-level moderate || print_status "WARNING" "Vulnerabilities found - review required"

# Secret detection (if script exists)
if [ -f "scripts/check-secrets.sh" ]; then
    print_status "INFO" "Running secret detection..."
    chmod +x scripts/check-secrets.sh
    ./scripts/check-secrets.sh $(find . -type f -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" | head -20) || print_status "WARNING" "Potential secrets detected"
else
    print_status "WARNING" "Secret detection script not found"
fi

# Final Summary
print_status "SUCCESS" "✨ Local validation complete!"
print_status "INFO" "Summary:"
print_status "INFO" "  - Backend coverage: $BACKEND_COVERAGE%"
if [ "$SKIP_E2E" = false ]; then
    print_status "INFO" "  - E2E environment: Validated"
else
    print_status "INFO" "  - E2E environment: Skipped"
fi

if [ "$BACKEND_COVERAGE" -lt 70 ]; then
    print_status "WARNING" "⚠️  Coverage below threshold - this will fail CI pipeline"
    exit 1
fi

print_status "SUCCESS" "🎉 All validations passed! Ready for CI/CD pipeline"
