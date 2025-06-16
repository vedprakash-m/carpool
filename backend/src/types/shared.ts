// Shared types for backend
export type UserRole = 'admin' | 'group_admin' | 'parent' | 'child';

export interface RolePermissions {
  admin: {
    platform_management: boolean;
    group_admin_promotion: boolean;
    system_configuration: boolean;
  };
  group_admin: {
    group_management: boolean;
    member_management: boolean;
    trip_scheduling: boolean;
    emergency_coordination: boolean;
  };
  parent: {
    trip_participation: boolean;
    preference_submission: boolean;
    child_management: boolean;
  };
  child: {
    schedule_viewing: boolean;
    safety_reporting: boolean;
    profile_management: boolean;
  };
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  tripReminders: boolean;
  swapRequests: boolean;
  scheduleChanges: boolean;
}

export interface UserPreferences {
  pickupLocation: string;
  dropoffLocation: string;
  preferredTime: string;
  isDriver: boolean;
  maxPassengers?: number;
  smokingAllowed: boolean;
  musicPreference?: string;
  notifications: NotificationSettings;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  department?: string;
  emergencyContact?: string;
  phone?: string;
  grade?: string;
  role: UserRole;
  rolePermissions?: RolePermissions;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  familyName: string;
  parent: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  secondParent?: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  homeAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  children: {
    firstName: string;
    lastName: string;
    grade: string;
    school: string;
  }[];
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}
