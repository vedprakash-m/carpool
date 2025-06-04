@description('Location for all resources')
param location string = resourceGroup().location

@description('App name')
param appName string = 'vcarpool'

@description('Environment name')
param environmentName string = 'prod'

// Storage Account for Functions
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' = {
  name: '${replace(appName, '-', '')}sa${environmentName}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: '${appName}-plan-${environmentName}'
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true
  }
}

// Function App (minimal config)
resource functionApp 'Microsoft.Web/sites@2021-03-01' = {
  name: '${appName}-api-${environmentName}'
  location: location
  kind: 'functionapp'
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
      ]
      nodeVersion: '~22'
    }
    httpsOnly: true
  }
}

// Static Web App (basic)
resource staticWebApp 'Microsoft.Web/staticSites@2021-03-01' = {
  name: '${appName}-web-${environmentName}'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

// Simple outputs
output functionAppName string = functionApp.name
output staticWebAppName string = staticWebApp.name
output functionAppEndpoint string = 'https://${functionApp.properties.defaultHostName}/api'
output staticWebAppEndpoint string = 'https://${staticWebApp.properties.defaultHostname}' 
