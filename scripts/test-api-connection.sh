#!/bin/bash

# VCarpool API Connection Test Script
# Tests API endpoints and database connectivity

set -e

echo "🔍 Testing VCarpool API and Database Connectivity..."
echo ""

# Configuration
FUNCTION_APP_NAME="vcarpool-api-prod"
RESOURCE_GROUP="vcarpool-rg"
API_BASE_URL="https://vcarpool-api-prod.azurewebsites.net/api"

echo "📋 API Configuration:"
echo "Function App: $FUNCTION_APP_NAME"
echo "API Base URL: $API_BASE_URL"
echo ""

# Test 1: Check Function App Status
echo "1️⃣ Checking Function App Status..."
FUNCTION_APP_STATE=$(az functionapp show --name "$FUNCTION_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "state" -o tsv)
echo "Function App State: $FUNCTION_APP_STATE"

if [ "$FUNCTION_APP_STATE" != "Running" ]; then
    echo "❌ Function App is not running!"
    exit 1
fi
echo "✅ Function App is running"
echo ""

# Test 2: Check Cosmos DB Connection Settings
echo "2️⃣ Checking Cosmos DB Connection Settings..."
COSMOS_ENDPOINT=$(az functionapp config appsettings list --name "$FUNCTION_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "[?name=='COSMOS_DB_ENDPOINT'].value" -o tsv)
COSMOS_DB_ID=$(az functionapp config appsettings list --name "$FUNCTION_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "[?name=='COSMOS_DB_DATABASE_ID'].value" -o tsv)

echo "Cosmos DB Endpoint: $COSMOS_ENDPOINT"
echo "Database ID: $COSMOS_DB_ID"

if [ -z "$COSMOS_ENDPOINT" ] || [ -z "$COSMOS_DB_ID" ]; then
    echo "❌ Cosmos DB settings are missing!"
    exit 1
fi
echo "✅ Cosmos DB settings are configured"
echo ""

# Test 3: Check Available Functions
echo "3️⃣ Listing Available Functions..."
az functionapp function list --resource-group "$RESOURCE_GROUP" --name "$FUNCTION_APP_NAME" --query "[].name" -o table
echo ""

# Test 4: Test API Endpoints
echo "4️⃣ Testing API Endpoints..."

# Test Auth Register (should fail with validation but return 400, not 500)
echo "Testing auth/register endpoint..."
REGISTER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"testpass","firstName":"Test","lastName":"User","role":"parent"}')

echo "Auth Register Response: $REGISTER_RESPONSE"
if [ "$REGISTER_RESPONSE" -eq 500 ]; then
    echo "❌ Auth endpoint returning 500 error - likely database connection issue"
elif [ "$REGISTER_RESPONSE" -eq 400 ] || [ "$REGISTER_RESPONSE" -eq 409 ]; then
    echo "✅ Auth endpoint is working (validation/conflict error is expected)"
else
    echo "⚠️  Auth endpoint returned: $REGISTER_RESPONSE"
fi
echo ""

# Test 5: Database Connection Test
echo "5️⃣ Testing Database Connection..."
echo "Attempting to query Cosmos DB directly..."

COSMOS_DB_NAME="vcarpool-cosmos-prod"
CONTAINER_COUNT=$(az cosmosdb sql container list --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "vcarpool" --query "length(@)" -o tsv)

echo "Available containers: $CONTAINER_COUNT"
if [ "$CONTAINER_COUNT" -gt 0 ]; then
    echo "✅ Database is accessible and has containers"
    
    # List container names
    echo "Container names:"
    az cosmosdb sql container list --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "vcarpool" --query "[].name" -o table
else
    echo "❌ Database has no containers or is not accessible"
fi
echo ""

# Test 6: Application Logs Check
echo "6️⃣ Checking Recent Application Logs..."
echo "Recent error logs from Function App:"
az monitor log-analytics query \
    --workspace-id "$(az monitor log-analytics workspace show --resource-group "$RESOURCE_GROUP" --workspace-name "vcarpool-logs-prod" --query "customerId" -o tsv 2>/dev/null || echo "unknown")" \
    --analytics-query "AppTraces | where TimeGenerated > ago(1h) and SeverityLevel >= 3 | top 5 by TimeGenerated desc | project TimeGenerated, Message" \
    --out table 2>/dev/null || echo "⚠️  Log Analytics not available or not configured"

echo ""
echo "🎯 Summary and Recommendations:"

if [ "$REGISTER_RESPONSE" -eq 500 ]; then
    echo "❌ Backend API has database connection issues"
    echo "💡 Recommendations:"
    echo "   1. Restart the Function App: az functionapp restart --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP"
    echo "   2. Verify Cosmos DB connection key is valid"
    echo "   3. Check Function App logs for detailed error messages"
    echo "   4. Ensure Function App has latest deployment with database client code"
else
    echo "✅ API appears to be functional"
    echo "💡 Next steps:"
    echo "   1. Update CI/CD to use working endpoints"
    echo "   2. Deploy missing health endpoint if needed"
    echo "   3. Test frontend connectivity"
fi

echo ""
echo "🔗 Quick Frontend Test:"
echo "   Frontend URL: https://lively-stone-016bfa20f.6.azurestaticapps.net"
echo "   API URL configured: $API_BASE_URL"
echo "   Test login to verify end-to-end connectivity" 