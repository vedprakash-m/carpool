# VCarpool CI/CD Quick Setup Guide

## 🚀 Quick Start

This guide will help you set up the VCarpool CI/CD pipeline in under 30 minutes.

## Prerequisites

- Azure subscription with Owner or Contributor access
- GitHub repository with admin access
- Azure CLI installed (`az --version`)
- Node.js 20+ installed (`node --version`)

## Step 1: Azure Infrastructure Setup (10 minutes)

### 1.1 Create Resource Groups

```bash
# Create database resource group
az group create \
  --name vcarpool-db-rg \
  --location eastus \
  --tags environment=prod application=vcarpool resourceType=database

# Create compute resource group
az group create \
  --name vcarpool-rg \
  --location eastus \
  --tags environment=prod application=vcarpool resourceType=compute
```

### 1.2 Create Azure App Registration for GitHub Actions

```bash
# Create app registration
APP_ID=$(az ad app create \
  --display-name "vcarpool-github-actions" \
  --query appId -o tsv)

echo "App ID: $APP_ID"

# Create service principal
PRINCIPAL_ID=$(az ad sp create --id $APP_ID --query id -o tsv)
echo "Principal ID: $PRINCIPAL_ID"

# Get tenant and subscription IDs
TENANT_ID=$(az account show --query tenantId -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

echo "Tenant ID: $TENANT_ID"
echo "Subscription ID: $SUBSCRIPTION_ID"
```

### 1.3 Assign Azure Permissions

```bash
# Assign Contributor role to both resource groups
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/vcarpool-rg

az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/vcarpool-db-rg

echo "✅ Azure permissions configured"
```

### 1.4 Configure OIDC Federation

```bash
# For main branch deployments
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "vcarpool-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_GITHUB_USERNAME/vcarpool:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# For pull request validation
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "vcarpool-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_GITHUB_USERNAME/vcarpool:pull_request",
    "audiences": ["api://AzureADTokenExchange"]
  }'

echo "✅ OIDC federation configured"
```

## Step 2: GitHub Secrets Configuration (5 minutes)

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these **Repository secrets**:

```
AZURE_CLIENT_ID      = [App ID from step 1.2]
AZURE_TENANT_ID      = [Tenant ID from step 1.2]
AZURE_SUBSCRIPTION_ID = [Subscription ID from step 1.2]
```

## Step 3: Deploy Infrastructure (10 minutes)

### 3.1 Deploy Database Resources

```bash
# Deploy persistent resources first
az deployment group create \
  --resource-group vcarpool-db-rg \
  --template-file infra/database.bicep \
  --parameters @infra/database.parameters.json \
  --parameters environmentName=prod \
  --mode Incremental
```

### 3.2 Deploy Compute Resources

```bash
# Deploy compute resources
az deployment group create \
  --resource-group vcarpool-rg \
  --template-file infra/main-compute.bicep \
  --parameters @infra/main-compute.parameters.json \
  --parameters databaseResourceGroup=vcarpool-db-rg \
  --parameters environmentName=prod \
  --mode Incremental
```

### 3.3 Get Static Web Apps Deployment Token

```bash
# Get the deployment token for Static Web Apps
SWA_TOKEN=$(az staticwebapp secrets list \
  --name vcarpool-web-prod \
  --resource-group vcarpool-rg \
  --query properties.apiKey -o tsv)

echo "Static Web Apps Token: $SWA_TOKEN"
```

Add this as a GitHub secret:

```
AZURE_STATIC_WEB_APPS_API_TOKEN = [SWA Token from above]
```

## Step 4: Test the Pipeline (5 minutes)

### 4.1 Trigger CI Pipeline

```bash
# Make a small change and push
echo "# CI/CD Pipeline Ready" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

### 4.2 Monitor Pipeline

- Go to GitHub → Actions tab
- Watch the "Robust CI Pipeline" workflow
- Verify all jobs pass with green checkmarks

### 4.3 Trigger Deployment

```bash
# Push triggers deployment automatically
# Or manually trigger from GitHub Actions → Deploy workflow → Run workflow
```

### 4.4 Verify Deployment

Check these URLs (replace with your actual URLs):

- **Frontend**: https://vcarpool-web-prod.azurestaticapps.net
- **Backend Health**: https://vcarpool-api-prod.azurewebsites.net/api/health

## Step 5: Team Onboarding

### 5.1 Share Access

- Add team members to GitHub repository
- Grant Azure resource group access if needed
- Share this guide with the team

### 5.2 Local Development Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/vcarpool.git
cd vcarpool

# Install dependencies
npm ci

# Start development servers
npm run dev
```

### 5.3 Workflow Commands

```bash
# Run all tests locally
npm run test:ci

# Build all packages
npm run build

# Lint and fix code
npm run lint:fix

# Run E2E tests (optional)
cd frontend && npm run test:e2e
```

## 🛠 Troubleshooting Common Issues

### Issue: Azure Authentication Failed

**Solution**: Verify GitHub secrets match Azure app registration values

```bash
# Check your current Azure context
az account show
az ad app show --id $APP_ID
```

### Issue: Resource Group Creation Failed

**Solution**: Check Azure subscription permissions and quotas

```bash
# Verify subscription access
az account list --output table
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.DocumentDB
```

### Issue: Static Web Apps Deployment Failed

**Solution**: Regenerate deployment token

```bash
# Get a fresh token
az staticwebapp secrets list --name vcarpool-web-prod --resource-group vcarpool-rg
```

### Issue: Function App Deployment Timeout

**Solution**: Check Function App logs and restart

```bash
# Restart Function App
az functionapp restart --name vcarpool-api-prod --resource-group vcarpool-rg

# Check logs
az functionapp log tail --name vcarpool-api-prod --resource-group vcarpool-rg
```

## 📊 Monitoring & Maintenance

### Daily Checks

- Monitor GitHub Actions for failures
- Check Azure costs in Cost Management
- Review Application Insights for errors

### Weekly Tasks

- Update dependencies (Dependabot PRs)
- Review security alerts
- Check performance metrics

### Monthly Tasks

- Review and optimize costs
- Update documentation
- Team retrospective on CI/CD process

## 🎯 Success Criteria

After setup, you should have:

- ✅ CI pipeline running on every PR and push
- ✅ Automatic deployment to Azure on main branch
- ✅ Health checks validating deployments
- ✅ Frontend accessible at Static Web Apps URL
- ✅ Backend API responding at Functions URL
- ✅ Comprehensive logging and monitoring

## 📚 Next Steps

1. **Configure Monitoring**: Set up alerts in Application Insights
2. **Add Environments**: Create staging environment if needed
3. **Enhance Security**: Add dependency scanning and SAST tools
4. **Optimize Performance**: Monitor and optimize build times
5. **Team Training**: Ensure all developers understand the workflow

## 🆘 Support

- **Documentation**: [CI_CD_PIPELINE_GUIDE.md](./CI_CD_PIPELINE_GUIDE.md)
- **Issues**: Create GitHub issues for problems
- **Emergency**: Check rollback procedures in main guide

---

**Setup Time**: ~30 minutes  
**Difficulty**: Intermediate  
**Prerequisites**: Azure CLI, GitHub access  
**Last Updated**: December 2024
