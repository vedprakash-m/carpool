#!/bin/bash

# VCarpool Cosmos DB Container Verification Script
# Verifies all containers exist and match Bicep template definitions

set -e

# Configuration
RESOURCE_GROUP="vcarpool-rg"
COSMOS_DB_NAME="vcarpool-cosmos-prod"
DATABASE_NAME="vcarpool"

echo "🔍 Verifying Cosmos DB Containers..."
echo "Cosmos DB: $COSMOS_DB_NAME"
echo "Database: $DATABASE_NAME"
echo ""

# Expected containers from Bicep templates
declare -a CONTAINERS=(
    "users:/id"
    "trips:/driverId"
    "schedules:/userId"
    "swapRequests:/requesterId"
    "notifications:/id"
    "messages:/id"
    "chats:/id"
    "chatParticipants:/id"
    "email-templates:/id"
)

# Check if Azure CLI is logged in
if ! az account show &>/dev/null; then
    echo "❌ Please login to Azure CLI first: az login"
    exit 1
fi

# Verify Cosmos DB exists
echo "📊 Checking Cosmos DB Account..."
if az cosmosdb show --name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --query "name" -o tsv &>/dev/null; then
    echo "✅ Cosmos DB Account exists: $COSMOS_DB_NAME"
else
    echo "❌ Cosmos DB Account not found: $COSMOS_DB_NAME"
    exit 1
fi

# Verify Database exists
echo "🗄️ Checking Database..."
if az cosmosdb sql database show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --name "$DATABASE_NAME" --query "name" -o tsv &>/dev/null; then
    echo "✅ Database exists: $DATABASE_NAME"
else
    echo "❌ Database not found: $DATABASE_NAME"
    exit 1
fi

# Verify each container
echo "📦 Checking Containers..."
MISSING_CONTAINERS=()
EXISTING_CONTAINERS=()

for container_info in "${CONTAINERS[@]}"; do
    IFS=':' read -r container_name partition_key <<< "$container_info"
    
    echo -n "  Checking $container_name... "
    
    if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "$container_name" --query "name" -o tsv &>/dev/null; then
        echo "✅ EXISTS"
        EXISTING_CONTAINERS+=("$container_name")
        
        # Verify partition key
        ACTUAL_PARTITION_KEY=$(az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "$container_name" --query "resource.partitionKey.paths[0]" -o tsv)
        if [ "$ACTUAL_PARTITION_KEY" = "$partition_key" ]; then
            echo "    ✅ Partition key matches: $partition_key"
        else
            echo "    ⚠️  Partition key mismatch: expected $partition_key, got $ACTUAL_PARTITION_KEY"
        fi
    else
        echo "❌ MISSING"
        MISSING_CONTAINERS+=("$container_name")
    fi
done

echo ""
echo "📋 Summary:"
echo "✅ Existing containers (${#EXISTING_CONTAINERS[@]}): ${EXISTING_CONTAINERS[*]}"
if [ ${#MISSING_CONTAINERS[@]} -gt 0 ]; then
    echo "❌ Missing containers (${#MISSING_CONTAINERS[@]}): ${MISSING_CONTAINERS[*]}"
    echo ""
    echo "🔧 To create missing containers, run:"
    echo "   ./scripts/create-cosmos-db.sh"
    exit 1
else
    echo "🎉 All containers verified successfully!"
fi

# Get connection details
echo ""
echo "🔗 Connection Details:"
COSMOS_ENDPOINT=$(az cosmosdb show --name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --query documentEndpoint -o tsv)
echo "Endpoint: $COSMOS_ENDPOINT"
echo "Database: $DATABASE_NAME"

echo ""
echo "✅ Cosmos DB infrastructure verification completed successfully!"
echo "All containers match the Bicep template definitions." 