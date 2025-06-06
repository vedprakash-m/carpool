"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth.store";
import { useTripStore } from "../../store/trip.store";
import DashboardLayout from "../../components/DashboardLayout";
import { SectionErrorBoundary } from "../../components/SectionErrorBoundary";
import {
  CalendarIcon,
  TruckIcon as CarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  MapPinIcon,
  AcademicCapIcon,
  HomeIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

// Memoized components for better performance
const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  trend?: { value: number; isPositive: boolean };
}) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`${color} rounded-md p-3`}>
            <Icon className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">
                {value}
              </div>
              {trend && (
                <div
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

const QuickActionCard = ({ action }: { action: any }) => (
  <button
    onClick={action.action}
    className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
  >
    <div>
      <span
        className={`${action.color} rounded-lg inline-flex p-3 ring-4 ring-white`}
      >
        <action.icon className="h-6 w-6 text-white" aria-hidden="true" />
      </span>
    </div>
    <div className="mt-4">
      <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
        {action.name}
      </h3>
      <p className="mt-2 text-sm text-gray-500">{action.description}</p>
    </div>
  </button>
);

const RecentTripCard = ({ trip }: { trip: any }) => (
  <div className="bg-white px-4 py-4 border border-gray-200 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
        <div>
          <p className="text-sm font-medium text-gray-900">
            {trip.destination}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(trip.departureTime).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center">
        <UserGroupIcon className="h-4 w-4 text-gray-400 mr-1" />
        <span className="text-sm text-gray-600">
          {trip.passengers?.length || 0}/{trip.availableSeats}
        </span>
      </div>
    </div>
  </div>
);

// Loading components
const StatCardSkeleton = () => (
  <div className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="bg-gray-300 rounded-md p-3 w-12 h-12"></div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  </div>
);

function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { stats, loading: statsLoading, fetchTripStats } = useTripStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTripStats();
    }
  }, [isAuthenticated, fetchTripStats]);

  if (!isAuthenticated || !user) {
    return null; // DashboardLayout will handle redirect
  }

  // School carpool specific quick actions
  const schoolActions = [
    {
      name: "Schedule School Run",
      description: "Create morning or afternoon school trip",
      icon: AcademicCapIcon,
      color: "bg-blue-500",
      action: () => router.push("/trips/create?type=school"),
    },
    {
      name: "Find School Carpool",
      description: "Join existing school trips in your area",
      icon: UserGroupIcon,
      color: "bg-green-500",
      action: () => router.push("/trips?filter=school"),
    },
    {
      name: "Manage Children",
      description: "Add or edit student profiles",
      icon: HomeIcon,
      color: "bg-purple-500",
      action: () => router.push("/family/children"),
    },
  ];

  // School-focused statistics
  const schoolStats = [
    {
      name: "This Week's School Runs",
      value: statsLoading ? "..." : stats?.weeklySchoolTrips || 0,
      icon: AcademicCapIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "Morning + afternoon trips",
    },
    {
      name: "Children in Carpool",
      value: statsLoading ? "..." : stats?.childrenCount || 0,
      icon: UserGroupIcon,
      color: "text-green-600",
      bgColor: "bg-green-100",
      description: "Active student profiles",
    },
    {
      name: "Monthly Fuel Savings",
      value: statsLoading
        ? "..."
        : `$${stats?.monthlyFuelSavings?.toFixed(2) || "0.00"}`,
      icon: CurrencyDollarIcon,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      description: "vs. driving alone",
    },
    {
      name: "Time Saved This Month",
      value: statsLoading ? "..." : `${stats?.timeSavedHours || 0}h`,
      icon: ClockIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      description: "from coordinated pickups",
    },
  ];

  // Mock upcoming school trips
  const upcomingSchoolTrips = [
    {
      id: 1,
      type: "Morning Drop-off",
      school: "Lincoln Elementary",
      time: "7:45 AM",
      date: "Tomorrow",
      children: ["Emma", "Jake"],
      driver: user.id === "driver1" ? "You" : "Sarah M.",
      pickupLocation: "Maple Street & 5th Ave",
      status: "confirmed",
    },
    {
      id: 2,
      type: "Afternoon Pickup",
      school: "Lincoln Elementary",
      time: "3:15 PM",
      date: "Tomorrow",
      children: ["Emma"],
      driver: "You",
      passengers: ["Tom (Grade 3)", "Lisa (Grade 2)"],
      status: "driving",
    },
  ];

  // Family efficiency metrics
  const familyMetrics = {
    thisWeek: {
      tripsCoordinated: 8,
      milesShared: 45,
      co2Saved: "12 lbs",
      costPerTrip: "$3.25",
    },
    thisMonth: {
      reliabilityScore: "98%",
      familiesConnected: 6,
      emergencyPickups: 2,
      averageRating: 4.8,
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section - School Focused */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Good morning, {user.firstName}! 👋
              </h1>
              <p className="text-gray-600">
                You have <strong>2 school runs</strong> scheduled for tomorrow.
                <span className="text-green-600 font-medium ml-2">
                  ✓ All pickups confirmed
                </span>
              </p>
            </div>
            <div className="hidden md:block">
              <AcademicCapIcon className="h-16 w-16 text-blue-400" />
            </div>
          </div>
        </div>

        {/* School Statistics Grid */}
        <SectionErrorBoundary sectionName="School Statistics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {schoolStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center">
                    <div className={`${stat.bgColor} rounded-lg p-3`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        {stat.name}
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stat.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionErrorBoundary>

        {/* Upcoming School Trips */}
        <SectionErrorBoundary sectionName="Upcoming School Trips">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                📅 Upcoming School Runs
              </h2>
              <button
                onClick={() => router.push("/trips")}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                View all trips →
              </button>
            </div>

            <div className="space-y-4">
              {upcomingSchoolTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="bg-blue-100 rounded-full p-2">
                        {trip.type.includes("Morning") ? (
                          <ClockIcon className="h-5 w-5 text-blue-600" />
                        ) : (
                          <HomeIcon className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {trip.type}
                        </h3>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-600">
                          {trip.school}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span>📍 {trip.pickupLocation || "Your location"}</span>
                        <span>⏰ {trip.time}</span>
                        <span>🗓 {trip.date}</span>
                      </div>
                      <div className="mt-2 text-sm">
                        {trip.children && (
                          <span className="text-green-700">
                            Children: {trip.children.join(", ")}
                          </span>
                        )}
                        {trip.passengers && (
                          <span className="text-blue-700 ml-4">
                            Passengers: {trip.passengers.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        trip.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : trip.status === "driving"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {trip.status === "confirmed" && "✓ Confirmed"}
                      {trip.status === "driving" && "🚗 You're driving"}
                      {trip.status === "pending" && "⏳ Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionErrorBoundary>

        {/* School Carpool Actions */}
        <SectionErrorBoundary sectionName="School Actions">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              🎯 Quick School Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {schoolActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.name}
                    onClick={action.action}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200 text-left group"
                  >
                    <div
                      className={`${action.color} rounded-lg p-3 text-white group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                        {action.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionErrorBoundary>

        {/* Family Efficiency Dashboard */}
        <SectionErrorBoundary sectionName="Family Metrics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* This Week */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 text-green-600 mr-2" />
                This Week's Impact
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    School trips coordinated
                  </span>
                  <span className="font-semibold">
                    {familyMetrics.thisWeek.tripsCoordinated}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Miles shared with families
                  </span>
                  <span className="font-semibold">
                    {familyMetrics.thisWeek.milesShared} miles
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CO₂ emissions saved</span>
                  <span className="font-semibold text-green-600">
                    {familyMetrics.thisWeek.co2Saved}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average cost per trip</span>
                  <span className="font-semibold">
                    {familyMetrics.thisWeek.costPerTrip}
                  </span>
                </div>
              </div>
            </div>

            {/* This Month */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
                Community Connection
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reliability score</span>
                  <span className="font-semibold text-green-600">
                    {familyMetrics.thisMonth.reliabilityScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Families connected</span>
                  <span className="font-semibold">
                    {familyMetrics.thisMonth.familiesConnected}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Emergency pickups helped
                  </span>
                  <span className="font-semibold">
                    {familyMetrics.thisMonth.emergencyPickups}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Parent rating</span>
                  <span className="font-semibold">
                    ⭐ {familyMetrics.thisMonth.averageRating}/5
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionErrorBoundary>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
