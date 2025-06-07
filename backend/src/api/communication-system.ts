/**
 * In-App Communication System
 * Complete carpool-specific messaging with progressive migration from WhatsApp
 */

interface CarpoolMessage {
  messageId: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: "parent" | "trip_admin";
  content: MessageContent;
  messageType:
    | "text"
    | "voice"
    | "photo"
    | "location"
    | "system"
    | "quick_action";
  threadId?: string; // For message threading
  contextTags: ContextTag[];
  timestamp: string;
  editedAt?: string;
  reactions: MessageReaction[];
  readBy: MessageRead[];
  priority: "low" | "normal" | "high" | "urgent";
  carpool_context: CarpoolContext;
}

interface MessageContent {
  text?: string;
  voiceUrl?: string;
  voiceDuration?: number; // seconds
  photoUrl?: string;
  photoCaption?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
    label: string; // "My location", "School pickup", etc.
  };
  quickAction?: {
    type: "running_late" | "pickup_complete" | "emergency" | "route_change";
    data: any;
  };
  systemMessage?: {
    type: "schedule_change" | "member_joined" | "member_left" | "group_created";
    data: any;
  };
}

interface ContextTag {
  type: "date" | "child_name" | "emergency" | "schedule" | "pickup" | "route";
  value: string;
  display: string;
}

interface MessageReaction {
  userId: string;
  emoji: string; // '👍', '❤️', '😅', '🚗', '⏰', '🚨'
  timestamp: string;
}

interface MessageRead {
  userId: string;
  readAt: string;
}

interface CarpoolContext {
  relatedDate?: string; // ISO date if message relates to specific day
  relatedChildren?: string[]; // Child names if message is child-specific
  relatedPickup?: {
    time: string;
    location: string;
    driverName: string;
  };
  urgencyLevel: "info" | "attention" | "urgent" | "emergency";
  actionRequired?: {
    type: "confirmation" | "response" | "availability_check";
    deadline?: string;
    respondedUsers: string[];
  };
}

interface MessageThread {
  threadId: string;
  groupId: string;
  topic: string;
  startedBy: string;
  startedAt: string;
  lastActivity: string;
  messageCount: number;
  participants: string[];
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

interface CommunicationPreferences {
  userId: string;
  notificationSettings: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours: {
    start: string; // HH:MM
    end: string; // HH:MM
    emergencyOverride: boolean;
  };
  messageFilters: {
    priorityThreshold: "low" | "normal" | "high" | "urgent";
    autoMuteThreads: boolean;
    digestMode: boolean; // Bundle non-urgent messages
  };
  voicePreferences: {
    autoPlay: boolean;
    transcriptionEnabled: boolean;
    voiceToText: boolean;
  };
}

interface GroupCommunicationStats {
  groupId: string;
  period: string;
  metrics: {
    totalMessages: number;
    messagesPerDay: number;
    mostActiveHour: string;
    responseRate: number; // percentage of action-required messages that got responses
    averageResponseTime: number; // minutes
    emergencyResponseTime: number; // minutes
    topContributors: {
      userId: string;
      messageCount: number;
      helpfulnessScore: number;
    }[];
  };
  communicationHealth: {
    score: number; // 0-100
    factors: {
      responseRate: number;
      emergencyHandling: number;
      participationBalance: number; // How evenly distributed communication is
      conflictResolution: number;
    };
  };
}

/**
 * POST /api/communication/messages
 * Send a new message to the group
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const { groupId, content, messageType, threadId, priority, contextTags } =
      req.body;
    const senderId = req.user.id;
    const senderName = req.user.name;
    const senderRole = req.user.role;

    // Validate sender is group member
    await validateGroupMembership(senderId, groupId);

    // Determine carpool context
    const carpoolContext = await determineCarpoolContext(
      groupId,
      content,
      contextTags
    );

    // Create message
    const message: CarpoolMessage = {
      messageId: generateMessageId(),
      groupId,
      senderId,
      senderName,
      senderRole,
      content,
      messageType,
      threadId,
      contextTags: contextTags || [],
      timestamp: new Date().toISOString(),
      reactions: [],
      readBy: [{ userId: senderId, readAt: new Date().toISOString() }],
      priority: priority || "normal",
      carpool_context: carpoolContext,
    };

    // Store message
    await storeMessage(message);

    // Handle special message types
    if (messageType === "quick_action") {
      await processQuickAction(message);
    }

    // Send notifications
    await sendMessageNotifications(message);

    // Update group activity
    await updateGroupActivity(groupId, message);

    res.json({
      success: true,
      message,
      notificationsSent: (await getGroupMemberCount(groupId)) - 1,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message",
    });
  }
}

/**
 * GET /api/communication/messages/:groupId
 * Get messages for a group with pagination and filtering
 */
export async function getGroupMessages(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { groupId } = req.params;
    const {
      limit = 50,
      offset = 0,
      threadId,
      since,
      priority,
      messageType,
      contextTag,
    } = req.query;

    const userId = req.user.id;

    // Validate access
    await validateGroupMembership(userId, groupId);

    // Build filters
    const filters = {
      groupId,
      threadId: threadId as string,
      since: since as string,
      priority: priority as string,
      messageType: messageType as string,
      contextTag: contextTag as string,
    };

    // Get messages
    const messages = await fetchGroupMessages(filters, {
      limit: Number(limit),
      offset: Number(offset),
    });

    // Mark messages as read
    await markMessagesAsRead(
      userId,
      messages.map((m) => m.messageId)
    );

    // Get threads if any
    const threads = await getActiveThreads(groupId);

    // Get communication stats
    const stats = await getGroupCommunicationStats(groupId);

    res.json({
      success: true,
      data: {
        messages,
        threads,
        stats,
        hasMore: messages.length === Number(limit),
        unreadCount: await getUnreadCount(userId, groupId),
      },
    });
  } catch (error) {
    console.error("Get group messages error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get group messages",
    });
  }
}

