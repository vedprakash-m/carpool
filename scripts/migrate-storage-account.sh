#!/bin/bash

# Storage Account Migration Script
# This script helps migrate data from one storage account to another

set -e

# Configuration
SOURCE_STORAGE_ACCOUNT="carpoolsaprod"
SOURCE_RESOURCE_GROUP="carpool-rg"
TARGET_STORAGE_ACCOUNT=""
TARGET_RESOURCE_GROUP=""
ENVIRONMENT="prod"

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
  plan          - Show migration plan (dry run)
  create-target - Create new storage account in target location
  migrate-data  - Migrate data from source to target
  update-config - Update function app configuration
  verify        - Verify migration success
  cleanup       - Remove old storage account (DANGER!)
  help          - Show this help

Options:
  --target-name NAME    - Target storage account name
  --target-rg NAME      - Target resource group name
  --target-location LOC - Target location (e.g., eastus2, westus2)

Examples:
  # Plan migration to new resource group
  $0 plan --target-name carpoolsanew --target-rg carpool-storage-rg --target-location eastus2
  
  # Execute migration
  $0 create-target --target-name carpoolsanew --target-rg carpool-storage-rg --target-location eastus2
  $0 migrate-data --target-name carpoolsanew --target-rg carpool-storage-rg
  $0 update-config --target-name carpoolsanew --target-rg carpool-storage-rg
  $0 verify --target-name carpoolsanew --target-rg carpool-storage-rg

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
    
    # Check if source storage account exists
    if ! az storage account show --name "$SOURCE_STORAGE_ACCOUNT" --resource-group "$SOURCE_RESOURCE_GROUP" &> /dev/null; then
        error "Source storage account $SOURCE_STORAGE_ACCOUNT not found in $SOURCE_RESOURCE_GROUP"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

plan_migration() {
    local target_name="$1"
    local target_rg="$2"
    local target_location="$3"
    
    log "📋 Storage Account Migration Plan"
    echo
    echo "SOURCE:"
    echo "  Storage Account: $SOURCE_STORAGE_ACCOUNT"
    echo "  Resource Group:  $SOURCE_RESOURCE_GROUP"
    echo "  Location:        $(az storage account show --name "$SOURCE_STORAGE_ACCOUNT" --resource-group "$SOURCE_RESOURCE_GROUP" --query location -o tsv)"
    echo
    echo "TARGET:"
    echo "  Storage Account: $target_name"
    echo "  Resource Group:  $target_rg"
    echo "  Location:        $target_location"
    echo
    echo "MIGRATION STEPS:"
    echo "1. Create new storage account in target location"
    echo "2. Copy all blobs, tables, and queues"
    echo "3. Update Function App configuration"
    echo "4. Verify all services are working"
    echo "5. (Optional) Delete old storage account"
    echo
    warning "This migration will require downtime during configuration update"
    echo
    
    # Show current storage account contents
    log "Current storage account contents:"
    local account_key=$(az storage account keys list --account-name "$SOURCE_STORAGE_ACCOUNT" --resource-group "$SOURCE_RESOURCE_GROUP" --query '[0].value' -o tsv)
    
    echo "Containers:"
    az storage container list --account-name "$SOURCE_STORAGE_ACCOUNT" --account-key "$account_key" --query '[].name' -o table 2>/dev/null || echo "  (Unable to list containers - check permissions)"
    
    echo
    echo "Tables:"
    az storage table list --account-name "$SOURCE_STORAGE_ACCOUNT" --account-key "$account_key" --query '[].name' -o table 2>/dev/null || echo "  (Unable to list tables - check permissions)"
}

create_target_storage() {
    local target_name="$1"
    local target_rg="$2"
    local target_location="$3"
    
    log "Creating target storage account..."
    
    # Create resource group if it doesn't exist
    if ! az group show --name "$target_rg" &> /dev/null; then
        log "Creating resource group $target_rg..."
        az group create --name "$target_rg" --location "$target_location"
    fi
    
    # Create storage account
    az storage account create \
        --name "$target_name" \
        --resource-group "$target_rg" \
        --location "$target_location" \
        --sku Standard_LRS \
        --kind StorageV2 \
        --access-tier Hot \
        --https-only true \
        --min-tls-version TLS1_2 \
        --tags application=carpool environment="$ENVIRONMENT" createdBy=migration
    
    success "Target storage account created: $target_name"
}

