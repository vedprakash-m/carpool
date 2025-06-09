export type UserRole = "admin" | "group_admin" | "parent" | "child" | "student" | "trip_admin";
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
    student: {
        schedule_viewing: boolean;
        safety_reporting: boolean;
        profile_management: boolean;
    };
    trip_admin: {
        group_management: boolean;
        member_management: boolean;
        trip_scheduling: boolean;
        emergency_coordination: boolean;
    };
}
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    phoneNumberVerified?: boolean;
    department?: string;
    emergencyContact?: string;
    emergencyContactVerified?: boolean;
    phone?: string;
    grade?: string;
    role: UserRole;
    rolePermissions?: RolePermissions;
    preferences: UserPreferences;
    isActiveDriver?: boolean;
    homeAddress?: string;
    homeAddressVerified?: boolean;
    homeLocation?: GeographicLocation;
    preferredSchools?: string[];
    travelSchedule?: {
        isRegularTraveler: boolean;
        travelPattern?: string;
        needsMakeupOptions: boolean;
        makeupCommitmentWeeks: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
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
    groupAdminId: string;
    groupAdmin: User;
    targetSchool: School;
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
    members: CarpoolGroupMember[];
    pendingInvitations: CarpoolGroupInvitation[];
    joinRequests: CarpoolGroupJoinRequest[];
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
    role: UserRole;
    joinedAt: Date;
    children?: {
        id: string;
        name: string;
        grade: string;
        studentId?: string;
    }[];
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
    role: "parent" | "child";
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
    matchScore?: number;
    matchReasons?: string[];
    distance?: number;
    reviewedBy?: string;
    reviewedByUser?: User;
    reviewMessage?: string;
    requestedAt: Date;
    reviewedAt?: Date;
}
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
export interface Family {
    id: string;
    name: string;
    parentIds: string[];
    childIds: string[];
    primaryParentId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Child {
    id: string;
    familyId: string;
    parentId: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    studentId?: string;
    grade?: string;
    emergencyContact?: string;
    pickupInstructions?: string;
    schoolId?: string;
    school?: School;
    createdAt: Date;
    updatedAt: Date;
}
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
export interface WeeklyScheduleTemplateSlot {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    routeType: "school_dropoff" | "school_pickup" | "multi_stop" | "point_to_point";
    description: string;
    locationId?: string;
    maxPassengers: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface DriverWeeklyPreference {
    id: string;
    driverParentId: string;
    weekStartDate: string;
    templateSlotId: string;
    preferenceLevel: "preferable" | "less_preferable" | "unavailable";
    submissionTimestamp: Date;
}
export interface RideAssignment {
    id: string;
    slotId: string;
    driverId: string;
    date: string;
    passengers: string[];
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
export interface Schedule {
    id: string;
    userId: string;
    recurring: boolean;
    startDate: Date;
    endDate?: Date;
    daysOfWeek: number[];
    departureTime: string;
    isDriver: boolean;
    maxPassengers?: number;
    status: ScheduleStatus;
    createdAt: Date;
    updatedAt: Date;
}
export type ScheduleStatus = "active" | "paused" | "inactive";
export interface SwapRequest {
    id: string;
    originalRideId: string;
    requestingDriverId: string;
    receivingDriverId: string;
    status: SwapRequestStatus;
    requestMessage?: string;
    responseMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}
export type SwapRequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "auto_accepted" | "expired";
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    details?: any;
    stack?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
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
export interface CreateUserRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phoneNumber?: string;
    homeAddress?: string;
    isActiveDriver?: boolean;
}
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
    inactivityScore: number;
    recommendedAction: "monitor" | "warn" | "purge";
    gracePeriodDays: number;
}
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
export interface SubmitWeeklyPreferencesRequest {
    weekStartDate: string;
    preferences: {
        templateSlotId: string;
        preferenceLevel: "preferable" | "less_preferable" | "unavailable";
    }[];
}
export interface GenerateScheduleRequest {
    weekStartDate: string;
    forceRegenerate?: boolean;
}
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
export interface TripAnalytics {
    totalTrips: number;
    totalUsers: number;
    averageOccupancy: number;
    costSavings: number;
    co2Reduction: number;
    timeframe: string;
}
export interface TripStats {
    totalTrips: number;
    tripsAsDriver: number;
    tripsAsPassenger: number;
    totalDistance: number;
    costSavings: number;
    upcomingTrips: number;
    weeklySchoolTrips?: number;
    childrenCount?: number;
    monthlyFuelSavings?: number;
    timeSavedHours?: number;
}
export type NotificationType = "trip_joined" | "trip_left" | "trip_cancelled" | "trip_updated" | "message_received" | "trip_reminder" | "pickup_reminder";
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
export declare enum MessageType {
    text = "text",
    location = "location",
    system = "system",
    image = "image"
}
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
    participants: string[];
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
export interface RealTimeEvent {
    type: "message" | "user_joined" | "user_left" | "typing" | "trip_update";
    chatId?: string;
    tripId?: string;
    userId: string;
    data: any;
    timestamp: Date;
}
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
export interface ChatRoomWithUnreadCount extends ChatRoom {
    unreadCount: number;
    userRole: "driver" | "passenger";
}
export interface MessageWithSender extends Message {
    isOwnMessage: boolean;
}
export interface WeeklySchedule {
    id: string;
    groupId: string;
    group: CarpoolGroup;
    weekStartDate: string;
    weekEndDate: string;
    status: "preferences_open" | "preferences_closed" | "scheduling" | "swaps_open" | "finalized" | "active" | "completed";
    preferencesDeadline: string;
    swapsDeadline: string;
    assignments: WeeklyAssignment[];
    swapRequests: SwapRequest[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    finalizedAt?: Date;
}
export interface WeeklyPreferences {
    id: string;
    scheduleId: string;
    parentId: string;
    parent: User;
    drivingAvailability: {
        monday: DayPreference;
        tuesday: DayPreference;
        wednesday: DayPreference;
        thursday: DayPreference;
        friday: DayPreference;
    };
    specialRequests?: string;
    emergencyContact?: string;
    submittedAt: Date;
    isLateSubmission: boolean;
}
export interface DayPreference {
    canDrive: boolean;
    preferredRole: "driver" | "passenger" | "either" | "unavailable";
    timeConstraints?: {
        earliestPickup?: string;
        latestDropoff?: string;
    };
    maxPassengers?: number;
    notes?: string;
}
export interface WeeklyAssignment {
    id: string;
    scheduleId: string;
    date: string;
    dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
    morningTrip?: {
        driverId: string;
        driver: User;
        passengers: AssignmentPassenger[];
        pickupTime: string;
        route: RouteStop[];
    };
    afternoonTrip?: {
        driverId: string;
        driver: User;
        passengers: AssignmentPassenger[];
        pickupTime: string;
        route: RouteStop[];
    };
    algorithmScore: number;
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
    children: string[];
    type: "pickup" | "dropoff";
}
export interface SwapRequest {
    id: string;
    scheduleId: string;
    requesterId: string;
    requester: User;
    originalAssignmentId: string;
    originalAssignment: WeeklyAssignment;
    proposedChange: {
        date: string;
        role: "driver" | "passenger";
        timeSlot: "morning" | "afternoon" | "both";
    };
    targetParentId?: string;
    targetParent?: User;
    reason: string;
    priority: "low" | "medium" | "high" | "emergency";
    status: SwapRequestStatus;
    respondedAt?: Date;
    responseMessage?: string;
    autoAcceptAt: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface DrivingHistory {
    id: string;
    parentId: string;
    groupId: string;
    totalWeeksInGroup: number;
    totalDrivingDays: number;
    drivingFrequencyPercentage: number;
    recentReliabilityScore: number;
    lastDrivingDate?: string;
    consecutiveDrivingDays: number;
    consecutivePassengerDays: number;
    weeklyHistory: {
        weekStartDate: string;
        drivingDays: number;
        passengerDays: number;
        noShows: number;
        lastMinuteCancellations: number;
        swapRequestsMade: number;
        swapRequestsAccepted: number;
    }[];
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
        preferredDrivingRotation: "equal" | "preference_based" | "availability_based";
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
    type: "insufficient_drivers" | "route_inefficiency" | "preference_conflict" | "capacity_exceeded";
    date: string;
    timeSlot: "morning" | "afternoon";
    description: string;
    suggestedResolutions: string[];
    affectedParents: string[];
}
export interface CarpoolGroupSchedulingSettings {
    preferenceSubmissionDeadline: {
        dayOfWeek: "friday" | "saturday" | "sunday";
        time: string;
    };
    swapRequestDeadline: {
        dayOfWeek: "saturday" | "sunday" | "monday";
        time: string;
    };
    maxConsecutiveDrivingDays: number;
    drivingRotationStrategy: "equal" | "preference_based" | "availability_based";
    allowSingleParentDays: boolean;
    maxDetourMinutes: number;
    preferredPickupTimeWindow: number;
    emergencyBackupParents: string[];
    emergencyContactMethod: "phone" | "sms" | "app" | "all";
}
export interface RecurringSchedule {
    id: string;
    groupId: string;
    name: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface Preference {
    id: string;
    familyId: string;
    date: string;
    canDrive: boolean;
}
export interface Assignment {
    familyId: string;
    driverId: string;
    date: Date;
    passengerFamilyIds: string[];
}
export interface ValidationResult {
    isValid: boolean;
    message?: string;
    verificationCode?: string;
    phoneVerified?: boolean;
    addressValidated?: boolean;
    emergencyContactsVerified?: boolean;
    profileComplete?: boolean;
    canAccessGroups?: boolean;
    errors?: string[];
}
export interface PhoneValidation {
    phoneNumber: string;
    code: string;
    verificationCode?: string;
    isVerified: boolean;
    attemptCount: number;
    attempts?: number;
    expiresAt: Date;
    status?: "pending" | "verified" | "failed";
    isValid?: boolean;
}
export interface AddressValidation {
    address: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    geocodedLocation?: GeographicLocation;
    distanceFromSchool?: number;
    withinServiceArea: boolean;
    isValid: boolean;
    status?: "pending" | "verified" | "failed";
    validationMessage?: string;
    error?: string;
}
export interface RegistrationData {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    homeAddress: string;
    children: {
        name: string;
        grade: string;
        schoolId: string;
        studentId?: string;
    }[];
    transportationRole: "driver_regular" | "driver_occasional" | "passenger_only";
    emergencyContact: {
        name: string;
        phoneNumber: string;
        relationship: string;
    };
    travelSchedule?: {
        isRegularTraveler: boolean;
        needsMakeupOptions: boolean;
    };
}
export declare const TESLA_STEM_HIGH_SCHOOL: School;
export declare const SERVICE_AREA_RADIUS_MILES = 25;
export interface TravelingParentSchedule {
    parentId: string;
    groupId: string;
    regularTravelDays?: string[];
    travelDates: {
        startDate: Date;
        endDate: Date;
        reason?: string;
    }[];
    makeupOptions: {
        selectedOption: "extra_weekly" | "weekend_special" | "extended_coverage" | "custom";
        makeupPlan: string;
        deadline: Date;
        status: "pending" | "approved" | "completed";
    };
    makeupCommitment?: {
        windowWeeks: number;
        commitmentType: string;
    };
    makeupWindow?: {
        minWeeks: number;
        maxWeeks: number;
    };
    makeupProposals?: Array<{
        id: string;
        status: string;
        description: string;
    }>;
    fairnessImpact: {
        missedTrips: number;
        makeupTripsNeeded: number;
        makeupTripsCompleted: number;
    };
}
export interface MakeupOption {
    id: string;
    type: "extra_weekly" | "weekend_special" | "extended_coverage" | "custom";
    description: string;
    windowWeeks: number;
    isFlexible: boolean;
    weekRange: {
        startWeek: Date;
        endWeek: Date;
    };
    additionalTrips: number;
    approved: boolean;
}
