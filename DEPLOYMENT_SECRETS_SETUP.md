# GitHub Secrets Setup for Azure Deployment

## Issue Resolution
The deployment failed because required Azure secrets are not configured in the GitHub repository.

**Error**: `❌ Required secret AZURE_CLIENT_ID is not set`

## Required GitHub Secrets

Navigate to your GitHub repository: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Core Azure Secrets (Required)
Add these secrets with the exact names:

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `AZURE_CLIENT_ID` | Azure App Registration Client ID | From Azure App Registration |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | From Azure Portal |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | From Azure Portal |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web Apps deployment token | From Azure Static Web Apps resource |

## Quick Setup Instructions

### Step 1: Get Azure Values

1. **Get Subscription ID**:
   ```bash
   az account show --query id -o tsv
   ```

2. **Get Tenant ID**:
   ```bash
   az account show --query tenantId -o tsv
   ```

3. **Create App Registration** (if not exists):
   ```bash
   # Create app registration
   az ad app create --display-name "vcarpool-deployment" --query appId -o tsv
   ```

4. **Get Client ID**:
   ```bash
   # This will be the App ID from the previous command
   echo "Use the App ID from the app registration"
   ```

### Step 2: Configure OIDC Federation

```bash
# Replace YOUR_GITHUB_USERNAME with your actual GitHub username
APP_ID="[Your App Registration ID]"

# For main branch deployments
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "vcarpool-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_GITHUB_USERNAME/vcarpool:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### Step 3: Get Static Web Apps Token

```bash
# Deploy infrastructure first, then get token
az staticwebapp secrets list \
  --name vcarpool-web-prod \
  --resource-group vcarpool-rg \
  --query properties.apiKey -o tsv
```

### Step 4: Add Secrets to GitHub

Go to: `https://github.com/YOUR_USERNAME/vcarpool/settings/secrets/actions`

Add each secret with the exact name and corresponding value.

## Verification

After adding the secrets, you can verify by running the deployment workflow manually:

1. Go to **Actions** tab in GitHub
2. Select "Deploy with Validation" workflow
3. Click "Run workflow"
4. Monitor the validation step - it should now pass

## Troubleshooting

### Common Issues:

1. **Wrong secret names**: Ensure exact case-sensitive names
2. **Missing OIDC federation**: App registration needs federated credentials
3. **Insufficient permissions**: App registration needs contributor role
4. **Static Web Apps token**: Infrastructure must be deployed first

### Assign Required Permissions:

```bash
# Assign Contributor role to the app registration
az role assignment create \
  --assignee [CLIENT_ID] \
  --role "Contributor" \
  --scope "/subscriptions/[SUBSCRIPTION_ID]"
```

For detailed setup, refer to: `/docs/CI_CD_QUICK_SETUP.md`
