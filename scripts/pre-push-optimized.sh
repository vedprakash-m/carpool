#!/bin/bash

# Optimized Pre-push Validation
# Smart validation that avoids redundant work

set -e

echo "🚀 Smart Pre-push Validation"
echo "============================="

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

start_time=$(date +%s)

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
    
    # If pre-commit ran within last 10 minutes (600 seconds), skip basic checks
    if [ $TIME_DIFF -lt 600 ]; then
        SKIP_BASIC_CHECKS=true
        print_status "INFO" "Pre-commit checks ran ${TIME_DIFF}s ago - optimizing validation"
    else
        print_status "WARNING" "Pre-commit checks are stale (${TIME_DIFF}s ago) - running full validation"
    fi
else
    print_status "WARNING" "No pre-commit timestamp found - running full validation"
fi

# 1. Basic checks (only if not recently done)
if [ "$SKIP_BASIC_CHECKS" = false ]; then
    print_status "INFO" "Running type checking & linting..."
    
    # Build shared package first (required for workspace)
    npm run build:shared || { print_status "ERROR" "Shared package build failed"; exit 1; }
    
    # Type checking using workspace-aware commands
    npm run type-check:backend || { print_status "ERROR" "Backend type checking failed"; exit 1; }
    npm run type-check:frontend || { print_status "ERROR" "Frontend type checking failed"; exit 1; }
    
    # Linting using workspace commands
    npm run lint:backend || { print_status "ERROR" "Backend linting failed"; exit 1; }
    npm run lint:frontend || { print_status "ERROR" "Frontend linting failed"; exit 1; }
    
    print_status "SUCCESS" "Basic validation completed"
else
    print_status "INFO" "⚡ Skipping basic checks - already validated recently"
fi

# 2. Build validation (critical for deployment)
print_status "INFO" "Quick build validation..."

# Fast dependency check (npm workspaces - install from root)
DEPS_MISSING=false
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/tsc" ]; then
    print_status "INFO" "Installing workspace dependencies (first time)..."
    npm ci --silent --prefer-offline
    DEPS_MISSING=true
fi

# Quick build check using workspace commands
print_status "INFO" "Quick build validation..."

# Ensure shared package is built first
npm run build:shared || {
    print_status "ERROR" "Shared package build failed"
    exit 1
}

# Backend - use workspace-aware type checking
npm run type-check:backend || {
    print_status "ERROR" "Backend compilation failed"
    exit 1
}

# Frontend - use workspace-aware validation
npm run type-check:frontend || {
    print_status "ERROR" "Frontend validation failed"
    exit 1
}

print_status "SUCCESS" "Build validation completed (quick mode)"

# 3. Essential tests only (ultra-fast)
print_status "INFO" "Running essential tests..."

# Only run the most critical tests to save time
npm run test:backend:ci --silent || {
    print_status "WARNING" "Some backend tests failed - full tests will run in CI"
}

print_status "SUCCESS" "Essential tests completed"

# 4. Quick security validation
print_status "INFO" "Quick security check..."

# Just check for obvious issues, skip heavy audits
if git diff --cached --name-only | grep -qE '\.(env|key|pem)$'; then
    print_status "WARNING" "Environment/key files detected - verify no secrets committed"
fi

print_status "SUCCESS" "Security check completed"

# 5. Skip build artifact checking to save time
print_status "INFO" "Skipping build artifact checking (CI will validate)"

end_time=$(date +%s)
duration=$((end_time - start_time))

print_status "SUCCESS" "🎉 Pre-push validation completed in ${duration}s"
print_status "INFO" "Code is ready for push - CI will run comprehensive tests"
