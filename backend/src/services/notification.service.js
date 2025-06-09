"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = exports.NotificationRepository = void 0;
const uuid_1 = require("uuid");
class NotificationRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    async create(notification) {
        const newNotification = {
            ...notification,
            id: (0, uuid_1.v4)(),
            createdAt: new Date(),
        };
        const { resource } = await this.container.items.create(newNotification);
        return resource;
    }
    async findByUserId(userId, options = {}) {
        let query = "SELECT * FROM c WHERE c.userId = @userId";
        const parameters = [{ name: "@userId", value: userId }];
        if (options.read !== undefined) {
            query += " AND c.read = @read";
            parameters.push({ name: "@read", value: options.read.toString() });
        }
        if (options.type) {
            query += " AND c.type = @type";
            parameters.push({ name: "@type", value: options.type });
        }
        // Filter out expired notifications
        query += " AND (c.expiresAt IS NULL OR c.expiresAt > @now)";
        parameters.push({ name: "@now", value: new Date().toISOString() });
        query += " ORDER BY c.createdAt DESC";
        if (options.limit) {
            query += ` OFFSET ${options.offset || 0} LIMIT ${options.limit}`;
        }
        const { resources: notifications } = await this.container.items
            .query({
            query,
            parameters,
        })
            .fetchAll();
        // Get total count
        const countQuery = query
            .replace("SELECT * FROM c", "SELECT VALUE COUNT(1) FROM c")
            .replace(/ORDER BY .+$/, "")
            .replace(/OFFSET .+ LIMIT .+$/, "");
        const { resources: countResult } = await this.container.items
            .query({
            query: countQuery,
            parameters,
        })
            .fetchAll();
        const total = countResult[0] || 0;
        return { notifications, total };
    }
    async markAsRead(notificationId) {
        try {
            const { resource: notification } = await this.container
                .item(notificationId, notificationId)
                .read();
            if (!notification) {
                return false;
            }
            const updatedNotification = {
                ...notification,
                read: true,
            };
            await this.container
                .item(notificationId, notificationId)
                .replace(updatedNotification);
            return true;
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }
    async markAllAsRead(userId) {
        const { notifications } = await this.findByUserId(userId, { read: false });
        let count = 0;
        for (const notification of notifications) {
            const success = await this.markAsRead(notification.id);
            if (success)
                count++;
        }
        return count;
    }
    async delete(notificationId) {
        try {
            await this.container.item(notificationId, notificationId).delete();
            return true;
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }
    async cleanup() {
        const now = new Date().toISOString();
        const query = {
            query: "SELECT * FROM c WHERE c.expiresAt != null AND c.expiresAt <= @now",
            parameters: [{ name: "@now", value: now }],
        };
        const { resources: expiredNotifications } = await this.container.items
            .query(query)
            .fetchAll();
        let deletedCount = 0;
        for (const notification of expiredNotifications) {
            const success = await this.delete(notification.id);
            if (success)
                deletedCount++;
        }
        return deletedCount;
    }
}
exports.NotificationRepository = NotificationRepository;
class NotificationService {
    notificationRepository;
    pushService;
    logger;
    constructor(notificationRepository, pushService, logger) {
        this.notificationRepository = notificationRepository;
        this.pushService = pushService;
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
     * Create a notification
     */
    async createNotification(request) {
        try {
            const notification = await this.notificationRepository.create({
                ...request,
                read: false,
            });
            // Send push notification if service is available
            if (this.pushService) {
                const pushPayload = {
                    title: request.title,
                    body: request.message,
                    data: request.data,
                    badge: 1,
                };
                await this.pushService.sendPushNotification(request.userId, pushPayload);
            }
            this.logger.info("Notification created", {
                notificationId: notification.id,
                userId: request.userId,
            });
            return notification;
        }
        catch (error) {
            this.logger.error("Error creating notification", error);
            throw error;
        }
    }
    /**
     * Get notifications for a user
     */
    async getUserNotifications(userId, options = {}) {
        try {
            return await this.notificationRepository.findByUserId(userId, options);
        }
        catch (error) {
            this.logger.error("Error fetching user notifications", { userId, error });
            throw error;
        }
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        try {
            // TODO: Add user ownership check
            return await this.notificationRepository.markAsRead(notificationId);
        }
        catch (error) {
            this.logger.error("Error marking notification as read", {
                notificationId,
                error,
            });
            throw error;
        }
    }
    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        try {
            const count = await this.notificationRepository.markAllAsRead(userId);
            this.logger.info("Marked all notifications as read", { userId, count });
            return count;
        }
        catch (error) {
            this.logger.error("Error marking all notifications as read", {
                userId,
                error,
            });
            throw error;
        }
    }
    /**
     * Notification helpers for specific events
     */
    async notifyTripJoined(trip, passengerUser) {
        await this.createNotification({
            userId: trip.driverId,
            type: "trip_joined",
            title: "New Passenger",
            message: `${passengerUser.firstName} ${passengerUser.lastName} joined your trip to ${trip.destination}`,
            data: {
                tripId: trip.id,
                passengerId: passengerUser.id,
                destination: trip.destination,
            },
        });
    }
    async notifyTripLeft(trip, passengerUser) {
        await this.createNotification({
            userId: trip.driverId,
            type: "trip_left",
            title: "Passenger Left",
            message: `${passengerUser.firstName} ${passengerUser.lastName} left your trip to ${trip.destination}`,
            data: {
                tripId: trip.id,
                passengerId: passengerUser.id,
                destination: trip.destination,
            },
        });
    }
    async notifyTripUpdated(trip, userIds) {
        const notifications = userIds.map((userId) => ({
            userId,
            type: "trip_updated",
            title: "Trip Updated",
            message: `Trip to ${trip.destination} has been updated. Please check the details.`,
            data: {
                tripId: trip.id,
                destination: trip.destination,
            },
        }));
        await Promise.all(notifications.map((notification) => this.createNotification(notification)));
    }
    async notifyTripCancelled(trip, userIds) {
        const notifications = userIds.map((userId) => ({
            userId,
            type: "trip_cancelled",
            title: "Trip Cancelled",
            message: `Trip to ${trip.destination} on ${trip.date.toDateString()} has been cancelled.`,
            data: {
                tripId: trip.id,
                destination: trip.destination,
                date: trip.date.toISOString(),
            },
        }));
        await Promise.all(notifications.map((notification) => this.createNotification(notification)));
    }
    async notifyNewMessage(chatId, senderName, message, recipientIds) {
        const notifications = recipientIds.map((userId) => ({
            userId,
            type: "message_received",
            title: `New message from ${senderName}`,
            message: message.length > 50 ? `${message.substring(0, 50)}...` : message,
            data: {
                chatId,
                senderName,
            },
        }));
        await Promise.all(notifications.map((notification) => this.createNotification(notification)));
    }
    async notifyTripReminder(trip, userIds) {
        const notifications = userIds.map((userId) => ({
            userId,
            type: "trip_reminder",
            title: "Trip Reminder",
            message: `Your trip to ${trip.destination} is tomorrow at ${trip.departureTime}`,
            data: {
                tripId: trip.id,
                destination: trip.destination,
                departureTime: trip.departureTime,
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire in 24 hours
        }));
        await Promise.all(notifications.map((notification) => this.createNotification(notification)));
    }
    /**
     * Get unread notification count
     */
    async getUnreadCount(userId) {
        const { total } = await this.getUserNotifications(userId, {
            read: false,
            limit: 1,
        });
        return total;
    }
    /**
     * Clean up expired notifications
     */
    async cleanupExpiredNotifications() {
        try {
            const deletedCount = await this.notificationRepository.cleanup();
            this.logger.info("Cleaned up expired notifications", { deletedCount });
            return deletedCount;
        }
        catch (error) {
            this.logger.error("Error cleaning up notifications", error);
            throw error;
        }
    }
    async sendPasswordResetEmail(email, data) {
        this.logger.info(`Sending password reset email to ${email}`, data);
        // In a real implementation, call EmailService or external provider
        return;
    }
}
exports.NotificationService = NotificationService;
