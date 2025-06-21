/**
 * Auth Service Test Suite - UX Requirements Alignment
 *
 * Testing alignment with User_Experience.md requirements:
 * - Progressive Parent Onboarding: Family-oriented authentication and onboarding progress tracking
 * - Family Unit Structure: Multi-child family authentication and emergency contact integration
 * - Unified Family Dashboard & Role Transitions: Role-based authentication with family context
 * - Emergency Response & Crisis Coordination: Emergency contact authentication and crisis mode access
 * - Group Admin Schedule Management: Admin role authentication with group management permissions
 * - Weekly Preference Submission: Authentication with family preference context and weekly scheduling
 */

import 'reflect-metadata';
import { AuthService, JwtPayload } from '../services/auth.service';
import { User, UserRole } from '@vcarpool/shared';
import { UserRepository } from '../repositories/user.repository';
import { ILogger } from '../utils/logger';

// Mock Logger
const mockLogger: ILogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setContext: jest.fn(),
  child: jest.fn().mockReturnThis(),
  startTimer: jest.fn().mockReturnValue({
    end: jest.fn(),
  }),
};

// Mock UserRepository
const mockUserRepository: jest.Mocked<UserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
} as any;

// Family-oriented mock user aligned with UX requirements
// Extended for testing with family context - using existing User interface as base
interface TestFamilyUser extends User {
  // Family-specific testing extensions
  familyId?: string;
  children?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    grade: string;
    school: string;
    emergencyContacts: string[];
  }>;
  emergencyContacts?: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
    isPrimary: boolean;
  }>;
  onboardingCompleted?: boolean;
  onboardingProgress?: {
    profileSetup: boolean;
    childrenAdded: boolean;
    emergencyContactsAdded: boolean;
    weeklyPreferencesSet: boolean;
    groupDiscoveryCompleted: boolean;
  };
  groupAdminRoles?: string[];
  weeklyPreferences?: {
    morningDropoff: { preferred: boolean; flexibleTiming: boolean };
    afternoonPickup: { preferred: boolean; flexibleTiming: boolean };
    recurringDays: string[];
  };
}

