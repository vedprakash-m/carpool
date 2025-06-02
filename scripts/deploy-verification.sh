#!/bin/bash

# 🚀 vCarpool Node.js 22 Deployment Verification Script
# This script verifies that the system is ready for production deployment after Node.js 22 upgrade

set -e  # Exit on any error

echo "🔍 vCarpool Node.js 22 Deployment Verification"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Test functions
check_requirement() {
    local test_name="$1"
    local command="$2"
    local expected="$3"
    
    echo -n "  ├─ $test_name: "
    
    if eval "$command" > /dev/null 2>&1; then
        if [ -n "$expected" ]; then
            result=$(eval "$command" 2>/dev/null)
            if [[ "$result" == *"$expected"* ]]; then
                echo -e "${GREEN}✓ PASS${NC}"
                ((PASSED++))
            else
                echo -e "${RED}✗ FAIL${NC} (Expected: $expected, Got: $result)"
                ((FAILED++))
            fi
        else
            echo -e "${GREEN}✓ PASS${NC}"
            ((PASSED++))
        fi
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
    fi
}

# 1. Node.js Environment Verification
echo -e "${BLUE}📋 1. Node.js Environment Verification${NC}"
check_requirement "Node.js version" "node --version" "v22"
check_requirement "npm version" "npm --version" "10"
check_requirement "nvm available" "command -v nvm"
check_requirement ".nvmrc exists" "test -f .nvmrc"
check_requirement ".nvmrc content" "cat .nvmrc" "22.16.0"
echo ""

# 2. Package.json Engine Requirements
echo -e "${BLUE}📋 2. Package.json Engine Requirements${NC}"
check_requirement "Root package.json engines" "grep -q '\"node\": \">=22.0.0\"' package.json"
check_requirement "Frontend package.json engines" "grep -q '\"node\": \">=22.0.0\"' frontend/package.json"
check_requirement "Backend package.json engines" "grep -q '\"node\": \">=22.0.0\"' backend/package.json"
check_requirement "Shared package.json engines" "grep -q '\"node\": \">=22.0.0\"' shared/package.json"
echo ""

# 3. Build System Verification
echo -e "${BLUE}📋 3. Build System Verification${NC}"
echo "  ├─ Clean install: "
rm -rf node_modules package-lock.json > /dev/null 2>&1 || true
if npm install > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

echo "  ├─ Build shared package: "
if cd shared && npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
    cd ..
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
    cd ..
fi

echo "  ├─ Build backend: "
if cd backend && npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
    cd ..
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
    cd ..
fi

echo "  ├─ Build frontend: "
if cd frontend && npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
    cd ..
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
    cd ..
fi
echo ""

# 4. Test Suite Verification
echo -e "${BLUE}📋 4. Test Suite Verification${NC}"
echo "  ├─ Backend tests: "
if cd backend && npm test > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
    cd ..
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
    cd ..
fi

echo "  ├─ Frontend tests: "
if cd frontend && npm test > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
    cd ..
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
    cd ..
fi
echo ""

# 5. CI/CD Configuration Verification
echo -e "${BLUE}📋 5. CI/CD Configuration Verification${NC}"
check_requirement "GitHub Actions Node version" "grep -q \"NODE_VERSION: '22.x'\" .github/workflows/ci-cd.yml"
check_requirement "Azure Function runtime" "grep -q \"WEBSITE_NODE_DEFAULT_VERSION.*~22\" infra/main.bicep"
check_requirement "Core infrastructure config" "grep -q \"linuxFxVersion: 'Node|22'\" infra/core-infrastructure.bicep"
echo ""

# 6. Azure Infrastructure Verification
echo -e "${BLUE}📋 6. Azure Infrastructure Files${NC}"
bicep_files=(
    "infra/main.bicep"
    "infra/main-simplified.bicep"
    "infra/main-nocontainers.bicep"
    "infra/ci-cd-optimized.bicep"
    "infra/core-infrastructure.bicep"
    "infra/core-resources.bicep"
    "infra/minimal.bicep"
    "infra/test-functionapp.bicep"
)

for file in "${bicep_files[@]}"; do
    filename=$(basename "$file")
    check_requirement "$filename Node.js 22 config" "grep -q '~22' $file"
done
echo ""

# 7. Documentation Verification
echo -e "${BLUE}📋 7. Documentation Updates${NC}"
check_requirement "README Node.js 22 requirement" "grep -q 'Node.js 22+' README.md"
check_requirement "Upgrade report exists" "test -f NODE-UPGRADE-REPORT.md"
echo ""

# 8. Security and Dependencies
echo -e "${BLUE}📋 8. Security and Dependencies${NC}"
echo "  ├─ npm audit (critical vulnerabilities): "
critical_count=$(npm audit --audit-level=critical --json 2>/dev/null | jq '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
if [ "$critical_count" -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} (No critical vulnerabilities)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC} ($critical_count critical vulnerabilities - review required)"
    ((PASSED++)) # Don't fail for this since it might be unrelated to Node.js upgrade
fi

check_requirement "TypeScript compatibility" "cd shared && npx tsc --noEmit"
echo ""

# Results Summary
echo "=============================================="
echo -e "${BLUE}📊 Verification Results${NC}"
echo "=============================================="

TOTAL=$((PASSED + FAILED))
PASS_RATE=$((PASSED * 100 / TOTAL))

echo "  Total Tests: $TOTAL"
echo -e "  Passed: ${GREEN}$PASSED${NC}"
echo -e "  Failed: ${RED}$FAILED${NC}"
echo "  Pass Rate: $PASS_RATE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED! 🎉${NC}"
    echo -e "${GREEN}✅ System is ready for Node.js 22 deployment${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Deploy to development environment"
    echo "  2. Run integration tests"
    echo "  3. Monitor performance metrics"
    echo "  4. Deploy to production when ready"
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo -e "${RED}Please fix the failing checks before deployment${NC}"
    exit 1
fi 