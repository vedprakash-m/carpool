#!/bin/bash

# Tesla STEM Carpool Configuration Update Script
# This script updates Function App settings with environment-specific configuration

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-dev}  # Default to dev if not specified
FUNCTION_APP_NAME=${2:-carpool-backend}
RESOURCE_GROUP=${3:-carpool-rg}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Validate environment parameter
if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod)$ ]]; then
    echo_error "Invalid environment: $ENVIRONMENT. Must be dev, test, or prod."
    exit 1
fi

echo_info "Updating Function App configuration for environment: $ENVIRONMENT"

# Check if Azure CLI is installed and logged in
if ! command -v az &> /dev/null; then
    echo_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo_error "Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Verify Function App exists
if ! az functionapp show --resource-group "$RESOURCE_GROUP" --name "$FUNCTION_APP_NAME" &> /dev/null; then
    echo_error "Function App '$FUNCTION_APP_NAME' not found in resource group '$RESOURCE_GROUP'"
    exit 1
fi

echo_info "Function App found: $FUNCTION_APP_NAME"

# Set environment-specific configurations
case $ENVIRONMENT in
    "dev")
        COSMOS_DB_NAME="carpool-db-dev"
        CORS_ORIGINS="http://localhost:3000,https://localhost:3000,https://carpool-web-dev.azurestaticapps.net"
        KEY_VAULT_URL="https://carpool-kv-dev.vault.azure.net/"
        ;;
    "test")
        COSMOS_DB_NAME="carpool-db-test"
        CORS_ORIGINS="https://carpool-web-test.azurestaticapps.net"
        KEY_VAULT_URL="https://carpool-kv-test.vault.azure.net/"
        ;;
    "prod")
        COSMOS_DB_NAME="carpool-db"
        CORS_ORIGINS="https://carpool.teslastem.org,https://carpool-web-prod.azurestaticapps.net"
        KEY_VAULT_URL="https://carpool-kv-prod.vault.azure.net/"
        ;;
esac

echo_info "Retrieving Cosmos DB connection string..."

# Get Cosmos DB connection string
COSMOS_CONNECTION_STRING=""
if [ "$ENVIRONMENT" = "prod" ]; then
    COSMOS_DB_RG="carpool-db-rg"
else
    COSMOS_DB_RG="carpool-db-rg"
fi

COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
    --resource-group "$COSMOS_DB_RG" \
    --name "$COSMOS_DB_NAME" \
    --type connection-strings \
    --query "connectionStrings[0].connectionString" \
    --output tsv 2>/dev/null || echo "")

if [ -n "$COSMOS_CONNECTION_STRING" ]; then
    echo_success "Cosmos DB connection string retrieved"
else
    echo_warning "Could not retrieve Cosmos DB connection string"
fi

# Get current Azure tenant and client IDs (if already configured)
CURRENT_TENANT_ID=$(az functionapp config appsettings list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --query "[?name=='AZURE_TENANT_ID'].value" \
    --output tsv 2>/dev/null || echo "")

CURRENT_CLIENT_ID=$(az functionapp config appsettings list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --query "[?name=='AZURE_CLIENT_ID'].value" \
    --output tsv 2>/dev/null || echo "")

# Default to current values if they exist, otherwise use placeholder
AZURE_TENANT_ID=${CURRENT_TENANT_ID:-"your-tenant-id"}
AZURE_CLIENT_ID=${CURRENT_CLIENT_ID:-"your-client-id"}

echo_info "Updating Function App settings..."

# Prepare settings array
SETTINGS=(
    "NODE_ENV=$ENVIRONMENT"
    "COSMOS_DB_DATABASE=carpool"
    "JWT_EXPIRES_IN=24h"
    "BCRYPT_ROUNDS=12"
    "MAX_LOGIN_ATTEMPTS=5"
    "LOCKOUT_DURATION=15"
    "GEOCODING_PROVIDER=mock"
    "FALLBACK_TO_MOCK=true"
    "CORS_ORIGINS=$CORS_ORIGINS"
    "MAX_DISTANCE_KM=50"
    "DEFAULT_SERVICE_RADIUS=25"
    "USE_KEY_VAULT=false"
)

