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

@description('Azure Function App name')
param functionAppName string = '${appName}-func'

@description('Azure Static Web App name')
param staticWebAppName string = '${appName}-web'

@description('Azure Application Insights name')
param appInsightsName string = '${appName}-insights-${environmentName}'

@description('Azure Key Vault name')
param keyVaultName string = '${appName}-kv-${environmentName}'

// Database resource group and resource details (from database deployment)
@description('Database resource group name')
param databaseResourceGroup string = '${appName}-db-rg'

@description('Cosmos DB account name from database resource group')
param cosmosDbAccountName string = '${appName}-cosmos-${environmentName}'

@description('Storage Account name from database resource group')
param storageAccountName string = '${replace(appName, '-', '')}sa${environmentName}'

// Tags for all resources
var tags = {
  application: appName
  environment: environmentName
  createdBy: 'Bicep'
  resourceType: 'compute'
}

// Database resource references using direct resource IDs to avoid cross-RG issues
var storageResourceId = resourceId(databaseResourceGroup, 'Microsoft.Storage/storageAccounts', storageAccountName)
var cosmosResourceId = resourceId(databaseResourceGroup, 'Microsoft.DocumentDB/databaseAccounts', cosmosDbAccountName)
var keyVaultResourceId = resourceId(databaseResourceGroup, 'Microsoft.KeyVault/vaults', keyVaultName)

// Get storage account connection string once to avoid multiple API calls
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageResourceId, '2021-08-01').keys[0].value}'

// Application Service Plan
resource hostingPlan 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: 'EastUSPlan'
  location: location
  tags: tags
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
    size: 'Y1'
    family: 'Y'
    capacity: 0
  }
  properties: {}
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
  }
}

// Reference existing Key Vault moved to the database resource group
resource keyVault 'Microsoft.KeyVault/vaults@2021-10-01' existing = {
  name: keyVaultName
  scope: resourceGroup(databaseResourceGroup)
}

// Get Cosmos DB connection details once to avoid multiple API calls
var cosmosConnectionString = listConnectionStrings(cosmosResourceId, '2021-10-15').connectionStrings[0].connectionString
var cosmosPrimaryKey = listKeys(cosmosResourceId, '2021-10-15').primaryMasterKey
var cosmosEndpoint = reference(cosmosResourceId, '2021-10-15').documentEndpoint

// Azure Function App
resource functionApp 'Microsoft.Web/sites@2021-03-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: storageConnectionString
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: storageConnectionString
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'COSMOS_DB_CONNECTION_STRING'
          value: cosmosConnectionString
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosEndpoint
        }
        {
          name: 'COSMOS_DB_KEY'
          value: cosmosPrimaryKey
        }
        {
          name: 'ENVIRONMENT'
          value: environmentName
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      http20Enabled: true
      cors: {
        allowedOrigins: [
          'https://portal.azure.com'
          'https://${staticWebApp.properties.defaultHostname}'
        ]
        supportCredentials: false
      }
    }
    httpsOnly: true
  }
}

// Azure Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2021-03-01' = {
  name: staticWebAppName
  location: 'East US 2' // Static Web Apps are limited to certain regions
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: 'https://github.com/vedprakash-m/carpool'
    branch: 'main'
    buildProperties: {
      appLocation: '/frontend'
      apiLocation: ''
      outputLocation: 'out'
    }
  }
}

// Outputs
output functionAppName string = functionApp.name
output functionAppDefaultHostName string = functionApp.properties.defaultHostName
output staticWebAppName string = staticWebApp.name
output staticWebAppDefaultHostName string = staticWebApp.properties.defaultHostname
output storageAccountName string = storageAccountName
output appInsightsName string = appInsights.name
output keyVaultName string = keyVault.name
output cosmosDbAccountName string = cosmosDbAccountName
output cosmosDbEndpoint string = cosmosEndpoint
