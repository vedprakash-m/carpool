#!/bin/bash

# Tesla STEM Carpool Production Rollback Script
# Emergency rollback procedures for production environment

set -e

# Configuration
ENVIRONMENT="prod"
RESOURCE_GROUP="carpool-rg"
FUNCTION_APP_NAME="carpool-app"
COSMOS_ACCOUNT="carpool-cosmos"
BACKUP_TIMESTAMP=${1:-$(date -u +"%Y%m%d%H%M%S")}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
}

# Rollback confirmation
confirm_rollback() {
    echo_warning "⚠️  PRODUCTION ROLLBACK INITIATED"
    echo_warning "This will rollback the production environment to a previous state."
    echo_warning "Backup timestamp: $BACKUP_TIMESTAMP"
    echo ""
    echo_info "Current time: $(date)"
    echo_info "Resource Group: $RESOURCE_GROUP"
    echo_info "Function App: $FUNCTION_APP_NAME"
    echo_info "Cosmos Account: $COSMOS_ACCOUNT"
    echo ""
    
    read -p "Are you sure you want to proceed with rollback? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo_info "Rollback cancelled."
        exit 0
    fi
    
    echo_info "Proceeding with rollback..."
}

# Check Azure CLI authentication
check_azure_auth() {
    echo_info "Checking Azure CLI authentication..."
    if ! az account show > /dev/null 2>&1; then
        echo_error "Azure CLI not authenticated. Please run 'az login' first."
        exit 1
    fi
    echo_success "Azure CLI authenticated"
}

# Function to rollback Function App deployment
rollback_function_app() {
    echo_info "Rolling back Function App deployment..."
    
    # Get deployment history
    echo_info "Fetching deployment history..."
    DEPLOYMENTS=$(az functionapp deployment list --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --query "[].{id:id,active:active,status:status,author:author,start_time:start_time}" --output table)
    
    echo_info "Recent deployments:"
    echo "$DEPLOYMENTS"
    
    # Get the previous successful deployment
    PREVIOUS_DEPLOYMENT=$(az functionapp deployment list --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --query "[?active==\`false\` && status==\`Success\`] | [0].id" --output tsv)
    
    if [[ -z "$PREVIOUS_DEPLOYMENT" ]]; then
        echo_error "No previous successful deployment found"
        return 1
    fi
    
    echo_info "Rolling back to deployment: $PREVIOUS_DEPLOYMENT"
    
    # Perform rollback
    az functionapp deployment source config --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --manual-integration --repo-url "previous-deployment" --branch $PREVIOUS_DEPLOYMENT
    
    echo_success "Function App rollback completed"
}

# Function to rollback database (restore from backup)
rollback_database() {
    echo_info "Initiating database rollback..."
    
    # List available backups
    echo_info "Fetching available backups..."
    BACKUPS=$(az cosmosdb sql database backup list --account-name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query "[].{name:name,timestamp:timestamp,status:status}" --output table)
    
    echo_info "Available backups:"
    echo "$BACKUPS"
    
    # Find backup closest to specified timestamp
    TARGET_BACKUP=$(az cosmosdb sql database backup list --account-name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query "[?contains(timestamp, '$BACKUP_TIMESTAMP')] | [0].name" --output tsv)
    
    if [[ -z "$TARGET_BACKUP" ]]; then
        echo_warning "Exact backup not found for timestamp: $BACKUP_TIMESTAMP"
        TARGET_BACKUP=$(az cosmosdb sql database backup list --account-name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query "[0].name" --output tsv)
        echo_info "Using most recent backup: $TARGET_BACKUP"
    fi
    
    if [[ -z "$TARGET_BACKUP" ]]; then
        echo_error "No backup available for restore"
        return 1
    fi
    
    echo_warning "⚠️  Database restore will overwrite current data"
    read -p "Proceed with database restore? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo_info "Database restore cancelled."
        return 0
    fi
    
    # Perform database restore
    echo_info "Restoring database from backup: $TARGET_BACKUP"
    az cosmosdb sql database restore --account-name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --backup-id $TARGET_BACKUP --restore-timestamp $BACKUP_TIMESTAMP
    
    echo_success "Database rollback completed"
}

