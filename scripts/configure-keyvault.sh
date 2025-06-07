#!/bin/bash

# VCarpool Key Vault Configuration Script
# Configures access policies and secrets after initial deployment

set -e

# Configuration
RESOURCE_GROUP="vcarpool-rg"
APP_NAME="vcarpool"
ENVIRONMENT="prod"
KEY_VAULT_NAME="${APP_NAME}-kv-${ENVIRONMENT}"
FUNCTION_APP_NAME="${APP_NAME}-api-${ENVIRONMENT}"

echo "🔐 Configuring Azure Key Vault for VCarpool Production..."

# Get Function App managed identity
echo "📋 Getting Function App managed identity..."
PRINCIPAL_ID=$(az webapp identity show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query principalId \
  --output tsv)

if [ -z "$PRINCIPAL_ID" ]; then
  echo "❌ Error: Could not get Function App managed identity"
  echo "💡 Ensure the Function App has been deployed with system-assigned managed identity"
  exit 1
fi

echo "✅ Function App Principal ID: $PRINCIPAL_ID"

# Configure Key Vault access policy for Function App
echo "🔑 Setting Key Vault access policy for Function App..."
az keyvault set-policy \
  --name "$KEY_VAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list

# Get Cosmos DB key
echo "🗄️  Getting Cosmos DB key..."
COSMOS_DB_NAME="${APP_NAME}-cosmos-${ENVIRONMENT}"
COSMOS_DB_KEY=$(az cosmosdb keys list \
  --name "$COSMOS_DB_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query primaryMasterKey \
  --output tsv)

# Generate strong JWT secrets
echo "🔐 Generating JWT secrets..."
JWT_SECRET="prod-jwt-$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="prod-refresh-$(openssl rand -hex 32)"

# Store secrets in Key Vault
echo "💾 Storing secrets in Key Vault..."

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "cosmos-db-key" \
  --value "$COSMOS_DB_KEY" \
  --description "Cosmos DB primary key for VCarpool database"

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "jwt-secret" \
  --value "$JWT_SECRET" \
  --description "JWT signing secret for user authentication"

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "jwt-refresh-secret" \
  --value "$JWT_REFRESH_SECRET" \
  --description "JWT refresh token signing secret"

# Update Function App to use Key Vault references
echo "🔗 Updating Function App to use Key Vault references..."

az webapp config appsettings set \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
  "COSMOS_DB_KEY=@Microsoft.KeyVault(VaultName=${KEY_VAULT_NAME};SecretName=cosmos-db-key)" \
  "JWT_SECRET=@Microsoft.KeyVault(VaultName=${KEY_VAULT_NAME};SecretName=jwt-secret)" \
  "JWT_REFRESH_SECRET=@Microsoft.KeyVault(VaultName=${KEY_VAULT_NAME};SecretName=jwt-refresh-secret)"

# Verify Key Vault configuration
echo "✅ Verifying Key Vault configuration..."

echo "📊 Key Vault Secrets:"
az keyvault secret list \
  --vault-name "$KEY_VAULT_NAME" \
  --query "[].{Name:name,Enabled:attributes.enabled}" \
  --output table

echo "📊 Function App Settings (Key Vault references):"
az webapp config appsettings list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?contains(value, 'KeyVault')].{Name:name,Value:value}" \
  --output table

echo ""
echo "🎉 Key Vault configuration completed successfully!"
echo ""
echo "📋 Summary:"
echo "  ✅ Function App managed identity configured"
echo "  ✅ Key Vault access policy set"
echo "  ✅ Secrets stored in Key Vault:"
echo "     - cosmos-db-key"
echo "     - jwt-secret" 
echo "     - jwt-refresh-secret"
echo "  ✅ Function App configured to use Key Vault references"
echo ""
echo "🔒 Security Status: Production-ready with Azure Key Vault secret management"
echo ""
echo "💡 Next Steps:"
echo "  1. Verify Function App is working with Key Vault references"
echo "  2. Test authentication endpoints"
echo "  3. Monitor Application Insights for any Key Vault access issues"
echo ""
echo "🚨 Important: The old environment variables with secrets have been replaced."
echo "   If you need to rollback, run: az webapp config appsettings set --settings with original values" 