#!/bin/bash

# Validate .env files to ensure they don't contain real secrets
# This script checks that environment files only have placeholder/example values

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Validating environment files..."

FOUND_ISSUES=0

# Safe placeholder patterns that should be used instead of real secrets
SAFE_PATTERNS=(
    "your-"
    "example"
    "placeholder"
    "change-me"
    "replace-with"
    "add-your"
    "insert-your"
    "localhost"
    "127.0.0.1"
    "test-"
    "demo-"
    "sample-"
    "development-only"
    "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="  # Cosmos DB emulator key
)

# Dangerous patterns that should never be in committed files
DANGEROUS_PATTERNS=(
    # Real Azure/AWS patterns
    "DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88}"
    "AKIA[0-9A-Z]{16}"
    "aws_secret_access_key.*[^example][^test][^demo]"
    
    # Real database connection strings
    "mongodb://[^localhost][^127.0.0.1]"
    "postgres://[^localhost][^127.0.0.1]"
    "mysql://[^localhost][^127.0.0.1]"
    
    # Real email credentials
    "smtp.*password.*[^your][^example][^test].{8,}"
    "email.*password.*[^your][^example][^test].{8,}"
    
    # Real API keys (long alphanumeric strings)
    "api.*key.*[A-Za-z0-9]{32,}"
    "secret.*key.*[A-Za-z0-9]{32,}"
    
    # JWT tokens that look real
    "eyJ[A-Za-z0-9-_=]+\\.eyJ[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_.+/=]{20,}"
)

# Files to check (passed as arguments)
if [ $# -eq 0 ]; then
    echo "❌ No files provided to validate"
    exit 1
fi

FILES="$@"

for file in $FILES; do
    if [ ! -f "$file" ]; then
        echo "⚠️  File $file does not exist, skipping..."
        continue
    fi
    
    echo "Validating $file..."
    
    # Check if it's actually an environment file
    if [[ ! "$file" =~ \.(env|environment)($|\.) ]]; then
        echo "⚠️  $file doesn't appear to be an environment file, skipping..."
        continue
    fi
    
    # Read file content
    file_content=$(cat "$file")
    
    # Check for dangerous patterns
    for pattern in "${DANGEROUS_PATTERNS[@]}"; do
        if echo "$file_content" | grep -Pq "$pattern"; then
            echo -e "${RED}❌ Found potentially real secret in $file matching pattern: $pattern${NC}"
            FOUND_ISSUES=1
        fi
    done
    
    # Check each line for secrets that don't match safe patterns
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
        # Check if line contains a value assignment
        if [[ "$line" =~ ^[^=]+=[^[:space:]]+ ]]; then
            var_name=$(echo "$line" | cut -d'=' -f1)
            var_value=$(echo "$line" | cut -d'=' -f2-)
            
            # Remove quotes
            var_value=$(echo "$var_value" | sed 's/^["'\'']//' | sed 's/["'\'']$//')
            
            # Skip if value is empty or very short
            if [[ ${#var_value} -lt 8 ]]; then
                continue
            fi
            
            # Check if it's a potentially sensitive variable
            if [[ "$var_name" =~ (SECRET|KEY|PASSWORD|TOKEN|CREDENTIAL|CONNECTION) ]]; then
                
                # Check if it matches any safe pattern
                is_safe=false
                for safe_pattern in "${SAFE_PATTERNS[@]}"; do
                    if [[ "$var_value" =~ $safe_pattern ]]; then
                        is_safe=true
                        break
                    fi
                done
                
                if [ "$is_safe" = false ]; then
                    # Additional checks for obviously safe values
                    if [[ "$var_value" =~ ^(true|false|[0-9]+|http://localhost|https://localhost)$ ]]; then
                        is_safe=true
                    fi
                    
                    # Check for development/test indicators
                    if [[ "$var_value" =~ (development|dev|test|staging|local) ]]; then
                        is_safe=true
                    fi
                fi
                
                if [ "$is_safe" = false ]; then
                    echo -e "${RED}❌ Potentially real secret found in $file:${NC}"
                    echo "   Variable: $var_name"
                    echo "   Value: ${var_value:0:20}... (truncated)"
                    echo "   Consider using a placeholder like 'your-${var_name,,}-here'"
                    FOUND_ISSUES=1
                fi
            fi
        fi
    done < "$file"
    
    # Special validation for specific files
    if [[ "$file" =~ \.env\.local$ ]] || [[ "$file" =~ \.env\.development$ ]]; then
        echo "ℹ️  Development environment file - allowing more flexible values"
    elif [[ "$file" =~ \.env\.example$ ]] || [[ "$file" =~ \.env\.template$ ]]; then
        echo "✅ Template file - ensuring all values are placeholders"
        
        # All values in template files should be placeholders
        while IFS= read -r line; do
            if [[ "$line" =~ ^[^=]+=[^[:space:]]+ ]] && [[ ! "$line" =~ ^[[:space:]]*# ]]; then
                var_value=$(echo "$line" | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
                
                if [[ ${#var_value} -gt 8 ]]; then
                    is_placeholder=false
                    for safe_pattern in "${SAFE_PATTERNS[@]}"; do
                        if [[ "$var_value" =~ $safe_pattern ]]; then
                            is_placeholder=true
                            break
                        fi
                    done
                    
                    if [ "$is_placeholder" = false ]; then
                        echo -e "${YELLOW}⚠️  Template file $file may contain non-placeholder value:${NC}"
                        echo "   $line"
                        echo "   Consider changing to: $(echo "$line" | cut -d'=' -f1)=your-$(echo "$line" | cut -d'=' -f1 | tr '[:upper:]' '[:lower:]')-here"
                    fi
                fi
            fi
        done < "$file"
    fi
done

# Summary
if [ $FOUND_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All environment files validated successfully!${NC}"
    echo "All secrets appear to be safe placeholders or development values."
    exit 0
else
    echo -e "${RED}❌ Environment file validation failed!${NC}"
    echo ""
    echo "Found potentially real secrets in environment files."
    echo ""
    echo "To fix this:"
    echo "1. Replace real secrets with placeholders like 'your-secret-here'"
    echo "2. Move real secrets to:"
    echo "   - Local environment files (gitignored)"
    echo "   - Azure Key Vault"
    echo "   - GitHub Secrets"
    echo "   - Environment variables at runtime"
    echo "3. Use safe development values for local development"
    echo ""
    exit 1
fi 