"use strict";
/**
 * WebSocket Service for Real-time Communication
 * Handles live messaging, notifications, and real-time updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebSocket = useWebSocket;
const react_1 = require("react");
class WebSocketService {
    ws = null;
    config;
    reconnectAttempts = 0;
    reconnectTimer = null;
    heartbeatTimer = null;
    messageHandlers = new Map();
    connectionListeners = new Set();
    isConnected = false;
    messageQueue = [];
    constructor(config) {
        this.config = config;
    }
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.url);
                this.ws.onopen = () => {
                    console.log("WebSocket connected");
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.flushMessageQueue();
                    this.notifyConnectionListeners(true);
                    resolve();
                };
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                this.ws.onclose = (event) => {
                    console.log("WebSocket disconnected:", event.code, event.reason);
                    this.isConnected = false;
                    this.stopHeartbeat();
                    this.notifyConnectionListeners(false);
                    if (!event.wasClean &&
                        this.reconnectAttempts < this.config.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };
                this.ws.onerror = (error) => {
                    console.error("WebSocket error:", error);
                    reject(error);
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close(1000, "Client disconnect");
            this.ws = null;
        }
        this.isConnected = false;
        this.notifyConnectionListeners(false);
    }
    sendMessage(message) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
        }
        else {
            // Queue message for later sending
            this.messageQueue.push(message);
        }
    }
    // Message type handlers
    onMessage(handler) {
        this.messageHandlers.set("message", handler);
    }
    onNotification(handler) {
        this.messageHandlers.set("notification", handler);
    }
    onLocationUpdate(handler) {
        this.messageHandlers.set("location_update", handler);
    }
    onTripStatus(handler) {
        this.messageHandlers.set("trip_status", handler);
    }
    onTyping(handler) {
        this.messageHandlers.set("typing", handler);
    }
    onUserJoined(handler) {
        this.messageHandlers.set("user_joined", handler);
    }
    onUserLeft(handler) {
        this.messageHandlers.set("user_left", handler);
    }
    // Send typing indicator
    sendTyping(chatId, isTyping) {
        this.sendMessage({
            type: "typing",
            data: { chatId, isTyping },
            timestamp: new Date().toISOString(),
            chatId,
        });
    }
    // Join chat room
    joinChat(chatId) {
        this.sendMessage({
            type: "user_joined",
            data: { chatId },
            timestamp: new Date().toISOString(),
            chatId,
        });
    }
    // Leave chat room
    leaveChat(chatId) {
        this.sendMessage({
            type: "user_left",
            data: { chatId },
            timestamp: new Date().toISOString(),
            chatId,
        });
    }
    onConnectionChange(listener) {
        this.connectionListeners.add(listener);
    }
    removeConnectionListener(listener) {
        this.connectionListeners.delete(listener);
    }
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            if (message.type === "heartbeat") {
                this.sendMessage({
                    type: "heartbeat",
                    data: { pong: true },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                handler(message.data);
            }
        }
        catch (error) {
            console.error("Error parsing WebSocket message:", error);
        }
    }
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(console.error);
        }, delay);
    }
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.sendMessage({
                    type: "heartbeat",
                    data: { ping: true },
                    timestamp: new Date().toISOString(),
                });
            }
        }, this.config.heartbeatInterval);
    }
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                this.sendMessage(message);
            }
        }
    }
    notifyConnectionListeners(connected) {
        this.connectionListeners.forEach((listener) => listener(connected));
    }
    get connected() {
        return this.isConnected;
    }
}
// React Hook for WebSocket
function useWebSocket(chatId) {
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [notifications, setNotifications] = (0, react_1.useState)([]);
    const [typingUsers, setTypingUsers] = (0, react_1.useState)(new Set());
    const [onlineUsers, setOnlineUsers] = (0, react_1.useState)(new Set());
    const wsRef = (0, react_1.useRef)(null);
    const typingTimeoutRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const config = {
            url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
            reconnectInterval: 5000,
            maxReconnectAttempts: 5,
            heartbeatInterval: 30000,
        };
        wsRef.current = new WebSocketService(config);
        // Set up message handlers
        wsRef.current.onMessage((data) => {
            setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((msg) => msg.id === data.id))
                    return prev;
                return [...prev, data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
        });
        wsRef.current.onNotification((data) => {
            setNotifications((prev) => [...prev, data]);
        });
        wsRef.current.onTyping((data) => {
            if (!chatId || data.chatId !== chatId)
                return;
            setTypingUsers((prev) => {
                const newSet = new Set(prev);
                if (data.isTyping) {
                    newSet.add(data.userId);
                }
                else {
                    newSet.delete(data.userId);
                }
                return newSet;
            });
        });
        wsRef.current.onUserJoined((data) => {
            if (!chatId || data.chatId !== chatId)
                return;
            setOnlineUsers((prev) => new Set(Array.from(prev).concat(data.userId)));
        });
        wsRef.current.onUserLeft((data) => {
            if (!chatId || data.chatId !== chatId)
                return;
            setOnlineUsers((prev) => {
                const newArray = Array.from(prev).filter((id) => id !== data.userId);
                return new Set(newArray);
            });
        });
        wsRef.current.onConnectionChange(setIsConnected);
        // Connect
        wsRef.current.connect().catch(console.error);
        // Join chat if provided
        if (chatId) {
            wsRef.current.connect().then(() => {
                wsRef.current?.joinChat(chatId);
            });
        }
        return () => {
            if (chatId && wsRef.current) {
                wsRef.current.leaveChat(chatId);
            }
            wsRef.current?.disconnect();
        };
    }, [chatId]);
    const sendMessage = (message) => {
        wsRef.current?.sendMessage({
            ...message,
            timestamp: new Date().toISOString(),
        });
    };
    const sendTyping = (isTyping) => {
        if (!chatId)
            return;
        wsRef.current?.sendTyping(chatId, isTyping);
        // Auto-stop typing after 3 seconds
        if (isTyping) {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                wsRef.current?.sendTyping(chatId, false);
            }, 3000);
        }
    };
    const clearMessages = () => setMessages([]);
    const clearNotifications = () => setNotifications([]);
    return {
        isConnected,
        messages,
        notifications,
        typingUsers,
        onlineUsers,
        sendMessage,
        sendTyping,
        clearMessages,
        clearNotifications,
        service: wsRef.current,
    };
}
exports.default = WebSocketService;
