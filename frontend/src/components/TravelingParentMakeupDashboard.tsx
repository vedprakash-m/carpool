"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface MakeupOption {
  id: string;
  proposedDate: string;
  proposedTime: string;
  makeupType: "extra_week" | "split_weeks" | "weekend_trip";
  tripsToMakeup: number;
  status: "proposed" | "approved" | "rejected" | "completed";
  notes?: string;
  adminNotes?: string;
  createdAt: string;
}

interface TravelingParentDashboardData {
  user: {
    id: string;
    role: string;
    makeupBalance: number;
  };
  group: {
    id: string;
    name: string;
  };
  travelSchedule: {
    hasUpcomingTravel: boolean;
    travelPeriods: Array<{
      startDate: string;
      endDate: string;
      reason: string;
      affectedTrips: number;
    }>;
  };
  makeupOptions: MakeupOption[];
  availableDates: Array<{
    date: string;
    dayOfWeek: string;
    available: boolean;
    conflictReason?: string;
  }>;
  statistics: {
    totalTripsOwed: number;
    upcomingMakeups: number;
    completedMakeups: number;
  };
}

interface NewMakeupProposal {
  proposedDate: string;
  proposedTime: string;
  makeupType: "extra_week" | "split_weeks" | "weekend_trip";
  tripsToMakeup: number;
  notes: string;
}

export default function TravelingParentMakeupDashboard() {
  const [dashboardData, setDashboardData] =
    useState<TravelingParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [newProposal, setNewProposal] = useState<NewMakeupProposal>({
    proposedDate: "",
    proposedTime: "07:30",
    makeupType: "extra_week",
    tripsToMakeup: 1,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Mock user ID - in production, get from auth context
  const userId = "user_001";

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/traveling-parent/makeup?action=get_dashboard&userId=${userId}`
      );
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.dashboard);
      } else {
        setError(data.error || "Failed to load dashboard");
      }
    } catch (err) {
      setError("Network error loading dashboard");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitMakeupProposal = async () => {
    try {
      setSubmitting(true);

      const response = await fetch("/api/traveling-parent/makeup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          makeupProposal: {
            ...newProposal,
            groupId: dashboardData?.group.id,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh dashboard data
        await fetchDashboardData();

        // Reset form
        setNewProposal({
          proposedDate: "",
          proposedTime: "07:30",
          makeupType: "extra_week",
          tripsToMakeup: 1,
          notes: "",
        });
        setShowNewProposal(false);
      } else {
        setError(data.error || "Failed to submit proposal");
      }
    } catch (err) {
      setError("Network error submitting proposal");
      console.error("Proposal submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getMakeupTypeLabel = (type: string) => {
    switch (type) {
      case "extra_week":
        return "Extra Week";
      case "split_weeks":
        return "Split Weeks";
      case "weekend_trip":
        return "Weekend Trip";
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "proposed":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "proposed":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchDashboardData();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Group Membership
          </h2>
          <p className="text-gray-600">
            You are not a member of any carpool group.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Traveling Parent Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your makeup trips for {dashboardData.group.name}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle
                    className={`h-8 w-8 ${
                      dashboardData.user.makeupBalance < 0
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Makeup Balance
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData.user.makeupBalance >= 0 ? "+" : ""}
                      {dashboardData.user.makeupBalance} trips
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Upcoming Makeups
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData.statistics.upcomingMakeups}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed Makeups
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData.statistics.completedMakeups}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Travel Schedule Alert */}
        {dashboardData.travelSchedule.hasUpcomingTravel && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Upcoming Travel Detected
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  {dashboardData.travelSchedule.travelPeriods.map(
                    (period, index) => (
                      <div key={index} className="mb-2">
                        <strong>{period.reason}</strong>: {period.startDate} to{" "}
                        {period.endDate}
                        <br />
                        This will affect {period.affectedTrips} trips. Please
                        schedule makeup trips below.
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowNewProposal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Propose Makeup Trips
          </button>
        </div>

        {/* New Proposal Form */}
        {showNewProposal && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Propose Makeup Trips
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed Date
                </label>
                <input
                  type="date"
                  value={newProposal.proposedDate}
                  onChange={(e) =>
                    setNewProposal({
                      ...newProposal,
                      proposedDate: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed Time
                </label>
                <input
                  type="time"
                  value={newProposal.proposedTime}
                  onChange={(e) =>
                    setNewProposal({
                      ...newProposal,
                      proposedTime: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Makeup Type
                </label>
                <select
                  value={newProposal.makeupType}
                  onChange={(e) =>
                    setNewProposal({
                      ...newProposal,
                      makeupType: e.target.value as any,
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="extra_week">Extra Week</option>
                  <option value="split_weeks">Split Weeks</option>
                  <option value="weekend_trip">Weekend Trip</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trips to Makeup
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={newProposal.tripsToMakeup}
                  onChange={(e) =>
                    setNewProposal({
                      ...newProposal,
                      tripsToMakeup: parseInt(e.target.value),
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={newProposal.notes}
                onChange={(e) =>
                  setNewProposal({ ...newProposal, notes: e.target.value })
                }
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information about your makeup proposal..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewProposal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitMakeupProposal}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Proposal"}
              </button>
            </div>
          </div>
        )}

        {/* Makeup Options List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Your Makeup Proposals
            </h3>
          </div>

          {dashboardData.makeupOptions.length === 0 ? (
            <div className="p-6 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No makeup proposals yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Click "Propose Makeup Trips" to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {dashboardData.makeupOptions.map((option) => (
                <div key={option.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(option.status)}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {getMakeupTypeLabel(option.makeupType)} -{" "}
                          {option.tripsToMakeup} trips
                        </h4>
                        <p className="text-sm text-gray-600">
                          {new Date(option.proposedDate).toLocaleDateString()}{" "}
                          at {option.proposedTime}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        option.status
                      )}`}
                    >
                      {option.status}
                    </span>
                  </div>

                  {option.notes && (
                    <div className="mt-3 text-sm text-gray-600">
                      <strong>Your notes:</strong> {option.notes}
                    </div>
                  )}

                  {option.adminNotes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <div className="text-sm text-gray-600">
                        <strong>Admin response:</strong> {option.adminNotes}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
