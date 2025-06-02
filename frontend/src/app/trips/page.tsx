"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth.store";
import { useTripStore } from "../../store/trip.store";
import DashboardLayout from "../../components/DashboardLayout";
import { SectionErrorBoundary } from "../../components/SectionErrorBoundary";
import {
  VirtualizedList,
  PerformanceErrorBoundary,
  withPerformanceMonitoring,
  createMemoizedComponent,
} from "../../components/OptimizedComponents";
import { Trip, TripStatus } from "../../types/shared";
import {
  CalendarIcon,
  TruckIcon as CarIcon,
  UserIcon,
  ClockIcon as ClockOutlineIcon,
  MapPinIcon as MapPinOutlineIcon,
  CurrencyDollarIcon,
  PlusIcon as PlusOutlineIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

type TabType = "my-trips" | "available" | "driving";

interface TripCardProps {
  trip: Trip;
  currentUserId: string;
  onJoinTrip?: (tripId: string) => void;
  onLeaveTrip?: (tripId: string) => void;
}

const TripCard = createMemoizedComponent<TripCardProps>(
  ({ trip, currentUserId, onJoinTrip, onLeaveTrip }) => {
    const isDriver = trip.driverId === currentUserId;
    const isPassenger = trip.passengers.includes(currentUserId);
    const canJoin =
      !isDriver &&
      !isPassenger &&
      trip.availableSeats > 0 &&
      trip.status === "planned";
    const canLeave = isPassenger && trip.status === "planned";

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    };

    const getStatusColor = (status: TripStatus) => {
      switch (status) {
        case "planned":
          return "text-blue-600 bg-blue-100";
        case "active":
          return "text-green-600 bg-green-100";
        case "completed":
          return "text-gray-600 bg-gray-100";
        case "cancelled":
          return "text-red-600 bg-red-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    };

    const handleJoinClick = () => {
      const pickupLocation = prompt("Please enter your pickup location:");
      if (pickupLocation && onJoinTrip) {
        onJoinTrip(trip.id);
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <MapPinOutlineIcon className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-900">
              {trip.destination}
            </span>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              trip.status
            )}`}
          >
            {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4" />
            <span>{formatDate(trip.date)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <ClockOutlineIcon className="h-4 w-4" />
            <span>
              {trip.departureTime} - {trip.arrivalTime}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <UserIcon className="h-4 w-4" />
            <span>
              {trip.passengers.length}/{trip.maxPassengers} passengers
            </span>
          </div>
        </div>

        {trip.notes && (
          <p className="text-sm text-gray-600 mb-4 italic">"{trip.notes}"</p>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {isDriver ? (
              <span className="flex items-center space-x-1">
                <CarIcon className="h-4 w-4" />
                <span>You're driving</span>
              </span>
            ) : isPassenger ? (
              <span className="text-green-600">You're a passenger</span>
            ) : (
              <span>{trip.availableSeats} seats available</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {trip.cost && (
              <span className="text-sm font-medium text-green-600">
                ${trip.cost.toFixed(2)}
              </span>
            )}

            {canJoin && (
              <button
                onClick={handleJoinClick}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Join Trip
              </button>
            )}

            {canLeave && (
              <button
                onClick={() => onLeaveTrip?.(trip.id)}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Leave Trip
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

// Performance monitoring for the main page component
const TripsPage = withPerformanceMonitoring(() => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const {
    trips,
    loading,
    error,
    fetchMyTrips,
    fetchAvailableTrips,
    joinTrip,
    leaveTrip,
    clearError,
  } = useTripStore();
  const [activeTab, setActiveTab] = useState<TabType>("my-trips");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "cost" | "destination">("date");
  const [filterStatus, setFilterStatus] = useState<TripStatus | "all">("all");

  // Filter and sort trips based on search criteria
  const filteredTrips = trips
    .filter((trip) => {
      const matchesSearch =
        searchQuery === "" ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || trip.status === filterStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "cost":
          return (a.cost || 0) - (b.cost || 0);
        case "destination":
          return a.destination.localeCompare(b.destination);
        default:
          return 0;
      }
    });

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch trips based on active tab
      if (activeTab === "my-trips") {
        fetchMyTrips();
      } else if (activeTab === "available") {
        fetchAvailableTrips();
      }
    }
  }, [isAuthenticated, activeTab, fetchMyTrips, fetchAvailableTrips]);

  const handleJoinTrip = async (tripId: string) => {
    const pickupLocation = prompt("Please enter your pickup location:");
    if (pickupLocation) {
      const success = await joinTrip(tripId, pickupLocation);
      if (success) {
        // Refresh the current view
        if (activeTab === "my-trips") {
          fetchMyTrips();
        } else if (activeTab === "available") {
          fetchAvailableTrips();
        }
      }
    }
  };

  const handleLeaveTrip = async (tripId: string) => {
    if (confirm("Are you sure you want to leave this trip?")) {
      const success = await leaveTrip(tripId);
      if (success) {
        // Refresh the current view
        if (activeTab === "my-trips") {
          fetchMyTrips();
        } else if (activeTab === "available") {
          fetchAvailableTrips();
        }
      }
    }
  };

  if (!isAuthenticated || !user) {
    return null; // DashboardLayout will handle redirect
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <SectionErrorBoundary sectionName="Trip Header">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
              <p className="text-gray-600">
                Manage your trips and find available rides
              </p>
            </div>
            <button
              onClick={() => router.push("/trips/create")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusOutlineIcon className="h-4 w-4 mr-2" />
              Create Trip
            </button>
          </div>
        </SectionErrorBoundary>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("my-trips")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "my-trips"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Trips
            </button>
            <button
              onClick={() => setActiveTab("available")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "available"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Available Trips
            </button>
          </nav>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search destinations or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 w-full sm:w-auto">
              {/* Sort By */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  Sort by:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "date" | "cost" | "destination")
                  }
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="date">Date</option>
                  <option value="destination">Destination</option>
                  <option value="cost">Cost</option>
                </select>
              </div>

              {/* Filter Status */}
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as TripStatus | "all")
                  }
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          {(searchQuery || filterStatus !== "all") && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredTrips.length} of {trips.length} trips
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-2 text-primary-600 hover:text-primary-500 underline"
                >
                  Clear search
                </button>
              )}
              {filterStatus !== "all" && (
                <button
                  onClick={() => setFilterStatus("all")}
                  className="ml-2 text-primary-600 hover:text-primary-500 underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={clearError}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <CarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {trips.length === 0
                ? activeTab === "my-trips"
                  ? "No trips yet"
                  : "No available trips"
                : "No trips match your search"}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {trips.length === 0
                ? activeTab === "my-trips"
                  ? "Get started by creating your first trip."
                  : "Check back later for available rides."
                : "Try adjusting your search criteria or filters."}
            </p>
            {activeTab === "my-trips" && trips.length === 0 && (
              <div className="mt-6">
                <button
                  onClick={() => router.push("/trips/create")}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PlusOutlineIcon className="h-4 w-4 mr-2" />
                  Create Trip
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            {filteredTrips.length > 10 ? (
              // Use virtualized list for better performance with many trips
              <VirtualizedList
                items={filteredTrips}
                itemHeight={200}
                containerHeight={600}
                className="space-y-4"
                renderItem={(trip, index) => (
                  <div className="px-2">
                    <TripCard
                      trip={trip}
                      currentUserId={user.id}
                      onJoinTrip={handleJoinTrip}
                      onLeaveTrip={handleLeaveTrip}
                    />
                  </div>
                )}
              />
            ) : (
              // Use regular grid for smaller lists
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    currentUserId={user.id}
                    onJoinTrip={handleJoinTrip}
                    onLeaveTrip={handleLeaveTrip}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}, "TripsPage");

export default function TripsPageWithErrorBoundary() {
  return (
    <PerformanceErrorBoundary>
      <TripsPage />
    </PerformanceErrorBoundary>
  );
}
