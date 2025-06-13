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

@description('Azure Cosmos DB account name')
param cosmosDbAccountName string = '${appName}-cosmos-${environmentName}'

// Tags for all resources
var tags = {
  application: appName
  environment: environmentName
  createdBy: 'Bicep'
  resourceType: 'database'
}

// Azure Cosmos DB Account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2021-10-15' = {
  name: cosmosDbAccountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    enableFreeTier: environmentName != 'prod'
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2021-10-15' = {
  parent: cosmosAccount
  name: 'vcarpool'
  properties: {
    resource: {
      id: 'vcarpool'
    }
    options: {
      throughput: 400
    }
  }
}

// Cosmos DB Containers
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  parent: cosmosDatabase
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
  }
}

resource tripsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  parent: cosmosDatabase
  name: 'trips'
  properties: {
    resource: {
      id: 'trips'
      partitionKey: {
        paths: ['/groupId']
        kind: 'Hash'
      }
    }
  }
}

resource groupsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  parent: cosmosDatabase
  name: 'groups'
  properties: {
    resource: {
      id: 'groups'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource preferencesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  parent: cosmosDatabase
  name: 'preferences'
  properties: {
    resource: {
      id: 'preferences'
      partitionKey: {
        paths: ['/parentId']
        kind: 'Hash'
      }
    }
  }
}

resource notificationsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  parent: cosmosDatabase
  name: 'notifications'
  properties: {
    resource: {
      id: 'notifications'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}

// Outputs for cross-resource group references
output cosmosAccountName string = cosmosAccount.name
output cosmosDatabaseName string = cosmosDatabase.name
output cosmosConnectionString string = cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output cosmosResourceGroup string = resourceGroup().name
