#!/bin/bash
# Automated CORS Duplication Scanner for VCarpool Backend
# Identifies functions still using duplicate CORS patterns

echo "🔍 Scanning VCarpool backend for CORS duplication patterns..."
echo "================================================="

BACKEND_DIR="/Users/vedprakashmishra/vcarpool/backend"
DUPLICATE_COUNT=0
FUNCTIONS_WITH_CORS=()

# Function to check for CORS patterns in a file
check_cors_patterns() {
    local file="$1"
    local basename=$(basename "$file")
    local dirname=$(dirname "$file")
    local function_name=$(basename "$dirname")
    
    # Check for old CORS header patterns
    if grep -q "Access-Control-Allow-Origin.*\*" "$file" 2>/dev/null; then
        echo "❌ CORS duplication found: $function_name ($basename)"
        FUNCTIONS_WITH_CORS+=("$function_name")
        ((DUPLICATE_COUNT++))
        
        # Show specific patterns found
        if grep -q "const corsHeaders" "$file"; then
            echo "   🔴 Uses 'const corsHeaders' pattern"
        fi
        if grep -q "OPTIONS.*corsHeaders" "$file"; then
            echo "   🔴 Has manual OPTIONS handling"
        fi
        if grep -q "headers: corsHeaders" "$file"; then
            echo "   🔴 Manual CORS header assignment"
        fi
        echo ""
    elif grep -q "UnifiedResponseHandler" "$file" 2>/dev/null; then
        echo "✅ CORS unified: $function_name ($basename)"
    fi
}

# Scan all function directories
find "$BACKEND_DIR" -name "index.js" -type f | while read -r file; do
    # Skip src/ directory and test files
    if [[ "$file" == *"/src/"* ]] || [[ "$file" == *"/test"* ]] || [[ "$file" == *"node_modules"* ]]; then
        continue
    fi
    
    check_cors_patterns "$file"
done

echo "================================================="
echo "📊 CORS Duplication Summary:"
echo "   Functions with duplicate CORS: $DUPLICATE_COUNT"
echo "   Estimated duplicate lines: $((DUPLICATE_COUNT * 8))"

if [ ${#FUNCTIONS_WITH_CORS[@]} -gt 0 ]; then
    echo ""
    echo "🎯 Priority functions to update:"
    printf '   - %s\n' "${FUNCTIONS_WITH_CORS[@]}" | head -10
    
    if [ ${#FUNCTIONS_WITH_CORS[@]} -gt 10 ]; then
        echo "   ... and $((${#FUNCTIONS_WITH_CORS[@]} - 10)) more"
    fi
fi

echo ""
echo "💡 Run this script after each update to track progress!"
