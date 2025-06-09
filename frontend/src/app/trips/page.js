"use strict";
"use client";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const auth_store_1 = require("../../store/auth.store");
const trip_store_1 = require("../../store/trip.store");
const DashboardLayout_1 = __importDefault(
  require("../../components/DashboardLayout")
);
const SectionErrorBoundary_1 = require("../../components/SectionErrorBoundary");
const outline_1 = require("@heroicons/react/24/outline");
const AdvancedTripSearch_1 = __importDefault(
  require("../../components/AdvancedTripSearch")
);
const TripCard = ({ trip, currentUserId, onJoinTrip, onLeaveTrip }) => {
  const isDriver = trip.driverId === currentUserId;
  const isPassenger = trip.passengers.includes(currentUserId);
  const canJoin =
    !isDriver &&
    !isPassenger &&
    trip.availableSeats > 0 &&
    trip.status === "planned";
  const canLeave = isPassenger && trip.status === "planned";
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };
  const getStatusColor = (status) => {
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
          <outline_1.MapPinIcon className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-gray-900">{trip.destination}</span>
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
          <outline_1.CalendarIcon className="h-4 w-4" />
          <span>{formatDate(trip.date)}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <outline_1.ClockIcon className="h-4 w-4" />
          <span>
            {trip.departureTime} - {trip.arrivalTime}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <outline_1.UserIcon className="h-4 w-4" />
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
              <outline_1.TruckIcon className="h-4 w-4" />
              <span>You're driving</span>
            </span>
          ) : isPassenger ? (
            <span className="text-green-600">You're a passenger</span>
          ) : (
            <span>{trip.availableSeats} seats available</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
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
};
function TripsPage() {
  const router = (0, navigation_1.useRouter)();
  const { user, isAuthenticated } = (0, auth_store_1.useAuthStore)();
  const {
    trips,
    loading,
    error,
    fetchMyTrips,
    fetchAvailableTrips,
    searchTrips,
    joinTrip,
    leaveTrip,
    clearError,
  } = (0, trip_store_1.useTripStore)();
  const [activeTab, setActiveTab] = (0, react_1.useState)("my-trips");
  const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
  const [sortBy, setSortBy] = (0, react_1.useState)("date");
  const [filterStatus, setFilterStatus] = (0, react_1.useState)("all");
  // Fetch trips when component mounts or tab changes
  (0, react_1.useEffect)(() => {
    if (activeTab === "my-trips") {
      fetchMyTrips();
    } else if (activeTab === "available") {
      fetchAvailableTrips();
    }
  }, [activeTab, fetchMyTrips, fetchAvailableTrips]);
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
  (0, react_1.useEffect)(() => {
    if (isAuthenticated) {
      // Fetch trips based on active tab
      if (activeTab === "my-trips") {
        fetchMyTrips();
      } else if (activeTab === "available") {
        fetchAvailableTrips();
      }
    }
  }, [isAuthenticated, activeTab, fetchMyTrips, fetchAvailableTrips]);
  const handleJoinTrip = async (tripId) => {
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
  const handleLeaveTrip = async (tripId) => {
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
  // Let DashboardLayout handle authentication redirect
  // Remove early return to allow proper authentication flow
  // For development with mock auth, bypass complex authentication flow
  return (
    <DashboardLayout_1.default>
      <div className="space-y-6">
        {/* Header */}
        <SectionErrorBoundary_1.SectionErrorBoundary sectionName="Trip Header">
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
              <outline_1.PlusIcon className="h-4 w-4 mr-2" />
              Create Trip
            </button>
          </div>
        </SectionErrorBoundary_1.SectionErrorBoundary>

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
              <AdvancedTripSearch_1.default
                onSearch={(filters) => {
                  // Use the advanced search functionality
                  searchTrips(filters);
                }}
                loading={loading}
              />
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
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="date">Date</option>
                  <option value="destination">Destination</option>
                  <option value="cost">Cost</option>
                </select>
              </div>

              {/* Filter Status */}
              <div className="flex items-center space-x-2">
                <outline_1.FunnelIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
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
            <outline_1.TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
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
                  <outline_1.PlusIcon className="h-4 w-4 mr-2" />
                  Create Trip
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  currentUserId={user?.id || ""}
                  onJoinTrip={handleJoinTrip}
                  onLeaveTrip={handleLeaveTrip}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout_1.default>
  );
}
exports.default = TripsPage;
