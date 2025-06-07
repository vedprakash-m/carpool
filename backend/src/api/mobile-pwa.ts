/**
 * Mobile PWA API
 * Handles push notifications, offline functionality, and voice interface
 */

interface PushNotificationSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  platform: "web" | "ios" | "android";
  userAgent: string;
  subscribedAt: string;
  active: boolean;
}

interface NotificationPreferences {
  userId: string;
  categories: {
    emergency: boolean;
    scheduleUpdates: boolean;
    socialCoordination: boolean;
    performanceTracking: boolean;
  };
  timing: {
    quietHoursStart: string; // HH:MM format
    quietHoursEnd: string;
    emergencyOverride: boolean;
  };
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
}

interface OfflineDataPackage {
  userId: string;
  groupIds: string[];
  data: {
    currentSchedule: ScheduleData;
    emergencyContacts: EmergencyContact[];
    groupMembers: GroupMember[];
    pendingActions: PendingAction[];
  };
  lastSync: string;
  version: number;
}

interface ScheduleData {
  currentWeek: {
    [date: string]: {
      driving: boolean;
      pickups: PickupAssignment[];
      specialInstructions: string;
    };
  };
  nextWeek: {
    [date: string]: {
      driving: boolean;
      pickups: PickupAssignment[];
      specialInstructions: string;
    };
  };
}

interface PickupAssignment {
  childName: string;
  parentName: string;
  address: string;
  time: string;
  phone: string;
  specialInstructions?: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  priority: number;
}

interface GroupMember {
  id: string;
  name: string;
  phone: string;
  children: string[];
  reliability: number;
  role: "parent" | "trip_admin";
}

interface PendingAction {
  id: string;
  type: "preference_submission" | "swap_request" | "status_update";
  data: any;
  timestamp: string;
  synced: boolean;
}

interface VoiceCommand {
  command: string;
  intent: string;
  parameters: { [key: string]: any };
  confidence: number;
  timestamp: string;
}

interface VoiceResponse {
  success: boolean;
  message: string;
  action: string;
  data?: any;
  followUpSuggestions?: string[];
}

/**
 * POST /api/mobile/notifications/subscribe
 * Subscribe to push notifications
 */
export async function subscribePushNotifications(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { endpoint, keys, platform, userAgent } = req.body;
    const userId = req.user.id;

    const subscription: PushNotificationSubscription = {
      userId,
      endpoint,
      keys,
      platform,
      userAgent,
      subscribedAt: new Date().toISOString(),
      active: true,
    };

    // Store subscription
    await storePushSubscription(subscription);

    // Send welcome notification
    await sendWelcomeNotification(subscription);

    res.json({
      success: true,
      message: "Push notifications subscribed successfully",
      subscriptionId: generateSubscriptionId(subscription),
    });
  } catch (error) {
    console.error("Push notification subscription error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to subscribe to push notifications",
    });
  }
}

/**
 * PUT /api/mobile/notifications/preferences
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user.id;
    const preferences: NotificationPreferences = {
      userId,
      ...req.body,
    };

    await storeNotificationPreferences(preferences);

    res.json({
      success: true,
      message: "Notification preferences updated",
      preferences,
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update notification preferences",
    });
  }
}

/**
 * GET /api/mobile/offline-data
 * Get offline data package for current user
 */
export async function getOfflineDataPackage(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user.id;
    const { lastSync } = req.query;

    // Get user's groups
    const userGroups = await getUserGroups(userId);
    const groupIds = userGroups.map((g) => g.id);

    // Build comprehensive offline data package
    const offlineData: OfflineDataPackage = {
      userId,
      groupIds,
      data: {
        currentSchedule: await buildScheduleData(userId, groupIds),
        emergencyContacts: await getEmergencyContacts(userId),
        groupMembers: await getGroupMembersData(groupIds),
        pendingActions: await getPendingActions(userId),
      },
      lastSync: new Date().toISOString(),
      version: await getDataVersion(userId),
    };

    // Check if update needed
    if (lastSync && (await isDataUpToDate(userId, lastSync as string))) {
      return res.json({
        success: true,
        upToDate: true,
        lastSync: offlineData.lastSync,
      });
    }

    res.json({
      success: true,
      data: offlineData,
      dataSize: JSON.stringify(offlineData).length,
      cacheUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Offline data package error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get offline data package",
    });
  }
}

