"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTripStore = void 0;
const zustand_1 = require("zustand");
const trip_api_1 = require("../lib/trip-api");
const initialState = {
    trips: [],
    currentTrip: null,
    stats: null,
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    },
};
exports.useTripStore = (0, zustand_1.create)((set, get) => ({
    ...initialState,
    fetchTrips: async (filters) => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.getTrips(filters);
            if (response.success && response.data && response.pagination) {
                set({
                    trips: response.data,
                    pagination: response.pagination,
                    loading: false,
                });
            }
            else {
                set({
                    error: response.error || "Failed to fetch trips",
                    loading: false,
                });
            }
        }
        catch (error) {
            console.error("Error fetching trips:", error);
            set({ error: "Failed to fetch trips", loading: false });
        }
    },
    fetchTripById: async (tripId) => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.getTripById(tripId);
            if (response.success && response.data) {
                set({
                    currentTrip: response.data,
                    loading: false,
                });
            }
            else {
                set({
                    error: response.error || "Failed to fetch trip",
                    loading: false,
                });
            }
        }
        catch (error) {
            console.error("Error fetching trip:", error);
            set({ error: "Failed to fetch trip", loading: false });
        }
    },
    fetchMyTrips: async () => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.getMyTrips();
            if (response.success && response.data && response.pagination) {
                set({
                    trips: response.data,
                    pagination: response.pagination,
                    loading: false,
                });
            }
            else {
                set({
                    error: response.error || "Failed to fetch your trips",
                    loading: false,
                });
            }
        }
        catch (error) {
            console.error("Error fetching my trips:", error);
            set({ error: "Failed to fetch your trips", loading: false });
        }
    },
    fetchAvailableTrips: async (date) => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.getAvailableTrips(date);
            if (response.success && response.data && response.pagination) {
                set({
                    trips: response.data,
                    pagination: response.pagination,
                    loading: false,
                });
            }
            else {
                set({
                    error: response.error || "Failed to fetch available trips",
                    loading: false,
                });
            }
        }
        catch (error) {
            console.error("Error fetching available trips:", error);
            set({ error: "Failed to fetch available trips", loading: false });
        }
    },
    fetchTripStats: async () => {
        try {
            const stats = await trip_api_1.tripApi.getTripStats();
            set({ stats });
            return stats;
        }
        catch (error) {
            console.error("Error fetching trip stats:", error);
            throw error;
        }
    },
    createTrip: async (tripData) => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.createTrip(tripData);
            if (response.success && response.data) {
                // Add the new trip to the beginning of the list
                const currentTrips = get().trips;
                set({
                    trips: [response.data, ...currentTrips],
                    loading: false,
                });
                return true;
            }
            else {
                set({
                    error: response.error || "Failed to create trip",
                    loading: false,
                });
                return false;
            }
        }
        catch (error) {
            console.error("Error creating trip:", error);
            set({ error: "Failed to create trip", loading: false });
            return false;
        }
    },
    updateTrip: async (tripId, updates) => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.updateTrip(tripId, updates);
            if (response.success && response.data) {
                // Update the trip in the list
                const currentTrips = get().trips;
                const updatedTrips = currentTrips.map((trip) => trip.id === tripId ? response.data : trip);
                set({
                    trips: updatedTrips,
                    currentTrip: get().currentTrip?.id === tripId
                        ? response.data
                        : get().currentTrip,
                    loading: false,
                });
                return true;
            }
            else {
                set({
                    error: response.error || "Failed to update trip",
                    loading: false,
                });
                return false;
            }
        }
        catch (error) {
            console.error("Error updating trip:", error);
            set({ error: "Failed to update trip", loading: false });
            return false;
        }
    },
    deleteTrip: async (tripId) => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.deleteTrip(tripId);
            if (response.success && response.data) {
                // Update the trip in the list
                const currentTrips = get().trips;
                const updatedTrips = currentTrips.filter((trip) => trip.id !== tripId);
                set({
                    trips: updatedTrips,
                    loading: false,
                });
                return true;
            }
            else {
                set({
                    error: response.error || "Failed to delete trip",
                    loading: false,
                });
                return false;
            }
        }
        catch (error) {
            console.error("Error deleting trip:", error);
            set({ error: "Failed to delete trip", loading: false });
            return false;
        }
    },
    joinTrip: async (tripId, pickupLocation) => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.joinTrip(tripId, { pickupLocation });
            if (response.success && response.data) {
                // Update the trip in the list
                const currentTrips = get().trips;
                const updatedTrips = currentTrips.map((trip) => trip.id === tripId ? response.data : trip);
                set({
                    trips: updatedTrips,
                    loading: false,
                });
                return true;
            }
            else {
                set({ error: response.error || "Failed to join trip", loading: false });
                return false;
            }
        }
        catch (error) {
            console.error("Error joining trip:", error);
            set({ error: "Failed to join trip", loading: false });
            return false;
        }
    },
    leaveTrip: async (tripId) => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.leaveTrip(tripId);
            if (response.success && response.data) {
                // Update the trip in the list
                const currentTrips = get().trips;
                const updatedTrips = currentTrips.map((trip) => trip.id === tripId ? response.data : trip);
                set({
                    trips: updatedTrips,
                    loading: false,
                });
                return true;
            }
            else {
                set({
                    error: response.error || "Failed to leave trip",
                    loading: false,
                });
                return false;
            }
        }
        catch (error) {
            console.error("Error leaving trip:", error);
            set({ error: "Failed to leave trip", loading: false });
            return false;
        }
    },
    setCurrentTrip: (trip) => {
        set({ currentTrip: trip });
    },
    clearError: () => {
        set({ error: null });
    },
    reset: () => {
        set(initialState);
    },
    searchTrips: async (searchFilters) => {
        set({ loading: true, error: null });
        try {
            const response = await trip_api_1.tripApi.searchTrips(searchFilters);
            if (response.success && response.data && response.pagination) {
                set({
                    trips: response.data,
                    pagination: response.pagination,
                    loading: false,
                });
            }
            else {
                set({
                    error: response.error || "Failed to search trips",
                    loading: false,
                });
            }
        }
        catch (error) {
            console.error("Error searching trips:", error);
            set({ error: "Failed to search trips", loading: false });
        }
    },
}));
