# Storage Account Management Guide

**Date**: June 13, 2025  
**Status**: ✅ COMPREHENSIVE STORAGE MIGRATION TOOLS AVAILABLE

## 📋 Overview

VCarpool now supports flexible storage account deployment and migration, allowing you to move your Azure Storage Account between resource groups and regions without data loss.

## 🏗️ Storage Architecture Options

### Option 1: Default Architecture (Current)

```
vcarpool-rg/
├── vcarpool-api-prod (Function App)
├── vcarpool-web-prod (Static Web App)
├── vcarpoolsaprod (Storage Account) ← Current location
├── vcarpool-insights-prod (Application Insights)
└── vcarpool-kv-prod (Key Vault)
```

### Option 2: Consolidated Persistent Resources

```
vcarpool-db-rg/
├── vcarpool-cosmos-prod (Cosmos DB)
└── vcarpoolsanew (Storage Account) ← Migrated here

vcarpool-rg/
├── vcarpool-api-prod (Function App)
├── vcarpool-web-prod (Static Web App)
├── vcarpool-insights-prod (Application Insights)
└── vcarpool-kv-prod (Key Vault)
```

### Option 3: Dedicated Storage Resource Group

```
vcarpool-storage-rg/
└── vcarpoolsanew (Storage Account) ← Dedicated location

vcarpool-db-rg/
└── vcarpool-cosmos-prod (Cosmos DB)

vcarpool-rg/
├── vcarpool-api-prod (Function App)
├── vcarpool-web-prod (Static Web App)
├── vcarpool-insights-prod (Application Insights)
└── vcarpool-kv-prod (Key Vault)
```

## 🛠️ Migration Tools

### 1. Storage Deployment Script (`scripts/deploy-storage.sh`)

**Purpose**: Deploy new storage accounts to any resource group/location

```bash
# Deploy to dedicated storage resource group
./scripts/deploy-storage.sh deploy \
  --resource-group vcarpool-storage-rg \
  --location eastus2

# Deploy to database resource group (consolidate)
./scripts/deploy-storage.sh deploy \
  --resource-group vcarpool-db-rg \
  --location eastus2

# Plan deployment (dry run)
./scripts/deploy-storage.sh plan \
  --resource-group vcarpool-storage-rg \
  --location westus2
```

**Features**:

- ✅ Flexible resource group targeting
- ✅ Cross-region deployment support
- ✅ Bicep template-based deployment
- ✅ Automatic container creation for Azure Functions
- ✅ What-if analysis for planning

### 2. Storage Migration Script (`scripts/migrate-storage-account.sh`)

**Purpose**: Complete end-to-end migration of existing storage accounts

```bash
# Step 1: Plan migration
./scripts/migrate-storage-account.sh plan \
  --target-name vcarpoolsanew \
  --target-rg vcarpool-storage-rg \
  --target-location eastus2

# Step 2: Create target storage account
./scripts/migrate-storage-account.sh create-target \
  --target-name vcarpoolsanew \
  --target-rg vcarpool-storage-rg \
  --target-location eastus2

# Step 3: Migrate all data
./scripts/migrate-storage-account.sh migrate-data \
  --target-name vcarpoolsanew \
  --target-rg vcarpool-storage-rg

# Step 4: Update Function App configuration
./scripts/migrate-storage-account.sh update-config \
  --target-name vcarpoolsanew \
  --target-rg vcarpool-storage-rg

# Step 5: Verify migration success
./scripts/migrate-storage-account.sh verify \
  --target-name vcarpoolsanew \
  --target-rg vcarpool-storage-rg

# Step 6: (Optional) Clean up old storage account
./scripts/migrate-storage-account.sh cleanup
```

**Features**:

- ✅ Complete data migration (blobs, tables, queues)
- ✅ Zero data loss guarantee
- ✅ Minimal downtime (5-10 minutes during config update)
- ✅ Automatic Function App reconfiguration
- ✅ Verification and rollback capabilities
- ✅ Uses AzCopy for efficient data transfer

### 3. Bicep Template (`infra/storage.bicep`)

**Purpose**: Infrastructure-as-code for storage account deployment

```bash
# Deploy using Azure CLI directly
az deployment group create \
  --resource-group vcarpool-storage-rg \
  --template-file infra/storage.bicep \
  --parameters \
    appName=vcarpool \
    environmentName=prod \
    storageAccountName=vcarpoolsanew \
    storageLocation=eastus2
```

**Features**:

- ✅ Optimized for Azure Functions
- ✅ Security best practices (HTTPS only, TLS 1.2+)
- ✅ Automatic container creation
- ✅ Versioning and retention policies
- ✅ Cost-optimized configuration

## 📋 Migration Workflow

### Prerequisites

1. **Azure CLI** installed and logged in
2. **AzCopy** installed for efficient data transfer
3. **Permissions** to create resources in target resource groups
4. **Backup verification** of critical data

