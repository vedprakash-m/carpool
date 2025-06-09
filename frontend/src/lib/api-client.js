"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.ApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
// Mock data for development
const MOCK_USER = {
    id: "mock-user-123",
    email: "admin@vcarpool.com",
    firstName: "Admin",
    lastName: "User",
    role: "parent",
    profilePicture: null,
    phoneNumber: "+1234567890",
    organizationId: "mock-org-123",
    preferences: {
        notifications: {
            email: true,
            push: true,
            sms: false,
            tripReminders: true,
            swapRequests: true,
            scheduleChanges: true,
        },
        privacy: {
            showPhoneNumber: true,
            showEmail: false,
        },
        pickupLocation: "Home",
        dropoffLocation: "School",
        preferredTime: "08:00",
        isDriver: true,
        smokingAllowed: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
};
class ApiClient {
    client;
    token = null;
    refreshToken = null;
    refreshPromise = null;
    isRefreshing = false;
    isMockMode = false;
    requestsQueue = [];
    constructor(baseURL = process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:7071/api") {
        this.client = axios_1.default.create({
            baseURL,
            timeout: 10000,
            headers: {
                "Content-Type": "application/json",
            },
        });
        // Check if mock mode was previously enabled
        if (typeof window !== "undefined") {
            const mockMode = localStorage.getItem("MOCK_AUTH");
            if (mockMode === "true") {
                this.isMockMode = true;
            }
        }
        // Temporarily enable mock mode for registration until backend is fixed
        // This allows users to test the complete registration flow
        this.enableMockMode();
        // Request interceptor to add auth token
        this.client.interceptors.request.use((config) => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        }, (error) => {
            return Promise.reject(error);
        });
        // Response interceptor to handle token refresh
        this.client.interceptors.response.use((response) => response, async (error) => {
            const originalRequest = error.config;
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                try {
                    const newToken = await this.refreshAccessToken();
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return this.client(originalRequest);
                }
                catch (refreshError) {
                    // Refresh failed, redirect to login
                    this.clearToken();
                    if (typeof window !== "undefined") {
                        window.location.href = "/login";
                    }
                    return Promise.reject(refreshError);
                }
            }
            return Promise.reject(error);
        });
    }
    // Mock authentication methods
    mockLogin(credentials) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        user: MOCK_USER,
                        token: "mock-token-" + Date.now(),
                        refreshToken: "mock-refresh-token-" + Date.now(),
                    },
                });
            }, 500); // Simulate network delay
        });
    }
    mockRegister(userData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        user: {
                            ...MOCK_USER,
                            email: userData.email,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            role: userData.role,
                        },
                        token: "mock-token-" + Date.now(),
                        refreshToken: "mock-refresh-token-" + Date.now(),
                    },
                });
            }, 500);
        });
    }
    // Enable/disable mock mode
    enableMockMode() {
        this.isMockMode = true;
        if (typeof window !== "undefined") {
            localStorage.setItem("MOCK_AUTH", "true");
        }
    }
    disableMockMode() {
        this.isMockMode = false;
        if (typeof window !== "undefined") {
            localStorage.removeItem("MOCK_AUTH");
        }
    }
    setToken(token, refreshToken) {
        this.token = token;
        if (refreshToken) {
            this.refreshToken = refreshToken;
        }
        if (typeof window !== "undefined") {
            localStorage.setItem("access_token", token);
            if (refreshToken) {
                localStorage.setItem("refresh_token", refreshToken);
            }
        }
    }
    clearToken() {
        this.token = null;
        this.refreshToken = null;
        if (typeof window !== "undefined") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
        }
    }
    loadToken() {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("access_token");
            const refreshToken = localStorage.getItem("refresh_token");
            if (token) {
                this.token = token;
            }
            if (refreshToken) {
                this.refreshToken = refreshToken;
            }
        }
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken() {
        // If we're already refreshing, return the existing promise
        if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
                this.requestsQueue.push({ resolve, reject });
            });
        }
        this.isRefreshing = true;
        try {
            if (!this.refreshToken) {
                throw new Error("No refresh token available");
            }
            const response = await axios_1.default.post(`${this.client.defaults.baseURL}/v1/auth/refresh-token`, { refreshToken: this.refreshToken });
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error || "Failed to refresh token");
            }
            const { token, refreshToken } = response.data.data;
            // Update tokens
            this.token = token;
            if (refreshToken) {
                this.refreshToken = refreshToken;
            }
            // Save to localStorage
            if (typeof window !== "undefined") {
                localStorage.setItem("access_token", token);
                if (refreshToken) {
                    localStorage.setItem("refresh_token", refreshToken);
                }
            }
            // Process any queued requests
            this.requestsQueue.forEach((request) => {
                request.resolve(token);
            });
            this.requestsQueue = [];
            this.isRefreshing = false;
            return token;
        }
        catch (error) {
            // Clear tokens on refresh failure
            this.clearToken();
            // Reject all queued requests
            this.requestsQueue.forEach((request) => {
                request.reject(error);
            });
            this.requestsQueue = [];
            this.isRefreshing = false;
            throw error;
        }
    }
    async get(url, config) {
        // Check for mock mode and various endpoints
        if (this.isMockMode) {
            // Mock trips stats for dashboard (support both /trips/stats and /v1/trips/stats)
            if (url === "/trips/stats" || url === "/v1/trips/stats") {
                return Promise.resolve({
                    success: true,
                    data: {
                        totalTrips: 12,
                        tripsAsDriver: 8,
                        tripsAsPassenger: 4,
                        totalDistance: 2450,
                        costSavings: 450,
                        upcomingTrips: 3,
                    },
                });
            }
            // Mock trips list (support both /trips and /v1/trips)
            if (url.startsWith("/trips") || url.startsWith("/v1/trips")) {
                return Promise.resolve({
                    success: true,
                    data: [
                        {
                            id: "trip-1",
                            driverId: "mock-driver-1",
                            destination: "Lincoln Elementary School",
                            pickupLocations: [],
                            date: new Date(Date.now() + 86400000),
                            departureTime: "07:45",
                            arrivalTime: "08:00",
                            maxPassengers: 4,
                            passengers: ["child-1"],
                            availableSeats: 3,
                            cost: 0,
                            status: "planned",
                            notes: "Morning school drop-off",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                        {
                            id: "trip-2",
                            driverId: "mock-driver-2",
                            destination: "Jefferson Middle School",
                            pickupLocations: [],
                            date: new Date(Date.now() + 172800000),
                            departureTime: "15:15",
                            arrivalTime: "15:30",
                            maxPassengers: 3,
                            passengers: [],
                            availableSeats: 3,
                            cost: 0,
                            status: "planned",
                            notes: "Afternoon pickup",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    ],
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 2,
                        totalPages: 1,
                    },
                });
            }
            // Mock user profile (support both /users/me and /v1/users/me)
            if (url === "/users/me" || url === "/v1/users/me") {
                return Promise.resolve({
                    success: true,
                    data: MOCK_USER,
                });
            }
            // Mock messages
            if (url.startsWith("/messages")) {
                return Promise.resolve({
                    success: true,
                    data: {
                        data: [
                            {
                                id: "msg-1",
                                content: "Welcome to VCarpool! This is a mock message.",
                                senderId: "mock-user-456",
                                senderName: "System Admin",
                                tripId: "trip-1",
                                createdAt: new Date().toISOString(),
                                type: "SYSTEM",
                            },
                        ],
                        total: 1,
                        page: 1,
                        limit: 10,
                    },
                });
            }
            // Mock any other GET requests
            return Promise.resolve({
                success: true,
                data: {},
            });
        }
        try {
            const response = await this.client.get(url, config);
            return response.data;
        }
        catch (error) {
            console.error("API GET request failed:", error);
            throw error;
        }
    }
    async post(url, data, config) {
        // Check for mock mode and auth endpoints
        if (this.isMockMode) {
            if (url === "/v1/auth/token" || url === "/auth/login-simple") {
                return this.mockLogin(data);
            }
            if (url === "/v1/auth/register") {
                return this.mockRegister(data);
            }
            // For other endpoints in mock mode, return success
            if (url.startsWith("/v1/auth/") || url.startsWith("/auth/")) {
                return Promise.resolve({
                    success: true,
                    data: {},
                });
            }
        }
        try {
            const response = await this.client.post(url, data, config);
            return response.data;
        }
        catch (error) {
            console.error("API POST request failed:", error);
            throw error;
        }
    }
    async put(url, data, config) {
        const response = await this.client.put(url, data, config);
        return response.data;
    }
    async delete(url, config) {
        const response = await this.client.delete(url, config);
        return response.data;
    }
    async getPaginated(url, params, config) {
        const response = await this.client.get(url, {
            ...config,
            params: { ...config?.params, ...params },
        });
        return response.data;
    }
}
exports.ApiClient = ApiClient;
// Create singleton instance
// Always use production backend API for now since local backend setup is complex
const getApiUrl = () => {
    // For now, always use production API to avoid local setup complexity
    return "https://vcarpool-api-prod.azurewebsites.net/api";
    // Future: Enable local development when needed
    // if (
    //   typeof window !== "undefined" &&
    //   window.location.hostname.includes("azurestaticapps.net")
    // ) {
    //   return "https://vcarpool-api-prod.azurewebsites.net/api";
    // }
    // return process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api";
};
exports.apiClient = new ApiClient(getApiUrl());
// Initialize token on client side
if (typeof window !== "undefined") {
    exports.apiClient.loadToken();
}
