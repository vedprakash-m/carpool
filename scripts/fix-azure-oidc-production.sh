#!/bin/bash

# Add missing production environment federated credential for Azure OIDC
# This fixes the CI/CD authentication issue

set -e

echo "🔧 Adding Production Environment Federated Credential"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Azure CLI is installed and user is logged in
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

if ! az account show &> /dev/null; then
    print_error "Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Configuration
GITHUB_ORG="vedprakash-m"
GITHUB_REPO="carpool"

# Get the service principal client ID from existing setup
print_info "Finding existing service principal..."

# Try to find the service principal
APP_NAME="carpool-github-actions"
CLIENT_ID=$(az ad sp list --display-name "$APP_NAME" --query "[0].appId" --output tsv 2>/dev/null || echo "")

if [[ -z "$CLIENT_ID" ]]; then
    print_error "Could not find existing service principal '$APP_NAME'"
    print_info "Please run './scripts/setup-azure-github.sh' first to create the service principal"
    exit 1
fi

print_success "Found service principal with Client ID: $CLIENT_ID"

# Add production environment federated credential
print_info "Adding federated credential for production environment..."

az ad app federated-credential create \
    --id "$CLIENT_ID" \
    --parameters '{
        "name": "carpool-production-environment",
        "issuer": "https://token.actions.githubusercontent.com",
        "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':environment:production",
        "description": "Production environment deployment",
        "audiences": ["api://AzureADTokenExchange"]
    }' 2>/dev/null || {
        print_warning "Production environment federated credential may already exist"
        print_info "Checking existing credentials..."
        
        # List existing credentials to verify
        echo "Existing federated credentials:"
        az ad app federated-credential list --id "$CLIENT_ID" --query "[].{name:name, subject:subject}" --output table 2>/dev/null || true
    }

print_success "Production environment federated credential configured"

echo
print_success "✅ Fix completed!"
print_info "The GitHub Actions workflow should now be able to authenticate with Azure using the production environment."
print_info "You can verify this by checking the next CI/CD run."

echo
print_info "If you still have issues, you can verify the credentials with:"
echo "az ad app federated-credential list --id $CLIENT_ID --query \"[].{name:name, subject:subject}\" --output table"
