#!/bin/bash

# Tesla STEM Carpool Infrastructure Deployment Script
# This script deploys the complete infrastructure using Bicep templates

set -e  # Exit on any error

# Configuration
RESOURCE_GROUP_DB="carpool-db-rg"
RESOURCE_GROUP_COMPUTE="carpool-rg"
LOCATION="eastus"
ENVIRONMENT=${1:-dev}  # Default to dev if not specified
APP_NAME="carpool"
DEPLOYMENT_NAME="carpool-infrastructure-$(date +%Y%m%d-%H%M%S)"

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

echo_info "Starting infrastructure deployment for environment: $ENVIRONMENT"

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

# Display current subscription
SUBSCRIPTION=$(az account show --query name -o tsv)
echo_info "Deploying to subscription: $SUBSCRIPTION"

# Phase 1: Create Resource Groups if they don't exist
echo_info "Phase 1: Creating resource groups..."

if ! az group show --name "$RESOURCE_GROUP_DB" &> /dev/null; then
    echo_info "Creating database resource group: $RESOURCE_GROUP_DB"
    az group create --name "$RESOURCE_GROUP_DB" --location "$LOCATION"
    echo_success "Database resource group created"
else
    echo_info "Database resource group already exists: $RESOURCE_GROUP_DB"
fi

if ! az group show --name "$RESOURCE_GROUP_COMPUTE" &> /dev/null; then
    echo_info "Creating compute resource group: $RESOURCE_GROUP_COMPUTE"
    az group create --name "$RESOURCE_GROUP_COMPUTE" --location "$LOCATION"
    echo_success "Compute resource group created"
else
    echo_info "Compute resource group already exists: $RESOURCE_GROUP_COMPUTE"
fi

# Phase 2: Deploy Database Tier (Persistent Resources)
echo_info "Phase 2: Deploying database tier..."

DATABASE_DEPLOYMENT="database-tier-$DEPLOYMENT_NAME"
az deployment group create \
    --resource-group "$RESOURCE_GROUP_DB" \
    --name "$DATABASE_DEPLOYMENT" \
    --template-file "../infra/database.bicep" \
    --parameters \
        environmentName="$ENVIRONMENT" \
        location="$LOCATION" \
        appName="$APP_NAME" \
    --query "properties.provisioningState" \
    --output table

if [ $? -eq 0 ]; then
    echo_success "Database tier deployed successfully"
else
    echo_error "Database tier deployment failed"
    exit 1
fi

# Phase 3: Deploy Compute Tier (Function Apps, Static Web Apps)
echo_info "Phase 3: Deploying compute tier..."

COMPUTE_DEPLOYMENT="compute-tier-$DEPLOYMENT_NAME"
az deployment group create \
    --resource-group "$RESOURCE_GROUP_COMPUTE" \
    --name "$COMPUTE_DEPLOYMENT" \
    --template-file "../infra/main.bicep" \
    --parameters \
        environmentName="$ENVIRONMENT" \
        location="$LOCATION" \
        appName="$APP_NAME" \
    --query "properties.provisioningState" \
    --output table

if [ $? -eq 0 ]; then
    echo_success "Compute tier deployed successfully"
else
    echo_error "Compute tier deployment failed"
    exit 1
fi

# Phase 4: Get deployment outputs and connection strings
echo_info "Phase 4: Retrieving deployment outputs..."

# Get Cosmos DB connection string
COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
    --resource-group "$RESOURCE_GROUP_DB" \
    --name "carpool-db" \
    --type connection-strings \
    --query "connectionStrings[0].connectionString" \
    --output tsv 2>/dev/null || echo "")

if [ -n "$COSMOS_CONNECTION_STRING" ]; then
    echo_success "Cosmos DB connection string retrieved"
else
    echo_warning "Could not retrieve Cosmos DB connection string"
fi

# Get Function App name
FUNCTION_APP_NAME=$(az deployment group show \
    --resource-group "$RESOURCE_GROUP_COMPUTE" \
    --name "$COMPUTE_DEPLOYMENT" \
    --query "properties.outputs.functionAppName.value" \
    --output tsv 2>/dev/null || echo "carpool-backend")

echo_success "Function App: $FUNCTION_APP_NAME"

# Get Static Web App name
STATIC_WEB_APP_NAME=$(az deployment group show \
    --resource-group "$RESOURCE_GROUP_COMPUTE" \
    --name "$COMPUTE_DEPLOYMENT" \
    --query "properties.outputs.staticWebAppName.value" \
    --output tsv 2>/dev/null || echo "")

if [ -n "$STATIC_WEB_APP_NAME" ]; then
    echo_success "Static Web App: $STATIC_WEB_APP_NAME"
fi

# Phase 5: Configure Function App Settings
echo_info "Phase 5: Configuring Function App settings..."

if [ -n "$COSMOS_CONNECTION_STRING" ]; then
    # Update Function App settings with database connection
    az functionapp config appsettings set \
        --resource-group "$RESOURCE_GROUP_COMPUTE" \
        --name "$FUNCTION_APP_NAME" \
        --settings \
            "COSMOS_DB_CONNECTION_STRING=$COSMOS_CONNECTION_STRING" \
            "ENVIRONMENT=$ENVIRONMENT" \
        --output none

    echo_success "Function App settings configured"
else
    echo_warning "Skipping Function App configuration due to missing connection string"
fi

# Phase 6: Display deployment summary
echo_info "Phase 6: Deployment Summary"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo "Database Resource Group: $RESOURCE_GROUP_DB"
echo "Compute Resource Group: $RESOURCE_GROUP_COMPUTE"
echo "Function App: $FUNCTION_APP_NAME"
if [ -n "$STATIC_WEB_APP_NAME" ]; then
    echo "Static Web App: $STATIC_WEB_APP_NAME"
fi
echo "Deployment Name: $DEPLOYMENT_NAME"
echo "=================================="

echo_success "Infrastructure deployment completed successfully!"

# Phase 7: Next Steps
echo_info "Next Steps:"
echo "1. Verify Function App is running: az functionapp show --resource-group $RESOURCE_GROUP_COMPUTE --name $FUNCTION_APP_NAME"
echo "2. Deploy application code: npm run deploy:dev (from backend directory)"
echo "3. Run health checks: curl https://$FUNCTION_APP_NAME.azurewebsites.net/api/hello"
echo "4. Monitor with Application Insights in Azure Portal"

echo_info "To clean up resources, run: ./cleanup-infrastructure.sh $ENVIRONMENT"