/**
 * POST /api/communication/threads
 * Start a new message thread
 */
export async function startThread(req: Request, res: Response): Promise<void> {
  try {
    const { groupId, topic, initialMessage } = req.body;
    const userId = req.user.id;

    await validateGroupMembership(userId, groupId);

    const thread: MessageThread = {
      threadId: generateThreadId(),
      groupId,
      topic,
      startedBy: userId,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0,
      participants: [userId],
      resolved: false,
    };

    // Create thread
    await createThread(thread);

    // Send initial message if provided
    if (initialMessage) {
      await sendMessage(
        {
          ...req,
          body: {
            ...initialMessage,
            groupId,
            threadId: thread.threadId,
          },
        },
        res
      );
      return;
    }

    res.json({
      success: true,
      thread,
    });
  } catch (error) {
    console.error("Start thread error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start thread",
    });
  }
}

/**
 * POST /api/communication/voice-message
 * Upload and process voice message
 */
export async function uploadVoiceMessage(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { groupId, audioData, duration } = req.body;
    const userId = req.user.id;

    await validateGroupMembership(userId, groupId);

    // Upload audio file
    const voiceUrl = await uploadAudioFile(audioData, userId);

    // Optional: Transcribe voice message
    const transcription = await transcribeAudio(voiceUrl);

    const message: CarpoolMessage = {
      messageId: generateMessageId(),
      groupId,
      senderId: userId,
      senderName: req.user.name,
      senderRole: req.user.role,
      content: {
        voiceUrl,
        voiceDuration: duration,
        text: transcription, // Include transcription for accessibility
      },
      messageType: "voice",
      contextTags: [],
      timestamp: new Date().toISOString(),
      reactions: [],
      readBy: [{ userId, readAt: new Date().toISOString() }],
      priority: "normal",
      carpool_context: await determineCarpoolContext(groupId, { voiceUrl }, []),
    };

    await storeMessage(message);
    await sendMessageNotifications(message);

    res.json({
      success: true,
      message,
      transcription,
    });
  } catch (error) {
    console.error("Voice message error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload voice message",
    });
  }
}

/**
 * POST /api/communication/emergency-broadcast
 * Send emergency message to all group members with escalation
 */
export async function sendEmergencyBroadcast(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { groupId, message, location, requiresResponse } = req.body;
    const senderId = req.user.id;

    await validateGroupMembership(senderId, groupId);

    const emergencyMessage: CarpoolMessage = {
      messageId: generateMessageId(),
      groupId,
      senderId,
      senderName: req.user.name,
      senderRole: req.user.role,
      content: {
        text: message,
        location,
      },
      messageType: "system",
      contextTags: [{ type: "emergency", value: "true", display: "Emergency" }],
      timestamp: new Date().toISOString(),
      reactions: [],
      readBy: [{ userId: senderId, readAt: new Date().toISOString() }],
      priority: "urgent",
      carpool_context: {
        urgencyLevel: "emergency",
        actionRequired: requiresResponse
          ? {
              type: "confirmation",
              deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
              respondedUsers: [],
            }
          : undefined,
      },
    };

    await storeMessage(emergencyMessage);

    // Send immediate notifications to all channels
    await sendEmergencyNotifications(emergencyMessage);

    // Start escalation timer if response required
    if (requiresResponse) {
      await scheduleEmergencyEscalation(emergencyMessage);
    }

    res.json({
      success: true,
      message: emergencyMessage,
      escalationScheduled: requiresResponse,
    });
  } catch (error) {
    console.error("Emergency broadcast error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send emergency broadcast",
    });
  }
}

