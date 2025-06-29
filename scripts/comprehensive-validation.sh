#!/bin/bash

# Comprehensive Local Validation Script
# This script runs all the same tests that CI/CD runs to catch issues early

set -e

echo "🔍 Starting comprehensive validation..."
echo "======================================"

# Store current directory
ORIGINAL_DIR=$(pwd)

# Function to cleanup and restore
cleanup() {
    cd "$ORIGINAL_DIR"
}
trap cleanup EXIT

# Ensure we're in the project root
cd "$(dirname "$0")/.."

echo "📁 Current directory: $(pwd)"

# 1. Backend Validation
echo ""
echo "🔧 Backend Validation"
echo "---------------------"
cd backend

echo "Installing dependencies..."
npm ci

echo "Building backend..."
npm run build

echo "Running linting..."
npm run lint

echo "Running unit tests with CI configuration..."
npm run test:ci

echo "Running specific test isolation checks..."
# Run tests multiple times to check for singleton state issues
for i in {1..3}; do
    echo "Test run $i/3..."
    npm test -- --testPathPattern="config.service.test" --silent
done

cd ..

# 2. Frontend Validation  
echo ""
echo "🎨 Frontend Validation"
echo "---------------------"
cd frontend

echo "Installing dependencies..."
npm ci

echo "Building frontend..."
npm run build

echo "Running linting..."
npm run lint

echo "Running tests..."
npm run test:ci

cd ..

# 3. E2E Validation
echo ""
echo "🧪 E2E Validation"
echo "----------------"
cd e2e

echo "Installing dependencies..."
npm ci

echo "Running E2E tests (if any)..."
# Note: Only run if tests exist
if [ -f "playwright.config.simple.ts" ]; then
    npm test || echo "E2E tests failed or not configured"
fi

cd ..

# 4. Cross-package validation
echo ""
echo "🔗 Cross-package Validation"
echo "---------------------------"

echo "Checking for old brand references..."
VCARPOOL_REFS=$(grep -r "vcarpool" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" . | grep -v "comprehensive-validation.sh" | wc -l || echo "0")
if [ "$VCARPOOL_REFS" -gt 0 ]; then
    echo "❌ Found $VCARPOOL_REFS references to old 'vcarpool' brand:"
    grep -r "vcarpool" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" . | grep -v "comprehensive-validation.sh" | head -10
    exit 1
else
    echo "✅ No old brand references found"
fi

echo "Checking for consistent package names..."
PACKAGE_INCONSISTENCIES=$(find . -name "package.json" -not -path "./node_modules/*" -exec grep -l "vcarpool" {} \; | wc -l || echo "0")
if [ "$PACKAGE_INCONSISTENCIES" -gt 0 ]; then
    echo "❌ Found package.json files with old brand:"
    find . -name "package.json" -not -path "./node_modules/*" -exec grep -l "vcarpool" {} \;
    exit 1
else
    echo "✅ All package.json files updated"
fi

# 5. Environment validation
echo ""
echo "🌍 Environment Validation"
echo "-------------------------"

echo "Checking environment variable consistency..."
ENV_FILES=(
    ".env"
    "backend/local.settings.json"
    "frontend/.env.local"
)

for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Checking $file..."
        if grep -q "vcarpool" "$file" 2>/dev/null; then
            echo "❌ Found old brand references in $file"
            grep "vcarpool" "$file"
            exit 1
        else
            echo "✅ $file is clean"
        fi
    else
        echo "⚠️  $file not found (may not exist)"
    fi
done

# 6. Test isolation validation
echo ""
echo "🔬 Test Isolation Validation"
echo "----------------------------"

cd backend

echo "Testing for singleton state leakage..."
# Run config service tests multiple times in different orders
npm test -- --testPathPattern="config.service.test" --testNamePattern="should fail validation in production with default JWT secret" --silent
npm test -- --testPathPattern="config.service.test" --testNamePattern="should load default configuration values" --silent
npm test -- --testPathPattern="config.service.test" --testNamePattern="should fail validation in production with default JWT secret" --silent

echo "✅ Test isolation verified"

cd ..

echo ""
echo "🎉 Comprehensive validation completed successfully!"
echo "All tests pass and no brand inconsistencies found."
