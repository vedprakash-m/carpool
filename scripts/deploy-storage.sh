#!/bin/bash

# Storage Account Deployment Script
# This script deploys a new storage account using Bicep templates

set -e

# Configuration
APP_NAME="vcarpool"
ENVIRONMENT="prod"
DEFAULT_LOCATION="eastus2"

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
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

show_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
  deploy        - Deploy new storage account
  plan          - Show deployment plan (what-if)
  outputs       - Get deployment outputs
  help          - Show this help

Options:
  --resource-group NAME     - Target resource group name (default: vcarpool-storage-rg)
  --location LOCATION       - Target location (default: eastus2)
  --storage-name NAME       - Storage account name (default: vcarpoolsa{env}new)
  --environment ENV         - Environment (dev/test/prod, default: prod)

Examples:
  # Deploy to new dedicated storage resource group
  $0 deploy --resource-group vcarpool-storage-rg --location eastus2
  
  # Deploy to database resource group (consolidate)
  $0 deploy --resource-group vcarpool-db-rg --location eastus2
  
  # Plan deployment (dry run)
  $0 plan --resource-group vcarpool-storage-rg --location westus2

EOF
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        error "Azure CLI is not installed"
        exit 1
    fi
    
    # Check if logged in
    if ! az account show &> /dev/null; then
        error "Not logged into Azure CLI. Run 'az login'"
        exit 1
    fi
    
    # Check if Bicep template exists
    if [ ! -f "infra/storage.bicep" ]; then
        error "Bicep template not found: infra/storage.bicep"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

deploy_storage() {
    local resource_group="$1"
    local location="$2"
    local storage_name="$3"
    local environment="$4"
    
    log "Deploying storage account to $resource_group in $location..."
    
    # Create resource group if it doesn't exist
    if ! az group show --name "$resource_group" &> /dev/null; then
        log "Creating resource group $resource_group..."
        az group create --name "$resource_group" --location "$location"
        success "Resource group created: $resource_group"
    else
        log "Using existing resource group: $resource_group"
    fi
    
    # Deploy storage account
    local deployment_name="storage-deployment-$(date +%Y%m%d-%H%M%S)"
    
    log "Starting deployment: $deployment_name"
    az deployment group create \
        --resource-group "$resource_group" \
        --template-file "infra/storage.bicep" \
        --name "$deployment_name" \
        --parameters \
            appName="$APP_NAME" \
            environmentName="$environment" \
            storageAccountName="$storage_name" \
            storageLocation="$location"
    
    success "Storage account deployment completed"
    
    # Get deployment outputs
    log "Retrieving deployment outputs..."
    local storage_account_name=$(az deployment group show \
        --resource-group "$resource_group" \
        --name "$deployment_name" \
        --query 'properties.outputs.storageAccountName.value' -o tsv)
    
    local storage_account_id=$(az deployment group show \
        --resource-group "$resource_group" \
        --name "$deployment_name" \
        --query 'properties.outputs.storageAccountId.value' -o tsv)
    
    echo
    success "Deployment Summary:"
    echo "  Storage Account Name: $storage_account_name"
    echo "  Storage Account ID:   $storage_account_id"
    echo "  Resource Group:       $resource_group"
    echo "  Location:             $location"
    echo
    
    warning "Next steps:"
    echo "1. Use the migration script to copy data from the old storage account"
    echo "2. Update your Function App configuration to use the new storage account"
    echo "3. Test your application thoroughly"
    echo "4. Delete the old storage account when confident"
    echo
    echo "Migration command:"
    echo "  ./scripts/migrate-storage-account.sh migrate-data --target-name $storage_account_name --target-rg $resource_group"
}

plan_deployment() {
    local resource_group="$1"
    local location="$2"
    local storage_name="$3"
    local environment="$4"
    
    log "Planning storage account deployment..."
    
    # Create resource group if it doesn't exist (for what-if)
    if ! az group show --name "$resource_group" &> /dev/null; then
        warning "Resource group $resource_group does not exist and will be created"
    fi
    
    # Run what-if deployment
    az deployment group what-if \
        --resource-group "$resource_group" \
        --template-file "infra/storage.bicep" \
        --parameters \
            appName="$APP_NAME" \
            environmentName="$environment" \
            storageAccountName="$storage_name" \
            storageLocation="$location"
}

get_outputs() {
    local resource_group="$1"
    
    log "Getting latest deployment outputs..."
    
    # Get the most recent deployment
    local latest_deployment=$(az deployment group list \
        --resource-group "$resource_group" \
        --query "[?contains(name, 'storage-deployment')].{name:name,timestamp:properties.timestamp}" \
        --output table \
        | tail -n 1 | awk '{print $1}')
    
    if [ -z "$latest_deployment" ]; then
        error "No storage deployments found in resource group $resource_group"
        exit 1
    fi
    
    log "Latest deployment: $latest_deployment"
    
    az deployment group show \
        --resource-group "$resource_group" \
        --name "$latest_deployment" \
        --query 'properties.outputs'
}

# Default values
RESOURCE_GROUP="vcarpool-storage-rg"
LOCATION="$DEFAULT_LOCATION"
STORAGE_NAME="${APP_NAME}sa${ENVIRONMENT}new"
ENVIRONMENT="prod"

# Parse command line arguments
COMMAND="$1"
shift

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        --location)
            LOCATION="$2"
            shift 2
            ;;
        --storage-name)
            STORAGE_NAME="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Clean storage account name (remove invalid characters)
STORAGE_NAME=$(echo "$STORAGE_NAME" | tr -d '-' | tr '[:upper:]' '[:lower:]')

# Validate storage account name
if [ ${#STORAGE_NAME} -lt 3 ] || [ ${#STORAGE_NAME} -gt 24 ]; then
    error "Storage account name must be between 3 and 24 characters: $STORAGE_NAME"
    exit 1
fi

# Execute command
case "$COMMAND" in
    deploy)
        check_prerequisites
        deploy_storage "$RESOURCE_GROUP" "$LOCATION" "$STORAGE_NAME" "$ENVIRONMENT"
        ;;
    plan)
        check_prerequisites
        plan_deployment "$RESOURCE_GROUP" "$LOCATION" "$STORAGE_NAME" "$ENVIRONMENT"
        ;;
    outputs)
        check_prerequisites
        get_outputs "$RESOURCE_GROUP"
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        error "Unknown command: $COMMAND"
        show_usage
        exit 1
        ;;
esac
