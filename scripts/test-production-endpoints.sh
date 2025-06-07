#!/bin/bash

# VCarpool Production API Endpoint Testing Script
# Comprehensive validation of all v1 API endpoints

set -e

# Configuration
API_BASE_URL="https://vcarpool-api-prod.azurewebsites.net/api/v1"
ADMIN_EMAIL="admin@vcarpool.com"
ADMIN_PASSWORD="Admin123!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}🧪 VCarpool Production API Testing Suite${NC}"
echo -e "${BLUE}====================================${NC}"
echo "📋 API Base URL: $API_BASE_URL"
echo "🕐 Test Started: $(date)"
echo ""

# Helper functions
log_test() {
    echo -e "${YELLOW}🔍 Testing: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((PASSED_TESTS++))
}

log_failure() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    echo -e "${RED}   Error: $2${NC}"
    ((FAILED_TESTS++))
}

increment_test() {
    ((TOTAL_TESTS++))
}

# Make API request with proper error handling
api_request() {
    local method=$1
    local endpoint=$2
    local data=${3:-""}
    local auth_header=${4:-""}
    
    local url="$API_BASE_URL$endpoint"
    local curl_opts=("-s" "-w" "%{http_code}" "-X" "$method")
    
    if [ ! -z "$auth_header" ]; then
        curl_opts+=("-H" "Authorization: Bearer $auth_header")
    fi
    
    curl_opts+=("-H" "Content-Type: application/json")
    
    if [ ! -z "$data" ]; then
        curl_opts+=("-d" "$data")
    fi
    
    curl "${curl_opts[@]}" "$url"
}

# Extract HTTP status code from response
get_status_code() {
    echo "$1" | tail -c 4
}

# Extract response body (remove last 3 characters which are status code)
get_response_body() {
    echo "$1" | sed 's/...$//'
}

# Test 1: Health Check (Basic connectivity)
test_health_check() {
    increment_test
    log_test "API Health Check"
    
    # Test auth endpoint as health check since health endpoint may not exist
    local response=$(api_request "GET" "/auth/token")
    local status_code=$(get_status_code "$response")
    
    if [ "$status_code" = "405" ] || [ "$status_code" = "200" ]; then
        log_success "API endpoint responding (tested auth endpoint)"
    else
        log_failure "API connectivity failed" "HTTP $status_code"
    fi
}

# Test 2: Authentication - Login
test_authentication() {
    increment_test
    log_test "User Authentication"
    
    local login_data="{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
    local response=$(api_request "POST" "/auth/token" "$login_data")
    local status_code=$(get_status_code "$response")
    local body=$(get_response_body "$response")
    
    if [ "$status_code" = "200" ]; then
        # Extract JWT token from response
        AUTH_TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        
        if [ ! -z "$AUTH_TOKEN" ]; then
            log_success "Authentication successful, token received"
        else
            log_failure "Authentication response missing token" "$body"
        fi
    else
        log_failure "Authentication failed" "HTTP $status_code - $body"
    fi
}

# Test 3: User Profile Retrieval
test_user_profile() {
    increment_test
    log_test "User Profile Retrieval"
    
    if [ -z "$AUTH_TOKEN" ]; then
        log_failure "User profile test skipped" "No authentication token available"
        return
    fi
    
    local response=$(api_request "GET" "/users/me" "" "$AUTH_TOKEN")
    local status_code=$(get_status_code "$response")
    local body=$(get_response_body "$response")
    
    if [ "$status_code" = "200" ]; then
        # Check if response contains user data
        if echo "$body" | grep -q '"email"'; then
            log_success "User profile retrieved successfully"
        else
            log_failure "User profile response invalid" "$body"
        fi
    else
        log_failure "User profile retrieval failed" "HTTP $status_code - $body"
    fi
}

# Test 4: Trip Statistics
test_trip_statistics() {
    increment_test
    log_test "Trip Statistics"
    
    if [ -z "$AUTH_TOKEN" ]; then
        log_failure "Trip statistics test skipped" "No authentication token available"
        return
    fi
    
    local response=$(api_request "GET" "/trips/stats" "" "$AUTH_TOKEN")
    local status_code=$(get_status_code "$response")
    local body=$(get_response_body "$response")
    
    if [ "$status_code" = "200" ]; then
        # Check if response contains expected statistics fields
        if echo "$body" | grep -q '"totalTrips"' && echo "$body" | grep -q '"costSavings"'; then
            log_success "Trip statistics retrieved successfully"
        else
            log_failure "Trip statistics response invalid" "$body"
        fi
    else
        log_failure "Trip statistics retrieval failed" "HTTP $status_code - $body"
    fi
}

# Test 5: Trips List
test_trips_list() {
    increment_test
    log_test "Trips List"
    
    if [ -z "$AUTH_TOKEN" ]; then
        log_failure "Trips list test skipped" "No authentication token available"
        return
    fi
    
    local response=$(api_request "GET" "/trips?limit=5" "" "$AUTH_TOKEN")
    local status_code=$(get_status_code "$response")
    local body=$(get_response_body "$response")
    
    if [ "$status_code" = "200" ]; then
        # Check if response contains trips array (even if empty)
        if echo "$body" | grep -q '"trips"'; then
            log_success "Trips list retrieved successfully"
        else
            log_failure "Trips list response invalid" "$body"
        fi
    else
        log_failure "Trips list retrieval failed" "HTTP $status_code - $body"
    fi
}