/**
 * POST /api/mobile/offline-sync
 * Sync offline actions when connection restored
 */
export async function syncOfflineActions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user.id;
    const { pendingActions } = req.body;

    const syncResults = await Promise.all(
      pendingActions.map(async (action: PendingAction) => {
        try {
          const result = await processPendingAction(action);
          return {
            actionId: action.id,
            success: true,
            result,
          };
        } catch (error) {
          return {
            actionId: action.id,
            success: false,
            error: error.message,
          };
        }
      })
    );

    const successCount = syncResults.filter((r) => r.success).length;
    const failureCount = syncResults.length - successCount;

    res.json({
      success: true,
      syncResults,
      summary: {
        total: syncResults.length,
        succeeded: successCount,
        failed: failureCount,
      },
      message: `Synced ${successCount}/${syncResults.length} actions successfully`,
    });
  } catch (error) {
    console.error("Offline sync error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to sync offline actions",
    });
  }
}

/**
 * POST /api/mobile/voice-command
 * Process voice commands
 */
export async function processVoiceCommand(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user.id;
    const { command, audioData } = req.body;

    // Parse voice command
    const parsedCommand = await parseVoiceCommand(command || audioData);

    if (parsedCommand.confidence < 0.7) {
      return res.json({
        success: false,
        message: "I didn't understand that. Could you try again?",
        suggestions: [
          "I'm running 5 minutes late",
          "Mark pickup complete",
          "What's my schedule tomorrow?",
        ],
      });
    }

    // Process command
    const response = await executeVoiceCommand(userId, parsedCommand);

    res.json({
      success: true,
      command: parsedCommand,
      response,
    });
  } catch (error) {
    console.error("Voice command error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process voice command",
    });
  }
}

/**
 * POST /api/mobile/quick-status
 * Send quick status updates (optimized for mobile)
 */
export async function sendQuickStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user.id;
    const { type, message, groupId, additionalData } = req.body;

    const statusUpdate = {
      userId,
      type, // 'running_late', 'pickup_complete', 'emergency', 'delayed'
      message,
      groupId,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };

    // Send to group members
    await broadcastQuickStatus(statusUpdate);

    // Update schedule if needed
    if (type === "running_late") {
      await adjustScheduleForDelay(
        userId,
        groupId,
        additionalData.delayMinutes
      );
    }

    res.json({
      success: true,
      statusUpdate,
      notificationsSent: await getGroupMemberCount(groupId),
      message: `Status update sent to group members`,
    });
  } catch (error) {
    console.error("Quick status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send quick status",
    });
  }
}

/**
 * GET /api/mobile/carplay-data/:groupId
 * Get CarPlay/Android Auto optimized data
 */
export async function getCarPlayData(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;

    const today = new Date().toISOString().split("T")[0];
    const carPlayData = {
      todayAssignment: await getTodayAssignment(userId, groupId, today),
      quickActions: [
        { id: "running_late", title: "Running Late", icon: "clock" },
        { id: "pickup_complete", title: "Pickup Complete", icon: "check" },
        { id: "emergency", title: "Emergency", icon: "alert" },
        { id: "call_admin", title: "Call Trip Admin", icon: "phone" },
      ],
      emergencyContacts: await getEmergencyContacts(userId),
      navigationData: await getNavigationData(userId, groupId, today),
    };

    res.json({
      success: true,
      data: carPlayData,
      optimizedForCar: true,
    });
  } catch (error) {
    console.error("CarPlay data error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get CarPlay data",
    });
  }
}

// Helper functions

