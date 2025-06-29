#!/bin/bash

# Bicep Template Validation Script for Carpool
# Validates Bicep templates locally before deployment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infra"

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        error "Azure CLI is not installed. Please install it: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    
    success "Azure CLI is available"
    
    # Check if Bicep is available
    if ! az bicep version &> /dev/null; then
        error "Bicep is not available. Please install it: az bicep install"
        exit 1
    fi
    
    local bicep_version=$(az bicep version --output json | jq -r '.bicepVersion' 2>/dev/null || echo "unknown")
    success "Bicep is available (version: $bicep_version)"
}

# Validate a single Bicep file
validate_bicep_file() {
    local file_path=$1
    local file_name=$(basename "$file_path")
    
    log "Validating Bicep file: $file_name"
    
    # Check if file exists
    if [ ! -f "$file_path" ]; then
        error "Bicep file not found: $file_path"
        return 1
    fi
    
    # Run Bicep build (compilation check)
    log "  Running Bicep build on $file_name..."
    if az bicep build --file "$file_path" > /dev/null 2>&1; then
        success "  Bicep build passed for $file_name"
    else
        error "  Bicep build failed for $file_name"
        log "  Error details:"
        az bicep build --file "$file_path" || true
        return 1
    fi
    
    # Run Bicep lint (style and best practices)
    log "  Running Bicep lint on $file_name..."
    local lint_output=$(az bicep lint --file "$file_path" 2>&1)
    if [ $? -eq 0 ]; then
        if [ -z "$lint_output" ]; then
            success "  Bicep lint passed for $file_name (no issues found)"
        else
            warning "  Bicep lint passed for $file_name with recommendations:"
            echo "$lint_output"
        fi
    else
        error "  Bicep lint failed for $file_name"
        echo "$lint_output"
        return 1
    fi
    
    return 0
}

# Validate template parameters
validate_template_parameters() {
    local template_path=$1
    local template_name=$(basename "$template_path")
    
    log "Validating template parameters for: $template_name"
    
    # Check for parameter files
    local param_files=()
    local template_dir=$(dirname "$template_path")
    
    # Look for common parameter file patterns
    for pattern in "*.parameters.json" "*.parameters.*.json" "parameters.json" "parameters.*.json"; do
        while IFS= read -r -d '' file; do
            param_files+=("$file")
        done < <(find "$template_dir" -name "$pattern" -print0 2>/dev/null || true)
    done
    
    if [ ${#param_files[@]} -eq 0 ]; then
        warning "  No parameter files found for $template_name"
        warning "  Template should be validated with actual parameter values during deployment"
    else
        success "  Found ${#param_files[@]} parameter file(s) for $template_name:"
        for param_file in "${param_files[@]}"; do
            echo "    - $(basename "$param_file")"
        done
    fi
}

# Validate template structure and best practices
validate_template_structure() {
    local template_path=$1
    local template_name=$(basename "$template_path")
    
    log "Validating template structure for: $template_name"
    
    # Check for required sections
    local template_content=$(cat "$template_path")
    
    # Check for metadata/description
    if echo "$template_content" | grep -q "@description\|metadata"; then
        success "  Template includes metadata/description"
    else
        warning "  Consider adding @description annotations for better documentation"
    fi
    
    # Check for parameter validation
    if echo "$template_content" | grep -q "@allowed\|@minLength\|@maxLength\|@minValue\|@maxValue"; then
        success "  Template includes parameter validation"
    else
        warning "  Consider adding parameter validation decorators"
    fi
    
    # Check for outputs
    if echo "$template_content" | grep -q "^output "; then
        success "  Template includes outputs"
    else
        warning "  Consider adding outputs for key resource identifiers"
    fi
}

# Main validation function
main() {
    log "Starting Bicep template validation for Carpool"
    log "Infrastructure directory: $INFRA_DIR"
    
    local validation_failed=false
    
    # Check prerequisites
    check_prerequisites || exit 1
    
    # Change to infrastructure directory
    cd "$INFRA_DIR"
    
    # Find all Bicep files
    local bicep_files=()
    while IFS= read -r -d '' file; do
        bicep_files+=("$file")
    done < <(find . -name "*.bicep" -print0)
    
    if [ ${#bicep_files[@]} -eq 0 ]; then
        error "No Bicep files found in $INFRA_DIR"
        exit 1
    fi
    
    log "Found ${#bicep_files[@]} Bicep file(s) to validate"
    
    # Validate each Bicep file
    for bicep_file in "${bicep_files[@]}"; do
        echo ""
        if ! validate_bicep_file "$bicep_file"; then
            validation_failed=true
        fi
        
        # Additional validations for main templates
        if [[ "$bicep_file" == *"main.bicep" || "$bicep_file" == *"azuredeploy.bicep" ]]; then
            validate_template_parameters "$bicep_file"
            validate_template_structure "$bicep_file"
        fi
    done
    
    echo ""
    
    # Summary
    if [ "$validation_failed" = "true" ]; then
        error "Bicep template validation failed - see errors above"
        exit 1
    else
        success "All Bicep templates passed validation!"
        
        # Additional recommendations
        echo ""
        log "Recommendations for CI/CD pipeline:"
        echo "  ✓ Run 'az deployment group validate' before actual deployment"
        echo "  ✓ Use parameter files for environment-specific configurations"
        echo "  ✓ Test deployments in a dev/staging environment first"
        echo "  ✓ Monitor deployment outputs and validate resource creation"
        
        exit 0
    fi
}

# Handle script arguments
case "${1:-validate}" in
    "validate")
        main
        ;;
    "prerequisites")
        check_prerequisites
        ;;
    "help")
        echo "Usage: $0 [validate|prerequisites|help]"
        echo "  validate       - Validate all Bicep templates (default)"
        echo "  prerequisites  - Check if required tools are installed"
        echo "  help           - Show this help"
        ;;
    *)
        error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