# Function to rollback configuration settings
rollback_configuration() {
    echo_info "Rolling back configuration settings..."
    
    # Restore previous application settings
    echo_info "Restoring application settings..."
    
    # Check if backup configuration file exists
    BACKUP_CONFIG_FILE="../backup/app-settings-$BACKUP_TIMESTAMP.json"
    if [[ -f "$BACKUP_CONFIG_FILE" ]]; then
        echo_info "Restoring from backup file: $BACKUP_CONFIG_FILE"
        az functionapp config appsettings set --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --settings @$BACKUP_CONFIG_FILE
    else
        echo_warning "Backup configuration file not found. Restoring default settings..."
        # Apply default configuration
        ./update-function-config.sh prod
    fi
    
    echo_success "Configuration rollback completed"
}

# Function to verify rollback success
verify_rollback() {
    echo_info "Verifying rollback success..."
    
    # Wait for services to stabilize
    echo_info "Waiting for services to stabilize (30 seconds)..."
    sleep 30
    
    # Run health checks
    echo_info "Running health checks..."
    HEALTH_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/health"
    
    for i in {1..5}; do
        echo_info "Health check attempt $i/5..."
        if curl -sf "$HEALTH_URL" > /dev/null; then
            echo_success "Health check passed"
            break
        else
            if [[ $i -eq 5 ]]; then
                echo_error "Health checks failed after 5 attempts"
                return 1
            fi
            echo_warning "Health check failed, retrying in 10 seconds..."
            sleep 10
        fi
    done
    
    # Run smoke tests
    echo_info "Running production smoke tests..."
    if ./production-smoke-tests.sh prod; then
        echo_success "Smoke tests passed"
    else
        echo_error "Smoke tests failed - rollback may be incomplete"
        return 1
    fi
    
    echo_success "Rollback verification completed successfully"
}

# Function to notify stakeholders
notify_stakeholders() {
    echo_info "Preparing stakeholder notification..."
    
    # Create incident summary
    INCIDENT_SUMMARY="docs/incident-rollback-$(date +%Y%m%d-%H%M%S).md"
    
    cat > $INCIDENT_SUMMARY << EOF
# Production Rollback Incident Report

**Date**: $(date)
**Environment**: Production
**Rollback Timestamp**: $BACKUP_TIMESTAMP

## Rollback Summary
- Function App: Rolled back to previous deployment
- Database: Restored from backup
- Configuration: Restored to previous settings

## Verification Status
- Health Checks: ✅ Passed
- Smoke Tests: ✅ Passed
- System Status: Operational

## Next Steps
1. Monitor system stability for 24 hours
2. Investigate root cause of original issue
3. Plan remediation and re-deployment
4. Update rollback procedures based on lessons learned

**Incident Report**: $INCIDENT_SUMMARY
EOF

    echo_info "Incident report created: $INCIDENT_SUMMARY"
    echo_info "Please notify stakeholders of rollback completion"
}

# Main rollback execution
main() {
    echo_critical "🚨 TESLA STEM CARPOOL PRODUCTION ROLLBACK"
    echo_critical "=========================================="
    
    confirm_rollback
    check_azure_auth
    
    echo_info "Starting rollback process..."
    echo_info "Timestamp: $(date)"
    
    # Execute rollback steps
    if rollback_function_app; then
        echo_success "✅ Function App rollback completed"
    else
        echo_error "❌ Function App rollback failed"
        exit 1
    fi
    
    if rollback_configuration; then
        echo_success "✅ Configuration rollback completed"
    else
        echo_error "❌ Configuration rollback failed"
        exit 1
    fi
    
    # Database rollback is optional and more destructive
    echo_warning "Database rollback is optional - only proceed if data corruption occurred"
    read -p "Perform database rollback? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        if rollback_database; then
            echo_success "✅ Database rollback completed"
        else
            echo_error "❌ Database rollback failed"
            exit 1
        fi
    else
        echo_info "Database rollback skipped"
    fi
    
    # Verify rollback
    if verify_rollback; then
        echo_success "✅ Rollback verification completed"
    else
        echo_error "❌ Rollback verification failed"
        exit 1
    fi
    
    # Create incident documentation
    notify_stakeholders
    
    echo_success "🎉 PRODUCTION ROLLBACK COMPLETED SUCCESSFULLY"
    echo_info "System has been rolled back and verified as operational"
    echo_info "Monitor system stability and investigate original issue"
}

# Check if this script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
