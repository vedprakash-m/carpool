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
  role?: "student" | "parent" | "admin" | "trip_admin" | "faculty" | "staff";
  preferences: UserPreferences;
  // New fields from Product Spec
  isActiveDriver?: boolean;
  homeAddress?: string;
  // Phase 2: Geographic & School Matching
  homeLocation?: GeographicLocation;
  preferredSchools?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Phase 2: Geographic & School Matching Types
export interface GeographicLocation {
  address: string;
  latitude: number;
  longitude: number;
  zipCode?: string;
  city?: string;
  state?: string;
  country?: string;
  formattedAddress?: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  location: GeographicLocation;
  district?: string;
  type: "elementary" | "middle" | "high" | "k12" | "other";
  grades: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CarpoolGroup {
  id: string;
  name: string;
  description?: string;
  tripAdminId: string;
  tripAdmin: User;
  targetSchool: School;
  targetSchoolId: string;
  // Geographic boundaries
  serviceArea: {
    centerLocation: GeographicLocation;
    radiusMiles: number;
    includeZipCodes?: string[];
    excludeZipCodes?: string[];
  };
  // Group settings
  maxChildren: number;
  ageGroups: string[];
  schedule: {
    daysOfWeek: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday")[];
    morningPickup?: {
      startTime: string; // "07:30"
      endTime: string; // "08:00"
    };
    afternoonDropoff?: {
      startTime: string; // "15:00"
      endTime: string; // "16:00"
    };
  };
  // Membership
  members: CarpoolGroupMember[];
  pendingInvitations: CarpoolGroupInvitation[];
  joinRequests: CarpoolGroupJoinRequest[];
  // Status & Lifecycle
  status: "active" | "inactive" | "purging" | "deleted" | "paused" | "archived";
  isAcceptingMembers: boolean;
  inactivityDetectedAt?: Date;
  purgingStartedAt?: Date;
  purgingScheduledDate?: Date;
  lastActivityAt: Date;
  activityMetrics: {
    lastPreferenceSubmission?: Date;
    lastScheduleGeneration?: Date;
    lastMemberActivity?: Date;
    consecutiveInactiveWeeks: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CarpoolGroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  role: "trip_admin" | "parent" | "student";
  joinedAt: Date;
  // Children in this group (for parents)
  children?: {
    id: string;
    name: string;
    grade: string;
    studentId?: string;
  }[];
  // Parent preferences
  drivingPreferences?: {
    canDrive: boolean;
    preferredDays: string[];
    maxPassengers: number;
    vehicleInfo?: string;
  };
}

export interface CarpoolGroupInvitation {
  id: string;
  groupId: string;
  group: CarpoolGroup;
  email: string;
  invitedBy: string;
  invitedByUser: User;
  role: "parent" | "student";
  status: "pending" | "accepted" | "declined" | "expired";
  message?: string;
  sentAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
}

export interface CarpoolGroupJoinRequest {
  id: string;
  groupId: string;
  group: CarpoolGroup;
  requesterId: string;
  requester: User;
  status: "pending" | "approved" | "denied";
  message?: string;
  // Auto-matching data
  matchScore?: number;
  matchReasons?: string[];
  distance?: number; // miles from group center
  // Trip admin response
  reviewedBy?: string;
  reviewedByUser?: User;
  reviewMessage?: string;
  requestedAt: Date;
  reviewedAt?: Date;
}

// Phase 2: Geographic matching and search
export interface GroupSearchCriteria {
  schoolId?: string;
  schoolName?: string;
  maxDistanceMiles?: number;
  userLocation?: GeographicLocation;
  ageGroups?: string[];
  daysOfWeek?: string[];
  timePreferences?: {
    morningPickup?: boolean;
    afternoonDropoff?: boolean;
  };
}

export interface GroupSearchResult {
  group: CarpoolGroup;
  matchScore: number;
  distance: number;
  matchReasons: string[];
  canRequestToJoin: boolean;
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
  // Phase 2: School association
  schoolId?: string;
  school?: School;
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
  | "cancelled"
  | "auto_accepted"
  | "expired";

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
  role: "parent" | "student" | "trip_admin";
  phoneNumber?: string;
  homeAddress?: string;
  isActiveDriver?: boolean;
}

// Parent Group Creation (Self-Service)
export interface ParentGroupCreationRequest {
  name: string;
  description?: string;
  targetSchoolId: string;
  serviceArea: {
    centerLocation: GeographicLocation;
    radiusMiles: number;
    includeZipCodes?: string[];
    excludeZipCodes?: string[];
  };
  maxChildren: number;
  ageGroups: string[];
  schedule: {
    daysOfWeek: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday")[];
    morningPickup?: {
      startTime: string;
      endTime: string;
    };
    afternoonDropoff?: {
      startTime: string;
      endTime: string;
    };
  };
}

// Group Lifecycle Management
export interface GroupReactivationRequest {
  id: string;
  groupId: string;
  requesterId: string;
  requester: User;
  reason: string;
  activityPlan: string;
  memberCommitments?: {
    confirmedMembers: number;
    newMembersPledged: number;
    totalExpectedMembers: number;
  };
  status: "pending" | "approved" | "denied";
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerNotes?: string;
}

export interface InactivityDetectionResult {
  groupId: string;
  isInactive: boolean;
  inactivityReasons: string[];
  lastActivityDate: Date;
  inactivityScore: number; // 0-100, higher means more inactive
  recommendedAction: "monitor" | "warn" | "purge";
  gracePeriodDays: number;
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

// Trip Statistics for Dashboard
export interface TripStats {
  totalTrips: number;
  tripsAsDriver: number;
  tripsAsPassenger: number;
  totalDistance: number;
  costSavings: number;
  upcomingTrips: number;
  // School-focused statistics for dashboard
  weeklySchoolTrips?: number;
  childrenCount?: number;
  monthlyFuelSavings?: number;
  timeSavedHours?: number;
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

// Phase 3: Advanced Scheduling Features

export interface WeeklySchedule {
  id: string;
  groupId: string;
  group: CarpoolGroup;
  weekStartDate: string; // YYYY-MM-DD (Monday)
  weekEndDate: string; // YYYY-MM-DD (Friday)
  status:
    | "preferences_open"
    | "preferences_closed"
    | "scheduling"
    | "swaps_open"
    | "finalized"
    | "active"
    | "completed";

  // Important deadlines
  preferencesDeadline: string; // Saturday 10PM
  swapsDeadline: string; // Sunday 5PM

  // Generated assignments
  assignments: WeeklyAssignment[];

  // Swap requests for this week
  swapRequests: SwapRequest[];

  // Metadata
  createdBy: string; // Trip Admin ID
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
}

export interface WeeklyPreferences {
  id: string;
  scheduleId: string;
  parentId: string;
  parent: User;

  // Driving availability for each day
  drivingAvailability: {
    monday: DayPreference;
    tuesday: DayPreference;
    wednesday: DayPreference;
    thursday: DayPreference;
    friday: DayPreference;
  };

  // Special requests or constraints
  specialRequests?: string;
  emergencyContact?: string;

  // Submission tracking
  submittedAt: Date;
  isLateSubmission: boolean; // After Saturday 10PM deadline
}

export interface DayPreference {
  canDrive: boolean;
  preferredRole: "driver" | "passenger" | "either" | "unavailable";
  timeConstraints?: {
    earliestPickup?: string; // "07:30"
    latestDropoff?: string; // "16:00"
  };
  maxPassengers?: number; // If driving
  notes?: string;
}

export interface WeeklyAssignment {
  id: string;
  scheduleId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

  // Morning trip (home → school)
  morningTrip?: {
    driverId: string;
    driver: User;
    passengers: AssignmentPassenger[];
    pickupTime: string;
    route: RouteStop[];
  };

  // Afternoon trip (school → home)
  afternoonTrip?: {
    driverId: string;
    driver: User;
    passengers: AssignmentPassenger[];
    pickupTime: string;
    route: RouteStop[];
  };

  // Assignment metadata
  algorithmScore: number; // How well this assignment fits preferences
  conflictResolution?: {
    reason: string;
    alternativeOptions: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentPassenger {
  parentId: string;
  parent: User;
  children: {
    id: string;
    name: string;
    grade: string;
  }[];
  pickupLocation: GeographicLocation;
  dropoffLocation: GeographicLocation;
  specialInstructions?: string;
}

export interface RouteStop {
  order: number;
  location: GeographicLocation;
  parentId: string;
  estimatedTime: string;
  actualTime?: string;
  children: string[]; // Child names
  type: "pickup" | "dropoff";
}

export interface SwapRequest {
  id: string;
  scheduleId: string;
  requesterId: string;
  requester: User;

  // What they want to swap
  originalAssignmentId: string;
  originalAssignment: WeeklyAssignment;

  // What they're offering instead
  proposedChange: {
    date: string;
    role: "driver" | "passenger";
    timeSlot: "morning" | "afternoon" | "both";
  };

  // Who they're requesting to swap with
  targetParentId?: string;
  targetParent?: User;

  // Request details
  reason: string;
  priority: "low" | "medium" | "high" | "emergency";

  // Response tracking
  status: SwapRequestStatus;
  respondedAt?: Date;
  responseMessage?: string;

  // Auto-acceptance logic
  autoAcceptAt: string; // Sunday 5PM deadline

  createdAt: Date;
  updatedAt: Date;
}

export interface DrivingHistory {
  id: string;
  parentId: string;
  groupId: string;

  // Historical data for conflict resolution
  totalWeeksInGroup: number;
  totalDrivingDays: number;
  drivingFrequencyPercentage: number; // What % of days they typically drive

  // Recent performance metrics
  recentReliabilityScore: number; // 0-100 based on no-shows, cancellations
  lastDrivingDate?: string;
  consecutiveDrivingDays: number;
  consecutivePassengerDays: number;

  // Weekly history (last 12 weeks)
  weeklyHistory: {
    weekStartDate: string;
    drivingDays: number;
    passengerDays: number;
    noShows: number;
    lastMinuteCancellations: number;
    swapRequestsMade: number;
    swapRequestsAccepted: number;
  }[];

  // Calculated at end of each week
  lastCalculatedAt: Date;
  updatedAt: Date;
}

export interface SchedulingAlgorithmInput {
  groupId: string;
  weekStartDate: string;
  preferences: WeeklyPreferences[];
  history: DrivingHistory[];
  groupSettings: {
    maxConsecutiveDrivingDays: number;
    preferredDrivingRotation:
      | "equal"
      | "preference_based"
      | "availability_based";
    allowSingleParentDays: boolean;
  };
}

export interface SchedulingAlgorithmOutput {
  assignments: WeeklyAssignment[];
  conflicts: SchedulingConflict[];
  algorithmStats: {
    totalScore: number;
    preferenceSatisfactionRate: number;
    drivingEquityScore: number;
    routeEfficiencyScore: number;
  };
  recommendations: string[];
}

export interface SchedulingConflict {
  type:
    | "insufficient_drivers"
    | "route_inefficiency"
    | "preference_conflict"
    | "capacity_exceeded";
  date: string;
  timeSlot: "morning" | "afternoon";
  description: string;
  suggestedResolutions: string[];
  affectedParents: string[];
}

// Enhanced CarpoolGroup for scheduling
export interface CarpoolGroupSchedulingSettings {
  // Scheduling preferences
  preferenceSubmissionDeadline: {
    dayOfWeek: "friday" | "saturday" | "sunday";
    time: string; // "22:00"
  };
  swapRequestDeadline: {
    dayOfWeek: "saturday" | "sunday" | "monday";
    time: string; // "17:00"
  };

  // Algorithm settings
  maxConsecutiveDrivingDays: number;
  drivingRotationStrategy: "equal" | "preference_based" | "availability_based";
  allowSingleParentDays: boolean;

  // Route optimization
  maxDetourMinutes: number;
  preferredPickupTimeWindow: number; // minutes

  // Emergency procedures
  emergencyBackupParents: string[]; // Parent IDs willing to be emergency backup
  emergencyContactMethod: "phone" | "sms" | "app" | "all";
}
