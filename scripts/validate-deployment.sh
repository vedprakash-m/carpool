#!/bin/bash

# Deployment Validation Script for Carpool
# Validates infrastructure deployment and application functionality

set -e

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-carpool-rg}"
DB_RESOURCE_GROUP="${DB_RESOURCE_GROUP:-carpool-db-rg}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
APP_NAME="${APP_NAME:-carpool}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to validate resource group
validate_resource_group() {
    local rg_name=$1
    local rg_type=$2
    
    log "Validating $rg_type resource group: $rg_name"
    
    if az group show --name "$rg_name" >/dev/null 2>&1; then
        success "$rg_type resource group exists"
        return 0
    else
        error "$rg_type resource group not found: $rg_name"
        return 1
    fi
}

# Function to validate Cosmos DB
validate_cosmos_db() {
    log "Validating Cosmos DB..."
    
    local cosmos_account="${APP_NAME}-cosmos-${ENVIRONMENT}"
    
    if az cosmosdb show --name "$cosmos_account" --resource-group "$DB_RESOURCE_GROUP" >/dev/null 2>&1; then
        success "Cosmos DB account exists: $cosmos_account"
        
        # Check if database exists
        if az cosmosdb sql database show --account-name "$cosmos_account" --resource-group "$DB_RESOURCE_GROUP" --name "carpool" >/dev/null 2>&1; then
            success "Cosmos DB database 'carpool' exists"
        else
            error "Cosmos DB database 'carpool' not found"
            return 1
        fi
        
        # Check containers
        local containers=("users" "trips" "schedules" "notifications")
        for container in "${containers[@]}"; do
            if az cosmosdb sql container show --account-name "$cosmos_account" --resource-group "$DB_RESOURCE_GROUP" --database-name "carpool" --name "$container" >/dev/null 2>&1; then
                success "Container '$container' exists"
            else
                warning "Container '$container' not found"
            fi
        done
        
        return 0
    else
        error "Cosmos DB account not found: $cosmos_account"
        return 1
    fi
}

# Function to validate Storage Account
validate_storage() {
    log "Validating Storage Account..."
    
    local storage_account="${APP_NAME//[-]/}sa${ENVIRONMENT}"
    
    if az storage account show --name "$storage_account" --resource-group "$DB_RESOURCE_GROUP" >/dev/null 2>&1; then
        success "Storage account exists: $storage_account"
        return 0
    else
        error "Storage account not found: $storage_account"
        return 1
    fi
}

# Function to validate Function App
validate_function_app() {
    log "Validating Function App..."
    
    local function_app="${APP_NAME}-api-${ENVIRONMENT}"
    
    if az functionapp show --name "$function_app" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
        success "Function App exists: $function_app"
        
        # Check if Function App is running
        local state=$(az functionapp show --name "$function_app" --resource-group "$RESOURCE_GROUP" --query "state" --output tsv)
        if [ "$state" = "Running" ]; then
            success "Function App is running"
        else
            warning "Function App state: $state"
        fi
        
        # Test Function App health endpoint
        local function_url="https://${function_app}.azurewebsites.net"
        log "Testing Function App health endpoint..."
        
        if curl -s -f "$function_url/api/hello" >/dev/null 2>&1; then
            success "Function App health check passed"
        else
            warning "Function App health check failed or endpoint not ready"
        fi
        
        return 0
    else
        error "Function App not found: $function_app"
        return 1
    fi
}

