#!/bin/bash

# Custom secret detection script for vCarpool project
# This script checks for common patterns that might indicate leaked secrets

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Checking for potential secrets and personal information..."

FOUND_ISSUES=0

# Define patterns to check for (using arrays compatible with older bash)
check_pattern() {
    local file="$1"
    local pattern_name="$2" 
    local pattern="$3"
    local allow_examples="$4"
    
    matches=$(grep -Pin "$pattern" "$file" 2>/dev/null || true)
    
    if [ ! -z "$matches" ]; then
        # Filter out obvious false positives
        if [[ "$pattern_name" == "email_address" && "$allow_examples" == "true" ]]; then
            if echo "$matches" | grep -q -E "(example\.com|test\.com|localhost|noreply|no-reply|@domain\.com|your-email|user@|admin@)"; then
                return 0
            fi
        fi
        
        if [[ "$pattern_name" == "phone_number" && "$allow_examples" == "true" ]]; then
            if echo "$matches" | grep -q -E "(\+?1?[-\s]?555|123-456|000-000|111-111|\+1234567890)"; then
                return 0
            fi
        fi
        
        # Check if it's in an allowed context (comments, examples, etc.)
        if echo "$matches" | grep -q -E "(example|sample|test|demo|TODO|FIXME|\/\/|\/\*|\#|<!--)"; then
            echo -e "${YELLOW}⚠️  Found potential $pattern_name in $file (likely safe):${NC}"
            echo "$matches"
            echo ""
        else
            echo -e "${RED}❌ Found potential $pattern_name in $file:${NC}"
            echo "$matches"
            echo ""
            FOUND_ISSUES=1
        fi
    fi
}

# Files to check (passed as arguments or all staged files)
if [ $# -eq 0 ]; then
    FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.(js|ts|tsx|json|yaml|yml|env|md)$' || true)
else
    FILES="$@"
fi

if [ -z "$FILES" ]; then
    echo "✅ No relevant files to check"
    exit 0
fi

# Check each file
for file in $FILES; do
    if [ ! -f "$file" ]; then
        continue
    fi
    
    echo "Checking $file..."
    
    # Skip if file is too large (likely binary or generated)
    if [ $(wc -c < "$file") -gt 1048576 ]; then # 1MB
        echo "⚠️  Skipping $file (too large)"
        continue
    fi
    
    # Check for various secret patterns
    check_pattern "$file" "api_key" "(api[_-]?key|apikey)[[:space:]]*[:=][[:space:]]*['\"][^'\"]{20,}['\"]" "false"
    check_pattern "$file" "access_token" "(access[_-]?token)[[:space:]]*[:=][[:space:]]*['\"][^'\"]{20,}['\"]" "false"
    check_pattern "$file" "secret_key" "(secret[_-]?key)[[:space:]]*[:=][[:space:]]*['\"][^'\"]{20,}['\"]" "false"
    check_pattern "$file" "private_key" "-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----" "false"
    
    # Database credentials
    check_pattern "$file" "database_url" "(database[_-]?url|db[_-]?url)[[:space:]]*[:=][[:space:]]*['\"][^'\"]*://[^'\"]*['\"]" "false"
    check_pattern "$file" "connection_string" "(connection[_-]?string)[[:space:]]*[:=][[:space:]]*['\"][^'\"]{30,}['\"]" "false"
    
    # Cloud provider keys
    check_pattern "$file" "aws_access_key" "AKIA[0-9A-Z]{16}" "false"
    check_pattern "$file" "azure_key" "DefaultEndpointsProtocol=https" "false"
    check_pattern "$file" "google_api_key" "AIza[0-9A-Za-z\\-_]{35}" "false"
    
    # JWT and session tokens
    check_pattern "$file" "jwt_token" "eyJ[A-Za-z0-9-_=]+\\.eyJ[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_.+/=]*" "false"
    
    # Personal information
    check_pattern "$file" "email_address" "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" "true"
    check_pattern "$file" "phone_number" "\\+?[0-9]{1,4}[[:space:]-]?\\(?[0-9]{3,4}\\)?[[:space:]-]?[0-9]{3,4}[[:space:]-]?[0-9]{3,4}" "true"
    check_pattern "$file" "credit_card" "[0-9]{4}[[:space:]-]?[0-9]{4}[[:space:]-]?[0-9]{4}[[:space:]-]?[0-9]{4}" "false"
    
    # Development secrets
    check_pattern "$file" "hardcoded_password" "password[[:space:]]*[:=][[:space:]]*['\"][^'\"]{8,}['\"]" "false"
done

# Check for specific vCarpool patterns
echo "🎯 Checking vCarpool-specific patterns..."

for file in $FILES; do
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Check for non-emulator Cosmos DB keys
    if grep -q "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==" "$file" 2>/dev/null; then
        if [[ "$file" != *".env"* ]] && [[ "$file" != *"example"* ]] && [[ "$file" != *"local"* ]]; then
            echo -e "${RED}❌ Found Cosmos DB emulator key in $file (should only be in local env files)${NC}"
            FOUND_ISSUES=1
        fi
    fi
    
    # Check for production-like JWT secrets
    if grep -qi "jwt.*secret.*=" "$file" 2>/dev/null; then
        secret_line=$(grep -i "jwt.*secret.*=" "$file" | head -1)
        # Skip if it's clearly a placeholder, in documentation, or dynamically generated
        if echo "$secret_line" | grep -qv -E "(your-|example|placeholder|test|demo|<.*>|\[.*\]|README|docs|template|\$\(openssl|\$\(uuidgen|\$\(head|random|rand)"; then
            secret_value=$(echo "$secret_line" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
            # Also check if the file itself is documentation or contains generation commands
            if [[ "$file" != *"README"* ]] && [[ "$file" != *"docs/"* ]] && [[ "$file" != *".md" ]] && [[ ${#secret_value} -gt 20 ]] && ! echo "$secret_line" | grep -q "\$("; then
                echo -e "${RED}❌ Found potentially real JWT secret in $file${NC}"
                FOUND_ISSUES=1
            fi
        fi
    fi
done

# Summary
if [ $FOUND_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ No secrets or sensitive information detected!${NC}"
    exit 0
else
    echo -e "${RED}❌ Potential secrets or sensitive information found!${NC}"
    echo ""
    echo "If these are false positives:"
    echo "1. Move real secrets to environment variables"
    echo "2. Use placeholder values like 'your-api-key-here'"
    echo "3. Add comments to indicate they're examples"
    echo "4. Update .gitignore if needed"
    echo ""
    echo "If these are real secrets:"
    echo "1. Remove them immediately"
    echo "2. Use environment variables instead"
    echo "3. Regenerate the compromised secrets"
    echo "4. Update your applications with new secrets"
    exit 1
fi 