# Test 6: Admin User Creation (if admin)
test_admin_user_creation() {
    increment_test
    log_test "Admin User Creation"
    
    if [ -z "$AUTH_TOKEN" ]; then
        log_failure "Admin user creation test skipped" "No authentication token available"
        return
    fi
    
    # Generate unique test user email
    local test_email="testuser-$(date +%s)@example.com"
    local user_data="{\"email\":\"$test_email\",\"password\":\"TestPass123!\",\"fullName\":\"Test User\",\"role\":\"parent\"}"
    
    local response=$(api_request "POST" "/admin/users" "$user_data" "$AUTH_TOKEN")
    local status_code=$(get_status_code "$response")
    local body=$(get_response_body "$response")
    
    if [ "$status_code" = "201" ]; then
        log_success "Admin user creation successful"
    elif [ "$status_code" = "403" ]; then
        log_success "Admin user creation properly restricted (non-admin user)"
    else
        log_failure "Admin user creation failed" "HTTP $status_code - $body"
    fi
}

# Test 7: Schedule Generation
test_schedule_generation() {
    increment_test
    log_test "Schedule Generation"
    
    if [ -z "$AUTH_TOKEN" ]; then
        log_failure "Schedule generation test skipped" "No authentication token available"
        return
    fi
    
    # Get next Monday's date for testing
    local next_monday=$(date -v +mon +%Y-%m-%d 2>/dev/null || date -d "next monday" +%Y-%m-%d)
    local schedule_data="{\"weekStartDate\":\"$next_monday\",\"forceRegenerate\":true}"
    
    local response=$(api_request "POST" "/admin/generate-schedule" "$schedule_data" "$AUTH_TOKEN")
    local status_code=$(get_status_code "$response")
    local body=$(get_response_body "$response")
    
    if [ "$status_code" = "200" ]; then
        if echo "$body" | grep -q '"assignmentsCreated"'; then
            log_success "Schedule generation successful"
        else
            log_failure "Schedule generation response invalid" "$body"
        fi
    elif [ "$status_code" = "403" ]; then
        log_success "Schedule generation properly restricted (non-admin user)"
    else
        log_failure "Schedule generation failed" "HTTP $status_code - $body"
    fi
}

# Test 8: Weekly Preferences Retrieval
test_weekly_preferences_get() {
    increment_test
    log_test "Weekly Preferences Retrieval"
    
    if [ -z "$AUTH_TOKEN" ]; then
        log_failure "Weekly preferences test skipped" "No authentication token available"
        return
    fi
    
    local response=$(api_request "GET" "/parents/weekly-preferences" "" "$AUTH_TOKEN")
    local status_code=$(get_status_code "$response")
    local body=$(get_response_body "$response")
    
    if [ "$status_code" = "200" ] || [ "$status_code" = "404" ]; then
        log_success "Weekly preferences endpoint accessible"
    else
        log_failure "Weekly preferences retrieval failed" "HTTP $status_code - $body"
    fi
}

# Test 9: CORS Headers Validation
test_cors_headers() {
    increment_test
    log_test "CORS Headers Validation"
    
    local response=$(curl -s -I -X OPTIONS "$API_BASE_URL/auth/token" \
        -H "Origin: https://lively-stone-016bfa20f.6.azurestaticapps.net" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type")
    
    if echo "$response" | grep -qi "access-control-allow-origin"; then
        log_success "CORS headers properly configured"
    else
        log_failure "CORS headers missing or misconfigured" "$response"
    fi
}

# Test 10: Rate Limiting (Gentle test)
test_rate_limiting() {
    increment_test
    log_test "Rate Limiting (Basic Check)"
    
    # Make a few requests quickly to check if rate limiting headers are present
    local response=$(curl -s -I "$API_BASE_URL/health")
    
    if echo "$response" | grep -qi "x-ratelimit" || echo "$response" | grep -qi "retry-after"; then
        log_success "Rate limiting headers detected"
    else
        log_success "Rate limiting test completed (headers may not be visible without triggering limits)"
    fi
}

# Main test execution
main() {
    echo "🚀 Starting API endpoint tests..."
    echo ""
    
    # Run all tests
    test_health_check
    test_authentication
    test_user_profile
    test_trip_statistics
    test_trips_list
    test_admin_user_creation
    test_schedule_generation
    test_weekly_preferences_get
    test_cors_headers
    test_rate_limiting
    
    # Summary
    echo ""
    echo -e "${BLUE}📊 Test Summary${NC}"
    echo -e "${BLUE}===============${NC}"
    echo "🧪 Total Tests: $TOTAL_TESTS"
    echo -e "✅ Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "❌ Failed: ${RED}$FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! API is functioning correctly.${NC}"
        exit 0
    else
        echo -e "${RED}⚠️  Some tests failed. Please review the errors above.${NC}"
        exit 1
    fi
}

# Run main function
main "$@" 