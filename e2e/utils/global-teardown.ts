/**
 * Global Teardown for E2E Tests
 * Cleans up test environment and stops services
 */

import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MongoClient } from 'mongodb';

const execAsync = promisify(exec);

export default async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting VCarpool E2E Global Teardown...');

  const mongoURL =
    process.env.MONGODB_URL ||
    'mongodb://testuser:testpass@localhost:27018/vcarpool_test?authSource=admin';

  try {
    // Step 1: Clean up test data
    console.log('🗑️ Cleaning up test data...');
    await cleanupTestData(mongoURL);

    // Step 2: Stop Docker services if not in CI
    if (!process.env.CI) {
      console.log('🛑 Stopping Docker services...');
      try {
        await execAsync('docker-compose -f docker-compose.e2e.yml down -v', {
          cwd: process.cwd().replace('/e2e', ''),
        });
        console.log('✅ Services stopped successfully');
      } catch (error) {
        console.warn('⚠️ Error stopping services (may not be running):', error);
      }
    }

    // Step 3: Clean up test artifacts
    console.log('🧽 Cleaning up test artifacts...');
    await cleanupArtifacts();

    console.log('✅ Global teardown completed successfully!');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw to avoid masking test failures
  }
}

async function cleanupTestData(mongoURL: string) {
  try {
    const client = new MongoClient(mongoURL);
    await client.connect();

    const db = client.db('vcarpool_test');

    // Reset collections to initial state
    await db.collection('users').deleteMany({});
    await db.collection('schools').deleteMany({});
    await db.collection('carpoolGroups').deleteMany({});
    await db.collection('sessions').deleteMany({});

    console.log('✅ Test data cleaned up');
    await client.close();
  } catch (error) {
    console.warn('⚠️ Could not clean up test data:', error);
  }
}

async function cleanupArtifacts() {
  try {
    // Remove temporary auth state files
    await execAsync('rm -f test-results/auth-state.json');
    console.log('✅ Temporary files cleaned up');
  } catch (error) {
    console.warn('⚠️ Could not clean up artifacts:', error);
  }
}
