/**
 * Tests for trip store
 * Testing trip management state with Zustand
 */

import { act, renderHook } from "@testing-library/react";
import { useTripStore } from "../../stores/trip.store";
import { tripApi } from "../../lib/api/trip";
import { Trip, TripStatus, PaginatedResponse } from "@vcarpool/shared";

// Mock the API
jest.mock("../../lib/api/trip", () => ({
  tripApi: {
    getTrips: jest.fn(),
    getMyTrips: jest.fn(),
    createTrip: jest.fn(),
    updateTrip: jest.fn(),
    deleteTrip: jest.fn(),
    joinTrip: jest.fn(),
    leaveTrip: jest.fn(),
    getTripById: jest.fn(),
  },
}));

const mockTripApi = tripApi as jest.Mocked<typeof tripApi>;

describe("useTripStore", () => {
  const mockTrip: Trip = {
    id: "1",
    driverId: "driver1",
    passengers: [],
    date: new Date("2024-01-20"),
    departureTime: "10:00",
    arrivalTime: "12:00",
    pickupLocations: [],
    destination: "Destination City",
    maxPassengers: 4,
    availableSeats: 4,
    status: "active" as TripStatus,
    cost: 25,
    notes: "Test trip",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  };

  const mockTripStats = {
    totalTrips: 10,
    tripsAsDriver: 6,
    tripsAsPassenger: 4,
    totalDistance: 150.5,
    costSavings: 85.25,
    upcomingTrips: 3,
  };

  const mockPagination = {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    // Reset store state
    useTripStore.setState({
      trips: [],
      myTrips: [],
      isLoading: false,
      error: null,
      searchFilters: {
        origin: "",
        destination: "",
        date: "",
        maxCost: undefined,
        availableSeats: undefined,
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });

    // Clear mocks
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useTripStore());

      expect(result.current.trips).toEqual([]);
      expect(result.current.myTrips).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchFilters).toEqual({
        origin: "",
        destination: "",
        date: "",
        maxCost: undefined,
        availableSeats: undefined,
      });
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe("fetchTrips", () => {
    it("should fetch trips successfully", async () => {
      const mockPaginatedResponse: PaginatedResponse<Trip> = {
        success: true,
        data: [mockTrip],
        pagination: mockPagination,
      };

      mockTripApi.getTrips.mockResolvedValueOnce(mockPaginatedResponse);

      const { fetchTrips } = useTripStore.getState();
      await fetchTrips();

      const state = useTripStore.getState();
      expect(state.trips).toEqual([mockTrip]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.pagination).toEqual(mockPaginatedResponse.pagination);
    });

    it("should handle fetch trips error", async () => {
      const errorResponse = {
        success: false,
        error: "Failed to fetch trips",
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      mockTripApi.getTrips.mockResolvedValueOnce(errorResponse);

      const { fetchTrips } = useTripStore.getState();
      await fetchTrips();

      const state = useTripStore.getState();
      expect(state.trips).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Failed to fetch trips");
    });

    it("should set loading state during fetch", async () => {
      const tripsPromise = new Promise<PaginatedResponse<Trip>>((resolve) => {
        setTimeout(() => resolve(mockPagination), 100);
      });

      mockTripApi.getTrips.mockReturnValueOnce(tripsPromise);

      const { fetchTrips } = useTripStore.getState();
      const fetchPromise = fetchTrips();

      // Check loading state
      expect(useTripStore.getState().isLoading).toBe(true);

      await fetchPromise;

      // Check final state
      const state = useTripStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.trips).toEqual([mockTrip]);
    });
  });

  describe("fetchMyTrips", () => {
    it("should fetch user trips successfully", async () => {
      const mockPaginatedResponse: PaginatedResponse<Trip> = {
        success: true,
        data: [mockTrip],
        pagination: mockPagination,
      };

      mockTripApi.getMyTrips.mockResolvedValueOnce(mockPaginatedResponse);

      const { fetchMyTrips } = useTripStore.getState();
      await fetchMyTrips();

      const state = useTripStore.getState();
      expect(state.myTrips).toEqual([mockTrip]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should handle fetch my trips error", async () => {
      const errorResponse = {
        success: false,
        error: "Failed to fetch your trips",
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      mockTripApi.getMyTrips.mockResolvedValueOnce(errorResponse);

      const { fetchMyTrips } = useTripStore.getState();
      await fetchMyTrips();

      const state = useTripStore.getState();
      expect(state.myTrips).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Failed to fetch your trips");
    });
  });

  describe("fetchAvailableTrips", () => {
    it("should fetch available trips successfully", async () => {
      mockTripApi.getAvailableTrips.mockResolvedValueOnce({
        success: true,
        data: [mockTrip],
        pagination: mockPagination,
      });

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchAvailableTrips();
      });

      expect(mockTripApi.getAvailableTrips).toHaveBeenCalledWith(undefined);
      expect(result.current.trips).toEqual([mockTrip]);
    });

    it("should fetch available trips with date filter", async () => {
      const testDate = "2024-12-25";

      mockTripApi.getAvailableTrips.mockResolvedValueOnce({
        success: true,
        data: [mockTrip],
        pagination: mockPagination,
      });

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchAvailableTrips(testDate);
      });

      expect(mockTripApi.getAvailableTrips).toHaveBeenCalledWith(testDate);
    });
  });

  describe("fetchTripStats", () => {
    it("should fetch trip stats successfully", async () => {
      mockTripApi.getTripStats.mockResolvedValueOnce({
        success: true,
        data: mockTripStats,
      });

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchTripStats();
      });

      expect(mockTripApi.getTripStats).toHaveBeenCalled();
      expect(result.current.stats).toEqual(mockTripStats);
    });

    it("should handle fetch stats error silently", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockTripApi.getTripStats.mockRejectedValueOnce(new Error("Stats error"));

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchTripStats();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching trip stats:",
        expect.any(Error)
      );
      expect(result.current.stats).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("createTrip", () => {
    it("should create trip successfully", async () => {
      const createRequest: Trip = {
        date: "2024-12-25",
        departureTime: "09:00",
        arrivalTime: "10:30",
        destination: "Downtown School",
        maxPassengers: 4,
        cost: 15.5,
        notes: "Test trip",
      };

      mockTripApi.createTrip.mockResolvedValueOnce({
        success: true,
        data: mockTrip,
      });

      const { result } = renderHook(() => useTripStore());

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createTrip(createRequest);
      });

      expect(mockTripApi.createTrip).toHaveBeenCalledWith(createRequest);
      expect(result.current.trips).toEqual([mockTrip]);
      expect(createResult!).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle create trip error", async () => {
      const createRequest: Trip = {
        date: "2024-12-25",
        departureTime: "09:00",
        arrivalTime: "10:30",
        destination: "Downtown School",
        maxPassengers: 4,
      };

      mockTripApi.createTrip.mockResolvedValueOnce({
        success: false,
        error: "Failed to create trip",
      });

      const { result } = renderHook(() => useTripStore());

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createTrip(createRequest);
      });

      expect(createResult!).toBe(false);
      expect(result.current.error).toBe("Failed to create trip");
      expect(result.current.trips).toEqual([]);
    });
  });

  describe("updateTrip", () => {
    it("should update trip successfully", async () => {
      const updatedTrip: Trip = {
        ...mockTrip,
        destination: "New Destination",
        date: new Date("2024-01-25"),
        updatedAt: new Date(),
      };

      const updateResponse = {
        success: true,
        data: updatedTrip,
      };

      mockTripApi.updateTrip.mockResolvedValueOnce(updateResponse);

      // Set initial state with the original trip
      useTripStore.setState({
        trips: [mockTrip],
        myTrips: [mockTrip],
      });

      const { updateTrip } = useTripStore.getState();
      await updateTrip("1", {
        destination: "New Destination",
        date: "2024-01-25",
      });

      const state = useTripStore.getState();
      expect(state.trips[0].destination).toBe("New Destination");
      expect(state.myTrips[0].destination).toBe("New Destination");
      expect(state.error).toBeNull();
    });

    it("should handle update trip error", async () => {
      const tripId = "trip-123";
      const updates: Trip = {
        destination: "Updated School",
      };

      mockTripApi.updateTrip.mockResolvedValueOnce({
        success: false,
        error: "Failed to update trip",
      });

      const { result } = renderHook(() => useTripStore());

      let updateResult: boolean;
      await act(async () => {
        updateResult = await result.current.updateTrip(tripId, updates);
      });

      expect(updateResult!).toBe(false);
      expect(result.current.error).toBe("Failed to update trip");
    });
  });

  describe("joinTrip", () => {
    it("should join trip successfully", async () => {
      const tripId = "trip-123";
      const pickupLocation = "456 Oak St";
      const updatedTrip = {
        ...mockTrip,
        passengers: [...mockTrip.passengers, "new-passenger"],
        currentPassengers: mockTrip.passengers.slice(0, -1),
      };

      // Set initial state with the trip
      useTripStore.setState({
        trips: [mockTrip],
      });

      mockTripApi.joinTrip.mockResolvedValueOnce({
        success: true,
        data: updatedTrip,
      });

      const { result } = renderHook(() => useTripStore());

      let joinResult: boolean;
      await act(async () => {
        joinResult = await result.current.joinTrip(tripId, pickupLocation);
      });

      expect(mockTripApi.joinTrip).toHaveBeenCalledWith(tripId, {
        pickupLocation,
      });
      expect(result.current.trips[0]).toEqual(updatedTrip);
      expect(joinResult!).toBe(true);
    });

    it("should handle join trip error", async () => {
      const tripId = "trip-123";
      const pickupLocation = "456 Oak St";

      mockTripApi.joinTrip.mockResolvedValueOnce({
        success: false,
        error: "Trip is full",
      });

      const { result } = renderHook(() => useTripStore());

      let joinResult: boolean;
      await act(async () => {
        joinResult = await result.current.joinTrip(tripId, pickupLocation);
      });

      expect(joinResult!).toBe(false);
      expect(result.current.error).toBe("Trip is full");
    });
  });

  describe("leaveTrip", () => {
    it("should leave trip successfully", async () => {
      const tripId = "trip-123";
      const updatedTrip = {
        ...mockTrip,
        currentPassengers: [...mockTrip.passengers, "new-passenger"],
      };

      // Set initial state with the trip
      useTripStore.setState({
        trips: [mockTrip],
      });

      mockTripApi.leaveTrip.mockResolvedValueOnce({
        success: true,
        data: updatedTrip,
      });

      const { result } = renderHook(() => useTripStore());

      let leaveResult: boolean;
      await act(async () => {
        leaveResult = await result.current.leaveTrip(tripId);
      });

      expect(mockTripApi.leaveTrip).toHaveBeenCalledWith(tripId);
      expect(result.current.trips[0]).toEqual(updatedTrip);
      expect(leaveResult!).toBe(true);
    });

    it("should handle leave trip error", async () => {
      const tripId = "trip-123";

      mockTripApi.leaveTrip.mockResolvedValueOnce({
        success: false,
        error: "Cannot leave trip",
      });

      const { result } = renderHook(() => useTripStore());

      let leaveResult: boolean;
      await act(async () => {
        leaveResult = await result.current.leaveTrip(tripId);
      });

      expect(leaveResult!).toBe(false);
      expect(result.current.error).toBe("Cannot leave trip");
    });
  });

  describe("setCurrentTrip", () => {
    it("should set current trip", () => {
      const { result } = renderHook(() => useTripStore());

      act(() => {
        result.current.setCurrentTrip(mockTrip);
      });

      expect(result.current.currentTrip).toEqual(mockTrip);
    });

    it("should clear current trip", () => {
      useTripStore.setState({
        currentTrip: mockTrip,
      });

      const { result } = renderHook(() => useTripStore());

      act(() => {
        result.current.setCurrentTrip(null);
      });

      expect(result.current.currentTrip).toBeNull();
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useTripStore.setState({
        error: "Some error message",
      });

      const { result } = renderHook(() => useTripStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset store to initial state", () => {
      useTripStore.setState({
        trips: [mockTrip],
        currentTrip: mockTrip,
        stats: mockTripStats,
        isLoading: true,
        error: "Some error",
        pagination: mockPagination,
      });

      const { result } = renderHook(() => useTripStore());

      act(() => {
        result.current.reset();
      });

      expect(result.current.trips).toEqual([]);
      expect(result.current.currentTrip).toBeNull();
      expect(result.current.stats).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe("error handling", () => {
    it("should handle network errors", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockTripApi.getTrips.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchTrips();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching trips:",
        expect.any(Error)
      );
      expect(result.current.error).toBe("Failed to fetch trips");

      consoleSpy.mockRestore();
    });

    it("should handle API errors for create trip", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const createRequest: Trip = {
        date: "2024-12-25",
        departureTime: "09:00",
        arrivalTime: "10:30",
        destination: "Downtown School",
        maxPassengers: 4,
      };

      mockTripApi.createTrip.mockRejectedValueOnce(new Error("Server error"));

      const { result } = renderHook(() => useTripStore());

      let createResult: boolean;
      await act(async () => {
        createResult = await result.current.createTrip(createRequest);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error creating trip:",
        expect.any(Error)
      );
      expect(createResult!).toBe(false);
      expect(result.current.error).toBe("Failed to create trip");

      consoleSpy.mockRestore();
    });
  });
});
