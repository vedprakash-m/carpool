#!/bin/bash

set -e

echo "🚀 Quick VCarpool Validation (No Docker Required)"
echo "============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 1. Quick dependency check
print_status "INFO" "Checking dependencies..."
npm ci --ignore-scripts --prefer-offline >/dev/null 2>&1

# 2. Build shared (required for type checking)
print_status "INFO" "Building shared package..."
npm run build:shared >/dev/null 2>&1

# 3. Type checking (most common CI failure)
print_status "INFO" "Type checking backend..."
npm run type-check:backend

print_status "INFO" "Type checking frontend..."
npm run type-check:frontend

# 4. Linting (catches many issues)
print_status "INFO" "Linting backend..."
npm run lint:backend

print_status "INFO" "Linting frontend..."
npm run lint:frontend

# 5. Backend coverage test (CI blocker)
print_status "INFO" "Running backend tests with coverage..."
cd backend
npm run test:ci >/dev/null 2>&1

COVERAGE=$(node -e "
    try {
        const r=require('./coverage/coverage-summary.json');
        console.log(Math.round(r.total.lines.pct));
    } catch(e) {
        console.log('0');
    }
")

cd ..

if [ "$COVERAGE" -lt 15 ]; then
    print_status "ERROR" "Backend coverage: $COVERAGE% (below 15% minimum)"
    exit 1
else
    print_status "SUCCESS" "Backend coverage: $COVERAGE%"
fi

# 6. Build validation
print_status "INFO" "Testing builds..."
npm run build:backend >/dev/null 2>&1
npm run build:frontend >/dev/null 2>&1

print_status "SUCCESS" "🎉 Quick validation passed!"
print_status "INFO" "Coverage: $COVERAGE% | Ready for CI pipeline"

# Optional: Show what would cause CI failures
if [ "$COVERAGE" -lt 70 ]; then
    print_status "WARNING" "Note: Coverage below 70% - CI will require improvement"
fi

print_status "SUCCESS" "✨ All critical validations passed" 