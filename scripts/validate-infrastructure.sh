#!/bin/bash

# Tesla STEM Carpool Infrastructure Validation Script
# This script validates the deployed infrastructure and performs health checks

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-dev}  # Default to dev if not specified
RESOURCE_GROUP_DB="carpool-db-rg"
RESOURCE_GROUP_COMPUTE="carpool-rg"

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

check_resource() {
    local resource_type=$1
    local resource_group=$2
    local resource_name=$3
    
    if az "$resource_type" show --resource-group "$resource_group" --name "$resource_name" &> /dev/null; then
        echo_success "$resource_type: $resource_name (✓)"
        return 0
    else
        echo_error "$resource_type: $resource_name (✗)"
        return 1
    fi
}

check_function_app_health() {
    local function_app_name=$1
    local resource_group=$2
    
    echo_info "Checking Function App health: $function_app_name"
    
    # Get Function App URL
    local app_url=$(az functionapp show \
        --resource-group "$resource_group" \
        --name "$function_app_name" \
        --query "defaultHostName" \
        --output tsv 2>/dev/null || echo "")
    
    if [ -n "$app_url" ]; then
        echo_success "Function App URL: https://$app_url"
        
        # Test health endpoint if available
        if curl -s -f "https://$app_url/api/hello" > /dev/null 2>&1; then
            echo_success "Health check endpoint responding (✓)"
        else
            echo_warning "Health check endpoint not responding or not deployed yet"
        fi
    else
        echo_error "Could not retrieve Function App URL"
        return 1
    fi
}

check_cosmos_db_health() {
    local cosmos_account_name=$1
    local resource_group=$2
    
    echo_info "Checking Cosmos DB health: $cosmos_account_name"
    
    # Check Cosmos DB status
    local cosmos_status=$(az cosmosdb show \
        --resource-group "$resource_group" \
        --name "$cosmos_account_name" \
        --query "provisioningState" \
        --output tsv 2>/dev/null || echo "")
    
    if [ "$cosmos_status" = "Succeeded" ]; then
        echo_success "Cosmos DB status: $cosmos_status (✓)"
        
        # Check if we can list databases
        local db_count=$(az cosmosdb sql database list \
            --account-name "$cosmos_account_name" \
            --resource-group "$resource_group" \
            --query "length(@)" \
            --output tsv 2>/dev/null || echo "0")
        
        echo_info "Cosmos DB databases found: $db_count"
    else
        echo_error "Cosmos DB status: $cosmos_status (✗)"
        return 1
    fi
}

# Validate environment parameter
if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod)$ ]]; then
    echo_error "Invalid environment: $ENVIRONMENT. Must be dev, test, or prod."
    exit 1
fi

echo_info "Validating infrastructure for environment: $ENVIRONMENT"

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
echo_info "Validating resources in subscription: $SUBSCRIPTION"

# Set resource names based on environment
if [ "$ENVIRONMENT" = "prod" ]; then
    COSMOS_DB_NAME="carpool-db"
    STORAGE_ACCOUNT_NAME="carpoolsaprod"
    KEY_VAULT_NAME="carpool-kv-prod"
else
    COSMOS_DB_NAME="carpool-db-$ENVIRONMENT"
    STORAGE_ACCOUNT_NAME="carpoolsa$ENVIRONMENT"
    KEY_VAULT_NAME="carpool-kv-$ENVIRONMENT"
fi

FUNCTION_APP_NAME="carpool-backend"

# Validation counters
VALIDATION_PASSED=0
VALIDATION_FAILED=0

echo_info "=== Resource Group Validation ==="

# Check resource groups
if az group show --name "$RESOURCE_GROUP_DB" &> /dev/null; then
    echo_success "Database Resource Group: $RESOURCE_GROUP_DB (✓)"
    ((VALIDATION_PASSED++))
else
    echo_error "Database Resource Group: $RESOURCE_GROUP_DB (✗)"
    ((VALIDATION_FAILED++))
fi

if az group show --name "$RESOURCE_GROUP_COMPUTE" &> /dev/null; then
    echo_success "Compute Resource Group: $RESOURCE_GROUP_COMPUTE (✓)"
    ((VALIDATION_PASSED++))
else
    echo_error "Compute Resource Group: $RESOURCE_GROUP_COMPUTE (✗)"
    ((VALIDATION_FAILED++))
fi

echo_info "=== Database Tier Validation ==="

# Check Cosmos DB
if check_resource "cosmosdb" "$RESOURCE_GROUP_DB" "$COSMOS_DB_NAME"; then
    ((VALIDATION_PASSED++))
    check_cosmos_db_health "$COSMOS_DB_NAME" "$RESOURCE_GROUP_DB"
else
    ((VALIDATION_FAILED++))
fi

# Check Storage Account
if check_resource "storage account" "$RESOURCE_GROUP_DB" "$STORAGE_ACCOUNT_NAME"; then
    ((VALIDATION_PASSED++))
else
    ((VALIDATION_FAILED++))
fi

echo_info "=== Compute Tier Validation ==="

# Check Function App
if check_resource "functionapp" "$RESOURCE_GROUP_COMPUTE" "$FUNCTION_APP_NAME"; then
    ((VALIDATION_PASSED++))
    check_function_app_health "$FUNCTION_APP_NAME" "$RESOURCE_GROUP_COMPUTE"
else
    ((VALIDATION_FAILED++))
fi

# Check Application Insights
if check_resource "monitor app-insights component" "$RESOURCE_GROUP_COMPUTE" "$FUNCTION_APP_NAME"; then
    ((VALIDATION_PASSED++))
else
    ((VALIDATION_FAILED++))
fi

echo_info "=== Configuration Validation ==="

# Check Function App settings
echo_info "Checking Function App configuration..."
COSMOS_CONNECTION_CONFIGURED=$(az functionapp config appsettings list \
    --resource-group "$RESOURCE_GROUP_COMPUTE" \
    --name "$FUNCTION_APP_NAME" \
    --query "[?name=='COSMOS_DB_CONNECTION_STRING'].value" \
    --output tsv 2>/dev/null || echo "")

if [ -n "$COSMOS_CONNECTION_CONFIGURED" ]; then
    echo_success "Cosmos DB connection string configured (✓)"
    ((VALIDATION_PASSED++))
else
    echo_warning "Cosmos DB connection string not configured"
    ((VALIDATION_FAILED++))
fi

# Check JWT configuration
JWT_SECRET_CONFIGURED=$(az functionapp config appsettings list \
    --resource-group "$RESOURCE_GROUP_COMPUTE" \
    --name "$FUNCTION_APP_NAME" \
    --query "[?name=='JWT_SECRET'].value" \
    --output tsv 2>/dev/null || echo "")

if [ -n "$JWT_SECRET_CONFIGURED" ]; then
    echo_success "JWT secret configured (✓)"
    ((VALIDATION_PASSED++))
else
    echo_warning "JWT secret not configured"
    ((VALIDATION_FAILED++))
fi

echo_info "=== Validation Summary ==="
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo "Passed: $VALIDATION_PASSED"
echo "Failed: $VALIDATION_FAILED"
echo "Total: $((VALIDATION_PASSED + VALIDATION_FAILED))"
echo "=================================="

if [ $VALIDATION_FAILED -eq 0 ]; then
    echo_success "All validations passed! Infrastructure is ready."
    exit 0
else
    echo_error "Some validations failed. Please review and fix issues before proceeding."
    exit 1
fi
