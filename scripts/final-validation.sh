#!/bin/bash

# Comprehensive Validation Script for VCarpool to Carpool Rebranding
# This script validates that all rebranding changes were applied correctly

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

success_count=0
error_count=0

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((success_count++))
}

error() {
    echo -e "${RED}❌ $1${NC}"
    ((error_count++))
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_info "🔍 Starting comprehensive rebranding validation..."

# 1. Check for remaining vcarpool references
log_info "1. Checking for remaining vcarpool references..."
REMAINING_REFS=$(grep -r "vcarpool" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=out --exclude="*.log" --exclude="rebranding-validation.sh" --exclude="comprehensive-replacement.sh" --exclude="final-validation.sh" . 2>/dev/null | wc -l | tr -d ' ' || echo "0")

if [ "$REMAINING_REFS" -eq 0 ]; then
    success "No remaining vcarpool references found"
else
    error "Found $REMAINING_REFS remaining vcarpool references"
fi

# 2. Validate CI/CD pipeline files
log_info "2. Validating CI/CD pipeline files..."

if grep -q "carpool-rg" .github/workflows/deploy-pipeline.yml; then
    success "Deploy pipeline uses new resource group names"
else
    error "Deploy pipeline still has old resource group names"
fi

if grep -q '"carpool"' infra/parameters.prod.json; then
    success "Production parameters updated to carpool"
else
    error "Production parameters not updated"
fi

if grep -q '"carpool"' infra/parameters.dev.json; then
    success "Development parameters updated to carpool"
else
    error "Development parameters not updated"
fi

# 3. Validate backend configuration
log_info "3. Validating backend configuration..."

if grep -q "carpool-api-prod" backend/package.json; then
    success "Backend deployment scripts updated"
else
    error "Backend deployment scripts not updated"
fi

# 4. Validate frontend token references
log_info "4. Validating frontend token references..."

if grep -q "carpool_token" frontend/src/components/PhoneVerification.tsx 2>/dev/null; then
    success "Frontend token references updated"
else
    warning "Frontend token references check - file may not exist or already updated"
fi

# 5. Validate script files
log_info "5. Validating script files..."

if grep -q "carpool-rg" scripts/validate-deployment.sh; then
    success "Validation script updated"
else
    error "Validation script not updated"
fi

# 6. Check documentation
log_info "6. Validating documentation..."

if grep -q "Carpool" README.md; then
    success "README updated to Carpool branding"
else
    error "README not updated"
fi

if grep -q "Carpool" NOTICE; then
    success "NOTICE file updated"
else
    error "NOTICE file not updated"
fi

# 7. Validate build output
log_info "7. Validating project structure..."

if [ -f ".github/workflows/deploy-pipeline.yml" ]; then
    success "Deploy pipeline workflow exists"
else
    error "Deploy pipeline workflow missing"
fi

if [ -f "infra/parameters.prod.json" ] && [ -f "infra/parameters.dev.json" ]; then
    success "Infrastructure parameter files exist"
else
    error "Infrastructure parameter files missing"
fi

# 8. Check that we have carpool references now
log_info "8. Validating carpool references exist..."

CARPOOL_REFS=$(grep -r "carpool" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=out --exclude="*.log" --exclude="final-validation.sh" . 2>/dev/null | wc -l | tr -d ' ' || echo "0")

if [ "$CARPOOL_REFS" -gt 100 ]; then
    success "Found $CARPOOL_REFS carpool references - rebranding successful"
else
    warning "Only found $CARPOOL_REFS carpool references - may need more updates"
fi

# 9. Test basic functionality
log_info "9. Testing basic project structure..."

if [ -f "scripts/validate-deployment.sh" ] && [ -x "scripts/validate-deployment.sh" ]; then
    success "Deployment validation script exists and is executable"
else
    error "Deployment validation script missing or not executable"
fi

# Summary
log_info "📊 Validation Summary"
echo ""
echo -e "${GREEN}✅ Successful checks: $success_count${NC}"
echo -e "${RED}❌ Failed checks: $error_count${NC}"
echo ""

if [ "$error_count" -eq 0 ]; then
    echo -e "${GREEN}🎉 All rebranding validation checks passed!${NC}"
    echo -e "${GREEN}✅ Project successfully rebranded from 'VCarpool' to 'Carpool'${NC}"
    echo -e "${GREEN}🚀 Ready for production deployment with new branding!${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Some validation checks failed. Please review and fix the issues above.${NC}"
    exit 1
fi
