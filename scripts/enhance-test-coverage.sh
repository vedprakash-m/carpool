#!/bin/bash

# VCarpool Test Coverage Enhancement Script
# Automated setup for improving backend test coverage from 4.74% to 70%+

set -e

echo "🧪 VCarpool Test Coverage Enhancement"
echo "===================================="

cd backend

# Check current coverage
echo "📊 Current test coverage status:"
npm run test:coverage 2>/dev/null | tail -10 || echo "Unable to run coverage - continuing with setup"

echo "🎯 Setting up enhanced test coverage..."

# Create test directory structure if it doesn't exist
mkdir -p src/__tests__/services
mkdir -p src/__tests__/functions
mkdir -p src/__tests__/utils
mkdir -p src/__tests__/integration

echo "🔧 Creating critical service test templates..."

# Address Validation Service Test
cat > src/__tests__/services/address-validation.service.test.ts << 'EOF'
import { AddressValidationService } from '../../services/address-validation.service';

describe('AddressValidationService', () => {
  let service: AddressValidationService;
  
  beforeEach(() => {
    service = new AddressValidationService();
  });

  describe('validateAddress', () => {
    it('should validate a correct address within service area', async () => {
      const address = '123 Main St, Redmond, WA 98052';
      const result = await service.validateAddress(address);
      
      expect(result.isValid).toBe(true);
      expect(result.distance).toBeLessThan(25); // Within 25-mile radius
      expect(result.coordinates).toBeDefined();
    });

    it('should reject address outside service area', async () => {
      const address = '1 Microsoft Way, Seattle, WA 98101'; // Too far
      const result = await service.validateAddress(address);
      
      expect(result.isValid).toBe(false);
      expect(result.distance).toBeGreaterThan(25);
      expect(result.error).toContain('outside service area');
    });

    it('should handle invalid addresses gracefully', async () => {
      const address = 'Invalid Address 12345';
      const result = await service.validateAddress(address);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should fallback to mock geocoding when APIs fail', async () => {
      // Mock API failure
      jest.spyOn(service, 'tryGoogleGeocoding').mockRejectedValue(new Error('API Error'));
      jest.spyOn(service, 'tryAzureGeocoding').mockRejectedValue(new Error('API Error'));
      
      const address = '123 Test St, Redmond, WA';
      const result = await service.validateAddress(address);
      
      expect(result.isValid).toBeDefined(); // Should still return a result
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance accurately', () => {
      const teslaCoords = { lat: 47.6740, lng: -122.1215 }; // Tesla STEM
      const testCoords = { lat: 47.6762, lng: -122.2059 }; // Redmond
      
      const distance = service.calculateDistance(teslaCoords, testCoords);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be reasonable
    });
  });
});
EOF

# Trip Management Service Test
cat > src/__tests__/services/trip.service.test.ts << 'EOF'
import { TripService } from '../../services/trip.service';
import { Trip, TripStatus } from '../../types/shared';

describe('TripService', () => {
  let service: TripService;
  let mockDbService: any;

  beforeEach(() => {
    mockDbService = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn()
    };
    service = new TripService(mockDbService);
  });

  describe('createTrip', () => {
    it('should create a new trip successfully', async () => {
      const tripData = {
        groupId: 'group-123',
        driverId: 'user-456',
        passengers: ['user-789'],
        date: '2025-01-15',
        pickupTime: '08:00',
        route: ['123 Main St', '456 Oak Ave'],
        status: TripStatus.SCHEDULED
      };

      mockDbService.create.mockResolvedValue({ id: 'trip-123', ...tripData });

      const result = await service.createTrip(tripData);

      expect(result.id).toBe('trip-123');
      expect(result.status).toBe(TripStatus.SCHEDULED);
      expect(mockDbService.create).toHaveBeenCalledWith('trips', tripData);
    });

    it('should validate trip data before creation', async () => {
      const invalidTripData = {
        groupId: '', // Invalid - empty
        driverId: 'user-456',
        passengers: [],
        date: 'invalid-date',
        pickupTime: '25:00' // Invalid time
      };

      await expect(service.createTrip(invalidTripData)).rejects.toThrow('Invalid trip data');
    });
  });

  describe('updateTripStatus', () => {
    it('should update trip status correctly', async () => {
      const tripId = 'trip-123';
      const newStatus = TripStatus.IN_PROGRESS;

      mockDbService.findById.mockResolvedValue({
        id: tripId,
        status: TripStatus.SCHEDULED
      });
      mockDbService.update.mockResolvedValue({
        id: tripId,
        status: newStatus
      });

      const result = await service.updateTripStatus(tripId, newStatus);

      expect(result.status).toBe(newStatus);
      expect(mockDbService.update).toHaveBeenCalledWith('trips', tripId, { status: newStatus });
    });
  });

  describe('getTripsByGroup', () => {
    it('should retrieve trips for a group', async () => {
      const groupId = 'group-123';
      const mockTrips = [
        { id: 'trip-1', groupId, status: TripStatus.SCHEDULED },
        { id: 'trip-2', groupId, status: TripStatus.COMPLETED }
      ];

      mockDbService.query.mockResolvedValue(mockTrips);

      const result = await service.getTripsByGroup(groupId);

      expect(result).toHaveLength(2);
      expect(result[0].groupId).toBe(groupId);
    });
  });
});
EOF

