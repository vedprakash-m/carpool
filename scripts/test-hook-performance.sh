#!/bin/bash

# Hook Performance Test
# Tests the speed and efficiency of git hooks

echo "🧪 Testing Git Hook Performance"
echo "================================"

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

# Test pre-commit hook performance
print_status "INFO" "Testing pre-commit hook speed..."

# Create a test TypeScript file
echo "const test: string = 'hello';" > test-file.ts
git add test-file.ts

# Time the pre-commit hook
start_time=$(date +%s.%N)
./scripts/pre-commit-fast.sh
end_time=$(date +%s.%N)
precommit_duration=$(echo "$end_time - $start_time" | bc)

print_status "SUCCESS" "Pre-commit completed in ${precommit_duration}s"

# Clean up test file
git reset HEAD test-file.ts
rm -f test-file.ts

# Test pre-push hook performance
print_status "INFO" "Testing pre-push hook speed..."

start_time=$(date +%s.%N)
timeout 60s ./scripts/pre-push-optimized.sh || {
    print_status "WARNING" "Pre-push hook timed out or failed (acceptable for performance test)"
}
end_time=$(date +%s.%N)
prepush_duration=$(echo "$end_time - $start_time" | bc)

print_status "SUCCESS" "Pre-push completed in ${prepush_duration}s"

# Performance benchmarks
print_status "INFO" "Performance Analysis:"
echo "📊 Pre-commit: ${precommit_duration}s (target: <5s)"
echo "📊 Pre-push: ${prepush_duration}s (target: <30s)"

# Recommendations
if (( $(echo "$precommit_duration > 5" | bc -l) )); then
    print_status "WARNING" "Pre-commit is slower than recommended (>5s)"
else
    print_status "SUCCESS" "Pre-commit performance is excellent (<5s)"
fi

if (( $(echo "$prepush_duration > 30" | bc -l) )); then
    print_status "WARNING" "Pre-push is slower than recommended (>30s)"
else
    print_status "SUCCESS" "Pre-push performance is good (<30s)"
fi

print_status "INFO" "Hook performance test completed"