# Add Cosmos DB connection if available
if [ -n "$COSMOS_CONNECTION_STRING" ]; then
    SETTINGS+=("COSMOS_DB_CONNECTION_STRING=$COSMOS_CONNECTION_STRING")
fi

# Add Azure settings if configured
if [ "$AZURE_TENANT_ID" != "your-tenant-id" ]; then
    SETTINGS+=("AZURE_TENANT_ID=$AZURE_TENANT_ID")
fi

if [ "$AZURE_CLIENT_ID" != "your-client-id" ]; then
    SETTINGS+=("AZURE_CLIENT_ID=$AZURE_CLIENT_ID")
fi

# Add Key Vault URL for production
if [ "$ENVIRONMENT" = "prod" ]; then
    SETTINGS+=("AZURE_KEY_VAULT_URL=$KEY_VAULT_URL")
    SETTINGS+=("USE_KEY_VAULT=true")
fi

# Apply settings to Function App
echo_info "Applying ${#SETTINGS[@]} configuration settings..."

az functionapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --settings "${SETTINGS[@]}" \
    --output none

if [ $? -eq 0 ]; then
    echo_success "Function App settings updated successfully"
else
    echo_error "Failed to update Function App settings"
    exit 1
fi

# Verify critical settings
echo_info "Verifying critical settings..."

# Check if Cosmos DB is configured
COSMOS_CONFIGURED=$(az functionapp config appsettings list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --query "[?name=='COSMOS_DB_CONNECTION_STRING'].value" \
    --output tsv 2>/dev/null || echo "")

if [ -n "$COSMOS_CONFIGURED" ]; then
    echo_success "✓ Cosmos DB connection configured"
else
    echo_warning "⚠ Cosmos DB connection not configured"
fi

# Check if CORS is configured
CORS_CONFIGURED=$(az functionapp config appsettings list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --query "[?name=='CORS_ORIGINS'].value" \
    --output tsv 2>/dev/null || echo "")

if [ -n "$CORS_CONFIGURED" ]; then
    echo_success "✓ CORS origins configured: $CORS_CONFIGURED"
else
    echo_warning "⚠ CORS origins not configured"
fi

# Check environment setting
ENV_CONFIGURED=$(az functionapp config appsettings list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP_NAME" \
    --query "[?name=='NODE_ENV'].value" \
    --output tsv 2>/dev/null || echo "")

if [ "$ENV_CONFIGURED" = "$ENVIRONMENT" ]; then
    echo_success "✓ Environment configured: $ENV_CONFIGURED"
else
    echo_warning "⚠ Environment mismatch: expected $ENVIRONMENT, got $ENV_CONFIGURED"
fi

echo_info "Configuration Summary:"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo "Function App: $FUNCTION_APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "CORS Origins: $CORS_ORIGINS"
echo "Cosmos DB: $([ -n "$COSMOS_CONFIGURED" ] && echo "Configured" || echo "Not configured")"
echo "Azure Tenant ID: $([ "$AZURE_TENANT_ID" != "your-tenant-id" ] && echo "Configured" || echo "Not configured")"
echo "Azure Client ID: $([ "$AZURE_CLIENT_ID" != "your-client-id" ] && echo "Configured" || echo "Not configured")"
echo "=================================="

echo_success "Configuration update completed!"

echo_info "Next steps:"
echo "1. Verify Function App is running: az functionapp show --resource-group $RESOURCE_GROUP --name $FUNCTION_APP_NAME --query state"
echo "2. Test health endpoint: curl https://$FUNCTION_APP_NAME.azurewebsites.net/api/hello"
echo "3. Check Application Insights for any startup errors"
echo "4. Update Azure Entra ID settings if needed: ./update-azure-auth.sh $ENVIRONMENT"
