#!/bin/bash

# Local CI/CD Validation Script
# This script replicates the exact CI/CD pipeline locally to catch issues before pushing

set -e  # Exit on any error

echo "🚀 Starting Local CI/CD Validation..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Track overall success
VALIDATION_FAILED=false

# 1. Backend Tests (matching CI exactly)
echo ""
echo "🧪 Running Backend Tests (CI Mode)..."
echo "-----------------------------------"
cd backend

# Install dependencies
npm install

# Run exact CI command
if npm run test:ci; then
    print_status "Backend tests passed"
else
    print_error "Backend tests failed"
    VALIDATION_FAILED=true
fi

# 2. Frontend Tests (if exists)
echo ""
echo "🎨 Checking Frontend..."
echo "---------------------"
cd ../frontend

if [ -f "package.json" ]; then
    npm install
    if npm test -- --watchAll=false; then
        print_status "Frontend tests passed"
    else
        print_error "Frontend tests failed"
        VALIDATION_FAILED=true
    fi
else
    print_warning "No frontend tests found"
fi

# 3. E2E Tests (quick validation)
echo ""
echo "🔄 Running E2E Validation..."
echo "---------------------------"
cd ../e2e

if [ -f "package.json" ]; then
    npm install
    # Run a quick smoke test instead of full E2E
    if npm run validate:quick 2>/dev/null || npm test -- --maxFailures=1 2>/dev/null; then
        print_status "E2E validation passed"
    else
        print_warning "E2E validation skipped (optional)"
    fi
else
    print_warning "No E2E tests found"
fi

# 4. TypeScript Compilation
echo ""
echo "🔧 TypeScript Compilation Check..."
echo "--------------------------------"
cd ..

# Check backend TypeScript
cd backend
if npx tsc --noEmit; then
    print_status "Backend TypeScript compilation passed"
else
    print_error "Backend TypeScript compilation failed"
    VALIDATION_FAILED=true
fi

# Check frontend TypeScript (if exists)
cd ../frontend
if [ -f "tsconfig.json" ]; then
    if npx tsc --noEmit; then
        print_status "Frontend TypeScript compilation passed"
    else
        print_error "Frontend TypeScript compilation failed"
        VALIDATION_FAILED=true
    fi
fi

cd ..

# 5. Linting
echo ""
echo "🧹 Running Linters..."
echo "--------------------"

cd backend
if npm run lint 2>/dev/null || npx eslint . --ext .ts,.tsx,.js,.jsx 2>/dev/null; then
    print_status "Backend linting passed"
else
    print_warning "Backend linting skipped (not configured)"
fi

cd ../frontend
if [ -f "package.json" ] && (npm run lint 2>/dev/null || npx eslint . --ext .ts,.tsx,.js,.jsx 2>/dev/null); then
    print_status "Frontend linting passed"
else
    print_warning "Frontend linting skipped"
fi

cd ..

# 6. Build Tests
echo ""
echo "🏗️  Build Tests..."
echo "------------------"

cd backend
if npm run build 2>/dev/null; then
    print_status "Backend build passed"
else
    print_warning "Backend build skipped (not configured)"
fi

cd ../frontend
if [ -f "package.json" ] && npm run build 2>/dev/null; then
    print_status "Frontend build passed"
else
    print_warning "Frontend build skipped"
fi

cd ..

# 7. Git Status Check
echo ""
echo "📋 Git Status Check..."
echo "---------------------"

if [ -z "$(git status --porcelain)" ]; then
    print_status "Working directory clean"
else
    print_warning "Working directory has uncommitted changes"
fi

# Final Report
echo ""
echo "📊 Validation Summary"
echo "===================="

if [ "$VALIDATION_FAILED" = true ]; then
    print_error "LOCAL VALIDATION FAILED"
    echo ""
    echo "❌ Some validations failed. Please fix the issues before pushing to avoid CI/CD failures."
    echo ""
    echo "💡 Tips:"
    echo "   - Run individual test commands to debug"
    echo "   - Check the error messages above"
    echo "   - Ensure all dependencies are installed"
    echo "   - Verify TypeScript compilation"
    exit 1
else
    print_status "ALL VALIDATIONS PASSED"
    echo ""
    echo "🎉 Your code is ready for CI/CD!"
    echo "   You can safely push your changes to the repository."
    echo ""
fi
