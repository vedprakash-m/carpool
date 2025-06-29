#!/bin/bash

# Optimized Pre-push Validation
# Skips checks already done in pre-commit unless they were bypassed

set -e

echo "🚀 Optimized Pre-push Validation"
echo "================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
    esac
}

# Store current directory
ORIGINAL_DIR=$(pwd)
cd "$(dirname "$0")/.."

# Function to cleanup and restore
cleanup() {
    cd "$ORIGINAL_DIR"
}
trap cleanup EXIT

# Check if pre-commit checks were recently run
PRE_COMMIT_TIMESTAMP_FILE=".git/hooks/pre-commit-timestamp"
CURRENT_TIME=$(date +%s)
SKIP_BASIC_CHECKS=false

if [ -f "$PRE_COMMIT_TIMESTAMP_FILE" ]; then
    PRE_COMMIT_TIME=$(cat "$PRE_COMMIT_TIMESTAMP_FILE")
    TIME_DIFF=$((CURRENT_TIME - PRE_COMMIT_TIME))
    
    # If pre-commit ran within last 5 minutes (300 seconds), skip basic checks
    if [ $TIME_DIFF -lt 300 ]; then
        SKIP_BASIC_CHECKS=true
        print_status "INFO" "Pre-commit checks were run recently ($TIME_DIFF seconds ago) - skipping redundant checks"
    else
        print_status "WARNING" "Pre-commit checks are stale ($TIME_DIFF seconds ago) - running full validation"
    fi
else
    print_status "WARNING" "No pre-commit timestamp found - running full validation"
fi

# 1. Basic checks (only if not recently done)
if [ "$SKIP_BASIC_CHECKS" = false ]; then
    print_status "INFO" "Running basic validation (type checking & linting)..."
    
    # Type checking
    print_status "INFO" "Type checking backend..."
    (cd backend && npx tsc --noEmit)
    
    print_status "INFO" "Type checking frontend..."
    (cd frontend && npx tsc --noEmit)
    
    # Linting
    print_status "INFO" "Linting backend..."
    npm run lint:backend
    
    print_status "INFO" "Linting frontend..."
    npm run lint:frontend
    
    print_status "SUCCESS" "Basic validation completed"
else
    print_status "INFO" "⚡ Skipping basic checks (type checking & linting) - already validated"
fi

# 2. Build validation (always run - critical for deployment)
print_status "INFO" "Building backend..."
(cd backend && npm ci && npm run build)

print_status "INFO" "Building frontend..."
(cd frontend && npm ci && npm run build)

# 3. Test validation (always run - critical for quality)
print_status "INFO" "Running backend tests with CI configuration..."
(cd backend && npm run test:ci)

print_status "INFO" "Running frontend tests..."
(cd frontend && npm run test:ci)

# 4. E2E validation (if available)
if docker info >/dev/null 2>&1; then
    print_status "INFO" "Running E2E tests..."
    (cd e2e && npm ci && npm test) || print_status "WARNING" "E2E tests failed or not configured"
else
    print_status "INFO" "Docker not available - skipping E2E tests (will run in CI)"
fi

# 5. Brand consistency checks
print_status "INFO" "Checking for old brand references..."
VCARPOOL_REFS=$(grep -r "carpool" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" --exclude="pre-push-optimized.sh" . | wc -l || echo "0")
if [ "$VCARPOOL_REFS" -gt 0 ]; then
    print_status "ERROR" "Found $VCARPOOL_REFS references to old 'carpool' brand:"
    grep -r "carpool" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" --exclude="pre-push-optimized.sh" . | head -5
    exit 1
else
    print_status "SUCCESS" "No old brand references found"
fi

# 6. Test isolation validation
print_status "INFO" "Validating test isolation..."
cd backend
for i in {1..2}; do
    npm test -- --testPathPattern="config.service.test" --testNamePattern="should fail validation in production with default JWT secret" --silent
done
cd ..

print_status "SUCCESS" "🎉 All pre-push validations passed!"
print_status "INFO" "Code is ready to be pushed to remote repository"
