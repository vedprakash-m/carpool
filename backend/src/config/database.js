"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containers = exports.database = exports.cosmosClient = void 0;
exports.initializeDatabase = initializeDatabase;
const cosmos_1 = require("@azure/cosmos");
const endpoint = process.env.COSMOS_DB_ENDPOINT || "";
const key = process.env.COSMOS_DB_KEY || "";
const databaseId = process.env.COSMOS_DB_DATABASE_ID || "vcarpool";
exports.cosmosClient = new cosmos_1.CosmosClient({ endpoint, key });
exports.database = exports.cosmosClient.database(databaseId);
// Container names
const CONTAINER_NAMES = {
    users: "users",
    trips: "trips",
    schedules: "schedules",
    swapRequests: "swapRequests",
    emailTemplates: "email-templates",
    messages: "messages",
    chats: "chats",
    chatParticipants: "chatParticipants",
    notifications: "notifications",
    weeklyPreferences: "weeklyPreferences",
};
// Container references
exports.containers = {
    users: exports.database.container(CONTAINER_NAMES.users),
    trips: exports.database.container(CONTAINER_NAMES.trips),
    schedules: exports.database.container(CONTAINER_NAMES.schedules),
    swapRequests: exports.database.container(CONTAINER_NAMES.swapRequests),
    emailTemplates: exports.database.container(CONTAINER_NAMES.emailTemplates),
    messages: exports.database.container(CONTAINER_NAMES.messages),
    chats: exports.database.container(CONTAINER_NAMES.chats),
    chatParticipants: exports.database.container(CONTAINER_NAMES.chatParticipants),
    notifications: exports.database.container(CONTAINER_NAMES.notifications),
    weeklyPreferences: exports.database.container(CONTAINER_NAMES.weeklyPreferences),
};
// Initialize database and containers
async function initializeDatabase() {
    try {
        // Create database if it doesn't exist
        await exports.cosmosClient.databases.createIfNotExists({ id: databaseId });
        // Create containers if they don't exist
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.users,
            partitionKey: "/id",
        });
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.trips,
            partitionKey: "/driverId",
        });
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.schedules,
            partitionKey: "/userId",
        });
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.swapRequests,
            partitionKey: "/requesterId",
        });
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.emailTemplates,
            partitionKey: "/id",
        });
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.messages,
            partitionKey: "/id",
        });
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.chats,
            partitionKey: "/id",
        });
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.chatParticipants,
            partitionKey: "/id",
        });
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.notifications,
            partitionKey: "/id",
        });
        await exports.database.containers.createIfNotExists({
            id: CONTAINER_NAMES.weeklyPreferences,
            partitionKey: "/driverParentId",
        });
        console.log("Database and containers initialized successfully");
    }
    catch (error) {
        console.error("Error initializing database:", error);
        throw error;
    }
}
