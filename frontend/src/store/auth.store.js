"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const api_client_1 = require("../lib/api-client");
exports.useAuthStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    // State
    user: null,
    token: null,
    refreshToken: null,
    isLoading: false,
    isAuthenticated: false,
    loading: false,
    error: null,
    // Actions
    clearError: () => set({ error: null }),
    login: async (credentials) => {
        try {
            set({ isLoading: true });
            const response = await api_client_1.apiClient.post("/v1/auth/token", credentials);
            if (response.success && response.data) {
                const { user, token, refreshToken } = response.data;
                // Set token in API client with refresh token
                api_client_1.apiClient.setToken(token, refreshToken);
                set({
                    user,
                    token,
                    refreshToken,
                    isAuthenticated: true,
                    isLoading: false,
                });
            }
            else {
                throw new Error(response.error || "Login failed");
            }
        }
        catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },
    register: async (userData) => {
        try {
            set({ isLoading: true });
            const response = await api_client_1.apiClient.post("/v1/auth/register", userData);
            if (response.success && response.data) {
                const { user, token, refreshToken } = response.data;
                // Set token in API client with refresh token
                api_client_1.apiClient.setToken(token, refreshToken);
                set({
                    user,
                    token,
                    refreshToken,
                    isAuthenticated: true,
                    isLoading: false,
                });
            }
            else {
                throw new Error(response.error || "Registration failed");
            }
        }
        catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },
    logout: () => {
        api_client_1.apiClient.clearToken();
        set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
        });
    },
    refreshAuth: async () => {
        try {
            set({ loading: true });
            // Use apiClient's refreshAccessToken method
            const token = await api_client_1.apiClient.refreshAccessToken();
            // Get the current user info to verify our session
            const userResponse = await api_client_1.apiClient.get("/v1/users/me");
            if (userResponse.success && userResponse.data) {
                set({
                    user: userResponse.data,
                    token,
                    isAuthenticated: true,
                    loading: false,
                    error: null,
                });
                return;
            }
            throw new Error("Failed to get user data");
        }
        catch (error) {
            console.error("Error refreshing auth:", error);
            // Clear all auth data on refresh failure
            api_client_1.apiClient.clearToken();
            set({
                user: null,
                token: null,
                refreshToken: null,
                isAuthenticated: false,
                loading: false,
                error: error instanceof Error
                    ? error.message
                    : "Authentication refresh failed",
            });
        }
    },
    updateUser: async (updates) => {
        try {
            const response = await api_client_1.apiClient.put("/v1/users/me", updates);
            if (response.success && response.data) {
                set({ user: response.data });
            }
            else {
                throw new Error(response.error || "Update failed");
            }
        }
        catch (error) {
            throw error;
        }
    },
    updateProfile: async (updates) => {
        try {
            set({ loading: true, error: null });
            const response = await api_client_1.apiClient.put("/v1/users/me", updates);
            if (response.success && response.data) {
                set({
                    user: response.data,
                    loading: false,
                });
                return true;
            }
            else {
                set({
                    error: response.error || "Update failed",
                    loading: false,
                });
                return false;
            }
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : "Update failed",
                loading: false,
            });
            return false;
        }
    },
    changePassword: async (currentPassword, newPassword) => {
        try {
            set({ loading: true, error: null });
            const response = await api_client_1.apiClient.put("/v1/users/me/password", { currentPassword, newPassword });
            if (response.success && response.data) {
                set({
                    loading: false,
                    error: null,
                });
                return true;
            }
            else {
                set({
                    error: response.error || "Password change failed",
                    loading: false,
                });
                return false;
            }
        }
        catch (error) {
            set({
                error: error instanceof Error ? error.message : "Password change failed",
                loading: false,
            });
            return false;
        }
    },
    initialize: () => {
        const { token } = get();
        if (token) {
            api_client_1.apiClient.setToken(token);
            set({ isAuthenticated: true });
        }
    },
}), {
    name: "auth-storage",
    partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
    }),
}));
