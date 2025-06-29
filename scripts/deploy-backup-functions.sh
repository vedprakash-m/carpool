#!/bin/bash

echo "🚑 Carpool Emergency Backend Deployment"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

cd backend

echo "📦 Building functions locally..."
npm run build

echo ""
echo "📋 Verifying required functions exist..."

REQUIRED_FUNCTIONS=("hello" "auth-login-legacy" "trips-stats" "users-me")
MISSING_FUNCTIONS=()

for func in "${REQUIRED_FUNCTIONS[@]}"; do
    if [ -d "$func" ] && [ -f "$func/index.js" ] && [ -f "$func/function.json" ]; then
        echo "   ✅ $func: Ready"
    else
        echo "   ❌ $func: Missing or incomplete"
        MISSING_FUNCTIONS+=("$func")
    fi
done

if [ ${#MISSING_FUNCTIONS[@]} -gt 0 ]; then
    echo ""
    echo "❌ Missing functions: ${MISSING_FUNCTIONS[*]}"
    echo "   Please run 'npm run build' in the backend directory first"
    exit 1
fi

echo ""
echo "📦 Creating deployment package..."

# Create a fresh deployment directory
rm -rf deployment-backup
mkdir deployment-backup

# Copy essential files
cp package.json deployment-backup/
cp host.json deployment-backup/
cp local.settings.json deployment-backup/ 2>/dev/null || echo "   (local.settings.json not found - OK for production)"

# Copy required functions
for func in "${REQUIRED_FUNCTIONS[@]}"; do
    cp -r "$func" deployment-backup/
    echo "   📁 Copied $func"
done

# Copy any additional files needed for Azure Functions
if [ -f "proxies.json" ]; then
    cp proxies.json deployment-backup/
fi

if [ -f "extensions.csproj" ]; then
    cp extensions.csproj deployment-backup/
fi

echo ""
echo "🗜️  Creating deployment zip..."
cd deployment-backup
zip -r ../deployment-backup.zip . -q
cd ..

echo "   📦 Created deployment-backup.zip ($(du -h deployment-backup.zip | cut -f1))"

echo ""
echo "🚀 Deploying to Azure Functions..."

# Deploy using Azure CLI
az functionapp deployment source config-zip \
    --resource-group "carpool-rg" \
    --name "carpool-api-prod" \
    --src "deployment-backup.zip" \
    --timeout 600

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "🔍 Verifying deployment..."
    sleep 30  # Wait for functions to initialize
    
    # Run verification script
    if [ -f "../scripts/verify-deployment.sh" ]; then
        bash ../scripts/verify-deployment.sh
    else
        echo "   Manual verification needed - check endpoints manually"
    fi
else
    echo ""
    echo "❌ Deployment failed!"
    echo "   Check Azure Portal for details"
    exit 1
fi

echo ""
echo "🧹 Cleaning up..."
rm -rf deployment-backup
rm deployment-backup.zip

echo "✅ Emergency deployment complete!" 