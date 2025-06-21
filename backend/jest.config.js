module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Skip only problematic files that need environment setup
  testPathIgnorePatterns: [
    '/node_modules/',
    // Enable all service tests for coverage improvement
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/__tests__/', '/coverage/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // Set coverage thresholds to our target of 80%
  coverageThreshold: {
    global: {
      statements: 80, // Target 80% coverage
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  // Timeout for async tests
  testTimeout: 30000,
  // Mock configuration
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/src/$1',
  },
};
