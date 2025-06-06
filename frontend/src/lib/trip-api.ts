import {
  Trip,
  CreateTripRequest,
  UpdateTripRequest,
  JoinTripRequest,
  ApiResponse,
  PaginatedResponse,
} from "@vcarpool/shared";
import { apiClient } from "./api-client";

export interface TripFilters {
  driverId?: string;
  passengerId?: string;
  status?: string;
  date?: string;
  destination?: string;
  origin?: string;
  maxPrice?: number;
  minSeats?: number;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?:
    | "date"
    | "price"
    | "destination"
    | "availableSeats"
    | "departureTime";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TripStats {
  totalTrips: number;
  tripsAsDriver: number;
  tripsAsPassenger: number;
  totalDistance: number;
  costSavings: number;
  upcomingTrips: number;
}

class TripApiService {
  /**
   * Get trips with optional filters
   */
  async getTrips(filters?: TripFilters): Promise<PaginatedResponse<Trip>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = `/trips${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<PaginatedResponse<Trip>>(url);
    if (!response.data) {
      throw new Error("Failed to fetch trips");
    }
    return response.data;
  }

  /**
   * Create a new trip
   */
  async createTrip(tripData: CreateTripRequest): Promise<ApiResponse<Trip>> {
    const response = await apiClient.post<ApiResponse<Trip>>(
      "/trips",
      tripData
    );
    if (!response.data) {
      throw new Error("Failed to create trip");
    }
    return response.data;
  }

  /**
   * Update a trip
   */
  async updateTrip(
    tripId: string,
    updates: UpdateTripRequest
  ): Promise<ApiResponse<Trip>> {
    const response = await apiClient.put<ApiResponse<Trip>>(
      `/trips/${tripId}`,
      updates
    );
    if (!response.data) {
      throw new Error("Failed to update trip");
    }
    return response.data;
  }

  /**
   * Join a trip as a passenger
   */
  async joinTrip(
    tripId: string,
    joinData: JoinTripRequest
  ): Promise<ApiResponse<Trip>> {
    const response = await apiClient.post<ApiResponse<Trip>>(
      `/trips/${tripId}/join`,
      joinData
    );
    if (!response.data) {
      throw new Error("Failed to join trip");
    }
    return response.data;
  }

  /**
   * Leave a trip
   */
  async leaveTrip(tripId: string): Promise<ApiResponse<Trip>> {
    const response = await apiClient.delete<ApiResponse<Trip>>(
      `/trips/${tripId}/leave`
    );
    if (!response.data) {
      throw new Error("Failed to leave trip");
    }
    return response.data;
  }

  /**
   * Delete a trip (driver only)
   */
  async deleteTrip(tripId: string): Promise<ApiResponse<Trip>> {
    const response = await apiClient.delete<ApiResponse<Trip>>(
      `/trips/${tripId}`
    );
    if (!response.data) {
      throw new Error("Failed to delete trip");
    }
    return response.data;
  }

  /**
   * Get trip statistics
   */
  async getTripStats(): Promise<TripStats> {
    const response = await apiClient.get<TripStats>("/trips/stats");
    if (!response.success || !response.data) {
      throw new Error("Failed to fetch trip stats");
    }
    return response.data;
  }

  /**
   * Get available trips (trips user can join)
   */
  async getAvailableTrips(date?: string): Promise<PaginatedResponse<Trip>> {
    const params = new URLSearchParams();
    params.append("status", "planned");

    if (date) {
      params.append("date", date);
    }

    const response = await apiClient.get<PaginatedResponse<Trip>>(
      `/trips?${params.toString()}`
    );
    if (!response.data) {
      throw new Error("Failed to fetch available trips");
    }
    return response.data;
  }

  /**
   * Get my trips (as driver or passenger)
   */
  async getMyTrips(): Promise<PaginatedResponse<Trip>> {
    const response = await apiClient.get<PaginatedResponse<Trip>>("/trips");
    if (!response.data) {
      throw new Error("Failed to fetch my trips");
    }
    return response.data;
  }

  /**
   * Get trips where I'm the driver
   */
  async getMyDriverTrips(): Promise<PaginatedResponse<Trip>> {
    // The backend will default to showing user's trips when no specific filters are provided
    // We can add a query parameter to be explicit
    const response = await apiClient.get<PaginatedResponse<Trip>>(
      "/trips?driver=me"
    );
    if (!response.data) {
      throw new Error("Failed to fetch driver trips");
    }
    return response.data;
  }

  /**
   * Get trips where I'm a passenger
   */
  async getMyPassengerTrips(): Promise<PaginatedResponse<Trip>> {
    const response = await apiClient.get<PaginatedResponse<Trip>>(
      "/trips?passenger=me"
    );
    if (!response.data) {
      throw new Error("Failed to fetch passenger trips");
    }
    return response.data;
  }

  /**
   * Get a specific trip by ID
   */
  async getTripById(tripId: string): Promise<ApiResponse<Trip>> {
    const response = await apiClient.get<ApiResponse<Trip>>(`/trips/${tripId}`);
    if (!response.data) {
      throw new Error("Failed to fetch trip");
    }
    return response.data;
  }

  /**
   * Search trips with advanced filters
   */
  async searchTrips(searchFilters: {
    searchQuery?: string;
    destination?: string;
    origin?: string;
    dateFrom?: string;
    dateTo?: string;
    maxPrice?: number;
    minSeats?: number;
    sortBy?:
      | "date"
      | "price"
      | "destination"
      | "availableSeats"
      | "departureTime";
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Trip>> {
    const params = new URLSearchParams();

    // Convert search filters to query parameters
    Object.entries(searchFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = `/trips${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<PaginatedResponse<Trip>>(url);
    if (!response.data) {
      throw new Error("Failed to search trips");
    }
    return response.data;
  }
}

export const tripApi = new TripApiService();
