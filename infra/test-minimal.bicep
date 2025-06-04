@description('Location for all resources')
param location string = resourceGroup().location

@description('App name')
param appName string = 'vcarpool'

@description('Environment name')
param environmentName string = 'prod'

// Simple storage account only
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

output storageAccountName string = storageAccount.name 
