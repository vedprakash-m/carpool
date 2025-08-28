#!/bin/bash

# Deploy to New Flex Consumption Function App
# This script deploys the backend code to the new carpool-backend Function App

set -e

# Configuration
FUNCTION_APP_NAME="carpool-backend"
BACKEND_DIR="/Users/ved/Apps/carpool/backend"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to deploy backend
deploy_backend() {
    log "Deploying backend to Flex Consumption Function App: $FUNCTION_APP_NAME"
    
    cd "$BACKEND_DIR"
    
    # Build the backend
    log "Building backend..."
    npm run build
    
    # Deploy to Azure Functions
    log "Deploying to $FUNCTION_APP_NAME..."
    func azure functionapp publish "$FUNCTION_APP_NAME" --typescript
    
    success "Backend deployed successfully!"
}

# Function to test deployment
test_deployment() {
    log "Testing deployment..."
    
    local health_url="https://$FUNCTION_APP_NAME.azurewebsites.net/api/health"
    
    log "Waiting for deployment to be ready..."
    sleep 30
    
    log "Testing health endpoint: $health_url"
    if curl -f -s "$health_url" > /dev/null; then
        success "Health check passed!"
    else
        error "Health check failed. Please check the deployment."
        return 1
    fi
}

# Function to show deployment info
show_info() {
    echo ""
    echo "🚀 Deployment Complete!"
    echo "======================="
    echo "Function App: $FUNCTION_APP_NAME"
    echo "Health URL: https://$FUNCTION_APP_NAME.azurewebsites.net/api/health"
    echo "Azure Portal: https://portal.azure.com/#@/resource/subscriptions/8c48242c-a20e-448a-ac0f-be75ac5ebad0/resourceGroups/carpool-rg/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME"
    echo ""
    echo "Next Steps:"
    echo "1. Test the health endpoint"
    echo "2. Update frontend configuration to use new backend URL"
    echo "3. Run migration script to copy settings from old app"
    echo "4. Delete old Y1 function app once confirmed working"
}

# Main execution
main() {
    case "${1:-deploy}" in
        "deploy")
            deploy_backend
            test_deployment
            show_info
            ;;
        "test")
            test_deployment
            ;;
        "info")
            show_info
            ;;
        *)
            echo "Usage: $0 [deploy|test|info]"
            echo "  deploy - Build and deploy backend (default)"
            echo "  test   - Test deployment health"
            echo "  info   - Show deployment information"
            exit 1
            ;;
    esac
}

main "$@"
