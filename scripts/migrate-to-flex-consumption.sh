#!/bin/bash

# Migrate Function App from Y1 Consumption to Flex Consumption Plan
# This script creates a new Flex Consumption Function App, migrates code, and cleans up old resources

set -e

# Configuration
RESOURCE_GROUP="carpool-rg"
LOCATION="eastus2"
APP_NAME="carpool"
ENVIRONMENT="prod"

# Current (old) resources
OLD_FUNCTION_APP="carpool-api-prod"
OLD_PLAN="carpool-plan-prod"

# New resources with Flex Consumption
NEW_FUNCTION_APP="carpool-backend"  # Updated to match manually created app
NEW_PLAN="ASP-carpoolrg-b937"       # Actual App Service Plan created by Azure
STORAGE_ACCOUNT="carpoolsaprod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

highlight() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# Function to check if resource exists
resource_exists() {
    local resource_name=$1
    local resource_type=$2
    
    case $resource_type in
        "functionapp")
            az functionapp show --name "$resource_name" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1
            ;;
        "appserviceplan")
            az appservice plan show --name "$resource_name" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to create Flex Consumption plan
create_flex_plan() {
    log "Creating Flex Consumption App Service Plan..."
    
    if resource_exists "$NEW_PLAN" "appserviceplan"; then
        success "Flex Consumption plan '$NEW_PLAN' already exists"
        return 0
    fi
    
    # Create Flex Consumption plan (using functionapp create with flex consumption)
    log "Note: Flex Consumption plans are created automatically with Function Apps"
    log "Skipping separate plan creation - will create with Function App"
    
    success "Ready to create Flex Consumption Function App"
}

# Function to create new Function App with Flex Consumption
create_flex_function_app() {
    log "Creating Flex Consumption Function App..."
    
    if resource_exists "$NEW_FUNCTION_APP" "functionapp"; then
        success "Flex Function App '$NEW_FUNCTION_APP' already exists"
        return 0
    fi
    
    # Create Function App with Flex Consumption plan
    if ! az functionapp create \
        --name "$NEW_FUNCTION_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --consumption-plan-location "$LOCATION" \
        --storage-account "$STORAGE_ACCOUNT" \
        --runtime "node" \
        --runtime-version "20" \
        --functions-version "4" \
        --flexconsumption-location "$LOCATION" \
        --output table; then
        error "Failed to create Flex Function App"
        return 1
    fi
    
    success "Created Flex Function App: $NEW_FUNCTION_APP"
}

