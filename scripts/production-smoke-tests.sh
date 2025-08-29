#!/bin/bash

# Tesla STEM Carpool Production Smoke Tests
# Comprehensive production environment validation

set -e

# Configuration
ENVIRONMENT=${1:-prod}
BASE_URL="https://carpool-api.azurewebsites.net"
FRONTEND_URL="https://ambitious-water-0b278f20f-preview.eastus2.2.azurestaticapps.net"
HEALTH_ENDPOINT="${BASE_URL}/api/health"
AUTH_ENDPOINT="${BASE_URL}/api/auth-unified"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo_test "Running: $test_name"
    
    if eval "$test_command"; then
        if [[ -n "$expected_result" ]]; then
            # Additional validation if provided
            if eval "$expected_result"; then
                echo_success "✓ $test_name"
                ((TESTS_PASSED++))
            else
                echo_error "✗ $test_name (validation failed)"
                ((TESTS_FAILED++))
                FAILED_TESTS+=("$test_name")
            fi
        else
            echo_success "✓ $test_name"
            ((TESTS_PASSED++))
        fi
    else
        echo_error "✗ $test_name"
        ((TESTS_FAILED++))
        FAILED_TESTS+=("$test_name")
    fi
    echo ""
}

echo_info "🚀 Starting Production Smoke Tests for Tesla STEM Carpool"
echo_info "Environment: $ENVIRONMENT"
echo_info "Backend: $BASE_URL"
echo_info "Frontend: $FRONTEND_URL"
echo ""

# Test 1: Health Check Endpoint
run_test "Health Check Endpoint" \
    "curl -sf '$HEALTH_ENDPOINT' > /tmp/health_response.json" \
    "grep -q '\"status\":\"healthy\"' /tmp/health_response.json"

# Test 2: Backend API Availability
run_test "Backend API Availability" \
    "curl -sf -o /dev/null '$BASE_URL/api/health'" \
    ""

# Test 3: Frontend Application Availability
run_test "Frontend Application Availability" \
    "curl -sf -o /dev/null '$FRONTEND_URL'" \
    ""

# Test 4: CORS Headers Present
run_test "CORS Headers Present" \
    "curl -sI '$BASE_URL/api/health' | grep -i 'access-control-allow-origin'" \
    ""

# Test 5: Security Headers Present
run_test "Security Headers Present" \
    "curl -sI '$BASE_URL/api/health' | grep -i 'x-content-type-options'" \
    ""

# Test 6: Authentication Endpoint Structure
run_test "Authentication Endpoint Available" \
    "curl -sf -X OPTIONS '$AUTH_ENDPOINT' > /dev/null" \
    ""

# Test 7: Database Connectivity (via health check)
run_test "Database Connectivity Check" \
    "curl -sf '$HEALTH_ENDPOINT' | jq -r '.checks.database' | grep -q 'healthy'" \
    ""

# Test 8: JWT Service Health
run_test "JWT Service Health Check" \
    "curl -sf '$HEALTH_ENDPOINT' | jq -r '.checks.jwt' | grep -q 'healthy'" \
    ""

# Test 9: API Response Time Check
run_test "API Response Time < 2s" \
    "timeout 2s curl -sf '$HEALTH_ENDPOINT' > /dev/null" \
    ""

# Test 10: Content Type Headers
run_test "JSON Content Type Headers" \
    "curl -sI '$HEALTH_ENDPOINT' | grep -i 'content-type.*application/json'" \
    ""

# Test 11: Azure Functions Deployment Verification
run_test "Azure Functions Count Verification" \
    "curl -sf '$BASE_URL/api/health' | jq -r '.functions_count // 0' | awk '\$1 >= 20'" \
    ""

# Test 12: Environment Configuration Check
run_test "Environment Configuration Validation" \
    "curl -sf '$HEALTH_ENDPOINT' | jq -r '.environment' | grep -q '$ENVIRONMENT'" \
    ""

echo_info "📊 Test Results Summary"
echo_info "===================="
echo_success "Tests Passed: $TESTS_PASSED"
if [[ $TESTS_FAILED -gt 0 ]]; then
    echo_error "Tests Failed: $TESTS_FAILED"
    echo_error "Failed Tests:"
    for test in "${FAILED_TESTS[@]}"; do
        echo_error "  - $test"
    done
else
    echo_success "Tests Failed: $TESTS_FAILED"
fi

echo_info "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo_info "Success Rate: $(( (TESTS_PASSED * 100) / (TESTS_PASSED + TESTS_FAILED) ))%"

# Cleanup
rm -f /tmp/health_response.json

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo_success "🎉 All smoke tests passed! Production environment is healthy."
    exit 0
else
    echo_error "❌ Some smoke tests failed. Review before proceeding with go-live."
    exit 1
fi
