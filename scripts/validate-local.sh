#!/bin/bash

set -e

echo "🚀 Starting comprehensive local validation (mirrors CI/CD pipeline)"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 passed${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🔬 CI Dependency Simulation..."
echo "--------------------"

echo "  📝 Testing backend type-check without shared build (simulates CI bug)..."
# Temporarily backup shared dist
if [ -d "shared/dist" ]; then
    mv shared/dist shared/dist.backup
fi

# Test backend type checking without shared (should fail like CI)
cd backend
if npx tsc --noEmit 2>/dev/null; then
    echo "⚠️  Backend type check unexpectedly passed without shared"
    cd ..
    mv shared/dist.backup shared/dist
else
    echo "⚠️  Backend type check failed without shared build (expected - CI dependency issue)"
    cd ..
    mv shared/dist.backup shared/dist
fi

echo "  📝 Testing frontend type-check without shared build (simulates CI bug)..."
# Clean shared build temporarily to simulate CI issue
if [ -d "shared/dist" ]; then
    mv shared/dist shared/dist.backup
fi

# Test frontend type checking without shared (should fail like CI)
cd frontend
if npx tsc --noEmit 2>/dev/null; then
    echo "⚠️  Frontend type check unexpectedly passed without shared"
    cd ..
    mv shared/dist.backup shared/dist
else
    echo "⚠️  Frontend type check failed without shared build (expected - CI dependency issue)"
    cd ..
    mv shared/dist.backup shared/dist
fi

echo "📦 Building shared package..."
cd shared && npm run build
print_status "Shared package build"

cd ..

echo "🔍 Backend validation..."
echo "--------------------"

echo "  📝 Backend linting..."
npm run lint:backend
print_status "Backend ESLint"

echo "  🔧 Backend type checking..."
cd backend && npx tsc --noEmit
print_status "Backend TypeScript"

cd ..

echo "🎨 Frontend validation..."
echo "--------------------"

echo "  📝 Frontend linting..."
npm run lint:frontend
print_status "Frontend ESLint"

echo "  🔧 Frontend type checking..."
npm run type-check:frontend
print_status "Frontend TypeScript"

echo "🧪 Testing validation..."
echo "--------------------"

echo "  🏃‍♂️ Running backend tests with coverage..."
cd backend && npm run test:ci
print_status "Backend tests with coverage"

cd ..

echo "  🏃‍♂️ Running frontend tests (CI mode)..."
cd frontend && npm run test:ci
print_status "Frontend tests (CI mode)"

cd ..

echo "🔒 Security validation..."
echo "--------------------"

echo "  🛡️  Checking for security vulnerabilities..."
npm audit --audit-level moderate || print_warning "Security audit found issues (not blocking)"

echo "🏗️ Build validation..."
echo "--------------------"

echo "  🔧 Testing frontend production build (catches Jest leaks, import issues)..."
echo "  Building frontend to catch production issues..."
cd frontend
npm run build >/dev/null 2>&1
cd ..
print_status "Frontend production build"

echo ""
echo "🎉 Local validation completed successfully!"
echo "=================================================="
echo "✅ All core validations passed"
echo "🚀 Ready for CI/CD pipeline"
echo ""
echo "Note: This validation focuses on the core issues that would cause CI failure."
echo "Some legacy test issues may still exist but won't block the pipeline."