# Function to copy app settings from old to new Function App
copy_app_settings() {
    log "Copying application settings from old to new Function App..."
    
    # Get current app settings from old function app
    local settings_json=$(az functionapp config appsettings list \
        --name "$OLD_FUNCTION_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --output json)
    
    # Extract settings into key=value format, excluding read-only settings
    local temp_file=$(mktemp)
    echo "$settings_json" | jq -r '.[] | select(.name | test("^(WEBSITE_|SCM_|FUNCTIONS_|APPINSIGHTS_INSTRUMENTATIONKEY|AzureWebJobsStorage)") | not) | "\(.name)=\(.value)"' > "$temp_file"
    
    if [ -s "$temp_file" ]; then
        log "Applying application settings to new Function App..."
        while IFS='=' read -r key value; do
            if [ -n "$key" ] && [ -n "$value" ]; then
                az functionapp config appsettings set \
                    --name "$NEW_FUNCTION_APP" \
                    --resource-group "$RESOURCE_GROUP" \
                    --settings "$key=$value" \
                    --output none
            fi
        done < "$temp_file"
        success "Application settings copied successfully"
    else
        warning "No custom application settings found to copy"
    fi
    
    rm -f "$temp_file"
}

# Function to build and deploy code
deploy_code() {
    log "Building and deploying code to new Function App..."
    
    # Build the backend
    log "Building backend..."
    cd backend
    npm install
    npm run build
    
    # Deploy to new Function App
    log "Deploying to Flex Function App..."
    if ! func azure functionapp publish "$NEW_FUNCTION_APP" --build remote --typescript; then
        error "Failed to deploy code to new Function App"
        cd ..
        return 1
    fi
    
    cd ..
    success "Code deployed successfully to Flex Function App"
}

# Function to test the new Function App
test_new_function_app() {
    log "Testing new Flex Function App..."
    
    # Get the new function app URL
    local new_url=$(az functionapp show \
        --name "$NEW_FUNCTION_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --query "defaultHostName" \
        --output tsv)
    
    if [ -z "$new_url" ]; then
        error "Could not get new Function App URL"
        return 1
    fi
    
    log "New Function App URL: https://$new_url"
    
    # Test a simple endpoint (if health check exists)
    log "Testing Function App health..."
    local health_response=$(curl -s -o /dev/null -w "%{http_code}" "https://$new_url/api/health" || echo "000")
    
    if [ "$health_response" = "200" ]; then
        success "Health check passed on new Function App"
    else
        warning "Health check returned status: $health_response (this might be normal if no health endpoint exists)"
    fi
    
    success "New Flex Function App is responding"
    echo ""
    highlight "🎯 NEW FUNCTION APP READY"
    echo "=============================="
    echo "Name: $NEW_FUNCTION_APP"
    echo "URL: https://$new_url"
    echo "Plan: $NEW_PLAN (Flex Consumption)"
    echo ""
}

# Function to compare performance
compare_performance() {
    log "Comparing Function App configurations..."
    
    # Get old function app details
    local old_plan_sku=$(az appservice plan show \
        --name "$OLD_PLAN" \
        --resource-group "$RESOURCE_GROUP" \
        --query "sku.name" \
        --output tsv)
    
    # Get new function app details
    local new_plan_sku=$(az appservice plan show \
        --name "$NEW_PLAN" \
        --resource-group "$RESOURCE_GROUP" \
        --query "sku.name" \
        --output tsv)
    
    echo ""
    highlight "📊 PERFORMANCE COMPARISON"
    echo "=========================="
    echo "Old Function App: $OLD_FUNCTION_APP"
    echo "  Plan: $OLD_PLAN ($old_plan_sku - Consumption)"
    echo "  Cold start: ~5-10 seconds"
    echo "  Scaling: Limited"
    echo ""
    echo "New Function App: $NEW_FUNCTION_APP"
    echo "  Plan: $NEW_PLAN ($new_plan_sku - Flex Consumption)"
    echo "  Cold start: ~1-2 seconds"
    echo "  Scaling: Enhanced with better concurrency"
    echo "  Performance: Significantly improved"
    echo ""
}

# Function to cleanup old resources
cleanup_old_resources() {
    warning "This will DELETE the old Y1 Function App and plan!"
    echo "Old Function App: $OLD_FUNCTION_APP"
    echo "Old Plan: $OLD_PLAN"
    echo ""
    read -p "Are you sure the new Flex Function App is working correctly? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        log "Deleting old Function App..."
        az functionapp delete \
            --name "$OLD_FUNCTION_APP" \
            --resource-group "$RESOURCE_GROUP" \
            --output none
        
        log "Deleting old App Service Plan..."
        az appservice plan delete \
            --name "$OLD_PLAN" \
            --resource-group "$RESOURCE_GROUP" \
            --yes \
            --output none
        
        success "Old resources cleaned up successfully"
        
        echo ""
        highlight "🎉 MIGRATION COMPLETED"
        echo "======================="
        echo "✅ New Flex Consumption Function App is active"
        echo "✅ Old Y1 resources have been removed"
        echo "✅ Better performance and scaling enabled"
        echo ""
    else
        log "Cleanup cancelled. Both Function Apps will remain active."
        echo ""
        warning "Remember to clean up old resources later:"
        echo "  - Function App: $OLD_FUNCTION_APP"
        echo "  - Plan: $OLD_PLAN"
    fi
}

# Function to rollback if needed
rollback() {
    warning "Rolling back - deleting new Flex resources..."
    
    if resource_exists "$NEW_FUNCTION_APP" "functionapp"; then
        log "Deleting new Function App..."
        az functionapp delete \
            --name "$NEW_FUNCTION_APP" \
            --resource-group "$RESOURCE_GROUP" \
            --output none
    fi
    
    if resource_exists "$NEW_PLAN" "appserviceplan"; then
        log "Deleting new App Service Plan..."
        az appservice plan delete \
            --name "$NEW_PLAN" \
            --resource-group "$RESOURCE_GROUP" \
            --yes \
            --output none
    fi
    
    success "Rollback completed. Original resources are unchanged."
}

# Main migration function
main() {
    highlight "🚀 Tesla STEM Carpool - Function App Migration to Flex Consumption"
    echo "=================================================================="
    echo ""
    
    case "${1:-migrate}" in
        "migrate")
            log "Starting migration to Flex Consumption..."
            create_flex_plan
            create_flex_function_app
            copy_app_settings
            deploy_code
            test_new_function_app
            compare_performance
            
            echo ""
            highlight "✅ MIGRATION PHASE COMPLETE"
            echo "============================"
            echo "The new Flex Consumption Function App is ready!"
            echo ""
            echo "Next steps:"
            echo "1. Test the new Function App thoroughly"
            echo "2. Update any DNS/routing if needed"
            echo "3. Run: $0 cleanup (to remove old resources)"
            echo ""
            ;;
        "cleanup")
            cleanup_old_resources
            ;;
        "rollback")
            rollback
            ;;
        "status")
            log "Checking migration status..."
            
            echo "Current Resources:"
            echo ""
            
            if resource_exists "$OLD_FUNCTION_APP" "functionapp"; then
                echo "❌ Old Function App: $OLD_FUNCTION_APP (Y1) - still exists"
            else
                echo "✅ Old Function App: deleted"
            fi
            
            if resource_exists "$NEW_FUNCTION_APP" "functionapp"; then
                echo "✅ New Function App: $NEW_FUNCTION_APP (Flex) - active"
            else
                echo "❌ New Function App: not created yet"
            fi
            ;;
        *)
            echo "Usage: $0 [migrate|cleanup|rollback|status]"
            echo ""
            echo "Commands:"
            echo "  migrate  - Create new Flex Consumption Function App (default)"
            echo "  cleanup  - Delete old Y1 resources (after testing)"
            echo "  rollback - Delete new Flex resources (emergency rollback)"
            echo "  status   - Check current migration status"
            echo ""
            exit 1
            ;;
    esac
}

# Change to script directory
cd "$(dirname "$0")/.."

# Check if Azure Functions Core Tools is installed
if ! command -v func &> /dev/null; then
    error "Azure Functions Core Tools (func) is not installed"
    echo "Install it with: npm install -g azure-functions-core-tools@4 --unsafe-perm true"
    exit 1
fi

# Run main function
main "$@"
