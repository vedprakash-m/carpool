#!/bin/bash

set -e

echo "⚡ Fast Pre-commit Validation"
echo "============================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
    esac
}

# 1. Type checking only (fastest validation)
print_status "INFO" "Type checking backend..."
cd backend && npx tsc --noEmit >/dev/null 2>&1 && cd ..

print_status "INFO" "Type checking frontend..."
cd frontend && npx tsc --noEmit >/dev/null 2>&1 && cd ..

# 2. Quick lint check (only changed files would be ideal, but keeping simple)
print_status "INFO" "Quick lint check..."
npm run lint:backend >/dev/null 2>&1
npm run lint:frontend >/dev/null 2>&1

print_status "SUCCESS" "⚡ Fast pre-commit validation passed!"
print_status "INFO" "Full tests will run on pre-push"
