#!/bin/bash

# Tesla STEM Carpool Infrastructure Cleanup Script
# This script safely removes infrastructure resources

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

# Validate environment parameter
if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod)$ ]]; then
    echo_error "Invalid environment: $ENVIRONMENT. Must be dev, test, or prod."
    exit 1
fi

# Safety check for production
if [ "$ENVIRONMENT" = "prod" ]; then
    echo_warning "You are about to delete PRODUCTION resources!"
    echo_warning "This action cannot be undone and will result in data loss."
    read -p "Type 'DELETE PRODUCTION' to confirm: " confirmation
    if [ "$confirmation" != "DELETE PRODUCTION" ]; then
        echo_info "Cleanup cancelled for safety."
        exit 0
    fi
fi

echo_info "Starting infrastructure cleanup for environment: $ENVIRONMENT"

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
echo_info "Cleaning up resources in subscription: $SUBSCRIPTION"

# Confirmation prompt
echo_warning "This will delete all $ENVIRONMENT resources in:"
echo "- $RESOURCE_GROUP_DB"
echo "- $RESOURCE_GROUP_COMPUTE"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo_info "Cleanup cancelled."
    exit 0
fi

# Phase 1: Delete compute resources first (non-persistent)
echo_info "Phase 1: Deleting compute resource group..."

if az group show --name "$RESOURCE_GROUP_COMPUTE" &> /dev/null; then
    echo_info "Deleting compute resource group: $RESOURCE_GROUP_COMPUTE"
    az group delete --name "$RESOURCE_GROUP_COMPUTE" --yes --no-wait
    echo_success "Compute resource group deletion initiated"
else
    echo_info "Compute resource group does not exist: $RESOURCE_GROUP_COMPUTE"
fi

# Phase 2: Wait for user confirmation before deleting persistent data
echo_warning "Phase 2: About to delete PERSISTENT data resources (databases, storage)"
echo_warning "This includes all application data and cannot be recovered!"
read -p "Continue with deleting persistent data? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if az group show --name "$RESOURCE_GROUP_DB" &> /dev/null; then
        echo_info "Deleting database resource group: $RESOURCE_GROUP_DB"
        az group delete --name "$RESOURCE_GROUP_DB" --yes --no-wait
        echo_success "Database resource group deletion initiated"
    else
        echo_info "Database resource group does not exist: $RESOURCE_GROUP_DB"
    fi
else
    echo_info "Persistent data resources preserved."
fi

# Phase 3: Monitor deletion progress
echo_info "Phase 3: Monitoring deletion progress..."
echo_info "You can monitor progress in the Azure Portal or with:"
echo "  az group list --query \"[?name=='$RESOURCE_GROUP_COMPUTE' || name=='$RESOURCE_GROUP_DB'].{Name:name, State:properties.provisioningState}\" --output table"

echo_success "Infrastructure cleanup initiated successfully!"
echo_info "Note: Resource group deletion may take several minutes to complete."
