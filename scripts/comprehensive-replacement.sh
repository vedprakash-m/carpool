#!/bin/bash

# Comprehensive VCarpool to Carpool Replacement Script
# This script replaces ALL instances of vcarpool with carpool across the entire project

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

log "🚀 Starting comprehensive VCarpool → Carpool replacement..."

# Count initial references
INITIAL_COUNT=$(grep -r "vcarpool" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=out --exclude="*.log" . 2>/dev/null | wc -l || echo "0")
log "Found $INITIAL_COUNT initial vcarpool references"

# 1. Replace in all text files (case-sensitive)
log "1. Replacing 'vcarpool' with 'carpool' in all files..."
find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.next/*" \
    -not -path "./out/*" \
    -not -path "./frontend/.next/*" \
    -not -path "./frontend/out/*" \
    -not -name "*.log" \
    -not -name "comprehensive-replacement.sh" \
    -exec grep -l "vcarpool" {} \; 2>/dev/null | \
    xargs sed -i '' 's/vcarpool/carpool/g' 2>/dev/null || true

# 2. Replace VCarpool (capitalized)
log "2. Replacing 'VCarpool' with 'Carpool' in all files..."
find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.next/*" \
    -not -path "./out/*" \
    -not -path "./frontend/.next/*" \
    -not -path "./frontend/out/*" \
    -not -name "*.log" \
    -not -name "comprehensive-replacement.sh" \
    -exec grep -l "VCarpool" {} \; 2>/dev/null | \
    xargs sed -i '' 's/VCarpool/Carpool/g' 2>/dev/null || true

# 3. Replace vCarpool (camelCase)
log "3. Replacing 'vCarpool' with 'Carpool' in all files..."
find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.next/*" \
    -not -path "./out/*" \
    -not -path "./frontend/.next/*" \
    -not -path "./frontend/out/*" \
    -not -name "*.log" \
    -not -name "comprehensive-replacement.sh" \
    -exec grep -l "vCarpool" {} \; 2>/dev/null | \
    xargs sed -i '' 's/vCarpool/Carpool/g' 2>/dev/null || true

# 4. Replace storage account specific names (vcarpoolsa → carpoolsa)
log "4. Replacing storage account names 'vcarpoolsa' with 'carpoolsa'..."
find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.next/*" \
    -not -path "./out/*" \
    -not -path "./frontend/.next/*" \
    -not -path "./frontend/out/*" \
    -not -name "*.log" \
    -not -name "comprehensive-replacement.sh" \
    -exec grep -l "vcarpoolsa" {} \; 2>/dev/null | \
    xargs sed -i '' 's/vcarpoolsa/carpoolsa/g' 2>/dev/null || true

# 5. Replace URL references
log "5. Replacing GitHub URLs 'vedprakash-m/vcarpool' with 'vedprakash-m/carpool'..."
find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.next/*" \
    -not -path "./out/*" \
    -not -path "./frontend/.next/*" \
    -not -path "./frontend/out/*" \
    -not -name "*.log" \
    -not -name "comprehensive-replacement.sh" \
    -exec grep -l "vedprakash-m/vcarpool" {} \; 2>/dev/null | \
    xargs sed -i '' 's/vedprakash-m\/vcarpool/vedprakash-m\/carpool/g' 2>/dev/null || true

# 6. Replace path references
log "6. Replacing path references '/Users/vedprakashmishra/vcarpool' with '/Users/vedprakashmishra/carpool'..."
find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.next/*" \
    -not -path "./out/*" \
    -not -path "./frontend/.next/*" \
    -not -path "./frontend/out/*" \
    -not -name "*.log" \
    -not -name "comprehensive-replacement.sh" \
    -exec grep -l "/Users/vedprakashmishra/vcarpool" {} \; 2>/dev/null | \
    xargs sed -i '' 's/\/Users\/vedprakashmishra\/vcarpool/\/Users\/vedprakashmishra\/carpool/g' 2>/dev/null || true

# 7. Replace in package.json name fields specifically
log "7. Updating package.json name fields..."
find . -name "package.json" \
    -not -path "./node_modules/*" \
    -exec sed -i '' 's/"vcarpool-/"carpool-/g' {} \; 2>/dev/null || true

# 8. Clean up build artifacts that might contain old references
log "8. Cleaning build artifacts..."
rm -rf frontend/.next frontend/out 2>/dev/null || true
rm -rf backend/dist 2>/dev/null || true

# Count final references
FINAL_COUNT=$(grep -r "vcarpool" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=out --exclude="*.log" --exclude="comprehensive-replacement.sh" . 2>/dev/null | wc -l || echo "0")

log "📊 Replacement Summary:"
echo -e "${BLUE}Initial references: $INITIAL_COUNT${NC}"
echo -e "${BLUE}Remaining references: $FINAL_COUNT${NC}"
echo -e "${GREEN}Replaced: $((INITIAL_COUNT - FINAL_COUNT)) references${NC}"

if [ "$FINAL_COUNT" -eq 0 ]; then
    success "🎉 All vcarpool references successfully replaced with carpool!"
    success "Project is now fully rebranded to 'Carpool'"
else
    warning "⚠️ $FINAL_COUNT references still remain. These might be in:"
    echo "   - Binary files"
    echo "   - Protected/readonly files"
    echo "   - Files with complex patterns"
    echo ""
    echo "Remaining references:"
    grep -r "vcarpool" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=out --exclude="*.log" --exclude="comprehensive-replacement.sh" . 2>/dev/null | head -10
fi

log "✅ Comprehensive replacement completed!"
