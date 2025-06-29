#!/bin/bash

echo "🔍 Carpool Backend Deployment Verification"
echo "==========================================="

# Backend API base URL
API_BASE="https://carpool-api-prod.azurewebsites.net/api"

# Test credentials
TEST_EMAIL="admin@carpool.com"
TEST_PASSWORD="${TEST_PASSWORD:-test-admin-password}"

echo ""
echo "📡 Testing Required Endpoints..."

# Test 1: Health endpoint
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "   ✅ Health endpoint: OK (200)"
else
    echo "   ❌ Health endpoint: Failed ($HEALTH_RESPONSE)"
fi

# Test 2: Auth login (OPTIONS - CORS preflight)
echo "2. Testing auth login CORS..."
CORS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API_BASE/auth/login")
if [ "$CORS_RESPONSE" = "200" ]; then
    echo "   ✅ Auth login CORS: OK (200)"
else
    echo "   ❌ Auth login CORS: Failed ($CORS_RESPONSE)"
fi

# Test 3: Auth login (POST - Authentication)
echo "3. Testing auth login..."
AUTH_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | tail -c 3)
if [ "$AUTH_RESPONSE" = "200" ]; then
    echo "   ✅ Auth login: OK (200)"
else
    echo "   ❌ Auth login: Failed ($AUTH_RESPONSE)"
fi

# Test 4: Trips stats
echo "4. Testing trips stats..."
STATS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/trips/stats")
if [ "$STATS_RESPONSE" = "200" ]; then
    echo "   ✅ Trips stats: OK (200)"
else
    echo "   ❌ Trips stats: Failed ($STATS_RESPONSE)"
fi

# Test 5: Users me
echo "5. Testing users me..."
USERS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/users/me")
if [ "$USERS_RESPONSE" = "200" ]; then
    echo "   ✅ Users me: OK (200)"
else
    echo "   ❌ Users me: Failed ($USERS_RESPONSE)"
fi

echo ""
echo "🔧 Checking Azure Function App Status..."

# List deployed functions
echo "Deployed functions:"
az functionapp function list --name "carpool-api-prod" --resource-group "carpool-rg" --query "[].{Name:name,Trigger:config.bindings[0].type}" --output table 2>/dev/null || echo "   ⚠️  Could not list functions (Azure CLI not configured)"

echo ""
echo "📋 Summary:"
echo "   Health: $HEALTH_RESPONSE"
echo "   CORS: $CORS_RESPONSE" 
echo "   Auth: $AUTH_RESPONSE"
echo "   Stats: $STATS_RESPONSE"
echo "   Users: $USERS_RESPONSE"

# Overall status
if [ "$HEALTH_RESPONSE" = "200" ] && [ "$CORS_RESPONSE" = "200" ] && [ "$AUTH_RESPONSE" = "200" ] && [ "$STATS_RESPONSE" = "200" ] && [ "$USERS_RESPONSE" = "200" ]; then
    echo ""
    echo "🎉 ALL ENDPOINTS WORKING! Backend deployment is successful."
    exit 0
else
    echo ""
    echo "⚠️  SOME ENDPOINTS FAILING! Backend needs attention."
    exit 1
fi 