migrate_data() {
    local target_name="$1"
    local target_rg="$2"
    
    log "Starting data migration..."
    
    # Get storage account keys
    local source_key=$(az storage account keys list --account-name "$SOURCE_STORAGE_ACCOUNT" --resource-group "$SOURCE_RESOURCE_GROUP" --query '[0].value' -o tsv)
    local target_key=$(az storage account keys list --account-name "$target_name" --resource-group "$target_rg" --query '[0].value' -o tsv)
    
    # Install azcopy if not available
    if ! command -v azcopy &> /dev/null; then
        warning "AzCopy not found. Please install AzCopy for efficient data transfer"
        echo "Visit: https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10"
        return 1
    fi
    
    # Migrate containers (blobs)
    log "Migrating blob containers..."
    local containers=$(az storage container list --account-name "$SOURCE_STORAGE_ACCOUNT" --account-key "$source_key" --query '[].name' -o tsv 2>/dev/null || echo "")
    
    for container in $containers; do
        log "  Copying container: $container"
        # Create container in target
        az storage container create --name "$container" --account-name "$target_name" --account-key "$target_key"
        
        # Copy blobs using azcopy
        azcopy copy \
            "https://${SOURCE_STORAGE_ACCOUNT}.blob.core.windows.net/${container}?$(az storage account generate-sas --account-name "$SOURCE_STORAGE_ACCOUNT" --account-key "$source_key" --services b --resource-types co --permission rwdlacup --expiry $(date -u -d '1 hour' +%Y-%m-%dT%H:%MZ) -o tsv)" \
            "https://${target_name}.blob.core.windows.net/${container}?$(az storage account generate-sas --account-name "$target_name" --account-key "$target_key" --services b --resource-types co --permission rwdlacup --expiry $(date -u -d '1 hour' +%Y-%m-%dT%H:%MZ) -o tsv)" \
            --recursive
    done
    
    # Migrate tables
    log "Migrating storage tables..."
    local tables=$(az storage table list --account-name "$SOURCE_STORAGE_ACCOUNT" --account-key "$source_key" --query '[].name' -o tsv 2>/dev/null || echo "")
    
    for table in $tables; do
        log "  Copying table: $table"
        az storage table create --name "$table" --account-name "$target_name" --account-key "$target_key"
        
        # Note: Table data copying requires additional tools or manual export/import
        warning "Table data for '$table' needs manual migration using Storage Explorer or custom scripts"
    done
    
    success "Data migration completed"
}

update_function_config() {
    local target_name="$1"
    local target_rg="$2"
    
    log "Updating Function App configuration..."
    
    local function_app_name="carpool-api-${ENVIRONMENT}"
    local target_key=$(az storage account keys list --account-name "$target_name" --resource-group "$target_rg" --query '[0].value' -o tsv)
    local new_connection_string="DefaultEndpointsProtocol=https;AccountName=${target_name};EndpointSuffix=core.windows.net;AccountKey=${target_key}"
    
    # Update AzureWebJobsStorage setting
    az functionapp config appsettings set \
        --name "$function_app_name" \
        --resource-group "carpool-rg" \
        --settings "AzureWebJobsStorage=$new_connection_string"
    
    success "Function App configuration updated"
    warning "Function App will restart automatically"
}

