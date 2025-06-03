#!/bin/bash

# Deployment monitoring script for vCarpool
echo "🔍 vCarpool Deployment Monitor"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get latest commit
LATEST_COMMIT=$(git rev-parse --short HEAD)
echo -e "${BLUE}Latest commit:${NC} $LATEST_COMMIT"

# GitHub Actions URL
GITHUB_REPO="vedprakash-m/vcarpool"
ACTIONS_URL="https://github.com/$GITHUB_REPO/actions"

echo ""
echo -e "${YELLOW}🚀 Deployment Status Check${NC}"
echo "================================"

echo "1. 📱 Check GitHub Actions: $ACTIONS_URL"
echo "2. 🔄 Monitor CI/CD Pipeline Progress"
echo "3. 📊 Look for these improvements in the logs:"
echo "   - ✅ Faster build times (30-50% improvement expected)"
echo "   - ✅ Memory optimization (NODE_OPTIONS=--max-old-space-size=4096)"
echo "   - ✅ Build artifacts verification"
echo "   - ✅ Health check retries"
echo "   - ✅ Deployment stabilization wait"

echo ""
echo -e "${GREEN}🎯 Expected Timeline:${NC}"
echo "- Shared build: ~3-5 minutes"
echo "- Frontend test: ~5-8 minutes"  
echo "- Infrastructure deploy: ~5-10 minutes"
echo "- Frontend deploy: ~10-15 minutes (improved from timeout)"
echo "- Integration tests: ~3-5 minutes"
echo ""
echo -e "${BLUE}Total expected time: 25-45 minutes${NC}"

echo ""
echo -e "${YELLOW}🔍 What to Watch For:${NC}"
echo "- Frontend deploy job should show 'Build completed successfully'"
echo "- No 'Web app warm up timed out' errors"
echo "- Health check should pass after deployment"
echo "- Final deployment summary should show all ✅"

echo ""
echo -e "${GREEN}✨ Optimizations Applied:${NC}"
echo "- Enhanced Next.js configuration with webpack optimizations"
echo "- Increased CI/CD timeout to 30 minutes"
echo "- Pre-build step with memory optimization"
echo "- Bundle size optimization with chunk splitting"
echo "- Azure SWA configuration improvements"
echo "- Performance monitoring and health checks"

echo ""
echo "🔗 Quick Links:"
echo "- GitHub Actions: $ACTIONS_URL"
echo "- Azure Portal: https://portal.azure.com"
echo "- Static Web App: Check pipeline output for URL"

echo ""
echo -e "${BLUE}💡 If deployment still fails:${NC}"
echo "1. Check the 'Build Next.js application for Azure SWA' step logs"
echo "2. Look for memory or timeout issues"
echo "3. Verify all build artifacts are created"
echo "4. Check Azure SWA deployment logs for specific errors" 