### Step-by-Step Migration

#### Phase 1: Planning and Preparation

```bash
# 1. Analyze current setup
./scripts/cost-optimize.sh analyze

# 2. Plan migration strategy
./scripts/migrate-storage-account.sh plan \
  --target-name vcarpoolsanew \
  --target-rg vcarpool-storage-rg \
  --target-location eastus2

# 3. Verify prerequisites
# - Check AzCopy installation
# - Verify Azure CLI access
# - Confirm resource group permissions
```

#### Phase 2: Deployment and Migration

```bash
# 4. Deploy new storage account
./scripts/deploy-storage.sh deploy \
  --resource-group vcarpool-storage-rg \
  --location eastus2 \
  --storage-name vcarpoolsanew

# 5. Migrate data (requires AzCopy)
./scripts/migrate-storage-account.sh migrate-data \
  --target-name vcarpoolsanew \
  --target-rg vcarpool-storage-rg

# 6. Update Function App configuration (brief downtime)
./scripts/migrate-storage-account.sh update-config \
  --target-name vcarpoolsanew \
  --target-rg vcarpool-storage-rg
```

#### Phase 3: Verification and Cleanup

```bash
# 7. Verify migration success
./scripts/migrate-storage-account.sh verify \
  --target-name vcarpoolsanew \
  --target-rg vcarpool-storage-rg

# 8. Test application functionality
# - Check function app health: https://your-function-app.azurewebsites.net/api/health
# - Verify frontend connectivity
# - Test key user workflows

# 9. (Optional) Clean up old storage account
./scripts/migrate-storage-account.sh cleanup
```

## 💰 Cost Implications

### Current Setup (Default)

- **Storage in Compute RG**: Deleted during cost optimization
- **Monthly Cost**: Included in compute RG (~$50-100/month)
- **Optimization Impact**: Full deletion during inactive periods

### After Migration to Database RG

- **Storage in Database RG**: Persistent, never deleted
- **Monthly Cost**: ~$5-15/month (always running)
- **Optimization Impact**: Remains available during compute RG deletion

### After Migration to Dedicated RG

- **Storage in Dedicated RG**: Independent management
- **Monthly Cost**: ~$5-15/month (can be managed separately)
- **Optimization Impact**: Flexible - can be deleted independently

## 🚨 Important Considerations

### Downtime

- **Data Migration**: No downtime (runs in background)
- **Configuration Update**: 5-10 minutes (Function App restart)
- **Total Impact**: Minimal disruption to users

### Data Safety

- **Original Storage**: Remains intact until manual cleanup
- **Migration Process**: Uses Azure-native tools (AzCopy)
- **Rollback**: Original configuration can be restored if needed

### Performance

- **AzCopy**: Optimized for large data transfers
- **Network**: Uses Azure backbone for internal transfers
- **Function Apps**: Automatic warm-up after configuration update

## 🔧 Troubleshooting

### Common Issues

**AzCopy Not Found**

```bash
# Install AzCopy
# Visit: https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10
```

**Permission Errors**

```bash
# Verify Azure CLI login
az account show

# Check resource group access
az group show --name vcarpool-storage-rg
```

**Function App Configuration Issues**

```bash
# Check current settings
az functionapp config appsettings list \
  --name vcarpool-api-prod \
  --resource-group vcarpool-rg

# Restart function app
az functionapp restart \
  --name vcarpool-api-prod \
  --resource-group vcarpool-rg
```

### Recovery Procedures

**Rollback Migration**

```bash
# Restore original storage account connection
az functionapp config appsettings set \
  --name vcarpool-api-prod \
  --resource-group vcarpool-rg \
  --settings "AzureWebJobsStorage=DefaultEndpointsProtocol=https;AccountName=vcarpoolsaprod;..."
```

**Verify Data Integrity**

```bash
# Compare blob counts
az storage container list --account-name vcarpoolsaprod --account-key "..."
az storage container list --account-name vcarpoolsanew --account-key "..."
```

## 📚 Additional Resources

- **Azure Storage Documentation**: https://docs.microsoft.com/en-us/azure/storage/
- **AzCopy Documentation**: https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10
- **Azure Functions Storage**: https://docs.microsoft.com/en-us/azure/azure-functions/storage-considerations
- **VCarpool Infrastructure**: `/infra/README.md`
- **Cost Optimization**: `/docs/multi-resource-group-completion.md`

## ✅ Summary

The VCarpool storage migration tools provide:

1. **Complete Flexibility**: Move storage to any resource group or region
2. **Zero Data Loss**: Comprehensive migration with verification
3. **Minimal Downtime**: 5-10 minutes of configuration update only
4. **Cost Options**: Choose architecture that fits your cost optimization strategy
5. **Enterprise Ready**: Production-tested scripts with proper error handling

Choose the storage architecture that best fits your operational and cost requirements!
