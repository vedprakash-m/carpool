# Tesla STEM Carpool - Infrastructure Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Tesla STEM Carpool infrastructure using Azure Bicep templates and automated scripts.

## Prerequisites

### Required Tools

- **Azure CLI** (version 2.40.0 or later)
- **Azure Subscription** with appropriate permissions
- **Bash shell** (Linux, macOS, or WSL on Windows)

### Required Permissions

- **Contributor** role on the target Azure subscription
- Ability to create resource groups
- Ability to create and manage Azure resources (Cosmos DB, Function Apps, Storage Accounts, etc.)

### Azure Login

```bash
# Login to Azure
az login

# Verify your subscription
az account show

# Set the correct subscription if needed
az account set --subscription "Your Subscription Name"
```

## Deployment Scripts

### 1. Infrastructure Deployment

Deploy the complete infrastructure for a specific environment:

```bash
# Deploy development environment
./scripts/deploy-infrastructure.sh dev

# Deploy test environment
./scripts/deploy-infrastructure.sh test

# Deploy production environment
./scripts/deploy-infrastructure.sh prod
```

### 2. Infrastructure Validation

Validate deployed infrastructure and perform health checks:

```bash
# Validate development environment
./scripts/validate-infrastructure.sh dev

# Validate test environment
./scripts/validate-infrastructure.sh test

# Validate production environment
./scripts/validate-infrastructure.sh prod
```

### 3. Infrastructure Cleanup

Remove infrastructure resources (use with caution):

```bash
# Cleanup development environment
./scripts/cleanup-infrastructure.sh dev

# Cleanup test environment
./scripts/cleanup-infrastructure.sh test

# Cleanup production environment (requires additional confirmation)
./scripts/cleanup-infrastructure.sh prod
```

## Deployment Architecture

### Resource Groups

- **carpool-db-rg**: Persistent data resources (Cosmos DB, Storage Account)
- **carpool-rg**: Compute resources (Function Apps, Application Insights)

### Azure Resources

#### Database Tier (carpool-db-rg)

- **Cosmos DB Account**: `carpool-db-{environment}` (prod: `carpool-db`)
- **Storage Account**: `carpoolsa{environment}` (prod: `carpoolsaprod`)
- **Key Vault**: `carpool-kv-{environment}`

#### Compute Tier (carpool-rg)

- **Function App**: `carpool-backend` (Flex Consumption plan)
- **Application Insights**: `carpool-backend`
- **Static Web App**: `carpool-web-{environment}` (if applicable)

## Environment-Specific Configuration

### Development (dev)

- Cosmos DB: `carpool-db-dev`
- Storage: `carpoolsadev`
- Resource Groups: `carpool-db-rg`, `carpool-rg`

### Test (test)

- Cosmos DB: `carpool-db-test`
- Storage: `carpoolsatest`
- Resource Groups: `carpool-db-rg`, `carpool-rg`

### Production (prod)

- Cosmos DB: `carpool-db`
- Storage: `carpoolsaprod`
- Resource Groups: `carpool-db-rg`, `carpool-rg`

## Manual Deployment (Alternative)

If you prefer manual deployment using Azure CLI directly:

### Step 1: Create Resource Groups

```bash
az group create --name carpool-db-rg --location eastus
az group create --name carpool-rg --location eastus
```

### Step 2: Deploy Database Tier

```bash
az deployment group create \
  --resource-group carpool-db-rg \
  --template-file infra/database.bicep \
  --parameters @infra/parameters/dev.parameters.json
```

### Step 3: Deploy Compute Tier

```bash
az deployment group create \
  --resource-group carpool-rg \
  --template-file infra/main.bicep \
  --parameters @infra/parameters/dev.parameters.json
```

## Post-Deployment Configuration

### 1. Function App Settings

After deployment, configure the Function App with required environment variables:

```bash
# Get Cosmos DB connection string
COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
  --resource-group carpool-db-rg \
  --name carpool-db-dev \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv)

# Configure Function App
az functionapp config appsettings set \
  --resource-group carpool-rg \
  --name carpool-backend \
  --settings \
    "COSMOS_DB_CONNECTION_STRING=$COSMOS_CONNECTION_STRING" \
    "JWT_SECRET=your-jwt-secret" \
    "AZURE_TENANT_ID=your-tenant-id" \
    "AZURE_CLIENT_ID=your-client-id"
```

### 2. Deploy Application Code

```bash
# From the backend directory
cd backend
npm run build
npm run deploy:dev
```

### 3. Initialize Database

```bash
# Run database initialization
az functionapp function call \
  --resource-group carpool-rg \
  --name carpool-backend \
  --function-name database-init
```

## Monitoring and Health Checks

### Application Insights

- Dashboard: Available in Azure Portal under `carpool-backend` Application Insights
- Custom queries: Use KQL queries in `backend/src/services/monitoring-queries.ts`

### Health Endpoints

```bash
# Function App health check
curl https://carpool-backend.azurewebsites.net/api/hello

# Database connectivity check
curl https://carpool-backend.azurewebsites.net/api/health
```

### Log Streaming

```bash
# Stream Function App logs
az functionapp log tail --resource-group carpool-rg --name carpool-backend
```

## Troubleshooting

### Common Issues

1. **Deployment Timeout**

   - Check Azure Portal for deployment status
   - Retry deployment with same parameters (Bicep is idempotent)

2. **Function App Not Responding**

   - Verify application settings are configured
   - Check Application Insights for errors
   - Restart Function App if needed

3. **Database Connection Issues**

   - Verify Cosmos DB connection string in Function App settings
   - Check Cosmos DB firewall rules
   - Validate database and container creation

4. **Authentication Issues**
   - Verify JWT_SECRET is configured
   - Check AZURE_TENANT_ID and AZURE_CLIENT_ID settings
   - Validate Entra ID application registration

### Getting Help

1. **Azure Portal**: Monitor deployments and resource health
2. **Application Insights**: View detailed telemetry and errors
3. **Azure CLI**: Use `az deployment group show` to check deployment status
4. **Logs**: Stream Function App logs for real-time debugging

## Security Considerations

### Production Deployment

- Use Azure Key Vault for sensitive configuration
- Enable Azure AD authentication for Function App
- Configure custom domains with SSL certificates
- Implement network security groups and private endpoints

### Access Control

- Use least-privilege access principles
- Configure RBAC for resource groups
- Enable audit logging for compliance

## Backup and Recovery

### Automated Backups

- Cosmos DB: Point-in-time restore enabled
- Storage Account: Geo-redundant storage configured

### Manual Backup

```bash
# Export Cosmos DB data
az cosmosdb export \
  --resource-group carpool-db-rg \
  --name carpool-db-dev \
  --container-uri "https://backup-storage.blob.core.windows.net/backups"
```

## Cost Optimization

### Development Environment

- Use consumption-based pricing for Function Apps
- Configure auto-pause for Cosmos DB during off-hours
- Monitor usage with Azure Cost Management

### Production Environment

- Consider reserved instances for predictable workloads
- Implement scaling policies based on usage patterns
- Regular cost analysis and optimization reviews

## Next Steps

1. **Continuous Deployment**: Set up GitHub Actions for automated deployments
2. **Infrastructure as Code**: Version control all Bicep templates
3. **Monitoring**: Configure comprehensive alerting and dashboards
4. **Security**: Implement advanced security features for production
