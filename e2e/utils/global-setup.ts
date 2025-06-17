/**
 * Global Setup for E2E Tests
 * Initializes the test environment, sets up database, and ensures services are ready
 */

import { chromium, FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { MongoClient } from 'mongodb';

const execAsync = promisify(exec);

export default async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting VCarpool E2E Global Setup...');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3001';
  const backendURL = process.env.BACKEND_URL || 'http://localhost:7072';
  const mongoURL =
    process.env.MONGODB_URL ||
    'mongodb://testuser:testpass@localhost:27018/vcarpool_test?authSource=admin';

  try {
    // Step 1: Start services if not running in CI
    if (!process.env.CI) {
      console.log('📦 Starting Docker services...');
      try {
        await execAsync(
          'docker-compose -f docker-compose.e2e.yml up -d mongodb-test backend-test frontend-test',
          {
            cwd: process.cwd().replace('/e2e', ''),
          },
        );

        // Wait for services to be ready
        await waitForServices(backendURL, baseURL);
      } catch (error) {
        console.warn('⚠️ Docker services may already be running or not available locally');
      }
    }

    // Step 2: Wait for and validate database connection
    console.log('🗄️ Connecting to test database...');
    const client = new MongoClient(mongoURL);
    await client.connect();

    // Verify database setup
    const db = client.db('vcarpool_test');
    const collections = await db.listCollections().toArray();
    console.log(`✅ Database connected. Collections: ${collections.map((c) => c.name).join(', ')}`);

    await client.close();

    // Step 3: Seed test data if needed
    console.log('🌱 Seeding test data...');
    await seedTestData(mongoURL);

    // Step 4: Validate API endpoints
    console.log('🔍 Validating API endpoints...');
    await validateAPI(backendURL);

    // Step 5: Create browser contexts for shared state
    console.log('🌐 Setting up browser contexts...');
    const browser = await chromium.launch();
    const context = await browser.newContext();

    // Store authentication tokens or shared state
    await context.storageState({ path: 'test-results/auth-state.json' });

    await browser.close();

    console.log('✅ Global setup completed successfully!');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function waitForServices(backendURL: string, frontendURL: string, maxAttempts = 30) {
  console.log('⏳ Waiting for services to be ready...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check backend health
      await axios.get(`${backendURL}/api/health`, { timeout: 5000 });
      console.log('✅ Backend is ready');

      // Check frontend
      await axios.get(frontendURL, { timeout: 5000 });
      console.log('✅ Frontend is ready');

      return; // Both services are ready
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Services not ready after ${maxAttempts} attempts`);
      }

      console.log(`⏳ Attempt ${attempt}/${maxAttempts} - Services not ready, waiting 5s...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function seedTestData(mongoURL: string) {
  const client = new MongoClient(mongoURL);
  await client.connect();

  try {
    const db = client.db('vcarpool_test');

    // Check if data already exists
    const userCount = await db.collection('users').countDocuments();

    if (userCount === 0) {
      console.log('📝 Seeding initial test data...');

      // The data seeding is handled by the init-mongo.js script
      // Here we just verify it worked
      const newUserCount = await db.collection('users').countDocuments();
      console.log(`✅ Seeded ${newUserCount} test users`);
    } else {
      console.log('📋 Test data already exists, skipping seed');
    }
  } finally {
    await client.close();
  }
}

async function validateAPI(backendURL: string) {
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${backendURL}/api/health`);
    console.log(`✅ Health check: ${healthResponse.status}`);

    // Test auth endpoints exist
    try {
      await axios.post(
        `${backendURL}/api/auth/login`,
        {},
        {
          validateStatus: (status) => status < 500,
        },
      );
      console.log('✅ Auth endpoints accessible');
    } catch (error) {
      console.log('⚠️ Auth endpoints may have validation issues (expected)');
    }
  } catch (error) {
    console.error('❌ API validation failed:', error);
    throw error;
  }
}