const mockFamilyParentUser: TestFamilyUser = {
  id: 'parent-family-123',
  email: 'john.doe@lincoln.edu',
  firstName: 'John',
  lastName: 'Doe',
  role: 'parent',
  phoneNumber: '555-0123',
  homeAddress: '123 Oak Park Drive',
  isActiveDriver: true,
  // Family-specific fields for testing
  familyId: 'family-456',
  children: [
    {
      id: 'child-1',
      firstName: 'Emma',
      lastName: 'Doe',
      grade: '3rd',
      school: 'Lincoln Elementary',
      emergencyContacts: ['contact-1', 'contact-2'],
    },
    {
      id: 'child-2',
      firstName: 'Lucas',
      lastName: 'Doe',
      grade: '1st',
      school: 'Lincoln Elementary',
      emergencyContacts: ['contact-1', 'contact-2'],
    },
  ],
  emergencyContacts: [
    {
      id: 'contact-1',
      name: 'Sarah Doe',
      relationship: 'mother',
      phone: '555-0101',
      isPrimary: true,
    },
    {
      id: 'contact-2',
      name: 'Mike Johnson',
      relationship: 'uncle',
      phone: '555-0102',
      isPrimary: false,
    },
  ],
  // Progressive onboarding context
  onboardingCompleted: true,
  onboardingProgress: {
    profileSetup: true,
    childrenAdded: true,
    emergencyContactsAdded: true,
    weeklyPreferencesSet: true,
    groupDiscoveryCompleted: true,
  },
  // Group admin roles for some users
  groupAdminRoles: ['group-2'], // Admin for Oak Park Afternoon Group
  // Weekly preferences with family context
  weeklyPreferences: {
    morningDropoff: { preferred: true, flexibleTiming: false },
    afternoonPickup: { preferred: true, flexibleTiming: true },
    recurringDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  preferences: {
    pickupLocation: '123 Oak Park Drive',
    dropoffLocation: 'Lincoln Elementary School',
    preferredTime: '07:45', // School-appropriate timing
    isDriver: true,
    smokingAllowed: false,
    // Enhanced notifications for family context
    notifications: {
      email: true,
      sms: true, // Important for family coordination
      tripReminders: true,
      swapRequests: true,
      scheduleChanges: true,
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Additional mock user for group admin testing
const mockGroupAdminUser: TestFamilyUser = {
  id: 'admin-family-789',
  email: 'sarah.wilson@lincoln.edu',
  firstName: 'Sarah',
  lastName: 'Wilson',
  role: 'group_admin',
  phoneNumber: '555-0456',
  homeAddress: '789 Maple Street',
  isActiveDriver: true,
  familyId: 'family-789',
  children: [
    {
      id: 'child-3',
      firstName: 'Alex',
      lastName: 'Wilson',
      grade: '2nd',
      school: 'Lincoln Elementary',
      emergencyContacts: ['contact-3', 'contact-4'],
    },
  ],
  emergencyContacts: [
    {
      id: 'contact-3',
      name: 'David Wilson',
      relationship: 'father',
      phone: '555-0201',
      isPrimary: true,
    },
    {
      id: 'contact-4',
      name: 'Mary Johnson',
      relationship: 'grandmother',
      phone: '555-0202',
      isPrimary: false,
    },
  ],
  onboardingCompleted: true,
  onboardingProgress: {
    profileSetup: true,
    childrenAdded: true,
    emergencyContactsAdded: true,
    weeklyPreferencesSet: true,
    groupDiscoveryCompleted: true,
  },
  groupAdminRoles: ['group-1', 'group-3'], // Admin for multiple groups
  weeklyPreferences: {
    morningDropoff: { preferred: false, flexibleTiming: true },
    afternoonPickup: { preferred: true, flexibleTiming: false },
    recurringDays: ['monday', 'wednesday', 'friday'],
  },
  preferences: {
    pickupLocation: '789 Maple Street',
    dropoffLocation: 'Lincoln Elementary School',
    preferredTime: '08:00',
    isDriver: true,
    smokingAllowed: false,
    notifications: {
      email: true,
      sms: true,
      tripReminders: true,
      swapRequests: true,
      scheduleChanges: true,
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(mockUserRepository, mockLogger);
  });

  describe('password management', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await authService.hashPasswordInstance(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
    });

    it('should verify password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await authService.hashPasswordInstance(password);

      const isValid = await authService.verifyPasswordInstance(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await authService.verifyPasswordInstance('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Family-Oriented Token Generation and Verification', () => {
    it('should generate and verify access token for family parent with complete onboarding', () => {
      const token = authService.generateAccessTokenInstance(mockFamilyParentUser);
      expect(token).toBeDefined();

      const decoded = authService.verifyAccessToken(token);
      expect(decoded.userId).toBe(mockFamilyParentUser.id);
      expect(decoded.role).toBe('parent');
      expect(decoded.permissions).toContain('submit_preferences');
      expect(decoded.permissions).toContain('manage_family');
      expect(decoded.permissions).toContain('emergency_response');
    });

    it('should generate access token for group admin with enhanced permissions', () => {
      const token = authService.generateAccessTokenInstance(mockGroupAdminUser);
      expect(token).toBeDefined();

      const decoded = authService.verifyAccessToken(token);
      expect(decoded.userId).toBe(mockGroupAdminUser.id);
      expect(decoded.role).toBe('group_admin');
      expect(decoded.permissions).toContain('submit_preferences');
      expect(decoded.permissions).toContain('manage_family');
      expect(decoded.permissions).toContain('manage_group');
      expect(decoded.permissions).toContain('emergency_response');
      expect(decoded.permissions).toContain('schedule_management');
    });

    it('should generate and verify refresh token for family context', () => {
      const token = authService.generateRefreshTokenInstance(mockFamilyParentUser);
      expect(token).toBeDefined();

      const decoded = authService.verifyRefreshToken(token);
      expect(decoded.userId).toBe(mockFamilyParentUser.id);
      expect(decoded.role).toBe('parent');
    });

    it('should throw an error for an invalid access token', () => {
      expect(() => authService.verifyAccessToken('invalid-token')).toThrow(
        'Invalid or expired token',
      );
    });

    it('should handle emergency response token generation', () => {
      const token = authService.generateAccessTokenInstance(mockFamilyParentUser);
      const decoded = authService.verifyAccessToken(token);

      // Verify emergency response permissions are included
      expect(decoded.permissions).toContain('emergency_response');
      expect(decoded.permissions).toContain('crisis_coordination');
    });
  });

  describe('token extraction', () => {
    it('should extract token from a valid Bearer header', () => {
      const token = 'my-jwt-token';
      const header = `Bearer ${token}`;
      expect(authService.extractTokenFromHeader(header)).toBe(token);
    });

    it('should return null for a malformed header', () => {
      expect(authService.extractTokenFromHeader('Bear my-jwt-token')).toBeNull();
    });

    it('should return null for a missing header', () => {
      expect(authService.extractTokenFromHeader(undefined)).toBeNull();
    });
  });

  describe('Family-Oriented Token Refresh and User Management', () => {
    it('should refresh access token for family parent with onboarding validation', async () => {
      const refreshToken = authService.generateRefreshTokenInstance(mockFamilyParentUser);
      mockUserRepository.findById.mockResolvedValue(mockFamilyParentUser);

      const result = await authService.refreshAccessToken(refreshToken);
      const familyUser = result.user as TestFamilyUser;

      expect(result).toBeDefined();
      expect(result.user).toEqual(mockFamilyParentUser);
      expect(result.accessToken).toBeDefined();
      expect(familyUser.onboardingCompleted).toBe(true);
      expect(familyUser.familyId).toBe('family-456');
      expect(familyUser.children).toHaveLength(2);
      expect(familyUser.emergencyContacts).toHaveLength(2);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFamilyParentUser.id);
    });

    it('should refresh access token for group admin with admin role validation', async () => {
      const refreshToken = authService.generateRefreshTokenInstance(mockGroupAdminUser);
      mockUserRepository.findById.mockResolvedValue(mockGroupAdminUser);

      const result = await authService.refreshAccessToken(refreshToken);
      const adminUser = result.user as TestFamilyUser;

      expect(result).toBeDefined();
      expect(result.user).toEqual(mockGroupAdminUser);
      expect(result.accessToken).toBeDefined();
      expect(adminUser.groupAdminRoles).toHaveLength(2);
      expect(adminUser.groupAdminRoles).toContain('group-1');
      expect(adminUser.groupAdminRoles).toContain('group-3');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockGroupAdminUser.id);
    });

    it('should throw an error if family user is not found during refresh', async () => {
      const refreshToken = authService.generateRefreshTokenInstance(mockFamilyParentUser);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.refreshAccessToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should validate family emergency contacts during token refresh', async () => {
      const refreshToken = authService.generateRefreshTokenInstance(mockFamilyParentUser);
      mockUserRepository.findById.mockResolvedValue(mockFamilyParentUser);

      const result = await authService.refreshAccessToken(refreshToken);
      const familyUser = result.user as TestFamilyUser;

      expect(familyUser.emergencyContacts![0].isPrimary).toBe(true);
      expect(familyUser.emergencyContacts![0].name).toBe('Sarah Doe');
      expect(familyUser.emergencyContacts![0].relationship).toBe('mother');
      expect(familyUser.emergencyContacts![1].isPrimary).toBe(false);
    });

    it('should validate weekly preferences during token refresh', async () => {
      const refreshToken = authService.generateRefreshTokenInstance(mockFamilyParentUser);
      mockUserRepository.findById.mockResolvedValue(mockFamilyParentUser);

      const result = await authService.refreshAccessToken(refreshToken);
      const familyUser = result.user as TestFamilyUser;

      expect(familyUser.weeklyPreferences).toBeDefined();
      expect(familyUser.weeklyPreferences!.morningDropoff.preferred).toBe(true);
      expect(familyUser.weeklyPreferences!.afternoonPickup.preferred).toBe(true);
      expect(familyUser.weeklyPreferences!.recurringDays).toHaveLength(5);
    });
  });
});