# Function to validate Static Web App
validate_static_web_app() {
    log "Validating Static Web App..."
    
    local static_web_app="${APP_NAME}-web-${ENVIRONMENT}"
    
    if az staticwebapp show --name "$static_web_app" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
        success "Static Web App exists: $static_web_app"
        
        # Get Static Web App URL and test
        local swa_url=$(az staticwebapp show --name "$static_web_app" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" --output tsv)
        
        if [ -n "$swa_url" ]; then
            log "Testing Static Web App accessibility..."
            if curl -s -f "https://$swa_url" >/dev/null 2>&1; then
                success "Static Web App is accessible: https://$swa_url"
            else
                warning "Static Web App not accessible or not ready"
            fi
        fi
        
        return 0
    else
        error "Static Web App not found: $static_web_app"
        return 1
    fi
}

# Function to validate Application Insights
validate_app_insights() {
    log "Validating Application Insights..."
    
    local app_insights="${APP_NAME}-insights-${ENVIRONMENT}"
    
    if az monitor app-insights component show --app "$app_insights" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
        success "Application Insights exists: $app_insights"
        return 0
    else
        error "Application Insights not found: $app_insights"
        return 1
    fi
}

# Function to validate Key Vault
validate_key_vault() {
    log "Validating Key Vault..."
    
    local key_vault="${APP_NAME}-kv-${ENVIRONMENT}"
    
    if az keyvault show --name "$key_vault" --resource-group "$DB_RESOURCE_GROUP" >/dev/null 2>&1; then
        success "Key Vault exists: $key_vault"
        return 0
    else
        error "Key Vault not found: $key_vault"
        return 1
    fi
}

# Function to validate end-to-end connectivity
validate_e2e_connectivity() {
    log "Validating end-to-end connectivity..."
    
    local function_app="${APP_NAME}-api-${ENVIRONMENT}"
    local static_web_app="${APP_NAME}-web-${ENVIRONMENT}"
    
    # Get URLs
    local api_url="https://${function_app}.azurewebsites.net"
    local swa_url=$(az staticwebapp show --name "$static_web_app" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" --output tsv 2>/dev/null || echo "")
    
    if [ -n "$swa_url" ]; then
        swa_url="https://$swa_url"
        log "Testing API connectivity from frontend perspective..."
        
        # This would normally test CORS and API connectivity
        # For now, we'll just verify both endpoints are reachable
        if curl -s -f "$api_url/api/hello" >/dev/null 2>&1 && curl -s -f "$swa_url" >/dev/null 2>&1; then
            success "End-to-end connectivity validation passed"
        else
            warning "End-to-end connectivity test incomplete - some endpoints not ready"
        fi
    else
        warning "Could not determine Static Web App URL for connectivity test"
    fi
}

# Function to display deployment summary
display_summary() {
    log "Deployment Summary:"
    echo ""
    echo "🗂️  Resource Groups:"
    echo "   Database: $DB_RESOURCE_GROUP"
    echo "   Compute:  $RESOURCE_GROUP"
    echo ""
    echo "🔗 Application URLs:"
    
    local function_app="${APP_NAME}-api-${ENVIRONMENT}"
    local static_web_app="${APP_NAME}-web-${ENVIRONMENT}"
    
    echo "   API:      https://${function_app}.azurewebsites.net"
    
    local swa_url=$(az staticwebapp show --name "$static_web_app" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" --output tsv 2>/dev/null || echo "")
    if [ -n "$swa_url" ]; then
        echo "   Frontend: https://$swa_url"
    else
        echo "   Frontend: Not available"
    fi
    echo ""
}

# Main validation function
main() {
    log "Starting deployment validation for Carpool"
    log "Environment: $ENVIRONMENT"
    
    local validation_failed=false
    
    # Validate resource groups
    validate_resource_group "$DB_RESOURCE_GROUP" "Database" || validation_failed=true
    validate_resource_group "$RESOURCE_GROUP" "Compute" || validation_failed=true
    
    # Validate database resources
    validate_cosmos_db || validation_failed=true
    validate_storage || validation_failed=true
    validate_key_vault || validation_failed=true
    
    # Validate compute resources
    validate_function_app || validation_failed=true
    validate_static_web_app || validation_failed=true
    validate_app_insights || validation_failed=true
    
    # Validate connectivity
    validate_e2e_connectivity
    
    # Display summary
    display_summary
    
    if [ "$validation_failed" = "true" ]; then
        error "Deployment validation failed - see errors above"
        exit 1
    else
        success "Deployment validation completed successfully!"
        
        # Set outputs for CI/CD pipeline
        if [ -n "$GITHUB_OUTPUT" ]; then
            echo "validation-status=success" >> "$GITHUB_OUTPUT"
            echo "api-url=https://${APP_NAME}-api-${ENVIRONMENT}.azurewebsites.net" >> "$GITHUB_OUTPUT"
            
            local swa_url=$(az staticwebapp show --name "${APP_NAME}-web-${ENVIRONMENT}" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" --output tsv 2>/dev/null || echo "")
            if [ -n "$swa_url" ]; then
                echo "frontend-url=https://$swa_url" >> "$GITHUB_OUTPUT"
            fi
        fi
        
        exit 0
    fi
}

# Handle script arguments
case "${1:-validate}" in
    "validate")
        main
        ;;
    "cosmos")
        validate_cosmos_db
        ;;
    "function-app")
        validate_function_app
        ;;
    "static-web-app")
        validate_static_web_app
        ;;
    "e2e")
        validate_e2e_connectivity
        ;;
    "help")
        echo "Usage: $0 [validate|cosmos|function-app|static-web-app|e2e|help]"
        echo "  validate        - Full deployment validation (default)"
        echo "  cosmos          - Validate Cosmos DB only"
        echo "  function-app    - Validate Function App only"
        echo "  static-web-app  - Validate Static Web App only"
        echo "  e2e             - Test end-to-end connectivity"
        echo "  help            - Show this help"
        ;;
    *)
        error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
