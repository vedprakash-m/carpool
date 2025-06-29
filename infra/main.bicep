@description('Location for all resources')
param location string = resourceGroup().location

@description('App name that will be used as prefix for all resources')
param appName string = 'carpool'

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string = 'dev'

@description('Azure Cosmos DB account name')
param cosmosDbAccountName string = '${appName}-cosmos-${environmentName}'

@description('Azure Function App name')
param functionAppName string = '${appName}-api-${environmentName}'

@description('Azure Static Web App name')
param staticWebAppName string = '${appName}-web-${environmentName}'

@description('Azure Application Insights name')
param appInsightsName string = '${appName}-insights-${environmentName}'

@description('Azure Storage Account name')
param storageAccountName string = '${replace(appName, '-', '')}sa${environmentName}'

@description('Database resource group name (for cross-RG references)')
param databaseResourceGroup string = '${appName}-db-rg'

// Tags for all resources
var tags = {
  application: appName
  environment: environmentName
  createdBy: 'Bicep'
}

// Reference to existing storage account in database resource group
// Note: This template now supports both single-RG and multi-RG deployments
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' existing = {
  name: storageAccountName
  scope: resourceGroup(databaseResourceGroup)
}

// Application Insights for monitoring
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logWorkspace.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Log Analytics workspace for Application Insights
resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2021-06-01' = {
  name: '${appName}-logs-${environmentName}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// App Service Plan for Function App
resource appServicePlan 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: '${appName}-plan-${environmentName}'
  location: location
  tags: tags
  sku: {
    name: 'B1' // Basic plan for development
    tier: 'Basic'
  }
  properties: {
    reserved: true // Required for Linux
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2021-03-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosAccountForConfig.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_KEY'
          value: cosmosAccountForConfig.listKeys().primaryMasterKey
        }
        {
          name: 'COSMOS_DB_DATABASE_ID'
          value: 'carpool'
        }
        {
          name: 'JWT_SECRET'
          value: 'prod-jwt-secret-${uniqueString(resourceGroup().id)}'
        }
        {
          name: 'JWT_REFRESH_SECRET'
          value: 'prod-refresh-secret-${uniqueString(resourceGroup().id)}'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
      cors: {
        allowedOrigins: [
          'https://${staticWebAppName}.azurestaticapps.net'
          'http://localhost:3000' // For local development
        ]
        supportCredentials: true
      }
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      nodeVersion: '~22'
    }
    httpsOnly: true
  }
}

// Reference to existing Cosmos DB for configuration (read-only)
resource cosmosAccountForConfig 'Microsoft.DocumentDB/databaseAccounts@2021-10-15' existing = {
  name: cosmosDbAccountName
  scope: resourceGroup(databaseResourceGroup)
}

// Deploy Cosmos DB containers using module to avoid cross-scope issues
module cosmosContainers 'modules/cosmos-containers.bicep' = {
  name: 'cosmosContainers'
  scope: resourceGroup(databaseResourceGroup)
  params: {
    cosmosDbAccountName: cosmosDbAccountName
    throughput: 400
  }
}

// Key Vault for secrets (without access policies initially)
resource keyVault 'Microsoft.KeyVault/vaults@2021-11-01-preview' = {
  name: '${appName}-kv-${environmentName}'
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: [] // Access policies will be added in second deployment
    enabledForTemplateDeployment: true
    enableRbacAuthorization: false
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: false // Allow for easier development
  }
}

// Output Key Vault name for second deployment phase
output keyVaultName string = keyVault.name

// Static Web App for the frontend
resource staticWebApp 'Microsoft.Web/staticSites@2021-03-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    provider: 'GitHub'
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// Output the endpoints for reference
output functionAppEndpoint string = 'https://${functionApp.properties.defaultHostName}/api'
output staticWebAppEndpoint string = 'https://${staticWebApp.properties.defaultHostname}'
output cosmosDbEndpoint string = cosmosAccountForConfig.properties.documentEndpoint

// Output resource names for CI/CD pipeline
output functionAppName string = functionApp.name
output staticWebAppName string = staticWebApp.name
