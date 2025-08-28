#!/bin/bash

# Production Environment Deployment Script for Tesla STEM Carpool
# Deploys to single consolidated resource group for cost optimization

set -e

# Configuration for Single Resource Group Deployment
LOCATION="eastus2"
APP_NAME="carpool"
ENVIRONMENT="prod"
RESOURCE_GROUP="${APP_NAME}-rg"

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

# Function to check Azure CLI login status
check_azure_login() {
    log "Checking Azure CLI login status..."
    
    if ! az account show >/dev/null 2>&1; then
        error "Not logged in to Azure. Please run 'az login' first."
        return 1
    fi
    
    local subscription_id=$(az account show --query id -o tsv)
    local subscription_name=$(az account show --query name -o tsv)
    success "Logged in to Azure subscription: $subscription_name ($subscription_id)"
}

# Function to check if resource group exists
check_resource_group() {
    local rg_name=$1
    if az group show --name "$rg_name" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to create resource group if it doesn't exist
ensure_resource_group() {
    local rg_name=$1
    
    if check_resource_group "$rg_name"; then
        success "Resource group '$rg_name' already exists"
    else
        log "Creating resource group: $rg_name"
        az group create --name "$rg_name" --location "$LOCATION"
        success "Created resource group: $rg_name"
    fi
}

# Function to validate Bicep templates
validate_templates() {
    log "Validating main.bicep template..."
    
    # Validate main template (single resource group)
    if ! az deployment group validate \
        --resource-group "$RESOURCE_GROUP" \
        --template-file "infra/main.bicep" \
        --parameters \
            appName="$APP_NAME" \
            environmentName="$ENVIRONMENT" \
            location="$LOCATION" \
        >/dev/null 2>&1; then
        error "Main template validation failed"
        return 1
    fi
    
    success "Bicep template validated successfully"
}

# Function to deploy all resources
deploy_infrastructure() {
    log "Deploying all resources to $RESOURCE_GROUP..."
    
    # Deploy main.bicep (single resource group template)
    if ! az deployment group create \
        --resource-group "$RESOURCE_GROUP" \
        --template-file "infra/main.bicep" \
        --parameters \
            appName="$APP_NAME" \
            environmentName="$ENVIRONMENT" \
            location="$LOCATION" \
        --output table; then
        error "Infrastructure deployment failed"
        return 1
    fi
    
    success "Infrastructure deployment completed"
}

# Function to verify deployment
verify_deployment() {
    log "Verifying production environment deployment..."
    
    # Check all resources in single resource group
    log "Checking resources in $RESOURCE_GROUP..."
    local cosmos_count=$(az cosmosdb list --resource-group "$RESOURCE_GROUP" --query "length(@)" -o tsv 2>/dev/null || echo "0")
    local storage_count=$(az storage account list --resource-group "$RESOURCE_GROUP" --query "length(@)" -o tsv 2>/dev/null || echo "0")
    local function_count=$(az functionapp list --resource-group "$RESOURCE_GROUP" --query "length(@)" -o tsv 2>/dev/null || echo "0")
    local webapp_count=$(az staticwebapp list --resource-group "$RESOURCE_GROUP" --query "length(@)" -o tsv 2>/dev/null || echo "0")
    
    if [ "$cosmos_count" -gt 0 ]; then
        success "Found $cosmos_count Cosmos DB account(s)"
    else
        warning "No Cosmos DB accounts found"
    fi
    
    if [ "$storage_count" -gt 0 ]; then
        success "Found $storage_count storage account(s)"
    else
        warning "No storage accounts found"
    fi
    
    if [ "$function_count" -gt 0 ]; then
        success "Found $function_count Function App(s)"
    else
        warning "No Function Apps found"
    fi
    
    if [ "$webapp_count" -gt 0 ]; then
        success "Found $webapp_count Static Web App(s)"
    else
        warning "No Static Web Apps found"
    fi
}

# Function to get deployment outputs
get_deployment_info() {
    log "Getting deployment information..."
    
    # Get resource group information
    echo ""
    highlight "📋 PRODUCTION ENVIRONMENT SUMMARY"
    echo "=================================="
    echo "Environment: $ENVIRONMENT"
    echo "Location: $LOCATION"
    echo "Resource Group: $RESOURCE_GROUP"
    echo ""
    
    # Get specific resource information
    log "Getting resource details..."
    
    # Cosmos DB information
    local cosmos_name=$(az cosmosdb list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null)
    if [ -n "$cosmos_name" ]; then
        local cosmos_endpoint=$(az cosmosdb show --name "$cosmos_name" --resource-group "$RESOURCE_GROUP" --query "documentEndpoint" -o tsv)
        echo "Cosmos DB Account: $cosmos_name"
        echo "Cosmos DB Endpoint: $cosmos_endpoint"
        echo ""
    fi
    
    # Function App information
    local function_name=$(az functionapp list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null)
    if [ -n "$function_name" ]; then
        local function_url=$(az functionapp show --name "$function_name" --resource-group "$RESOURCE_GROUP" --query "defaultHostName" -o tsv)
        echo "Function App: $function_name"
        echo "Function App URL: https://$function_url"
        echo ""
    fi
    
    # Static Web App information
    local webapp_name=$(az staticwebapp list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null)
    if [ -n "$webapp_name" ]; then
        local webapp_url=$(az staticwebapp show --name "$webapp_name" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" -o tsv)
        echo "Static Web App: $webapp_name"
        echo "Static Web App URL: https://$webapp_url"
        echo ""
    fi
    
    success "Production environment deployment completed successfully!"
}

# Function to clean up production environment
cleanup_environment() {
    warning "This will DELETE the entire production environment!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        log "Deleting production environment resource group..."
        
        if check_resource_group "$RESOURCE_GROUP"; then
            log "Deleting resource group: $RESOURCE_GROUP"
            az group delete --name "$RESOURCE_GROUP" --yes --no-wait
            success "Production environment deletion initiated (running in background)"
        else
            warning "Resource group $RESOURCE_GROUP does not exist"
        fi
    else
        log "Cleanup cancelled"
    fi
}

# Main deployment function
main() {
    highlight "🚀 Tesla STEM Carpool - Production Environment Deployment"
    echo "=========================================================="
    echo ""
    
    # Check command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_azure_login
            ensure_resource_group "$RESOURCE_GROUP"
            validate_templates
            deploy_infrastructure
            verify_deployment
            get_deployment_info
            ;;
        "cleanup")
            cleanup_environment
            ;;
        "verify")
            check_azure_login
            verify_deployment
            get_deployment_info
            ;;
        *)
            echo "Usage: $0 [deploy|cleanup|verify]"
            echo "  deploy  - Deploy production environment (default)"
            echo "  cleanup - Delete production environment"
            echo "  verify  - Verify existing deployment"
            exit 1
            ;;
    esac
}

# Change to script directory
cd "$(dirname "$0")/.."

# Run main function
main "$@"
