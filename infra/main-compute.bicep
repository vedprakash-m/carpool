@description('Location for all resources')
param location string = resourceGroup().location

@description('App name that will be used as prefix for all resources')
param appName string = 'vcarpool'

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string = 'dev'

@description('Azure Function App name')
param functionAppName string = '${appName}-api-${environmentName}'

@description('Azure Static Web App name')
param staticWebAppName string = '${appName}-web-${environmentName}'

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

// Reference to existing storage account in database resource group
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' existing = {
  name: storageAccountName
  scope: resourceGroup(databaseResourceGroup)
}

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

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2021-10-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    enabledForDeployment: false
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: false
    tenantId: tenant().tenantId
    accessPolicies: [
      {
        tenantId: tenant().tenantId
        objectId: functionApp.identity.principalId
        permissions: {
          secrets: ['get', 'list']
        }
      }
    ]
    sku: {
      name: 'standard'
      family: 'A'
    }
  }
}

// Reference to existing Cosmos DB in the database resource group
resource existingCosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2021-10-15' existing = {
  name: cosmosDbAccountName
  scope: resourceGroup(databaseResourceGroup)
}

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
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
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
          value: '~18'
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
          value: existingCosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: existingCosmosAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_KEY'
          value: existingCosmosAccount.listKeys().primaryMasterKey
        }
        {
          name: 'ENVIRONMENT'
          value: environmentName
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
    repositoryUrl: 'https://github.com/vedprakash-m/vcarpool'
    branch: 'main'
    buildProperties: {
      appLocation: '/frontend'
      apiLocation: ''
      outputLocation: 'out'
    }
  }
}

// Store Cosmos DB connection string in Key Vault
resource cosmosConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2021-10-01' = {
  name: 'cosmos-connection-string'
  parent: keyVault
  properties: {
    value: existingCosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
  }
}

resource cosmosEndpointSecret 'Microsoft.KeyVault/vaults/secrets@2021-10-01' = {
  name: 'cosmos-endpoint'
  parent: keyVault
  properties: {
    value: existingCosmosAccount.properties.documentEndpoint
  }
}

resource cosmosKeySecret 'Microsoft.KeyVault/vaults/secrets@2021-10-01' = {
  name: 'cosmos-key'
  parent: keyVault
  properties: {
    value: existingCosmosAccount.listKeys().primaryMasterKey
  }
}

// Outputs
output functionAppName string = functionApp.name
output functionAppDefaultHostName string = functionApp.properties.defaultHostName
output staticWebAppName string = staticWebApp.name
output staticWebAppDefaultHostName string = staticWebApp.properties.defaultHostname
output storageAccountName string = storageAccount.name
output appInsightsName string = appInsights.name
output keyVaultName string = keyVault.name
output cosmosDbAccountName string = existingCosmosAccount.name
output cosmosDbEndpoint string = existingCosmosAccount.properties.documentEndpoint