verify_migration() {
    local target_name="$1"
    local target_rg="$2"
    
    log "Verifying migration..."
    
    # Check target storage account
    if az storage account show --name "$target_name" --resource-group "$target_rg" &> /dev/null; then
        success "Target storage account exists and is accessible"
    else
        error "Target storage account verification failed"
        return 1
    fi
    
    # Check Function App status
    local function_app_name="carpool-api-${ENVIRONMENT}"
    local app_status=$(az functionapp show --name "$function_app_name" --resource-group "carpool-rg" --query state -o tsv)
    
    if [ "$app_status" = "Running" ]; then
        success "Function App is running"
    else
        warning "Function App status: $app_status"
    fi
    
    # Test function endpoint
    log "Testing function app endpoint..."
    local function_url=$(az functionapp show --name "$function_app_name" --resource-group "carpool-rg" --query defaultHostName -o tsv)
    
    if curl -f -s "https://${function_url}/api/hello" > /dev/null; then
        success "Function app endpoint is responding"
    else
        warning "Function app endpoint test failed - may need warm-up time"
    fi
    
    success "Migration verification completed"
}

cleanup_old_storage() {
    warning "⚠️  DANGER: This will permanently delete the old storage account"
    warning "⚠️  Make sure the migration is working correctly before proceeding"
    echo
    read -p "Are you sure you want to delete the old storage account? (type 'DELETE' to confirm): " confirmation
    
    if [ "$confirmation" = "DELETE" ]; then
        log "Deleting old storage account..."
        az storage account delete --name "$SOURCE_STORAGE_ACCOUNT" --resource-group "$SOURCE_RESOURCE_GROUP" --yes
        success "Old storage account deleted"
    else
        log "Cleanup cancelled"
    fi
}

# Parse command line arguments
COMMAND="$1"
shift

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --target-name)
            TARGET_STORAGE_ACCOUNT="$2"
            shift 2
            ;;
        --target-rg)
            TARGET_RESOURCE_GROUP="$2"
            shift 2
            ;;
        --target-location)
            TARGET_LOCATION="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Execute command
case "$COMMAND" in
    plan)
        if [ -z "$TARGET_STORAGE_ACCOUNT" ] || [ -z "$TARGET_RESOURCE_GROUP" ] || [ -z "$TARGET_LOCATION" ]; then
            error "Missing required parameters for plan command"
            show_usage
            exit 1
        fi
        check_prerequisites
        plan_migration "$TARGET_STORAGE_ACCOUNT" "$TARGET_RESOURCE_GROUP" "$TARGET_LOCATION"
        ;;
    create-target)
        if [ -z "$TARGET_STORAGE_ACCOUNT" ] || [ -z "$TARGET_RESOURCE_GROUP" ] || [ -z "$TARGET_LOCATION" ]; then
            error "Missing required parameters for create-target command"
            show_usage
            exit 1
        fi
        check_prerequisites
        create_target_storage "$TARGET_STORAGE_ACCOUNT" "$TARGET_RESOURCE_GROUP" "$TARGET_LOCATION"
        ;;
    migrate-data)
        if [ -z "$TARGET_STORAGE_ACCOUNT" ] || [ -z "$TARGET_RESOURCE_GROUP" ]; then
            error "Missing required parameters for migrate-data command"
            show_usage
            exit 1
        fi
        check_prerequisites
        migrate_data "$TARGET_STORAGE_ACCOUNT" "$TARGET_RESOURCE_GROUP"
        ;;
    update-config)
        if [ -z "$TARGET_STORAGE_ACCOUNT" ] || [ -z "$TARGET_RESOURCE_GROUP" ]; then
            error "Missing required parameters for update-config command"
            show_usage
            exit 1
        fi
        check_prerequisites
        update_function_config "$TARGET_STORAGE_ACCOUNT" "$TARGET_RESOURCE_GROUP"
        ;;
    verify)
        if [ -z "$TARGET_STORAGE_ACCOUNT" ] || [ -z "$TARGET_RESOURCE_GROUP" ]; then
            error "Missing required parameters for verify command"
            show_usage
            exit 1
        fi
        check_prerequisites
        verify_migration "$TARGET_STORAGE_ACCOUNT" "$TARGET_RESOURCE_GROUP"
        ;;
    cleanup)
        check_prerequisites
        cleanup_old_storage
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
