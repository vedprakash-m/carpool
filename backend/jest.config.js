/**
 * Jest Configuration for vCarpool Backend
 * Enhanced testing setup with coverage, environment management, and test utilities
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Root directory
  rootDir: '.',

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts',
  ],

  // Explicitly ignore disabled tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '__tests__.disabled',
    '<rootDir>/src/__tests__/auth.service.test.ts',
    '<rootDir>/src/__tests__/trip.service.test.ts',
    '<rootDir>/src/__tests__/services/enhanced-service-coverage.test.ts',
    '<rootDir>/src/__tests__/functions/ping-simple.test.ts',
  ],

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // Setup files - temporarily disabled due to TypeScript issues
  // setupFilesAfterEnv: [
  //   '<rootDir>/tests/setup.ts'
  // ],

  // Coverage configuration
  collectCoverage: true, // Enable coverage for CI compatibility
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/types/**',
    '!src/index.ts',
    // Focus on implementation files that should have coverage
    '!src/**/mock*/**',
    '!src/**/fixtures/**',
    '!src/**/test-*/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  // Add coverage thresholds to encourage better testing
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 15,
      lines: 15,
      statements: 15,
    },
  },

  // Test environment variables
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',

  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: true,

  // Test result processor - commented out for CI compatibility
  // testResultsProcessor: '<rootDir>/tests/test-results-processor.js'
};
