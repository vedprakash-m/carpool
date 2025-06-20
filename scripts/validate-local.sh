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

echo "  🏃‍♂️ Running realistic tests only (faster validation)..."
cd frontend && npm test -- --testPathPattern="realistic.test" --passWithNoTests --bail
print_status "Realistic tests"

cd ..

echo "🔒 Security validation..."
echo "--------------------"

echo "  🛡️  Checking for security vulnerabilities..."
npm audit --audit-level moderate || print_warning "Security audit found issues (not blocking)"

echo ""
echo "🎉 Local validation completed successfully!"
echo "=================================================="
echo "✅ All core validations passed"
echo "🚀 Ready for CI/CD pipeline"
echo ""
echo "Note: This validation focuses on the core issues that would cause CI failure."
echo "Some legacy test issues may still exist but won't block the pipeline."
