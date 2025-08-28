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

// Resource names - consistent with existing infrastructure
var functionAppName = 'carpool-backend'  // Existing Flex Consumption Function App
var staticWebAppName = '${appName}-web-${environmentName}'
var appInsightsName = 'carpool-backend'  // Application Insights name matches Function App
var keyVaultName = '${appName}-kv-${environmentName}-${substring(uniqueString(resourceGroup().id), 0, 6)}'
var cosmosDbAccountName = '${appName}-db-${environmentName}'
var storageAccountName = 'carpoolsaprod'  // Existing storage account name

// Tags for all resources
var tags = {
  application: appName
  environment: environmentName
  createdBy: 'Bicep'
}

// Storage Account for Azure Functions (Reference existing)
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-06-01' existing = {
  name: storageAccountName
}

// Cosmos DB Account (Reference existing)
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2021-06-15' existing = {
  name: cosmosDbAccountName
}

// Cosmos DB Database
resource cosmosDbDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2021-06-15' = {
  parent: cosmosDbAccount
  name: 'carpool'
  properties: {
    resource: {
      id: 'carpool'
    }
  }
}

// Cosmos DB Containers
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-06-15' = {
  parent: cosmosDbDatabase
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource tripsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-06-15' = {
  parent: cosmosDbDatabase
  name: 'trips'
  properties: {
    resource: {
      id: 'trips'
      partitionKey: {
        paths: [
          '/groupId'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource groupsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-06-15' = {
  parent: cosmosDbDatabase
  name: 'groups'
  properties: {
    resource: {
      id: 'groups'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource preferencesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-06-15' = {
  parent: cosmosDbDatabase
  name: 'preferences'
  properties: {
    resource: {
      id: 'preferences'
      partitionKey: {
        paths: [
          '/userId'
        ]
        kind: 'Hash'
      }
    }
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2021-06-01-preview' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enableRbacAuthorization: true
  }
}

// Application Insights (Reference existing)
resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

// Azure Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2021-03-01' = {
  name: staticWebAppName
  location: 'East US 2'
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

// Azure Function App (Reference existing Flex Consumption Function App)
resource functionApp 'Microsoft.Web/sites@2021-03-01' existing = {
  name: functionAppName
}

// Outputs
output functionAppName string = functionApp.name
output functionAppDefaultHostName string = functionApp.properties.defaultHostName
output staticWebAppName string = staticWebApp.name
output staticWebAppDefaultHostName string = staticWebApp.properties.defaultHostname
output storageAccountName string = storageAccount.name
output appInsightsName string = appInsights.name
output keyVaultName string = keyVault.name
output cosmosDbAccountName string = cosmosDbAccount.name
output cosmosDbEndpoint string = cosmosDbAccount.properties.documentEndpoint
output resourceGroupName string = resourceGroup().name
