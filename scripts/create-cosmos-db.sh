#!/bin/bash

# VCarpool Cosmos DB Creation Script
# Creates Cosmos DB account, database, and all required containers

set -e  # Exit on any error

# Configuration
RESOURCE_GROUP="vcarpool-rg"
COSMOS_DB_NAME="vcarpool-cosmos-prod"
DATABASE_NAME="vcarpool"
LOCATION="eastus2"

echo "🚀 Creating Cosmos DB for VCarpool..."
echo "Resource Group: $RESOURCE_GROUP"
echo "Cosmos DB Name: $COSMOS_DB_NAME"
echo "Database Name: $DATABASE_NAME"
echo "Location: $LOCATION"
echo ""

# Check if Azure CLI is logged in
if ! az account show &>/dev/null; then
    echo "❌ Please login to Azure CLI first: az login"
    exit 1
fi

# Create Cosmos DB Account
echo "📊 Creating Cosmos DB Account..."
if az cosmosdb show --name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo "✅ Cosmos DB already exists: $COSMOS_DB_NAME"
else
    echo "Creating new Cosmos DB Account: $COSMOS_DB_NAME"
    az cosmosdb create \
        --name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --locations regionName="$LOCATION" failoverPriority=0 isZoneRedundant=false \
        --kind GlobalDocumentDB \
        --default-consistency-level Session \
        --enable-free-tier true \
        --tags application=vcarpool environment=prod
    echo "✅ Cosmos DB Account created successfully"
fi

# Create Database
echo "🗄️ Creating Database..."
if az cosmosdb sql database show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --name "$DATABASE_NAME" &>/dev/null; then
    echo "✅ Database already exists: $DATABASE_NAME"
else
    echo "Creating database: $DATABASE_NAME"
    az cosmosdb sql database create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --name "$DATABASE_NAME" \
        --throughput 400
    echo "✅ Database created successfully"
fi

# Create Containers
echo "📦 Creating Containers..."

# Users container
echo "Creating users container..."
if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "users" &>/dev/null; then
    echo "✅ Users container already exists"
else
    az cosmosdb sql container create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DATABASE_NAME" \
        --name "users" \
        --partition-key-path "/id"
    echo "✅ Users container created"
fi

# Trips container
echo "Creating trips container..."
if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "trips" &>/dev/null; then
    echo "✅ Trips container already exists"
else
    az cosmosdb sql container create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DATABASE_NAME" \
        --name "trips" \
        --partition-key-path "/driverId"
    echo "✅ Trips container created"
fi

# Schedules container
echo "Creating schedules container..."
if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "schedules" &>/dev/null; then
    echo "✅ Schedules container already exists"
else
    az cosmosdb sql container create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DATABASE_NAME" \
        --name "schedules" \
        --partition-key-path "/userId"
    echo "✅ Schedules container created"
fi

# SwapRequests container
echo "Creating swapRequests container..."
if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "swapRequests" &>/dev/null; then
    echo "✅ SwapRequests container already exists"
else
    az cosmosdb sql container create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DATABASE_NAME" \
        --name "swapRequests" \
        --partition-key-path "/requesterId"
    echo "✅ SwapRequests container created"
fi

# Email Templates container
echo "Creating email-templates container..."
if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "email-templates" &>/dev/null; then
    echo "✅ Email Templates container already exists"
else
    az cosmosdb sql container create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DATABASE_NAME" \
        --name "email-templates" \
        --partition-key-path "/id"
    echo "✅ Email Templates container created"
fi

# Chat Participants container
echo "Creating chatParticipants container..."
if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "chatParticipants" &>/dev/null; then
    echo "✅ Chat Participants container already exists"
else
    az cosmosdb sql container create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DATABASE_NAME" \
        --name "chatParticipants" \
        --partition-key-path "/id"
    echo "✅ Chat Participants container created"
fi

# Notifications container
echo "Creating notifications container..."
if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "notifications" &>/dev/null; then
    echo "✅ Notifications container already exists"
else
    az cosmosdb sql container create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DATABASE_NAME" \
        --name "notifications" \
        --partition-key-path "/id"
    echo "✅ Notifications container created"
fi

# Messages container
echo "Creating messages container..."
if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "messages" &>/dev/null; then
    echo "✅ Messages container already exists"
else
    az cosmosdb sql container create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DATABASE_NAME" \
        --name "messages" \
        --partition-key-path "/id"
    echo "✅ Messages container created"
fi

# Chats container
echo "Creating chats container..."
if az cosmosdb sql container show --account-name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DATABASE_NAME" --name "chats" &>/dev/null; then
    echo "✅ Chats container already exists"
else
    az cosmosdb sql container create \
        --account-name "$COSMOS_DB_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DATABASE_NAME" \
        --name "chats" \
        --partition-key-path "/id"
    echo "✅ Chats container created"
fi

# Get connection details
echo ""
echo "🔗 Getting connection details..."
COSMOS_ENDPOINT=$(az cosmosdb show --name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --query documentEndpoint -o tsv)
COSMOS_KEY=$(az cosmosdb keys list --name "$COSMOS_DB_NAME" --resource-group "$RESOURCE_GROUP" --query primaryMasterKey -o tsv)

echo ""
echo "✅ Cosmos DB setup completed successfully!"
echo ""
echo "📋 Connection Details:"
echo "Cosmos DB Name: $COSMOS_DB_NAME"
echo "Database Name: $DATABASE_NAME"
echo "Endpoint: $COSMOS_ENDPOINT"
echo "Primary Key: $COSMOS_KEY"
echo ""
echo "🔧 Function App Configuration:"
echo "COSMOS_DB_ENDPOINT=$COSMOS_ENDPOINT"
echo "COSMOS_DB_KEY=$COSMOS_KEY"
echo "COSMOS_DB_DATABASE_ID=$DATABASE_NAME"
echo ""
echo "📊 Containers Created:"
echo "- users (partition: /id)"
echo "- trips (partition: /driverId)"
echo "- schedules (partition: /userId)"
echo "- swapRequests (partition: /requesterId)"
echo "- notifications (partition: /id)"
echo "- messages (partition: /id)"
echo "- chats (partition: /id)"
echo "- chatParticipants (partition: /id)"
echo "- email-templates (partition: /id)"
echo ""
echo "🎯 Next Steps:"
echo "1. Update Function App settings with connection details"
echo "2. Run 'node scripts/create-admin-user.mjs' to create admin user"
echo "3. Test the application with real database" 