"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/auth.store";
import { useTripStore } from "../../../store/trip.store";
import DashboardLayout from "../../../components/DashboardLayout";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { Trip, TripStatus } from "@vcarpool/shared";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const { user } = useAuthStore();
  const {
    currentTrip,
    loading,
    error,
    fetchTripById,
    joinTrip,
    leaveTrip,
    updateTrip,
    deleteTrip,
    clearError,
  } = useTripStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (tripId) {
      fetchTripById(tripId);
    }
  }, [tripId, fetchTripById]);

  const handleJoinTrip = async () => {
    if (!pickupLocation.trim()) {
      alert("Please enter your pickup location");
      return;
    }

    setIsJoining(true);
    try {
      const success = await joinTrip(tripId, pickupLocation);
      if (success) {
        setPickupLocation("");
        // Refresh trip data
        await fetchTripById(tripId);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveTrip = async () => {
    if (confirm("Are you sure you want to leave this trip?")) {
      const success = await leaveTrip(tripId);
      if (success) {
        // Refresh trip data
        await fetchTripById(tripId);
      }
    }
  };

  const handleDeleteTrip = async () => {
    const success = await deleteTrip(tripId);
    if (success) {
      router.push("/trips");
    }
    setShowDeleteModal(false);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status: TripStatus) => {
    switch (status) {
      case "planned":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && !currentTrip) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !currentTrip) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading trip
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push("/trips")}
                    className="bg-red-100 px-4 py-2 rounded-md text-red-800 hover:bg-red-200"
                  >
                    Back to Trips
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentTrip) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Trip not found</h2>
            <p className="mt-2 text-gray-600">
              The trip you're looking for doesn't exist.
            </p>
            <button
              onClick={() => router.push("/trips")}
              className="mt-4 bg-primary-600 px-4 py-2 rounded-md text-white hover:bg-primary-700"
            >
              Back to Trips
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isDriver = currentTrip.driverId === user?.id;
  const isPassenger = currentTrip.passengers.includes(user?.id || "");
  const canJoin =
    !isDriver &&
    !isPassenger &&
    currentTrip.availableSeats > 0 &&
    currentTrip.status === "planned";
  const canLeave = isPassenger && currentTrip.status === "planned";
  const canManage =
    isDriver &&
    (currentTrip.status === "planned" || currentTrip.status === "active");

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/trips")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Trips
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentTrip.destination}
              </h1>
              <div className="mt-2 flex items-center space-x-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    currentTrip.status
                  )}`}
                >
                  {currentTrip.status.charAt(0).toUpperCase() +
                    currentTrip.status.slice(1)}
                </span>
                {isDriver && (
                  <span className="text-sm text-blue-600 font-medium">
                    You're driving
                  </span>
                )}
                {isPassenger && (
                  <span className="text-sm text-green-600 font-medium">
                    You're a passenger
                  </span>
                )}
              </div>
            </div>

            {canManage && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Trip Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Trip Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Date</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(currentTrip.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Time</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(currentTrip.departureTime)} -{" "}
                      {formatTime(currentTrip.arrivalTime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Destination
                    </p>
                    <p className="text-sm text-gray-600">
                      {currentTrip.destination}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <UserGroupIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Passengers
                    </p>
                    <p className="text-sm text-gray-600">
                      {currentTrip.passengers.length}/
                      {currentTrip.maxPassengers}
                      {currentTrip.availableSeats > 0 && (
                        <span className="text-green-600">
                          {" "}
                          ({currentTrip.availableSeats} available)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {currentTrip.cost && (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Cost per person
                      </p>
                      <p className="text-sm text-gray-600">
                        ${currentTrip.cost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {currentTrip.notes && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900">Notes</p>
                  <p className="mt-1 text-sm text-gray-600 italic">
                    "{currentTrip.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Driver Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Driver Information
              </h2>
              <div className="flex items-center space-x-4">
                <div className="bg-gray-200 rounded-full p-3">
                  <UserGroupIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {currentTrip.driver?.name || "Driver"}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    {currentTrip.driver?.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <EnvelopeIcon className="h-4 w-4 mr-1" />
                        {currentTrip.driver.email}
                      </div>
                    )}
                    {currentTrip.driver?.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-1" />
                        {currentTrip.driver.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Passengers List */}
            {currentTrip.passengers.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Passengers ({currentTrip.passengers.length})
                </h2>
                <div className="space-y-2">
                  {currentTrip.passengers.map((passengerId, index) => (
                    <div
                      key={passengerId}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center">
                        <div className="bg-gray-200 rounded-full p-2 mr-3">
                          <UserGroupIcon className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="text-sm text-gray-900">
                          Passenger {index + 1}
                        </span>
                        {passengerId === user?.id && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            {/* Join/Leave Actions */}
            {canJoin && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Join This Trip
                </h3>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="pickup"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Pickup Location
                    </label>
                    <input
                      type="text"
                      id="pickup"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="Enter your pickup location"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <button
                    onClick={handleJoinTrip}
                    disabled={isJoining || !pickupLocation.trim()}
                    className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoining ? "Joining..." : "Join Trip"}
                  </button>
                </div>
              </div>
            )}

            {canLeave && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Trip Actions
                </h3>
                <button
                  onClick={handleLeaveTrip}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  Leave Trip
                </button>
              </div>
            )}

            {/* Trip Stats */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Trip Statistics
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Available Seats</span>
                  <span className="font-medium">
                    {currentTrip.availableSeats}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Passengers</span>
                  <span className="font-medium">
                    {currentTrip.passengers.length}
                  </span>
                </div>
                {currentTrip.cost && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Cost</span>
                    <span className="font-medium">
                      $
                      {(
                        currentTrip.cost * currentTrip.passengers.length
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-600" />
                <h3 className="text-lg font-medium text-gray-900 mt-4">
                  Delete Trip
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  Are you sure you want to delete this trip? This action cannot
                  be undone and will notify all passengers.
                </p>
                <div className="items-center px-4 py-3 mt-4">
                  <button
                    onClick={handleDeleteTrip}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 mr-2"
                  >
                    Delete Trip
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="mt-3 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
