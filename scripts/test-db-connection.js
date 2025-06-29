#!/usr/bin/env node

const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔗 Testing Cosmos DB connection...');

  try {
    // Initialize Cosmos DB client with environment variables
    const cosmosClient = new CosmosClient({
      endpoint: process.env.COSMOS_DB_ENDPOINT,
      key: process.env.COSMOS_DB_KEY,
    });

    const databaseId = process.env.COSMOS_DB_DATABASE || 'carpool';
    console.log('📊 Database ID:', databaseId);
    console.log('🌐 Endpoint:', process.env.COSMOS_DB_ENDPOINT);

    // Test database connectivity
    const database = cosmosClient.database(databaseId);

    // List containers to verify connectivity
    const { resources: containers } = await database.containers.readAll().fetchAll();

    console.log('✅ Successfully connected to Cosmos DB!');
    console.log('📋 Available containers:');
    containers.forEach((container) => {
      console.log(`  - ${container.id}`);
    });

    // Test specific containers we need
    const requiredContainers = ['users', 'trips', 'schedules', 'weeklyPreferences'];
    const missingContainers = [];

    for (const containerName of requiredContainers) {
      const exists = containers.some((c) => c.id === containerName);
      if (exists) {
        console.log(`✅ Container '${containerName}' exists`);
      } else {
        console.log(`❌ Container '${containerName}' missing`);
        missingContainers.push(containerName);
      }
    }

    if (missingContainers.length > 0) {
      console.log('⚠️  Missing containers:', missingContainers.join(', '));
      console.log('💡 These will be created automatically when functions run');
    }

    // Test a simple query on users container if it exists
    if (containers.some((c) => c.id === 'users')) {
      console.log('🔍 Testing query on users container...');
      const usersContainer = database.container('users');
      const { resources: users } = await usersContainer.items
        .query('SELECT TOP 5 c.id, c.email, c.role FROM c')
        .fetchAll();

      console.log(`📈 Found ${users.length} users in database`);
      if (users.length > 0) {
        console.log('👥 Sample users:');
        users.forEach((user) => {
          console.log(`  - ${user.email} (${user.role})`);
        });
      }
    }

    console.log('🎉 Database connection test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Check your environment variables:');
    console.error('  - COSMOS_DB_ENDPOINT:', process.env.COSMOS_DB_ENDPOINT ? 'Set' : 'Missing');
    console.error('  - COSMOS_DB_KEY:', process.env.COSMOS_DB_KEY ? 'Set' : 'Missing');
    console.error(
      '  - COSMOS_DB_DATABASE:',
      process.env.COSMOS_DB_DATABASE || "Using default 'carpool'",
    );

    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
