// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  department?: string;
  emergencyContact?: string;
  phone?: string; // Alias for phoneNumber
  grade?: string;
  role?: "student" | "parent" | "admin" | "faculty" | "staff";
  preferences: UserPreferences;
  // New fields from Product Spec
  isActiveDriver?: boolean;
  homeAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Child model - NEW from Product Spec
export interface Child {
  id: string;
  parentId: string;
  fullName: string;
  studentId: string;
  grade?: string;
  emergencyContact?: string;
  pickupInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Location model - NEW from Product Spec
export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  type: "school" | "home" | "pickup_point" | "other";
  createdAt: Date;
  updatedAt: Date;
}

// Weekly Schedule Template Slot - NEW from Product Spec
export interface WeeklyScheduleTemplateSlot {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  routeType:
    | "school_dropoff"
    | "school_pickup"
    | "multi_stop"
    | "point_to_point";
  description: string;
  locationId?: string; // Reference to Location
  maxPassengers: number;
  createdAt: Date;
  updatedAt: Date;
}

// Driver Weekly Preference - NEW from Product Spec
export interface DriverWeeklyPreference {
  id: string;
  driverParentId: string;
  weekStartDate: string; // ISO date string (Monday of the week)
  templateSlotId: string;
  preferenceLevel: "preferable" | "less_preferable" | "unavailable";
  submissionTimestamp: Date;
}

// Ride Assignment - NEW from Product Spec
export interface RideAssignment {
  id: string;
  slotId: string; // Reference to WeeklyScheduleTemplateSlot
  driverId: string;
  date: string; // ISO date string
  passengers: string[]; // Array of Child IDs
  assignmentMethod: "automated" | "manual_override" | "swap_result";
  status: "assigned" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  tripReminders: boolean;
  swapRequests: boolean;
  scheduleChanges: boolean;
}

// Trip types
export interface Trip {
  id: string;
  driverId: string;
  passengers: string[];
  date: Date;
  departureTime: string;
  arrivalTime: string;
  pickupLocations: PickupLocation[];
  destination: string;
  maxPassengers: number;
  availableSeats: number;
  status: TripStatus;
  cost?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PickupLocation {
  userId: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  estimatedTime: string;
}

export type TripStatus = "planned" | "active" | "completed" | "cancelled";

// Schedule types
export interface Schedule {
  id: string;
  userId: string;
  recurring: boolean;
  startDate: Date;
  endDate?: Date;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  departureTime: string;
  isDriver: boolean;
  maxPassengers?: number;
  status: ScheduleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduleStatus = "active" | "paused" | "inactive";

// Swap request types - UPDATED to match Product Spec
export interface SwapRequest {
  id: string;
  originalRideId: string; // Reference to RideAssignment
  requestingDriverId: string;
  receivingDriverId: string;
  status: SwapRequestStatus;
  requestMessage?: string;
  responseMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SwapRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  department?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  department?: string;
  grade?: string;
  emergencyContact?: string;
  isActiveDriver?: boolean;
  homeAddress?: string;
}

// NEW API Types from Product Spec

// Admin User Creation Request
export interface CreateUserRequest {
  email: string;
  password: string; // Initial password set by admin
  firstName: string;
  lastName: string;
  role: "parent" | "student";
  phoneNumber?: string;
  homeAddress?: string;
  isActiveDriver?: boolean;
}

// Change Password Request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Weekly Preference Submission
export interface SubmitWeeklyPreferencesRequest {
  weekStartDate: string; // ISO date string (Monday)
  preferences: {
    templateSlotId: string;
    preferenceLevel: "preferable" | "less_preferable" | "unavailable";
  }[];
}

// Admin Schedule Generation Request
export interface GenerateScheduleRequest {
  weekStartDate: string; // ISO date string (Monday)
  forceRegenerate?: boolean; // Override existing assignments
}

// Child Management Requests
export interface CreateChildRequest {
  fullName: string;
  studentId: string;
  grade?: string;
  emergencyContact?: string;
  pickupInstructions?: string;
}

export interface UpdateChildRequest {
  fullName?: string;
  studentId?: string;
  grade?: string;
  emergencyContact?: string;
  pickupInstructions?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Trip request types
export interface CreateTripRequest {
  date: string;
  departureTime: string;
  arrivalTime: string;
  destination: string;
  maxPassengers: number;
  cost?: number;
  notes?: string;
}

export interface UpdateTripRequest {
  date?: string;
  departureTime?: string;
  arrivalTime?: string;
  destination?: string;
  maxPassengers?: number;
  cost?: number;
  notes?: string;
  status?: TripStatus;
}

export interface JoinTripRequest {
  pickupLocation: string;
}

// Email types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
}

export interface EmailRequest {
  to: string[];
  templateId: string;
  variables: Record<string, any>;
  priority?: "low" | "normal" | "high";
}

// Analytics types
export interface TripAnalytics {
  totalTrips: number;
  totalUsers: number;
  averageOccupancy: number;
  costSavings: number;
  co2Reduction: number;
  timeframe: string;
}

// Notification types
export type NotificationType =
  | "trip_joined"
  | "trip_left"
  | "trip_cancelled"
  | "trip_updated"
  | "message_received"
  | "trip_reminder"
  | "pickup_reminder";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// Message and Chat types
export type MessageType = "text" | "location" | "system" | "image";

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  content: string;
  metadata?: {
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    imageUrl?: string;
    systemEventType?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

export interface ChatRoom {
  id: string;
  tripId: string;
  type: "trip_chat";
  name: string;
  description?: string;
  participants: string[]; // Array of user IDs
  createdBy: string;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ChatParticipant {
  userId: string;
  chatId: string;
  role: "driver" | "passenger";
  joinedAt: Date;
  lastReadAt?: Date;
  notificationsEnabled: boolean;
}

// Real-time event types
export interface RealTimeEvent {
  type: "message" | "user_joined" | "user_left" | "typing" | "trip_update";
  chatId?: string;
  tripId?: string;
  userId: string;
  data: any;
  timestamp: Date;
}

// Request types for messaging
export interface SendMessageRequest {
  content: string;
  type: MessageType;
  metadata?: {
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    imageUrl?: string;
  };
}

export interface CreateChatRequest {
  tripId: string;
  name?: string;
  description?: string;
}

export interface UpdateMessageRequest {
  content: string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}

// Response types for messaging
export interface ChatRoomWithUnreadCount extends ChatRoom {
  unreadCount: number;
  userRole: "driver" | "passenger";
}

export interface MessageWithSender extends Message {
  isOwnMessage: boolean;
}