# User Management Service Test
cat > src/__tests__/services/user.service.test.ts << 'EOF'
import { UserService } from '../../services/user.service';
import { User, UserRole } from '../../types/shared';

describe('UserService', () => {
  let service: UserService;
  let mockDbService: any;
  let mockAuthService: any;

  beforeEach(() => {
    mockDbService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    mockAuthService = {
      hashPassword: jest.fn(),
      validatePassword: jest.fn()
    };
    service = new UserService(mockDbService, mockAuthService);
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARENT
      };

      mockAuthService.hashPassword.mockResolvedValue('hashed-password');
      mockDbService.findByEmail.mockResolvedValue(null); // Email not taken
      mockDbService.create.mockResolvedValue({
        id: 'user-123',
        ...userData,
        password: 'hashed-password'
      });

      const result = await service.createUser(userData);

      expect(result.id).toBe('user-123');
      expect(result.email).toBe(userData.email);
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith(userData.password);
      expect(result.password).not.toBe(userData.password); // Should be hashed
    });

    it('should reject duplicate email addresses', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'StrongPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARENT
      };

      mockDbService.findByEmail.mockResolvedValue({ id: 'existing-user' });

      await expect(service.createUser(userData)).rejects.toThrow('Email already exists');
    });
  });

  describe('validateUser', () => {
    it('should validate correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'correct-password';
      const hashedPassword = 'hashed-password';

      mockDbService.findByEmail.mockResolvedValue({
        id: 'user-123',
        email,
        password: hashedPassword
      });
      mockAuthService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result.isValid).toBe(true);
      expect(result.user.id).toBe('user-123');
    });

    it('should reject invalid credentials', async () => {
      const email = 'test@example.com';
      const password = 'wrong-password';

      mockDbService.findByEmail.mockResolvedValue({
        id: 'user-123',
        email,
        password: 'hashed-password'
      });
      mockAuthService.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser(email, password);

      expect(result.isValid).toBe(false);
      expect(result.user).toBeNull();
    });
  });
});
EOF

# Integration Test for Authentication Flow
cat > src/__tests__/integration/auth-flow.integration.test.ts << 'EOF'
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

describe('Authentication Flow Integration', () => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:7071/api';
  let authToken: string;

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'StrongPassword123!',
        firstName: 'Integration',
        lastName: 'Test',
        homeAddress: {
          street: '123 Test St',
          city: 'Redmond',
          state: 'WA',
          zipCode: '98052'
        },
        children: [{
          firstName: 'Child',
          lastName: 'Test',
          grade: '3rd Grade',
          school: 'Test Elementary'
        }]
      };

      const response = await axios.post(`${baseUrl}/auth-register`, userData);

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.user.email).toBe(userData.email);
      expect(response.data.token).toBeDefined();
      
      authToken = response.data.token;
    });

    it('should validate address during registration', async () => {
      const userData = {
        email: `test-addr-${Date.now()}@example.com`,
        password: 'StrongPassword123!',
        firstName: 'Address',
        lastName: 'Test',
        homeAddress: {
          street: '999 Nonexistent St',
          city: 'Nowhere',
          state: 'XX',
          zipCode: '00000'
        }
      };

      const response = await axios.post(`${baseUrl}/auth-register`, userData);

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('address');
    });
  });

  describe('User Authentication', () => {
    it('should authenticate with valid credentials', async () => {
      // This test assumes the user from the registration test exists
      const loginData = {
        email: 'test@example.com', // Use existing test user
        password: 'StrongPassword123!'
      };

      const response = await axios.post(`${baseUrl}/auth-login`, loginData);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.token).toBeDefined();
    });

    it('should protect endpoints with authentication', async () => {
      // Try to access protected endpoint without token
      try {
        await axios.get(`${baseUrl}/users-me`);
        fail('Should have thrown 401 error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }

      // Try with valid token
      const response = await axios.get(`${baseUrl}/users-me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
    });
  });
});
EOF

echo "✅ Test templates created successfully"

echo "📦 Installing additional test dependencies..."
npm install --save-dev @types/supertest supertest nock

echo "🔧 Updating Jest configuration for better coverage..."
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/types/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
EOF

# Create test setup file
cat > src/__tests__/setup.ts << 'EOF'
import { jest } from '@jest/globals';

// Mock external services for testing
jest.mock('axios');
jest.mock('@azure/cosmos');

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.COSMOS_DB_ENDPOINT = 'https://test-cosmos.documents.azure.com:443/';
});

afterAll(() => {
  // Cleanup after all tests
  jest.restoreAllMocks();
});
EOF

echo "🚀 Running enhanced test suite..."
npm run test:coverage

echo "✅ Test coverage enhancement complete!"
echo
echo "📊 Coverage Summary:"
npm run test:coverage 2>/dev/null | grep -A 10 "Coverage summary" || echo "Run 'npm run test:coverage' to see current coverage"
echo
echo "🎯 Next Steps:"
echo "1. Review and customize the generated test templates"
echo "2. Add more specific test cases for your business logic"
echo "3. Configure CI/CD to require minimum coverage thresholds"
echo "4. Run integration tests with real API connections" 