async function parseVoiceCommand(input: string): Promise<VoiceCommand> {
  // Simple rule-based parsing - in production would use NLP service
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes("running late") || lowerInput.includes("delayed")) {
    const minutes = extractNumber(lowerInput) || 5;
    return {
      command: input,
      intent: "running_late",
      parameters: { minutes },
      confidence: 0.9,
      timestamp: new Date().toISOString(),
    };
  }

  if (
    lowerInput.includes("pickup complete") ||
    lowerInput.includes("finished")
  ) {
    return {
      command: input,
      intent: "pickup_complete",
      parameters: {},
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    };
  }

  if (lowerInput.includes("schedule") || lowerInput.includes("tomorrow")) {
    return {
      command: input,
      intent: "check_schedule",
      parameters: { date: "tomorrow" },
      confidence: 0.85,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    command: input,
    intent: "unknown",
    parameters: {},
    confidence: 0.1,
    timestamp: new Date().toISOString(),
  };
}

async function executeVoiceCommand(
  userId: string,
  command: VoiceCommand
): Promise<VoiceResponse> {
  switch (command.intent) {
    case "running_late":
      await sendQuickStatusUpdate(
        userId,
        "running_late",
        command.parameters.minutes
      );
      return {
        success: true,
        message: `Sent "running ${command.parameters.minutes} minutes late" to your group`,
        action: "status_sent",
        followUpSuggestions: ["Call trip admin", "Check navigation"],
      };

    case "pickup_complete":
      await sendQuickStatusUpdate(userId, "pickup_complete");
      return {
        success: true,
        message: "Marked pickup as complete and notified parents",
        action: "pickup_marked_complete",
        followUpSuggestions: ["View next pickup", "End trip"],
      };

    case "check_schedule":
      const schedule = await getScheduleForVoice(
        userId,
        command.parameters.date
      );
      return {
        success: true,
        message: formatScheduleForVoice(schedule),
        action: "schedule_retrieved",
        data: schedule,
      };

    default:
      return {
        success: false,
        message: "I didn't understand that command",
        action: "unknown_command",
        followUpSuggestions: [
          'Try "I\'m running late"',
          'Say "mark pickup complete"',
          'Ask "what\'s my schedule?"',
        ],
      };
  }
}

function extractNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function formatScheduleForVoice(schedule: any): string {
  if (!schedule || !schedule.driving) {
    return "You are not scheduled to drive tomorrow";
  }

  const pickupCount = schedule.pickups?.length || 0;
  const time = schedule.time || "time not set";

  return `Tomorrow you're driving ${pickupCount} children at ${time}`;
}

// Mock implementations
async function storePushSubscription(
  subscription: PushNotificationSubscription
): Promise<void> {}
async function sendWelcomeNotification(
  subscription: PushNotificationSubscription
): Promise<void> {}
async function storeNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {}
async function getUserGroups(userId: string): Promise<any[]> {
  return [];
}
async function buildScheduleData(
  userId: string,
  groupIds: string[]
): Promise<ScheduleData> {
  return {} as ScheduleData;
}
async function getEmergencyContacts(
  userId: string
): Promise<EmergencyContact[]> {
  return [];
}
async function getGroupMembersData(groupIds: string[]): Promise<GroupMember[]> {
  return [];
}
async function getPendingActions(userId: string): Promise<PendingAction[]> {
  return [];
}
async function getDataVersion(userId: string): Promise<number> {
  return 1;
}
async function isDataUpToDate(
  userId: string,
  lastSync: string
): Promise<boolean> {
  return false;
}
async function processPendingAction(action: PendingAction): Promise<any> {
  return {};
}
async function broadcastQuickStatus(statusUpdate: any): Promise<void> {}
async function adjustScheduleForDelay(
  userId: string,
  groupId: string,
  delayMinutes: number
): Promise<void> {}
async function getGroupMemberCount(groupId: string): Promise<number> {
  return 0;
}
async function getTodayAssignment(
  userId: string,
  groupId: string,
  date: string
): Promise<any> {
  return {};
}
async function getNavigationData(
  userId: string,
  groupId: string,
  date: string
): Promise<any> {
  return {};
}
async function sendQuickStatusUpdate(
  userId: string,
  type: string,
  minutes?: number
): Promise<void> {}
async function getScheduleForVoice(userId: string, date: string): Promise<any> {
  return {};
}
function generateSubscriptionId(
  subscription: PushNotificationSubscription
): string {
  return "sub_" + Date.now();
}