/**
 * GET /api/communication/migration-status/:groupId
 * Get WhatsApp to in-app migration progress
 */
export async function getMigrationStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    await validateGroupMembership(userId, groupId);

    const migrationStatus = await calculateMigrationStatus(groupId);

    res.json({
      success: true,
      data: migrationStatus,
    });
  } catch (error) {
    console.error("Migration status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get migration status",
    });
  }
}

// Helper functions

async function determineCarpoolContext(
  groupId: string,
  content: MessageContent,
  contextTags: ContextTag[]
): Promise<CarpoolContext> {
  // Analyze message content for carpool-specific context
  const text = content.text?.toLowerCase() || "";

  let urgencyLevel: CarpoolContext["urgencyLevel"] = "info";
  if (text.includes("emergency") || text.includes("help"))
    urgencyLevel = "emergency";
  else if (text.includes("late") || text.includes("delay"))
    urgencyLevel = "urgent";
  else if (text.includes("change") || text.includes("cancel"))
    urgencyLevel = "attention";

  // Extract date references
  const relatedDate = extractDateFromMessage(text);

  // Extract child names
  const relatedChildren = await extractChildNamesFromMessage(text, groupId);

  return {
    relatedDate,
    relatedChildren,
    urgencyLevel,
    actionRequired:
      urgencyLevel === "urgent" || urgencyLevel === "emergency"
        ? {
            type: "confirmation",
            deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
            respondedUsers: [],
          }
        : undefined,
  };
}

async function calculateMigrationStatus(groupId: string) {
  const stats = await getGroupCommunicationStats(groupId);
  const whatsappUsage = await getWhatsAppUsageStats(groupId);

  const migrationScore = Math.round(
    (stats.metrics.totalMessages /
      (stats.metrics.totalMessages + whatsappUsage.messageCount)) *
      100
  );

  return {
    migrationScore, // 0-100% in-app adoption
    inAppMessages: stats.metrics.totalMessages,
    whatsappMessages: whatsappUsage.messageCount,
    phase:
      migrationScore > 75
        ? "completing"
        : migrationScore > 25
        ? "transitioning"
        : "starting",
    recommendations: generateMigrationRecommendations(migrationScore),
    incentives: getAvailableIncentives(groupId, migrationScore),
  };
}

function generateMigrationRecommendations(score: number): string[] {
  if (score < 25) {
    return [
      "Try voice messages for quick updates while driving",
      "Use pickup confirmations to track group activity",
      "Tag messages by date for better organization",
    ];
  } else if (score < 75) {
    return [
      "Start message threads for specific topics",
      "Use location sharing for pickup coordination",
      "Try emergency broadcast for urgent situations",
    ];
  } else {
    return [
      "Explore video calling for complex coordination",
      "Use polling features for group decisions",
      "WhatsApp can now be backup-only communication",
    ];
  }
}

// Mock implementations
async function validateGroupMembership(
  userId: string,
  groupId: string
): Promise<void> {}
async function storeMessage(message: CarpoolMessage): Promise<void> {}
async function sendMessageNotifications(
  message: CarpoolMessage
): Promise<void> {}
async function updateGroupActivity(
  groupId: string,
  message: CarpoolMessage
): Promise<void> {}
async function fetchGroupMessages(
  filters: any,
  pagination: any
): Promise<CarpoolMessage[]> {
  return [];
}
async function markMessagesAsRead(
  userId: string,
  messageIds: string[]
): Promise<void> {}
async function getActiveThreads(groupId: string): Promise<MessageThread[]> {
  return [];
}
async function getGroupCommunicationStats(
  groupId: string
): Promise<GroupCommunicationStats> {
  return {} as GroupCommunicationStats;
}
async function getUnreadCount(
  userId: string,
  groupId: string
): Promise<number> {
  return 0;
}
async function createThread(thread: MessageThread): Promise<void> {}
async function uploadAudioFile(
  audioData: any,
  userId: string
): Promise<string> {
  return "url";
}
async function transcribeAudio(audioUrl: string): Promise<string> {
  return "transcription";
}
async function sendEmergencyNotifications(
  message: CarpoolMessage
): Promise<void> {}
async function scheduleEmergencyEscalation(
  message: CarpoolMessage
): Promise<void> {}
async function getGroupMemberCount(groupId: string): Promise<number> {
  return 0;
}
async function processQuickAction(message: CarpoolMessage): Promise<void> {}
async function extractChildNamesFromMessage(
  text: string,
  groupId: string
): Promise<string[]> {
  return [];
}
async function getWhatsAppUsageStats(groupId: string): Promise<any> {
  return { messageCount: 0 };
}
async function getAvailableIncentives(
  groupId: string,
  score: number
): Promise<any[]> {
  return [];
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function generateThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function extractDateFromMessage(text: string): string | undefined {
  return undefined;
}
