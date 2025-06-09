"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = void 0;
const error_handler_1 = require("../utils/error-handler");
class MessagingService {
    messageRepository;
    chatRepository;
    participantRepository;
    userRepository;
    tripRepository;
    realtimeService;
    logger;
    constructor(messageRepository, chatRepository, participantRepository, userRepository, tripRepository, realtimeService, logger) {
        this.messageRepository = messageRepository;
        this.chatRepository = chatRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
        this.tripRepository = tripRepository;
        this.realtimeService = realtimeService;
        this.logger = logger || {
            debug: (message, data) => console.debug(message, data),
            info: (message, data) => console.info(message, data),
            warn: (message, data) => console.warn(message, data),
            error: (message, error) => console.error(message, error),
            setContext: () => { },
            child: () => this.logger,
            startTimer: (label) => () => console.time(label),
        };
    }
    /**
     * Create a chat room for a trip
     */
    async createTripChat(tripId, createdBy, chatData) {
        try {
            // Check if chat already exists for this trip
            const existingChat = await this.chatRepository.getChatByTripId(tripId);
            if (existingChat) {
                return existingChat;
            }
            // Get trip details
            const trip = await this.tripRepository.findById(tripId);
            if (!trip) {
                throw error_handler_1.Errors.NotFound("Trip not found");
            }
            // Get all participants (driver + passengers)
            const participants = [trip.driverId, ...trip.passengers];
            // Create chat room
            const chatRoom = {
                tripId,
                type: "trip_chat",
                name: chatData?.name || `Trip to ${trip.destination}`,
                description: chatData?.description ||
                    `Chat for trip on ${trip.date.toDateString()}`,
                participants,
                createdBy,
                isActive: true,
            };
            const createdChat = await this.chatRepository.createChat(chatRoom);
            // Create participant records
            for (const userId of participants) {
                const participant = {
                    userId,
                    chatId: createdChat.id,
                    role: userId === trip.driverId ? "driver" : "passenger",
                    joinedAt: new Date(),
                    notificationsEnabled: true,
                };
                await this.participantRepository.createParticipant(participant);
            }
            // Send system message
            await this.sendSystemMessage(createdChat.id, `Trip chat created for ${trip.destination} on ${trip.date.toDateString()}`);
            this.logger.info("Trip chat created", { tripId, chatId: createdChat.id });
            return createdChat;
        }
        catch (error) {
            this.logger.error("Error creating trip chat", { tripId, error });
            throw error;
        }
    }
    /**
     * Send a message to a chat
     */
    async sendMessage(chatId, senderId, messageData) {
        try {
            // Verify chat exists and user is participant
            const chat = await this.chatRepository.getChatById(chatId);
            if (!chat) {
                throw error_handler_1.Errors.NotFound("Chat not found");
            }
            if (!chat.participants.includes(senderId)) {
                throw error_handler_1.Errors.Forbidden("You are not a participant in this chat");
            }
            if (!chat.isActive) {
                throw error_handler_1.Errors.BadRequest("Chat is no longer active");
            }
            // Get sender info
            const sender = await this.userRepository.findById(senderId);
            if (!sender) {
                throw error_handler_1.Errors.NotFound("Sender not found");
            }
            // Create message
            const message = {
                chatId,
                senderId,
                senderName: `${sender.firstName} ${sender.lastName}`,
                type: messageData.type || "text",
                content: messageData.content,
                metadata: messageData.metadata,
            };
            const createdMessage = await this.messageRepository.createMessage(message);
            // Update chat's last message
            await this.chatRepository.updateChat(chatId, {
                lastMessage: {
                    id: createdMessage.id,
                    content: createdMessage.content,
                    senderId: createdMessage.senderId,
                    senderName: createdMessage.senderName,
                    timestamp: createdMessage.createdAt,
                },
            });
            // Prepare response
            const messageWithSender = {
                ...createdMessage,
                isOwnMessage: true,
            };
            // Send real-time notification to other participants
            if (this.realtimeService) {
                const realtimeEvent = {
                    type: "message",
                    chatId,
                    userId: senderId,
                    data: createdMessage,
                    timestamp: new Date(),
                };
                await this.realtimeService.sendToChat(chatId, realtimeEvent);
            }
            this.logger.info("Message sent", {
                chatId,
                messageId: createdMessage.id,
                senderId,
            });
            return messageWithSender;
        }
        catch (error) {
            this.logger.error("Error sending message", { chatId, senderId, error });
            throw error;
        }
    }
    /**
     * Get messages for a chat
     */
    async getMessages(chatId, userId, options = {}) {
        try {
            // Verify user is participant
            const chat = await this.chatRepository.getChatById(chatId);
            if (!chat) {
                throw error_handler_1.Errors.NotFound("Chat not found");
            }
            if (!chat.participants.includes(userId)) {
                throw error_handler_1.Errors.Forbidden("You are not a participant in this chat");
            }
            const { messages, total } = await this.messageRepository.getMessages(chatId, options);
            // Add isOwnMessage flag
            const messagesWithSender = messages.map((message) => ({
                ...message,
                isOwnMessage: message.senderId === userId,
            }));
            // Update last read timestamp
            await this.participantRepository.updateLastRead(userId, chatId, new Date());
            return { messages: messagesWithSender, total };
        }
        catch (error) {
            this.logger.error("Error getting messages", { chatId, userId, error });
            throw error;
        }
    }
    /**
     * Get user's chats with unread counts
     */
    async getUserChats(userId, options = {}) {
        try {
            const { chats, total } = await this.chatRepository.getUserChats(userId, options);
            // Add unread counts and user role
            const chatsWithUnread = await Promise.all(chats.map(async (chat) => {
                const participant = await this.participantRepository.getParticipant(userId, chat.id);
                const unreadCount = await this.messageRepository.getUnreadCount(chat.id, userId, participant?.lastReadAt);
                return {
                    ...chat,
                    unreadCount,
                    userRole: participant?.role || "passenger",
                };
            }));
            return { chats: chatsWithUnread, total };
        }
        catch (error) {
            this.logger.error("Error getting user chats", { userId, error });
            throw error;
        }
    }
    /**
     * Get or create chat for a trip
     */
    async getOrCreateTripChat(tripId, userId) {
        try {
            // Check if chat already exists
            let chat = await this.chatRepository.getChatByTripId(tripId);
            if (!chat) {
                // Create new chat
                chat = await this.createTripChat(tripId, userId);
            }
            else {
                // Add user as participant if not already
                if (!chat.participants.includes(userId)) {
                    await this.chatRepository.addParticipant(chat.id, userId);
                    // Get trip to determine role
                    const trip = await this.tripRepository.findById(tripId);
                    if (trip) {
                        const participant = {
                            userId,
                            chatId: chat.id,
                            role: userId === trip.driverId ? "driver" : "passenger",
                            joinedAt: new Date(),
                            notificationsEnabled: true,
                        };
                        await this.participantRepository.createParticipant(participant);
                    }
                }
            }
            return chat;
        }
        catch (error) {
            this.logger.error("Error getting or creating trip chat", {
                tripId,
                userId,
                error,
            });
            throw error;
        }
    }
    /**
     * Update message
     */
    async updateMessage(messageId, userId, content) {
        try {
            const message = await this.messageRepository.getMessageById(messageId);
            if (!message) {
                throw error_handler_1.Errors.NotFound("Message not found");
            }
            if (message.senderId !== userId) {
                throw error_handler_1.Errors.Forbidden("You can only edit your own messages");
            }
            // Don't allow editing messages older than 15 minutes
            const editTimeLimit = 15 * 60 * 1000; // 15 minutes
            if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
                throw error_handler_1.Errors.BadRequest("Message is too old to edit");
            }
            const updatedMessage = await this.messageRepository.updateMessage(messageId, { content });
            // Send real-time notification
            if (this.realtimeService && updatedMessage) {
                const realtimeEvent = {
                    type: "message",
                    chatId: message.chatId,
                    userId,
                    data: { ...updatedMessage, type: "edit" },
                    timestamp: new Date(),
                };
                await this.realtimeService.sendToChat(message.chatId, realtimeEvent);
            }
            return updatedMessage;
        }
        catch (error) {
            this.logger.error("Error updating message", { messageId, userId, error });
            throw error;
        }
    }
    /**
     * Delete message
     */
    async deleteMessage(messageId, userId) {
        try {
            const message = await this.messageRepository.getMessageById(messageId);
            if (!message) {
                throw error_handler_1.Errors.NotFound("Message not found");
            }
            if (message.senderId !== userId) {
                throw error_handler_1.Errors.Forbidden("You can only delete your own messages");
            }
            const deleted = await this.messageRepository.deleteMessage(messageId);
            // Send real-time notification
            if (this.realtimeService && deleted) {
                const realtimeEvent = {
                    type: "message",
                    chatId: message.chatId,
                    userId,
                    data: { messageId, type: "delete" },
                    timestamp: new Date(),
                };
                await this.realtimeService.sendToChat(message.chatId, realtimeEvent);
            }
            return deleted;
        }
        catch (error) {
            this.logger.error("Error deleting message", { messageId, userId, error });
            throw error;
        }
    }
    /**
     * Send system message
     */
    async sendSystemMessage(chatId, content) {
        const systemMessage = {
            chatId,
            senderId: "system",
            senderName: "System",
            type: "system",
            content,
            metadata: {
                systemEventType: "chat_created",
            },
        };
        return await this.messageRepository.createMessage(systemMessage);
    }
    /**
     * Handle user joined trip
     */
    async handleUserJoinedTrip(tripId, userId) {
        try {
            const chat = await this.chatRepository.getChatByTripId(tripId);
            if (chat) {
                // Add user to chat
                await this.chatRepository.addParticipant(chat.id, userId);
                // Create participant record
                const participant = {
                    userId,
                    chatId: chat.id,
                    role: "passenger",
                    joinedAt: new Date(),
                    notificationsEnabled: true,
                };
                await this.participantRepository.createParticipant(participant);
                // Get user info
                const user = await this.userRepository.findById(userId);
                const userName = user ? `${user.firstName} ${user.lastName}` : "A user";
                // Send system message
                await this.sendSystemMessage(chat.id, `${userName} joined the trip`);
                // Send real-time notification
                if (this.realtimeService) {
                    const realtimeEvent = {
                        type: "user_joined",
                        chatId: chat.id,
                        tripId,
                        userId,
                        data: { userName },
                        timestamp: new Date(),
                    };
                    await this.realtimeService.sendToChat(chat.id, realtimeEvent);
                }
            }
        }
        catch (error) {
            this.logger.error("Error handling user joined trip", {
                tripId,
                userId,
                error,
            });
        }
    }
    /**
     * Handle user left trip
     */
    async handleUserLeftTrip(tripId, userId) {
        try {
            const chat = await this.chatRepository.getChatByTripId(tripId);
            if (chat) {
                // Get user info before removing
                const user = await this.userRepository.findById(userId);
                const userName = user ? `${user.firstName} ${user.lastName}` : "A user";
                // Remove user from chat
                await this.chatRepository.removeParticipant(chat.id, userId);
                // Send system message
                await this.sendSystemMessage(chat.id, `${userName} left the trip`);
                // Send real-time notification
                if (this.realtimeService) {
                    const realtimeEvent = {
                        type: "user_left",
                        chatId: chat.id,
                        tripId,
                        userId,
                        data: { userName },
                        timestamp: new Date(),
                    };
                    await this.realtimeService.sendToChat(chat.id, realtimeEvent);
                }
            }
        }
        catch (error) {
            this.logger.error("Error handling user left trip", {
                tripId,
                userId,
                error,
            });
        }
    }
    /**
     * Handle trip updated
     */
    async handleTripUpdated(trip, updatedBy) {
        try {
            const chat = await this.chatRepository.getChatByTripId(trip.id);
            if (chat) {
                // Get user info
                const user = await this.userRepository.findById(updatedBy);
                const userName = user
                    ? `${user.firstName} ${user.lastName}`
                    : "The driver";
                // Send system message
                await this.sendSystemMessage(chat.id, `${userName} updated the trip details. Please check the trip information.`);
                // Send real-time notification
                if (this.realtimeService) {
                    const realtimeEvent = {
                        type: "trip_update",
                        chatId: chat.id,
                        tripId: trip.id,
                        userId: updatedBy,
                        data: { trip, updatedBy: userName },
                        timestamp: new Date(),
                    };
                    await this.realtimeService.sendToChat(chat.id, realtimeEvent);
                }
            }
        }
        catch (error) {
            this.logger.error("Error handling trip updated", {
                tripId: trip.id,
                updatedBy,
                error,
            });
        }
    }
    /**
     * Handle typing indicator
     */
    async handleTyping(chatId, userId, isTyping) {
        try {
            // Verify user is participant
            const chat = await this.chatRepository.getChatById(chatId);
            if (!chat || !chat.participants.includes(userId)) {
                return;
            }
            // Send real-time notification
            if (this.realtimeService) {
                await this.realtimeService.notifyTyping(chatId, userId, isTyping);
            }
        }
        catch (error) {
            this.logger.error("Error handling typing", { chatId, userId, error });
        }
    }
    /**
     * Deactivate chat when trip is completed/cancelled
     */
    async deactivateChat(tripId) {
        try {
            const chat = await this.chatRepository.getChatByTripId(tripId);
            if (chat) {
                await this.chatRepository.updateChat(chat.id, { isActive: false });
                await this.sendSystemMessage(chat.id, "This trip has ended. Chat is now read-only.");
            }
        }
        catch (error) {
            this.logger.error("Error deactivating chat", { tripId, error });
        }
    }
}
exports.MessagingService = MessagingService;
