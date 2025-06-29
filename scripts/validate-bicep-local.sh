#!/bin/bash

# Local Bicep Validation Script
# This script mirrors the CI/CD Bicep validation to catch issues early

set -e

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

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Function to check if Bicep CLI is installed
check_bicep_cli() {
    if command -v bicep &> /dev/null; then
        success "Bicep CLI is installed"
        bicep --version
    else
        error "Bicep CLI not found. Installing..."
        install_bicep_cli
    fi
}

# Function to install Bicep CLI on macOS/Linux
install_bicep_cli() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            log "Installing Bicep CLI via Homebrew..."
            brew install bicep
        else
            log "Installing Bicep CLI manually..."
            curl -Lo bicep https://github.com/Azure/bicep/releases/latest/download/bicep-osx-x64
            chmod +x ./bicep
            sudo mv ./bicep /usr/local/bin/bicep
        fi
    else
        # Linux
        log "Installing Bicep CLI for Linux..."
        curl -Lo bicep https://github.com/Azure/bicep/releases/latest/download/bicep-linux-x64
        chmod +x ./bicep
        sudo mv ./bicep /usr/local/bin/bicep
    fi
}

# Function to lint Bicep templates
lint_bicep_templates() {
    log "🧹 Linting Bicep templates..."
    
    local lint_failed=false
    
    # Lint all Bicep files
    for bicep_file in infra/*.bicep; do
        if [ -f "$bicep_file" ]; then
            log "Linting $bicep_file..."
            if bicep build "$bicep_file" --stdout > /dev/null 2>&1; then
                success "$bicep_file passed linting"
            else
                error "$bicep_file failed linting"
                bicep build "$bicep_file" --stdout
                lint_failed=true
            fi
        fi
    done
    
    # Lint module files
    if [ -d "infra/modules" ]; then
        for bicep_file in infra/modules/*.bicep; do
            if [ -f "$bicep_file" ]; then
                log "Linting module $bicep_file..."
                if bicep build "$bicep_file" --stdout > /dev/null 2>&1; then
                    success "$bicep_file passed linting"
                else
                    error "$bicep_file failed linting"
                    bicep build "$bicep_file" --stdout
                    lint_failed=true
                fi
            fi
        done
    fi
    
    if [ "$lint_failed" = true ]; then
        error "Bicep linting failed"
        return 1
    else
        success "All Bicep templates passed linting"
        return 0
    fi
}

# Function to validate Bicep template structure
validate_bicep_structure() {
    log "🔍 Validating Bicep template structure..."
    
    local validation_failed=false
    
    # Check for required files
    required_files=("infra/main.bicep" "infra/database.bicep" "infra/main-compute.bicep")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            success "Required file found: $file"
        else
            error "Required file missing: $file"
            validation_failed=true
        fi
    done
    
    # Check for parameter files
    for env in dev prod; do
        param_file="infra/parameters.$env.json"
        if [ -f "$param_file" ]; then
            success "Parameter file found: $param_file"
            # Validate JSON syntax
            if jq empty "$param_file" 2>/dev/null; then
                success "$param_file has valid JSON syntax"
            else
                error "$param_file has invalid JSON syntax"
                validation_failed=true
            fi
        else
            warning "Parameter file missing: $param_file"
        fi
    done
    
    if [ "$validation_failed" = true ]; then
        error "Bicep structure validation failed"
        return 1
    else
        success "Bicep template structure validation passed"
        return 0
    fi
}

# Function to check for common security issues
check_security_patterns() {
    log "🔒 Checking for security best practices..."
    
    # Check for HTTPS enforcement
    if grep -r "httpsOnly.*true" infra/*.bicep > /dev/null 2>&1; then
        success "HTTPS enforcement found"
    else
        warning "Consider enforcing HTTPS for web resources"
    fi
    
    # Check for minimum TLS version
    if grep -r "minTlsVersion.*1.2" infra/*.bicep > /dev/null 2>&1; then
        success "Minimum TLS version configured"
    else
        warning "Consider setting minimum TLS version to 1.2"
    fi
    
    # Check for storage encryption
    if grep -r "supportsHttpsTrafficOnly.*true" infra/*.bicep > /dev/null 2>&1; then
        success "Storage HTTPS enforcement found"
    else
        warning "Consider enforcing HTTPS for storage accounts"
    fi
    
    # Check for Key Vault usage
    if grep -r "Microsoft.KeyVault" infra/*.bicep > /dev/null 2>&1; then
        success "Key Vault usage detected"
    else
        warning "Consider using Key Vault for secret management"
    fi
    
    success "Security pattern check completed"
}

# Function to validate against common Bicep errors
validate_common_errors() {
    log "🔧 Checking for common Bicep errors..."
    
    local validation_failed=false
    
    # Check for cross-scope issues (BCP165)
    for bicep_file in infra/*.bicep; do
        if [ -f "$bicep_file" ]; then
            # Look for resources with parent and scope on different resource groups
            if grep -n "scope: resourceGroup" "$bicep_file" > /dev/null && grep -n "parent:" "$bicep_file" > /dev/null; then
                warning "Potential cross-scope issue in $bicep_file - check for BCP165 errors"
                
                # Try to build and capture specific errors
                if ! bicep build "$bicep_file" --stdout > /dev/null 2>&1; then
                    error "Cross-scope validation failed for $bicep_file"
                    bicep build "$bicep_file" 2>&1 | grep -E "(BCP165|scope|parent)" || true
                    validation_failed=true
                fi
            fi
        fi
    done
    
    if [ "$validation_failed" = true ]; then
        error "Common error validation failed"
        return 1
    else
        success "Common error validation passed"
        return 0
    fi
}

# Main validation function
main() {
    log "🚀 Starting local Bicep validation..."
    
    # Change to project root if not already there
    if [ ! -f "package.json" ] || [ ! -d "infra" ]; then
        if [ -f "../package.json" ] && [ -d "../infra" ]; then
            cd ..
        else
            error "Cannot find project root (package.json and infra/ directory)"
            exit 1
        fi
    fi
    
    local overall_success=true
    
    # Run validation steps
    if ! check_bicep_cli; then
        overall_success=false
    fi
    
    if ! validate_bicep_structure; then
        overall_success=false
    fi
    
    if ! lint_bicep_templates; then
        overall_success=false
    fi
    
    if ! validate_common_errors; then
        overall_success=false
    fi
    
    check_security_patterns  # This only provides warnings, not failures
    
    # Final result
    if [ "$overall_success" = true ]; then
        success "🎉 All local Bicep validations passed!"
        log "✅ Templates are ready for CI/CD pipeline"
        exit 0
    else
        error "❌ Some Bicep validations failed"
        log "🔧 Please fix the issues before committing"
        exit 1
    fi
}

# Run main function
main "$@"
