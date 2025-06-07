import React, { useState } from "react";

interface Child {
  id: string;
  name: string;
  grade: string;
  school: string;
  groups: CarpoolGroup[];
}

interface CarpoolGroup {
  id: string;
  name: string;
  role: "driver" | "passenger";
  pickupTime: string;
  status: string;
  driverName?: string;
}

interface FamilyStats {
  daysThisMonth: {
    driven: number;
    passenger: number;
  };
  reliability: number;
  communityScore: number;
}

interface UnifiedFamilyDashboardProps {
  family: {
    parentName: string;
    children: Child[];
    stats: FamilyStats;
  };
}

const UnifiedFamilyDashboard: React.FC<UnifiedFamilyDashboardProps> = ({
  family,
}) => {
  const [currentView, setCurrentView] = useState<"parent" | "admin">("parent");
  const [showRoleSwitch, setShowRoleSwitch] = useState(false);

  // Mock data for demonstration
  const mockData = {
    parentName: "Sarah Johnson",
    children: [
      {
        id: "emma",
        name: "Emma",
        grade: "2nd",
        school: "Lincoln Elementary",
        groups: [
          {
            id: "morning-riders",
            name: "Lincoln Elementary Morning Riders",
            role: "driver" as const,
            pickupTime: "7:45 AM",
            status: "You're driving today",
            driverName: "You",
          },
        ],
      },
      {
        id: "tommy",
        name: "Tommy",
        grade: "5th",
        school: "Lincoln Elementary",
        groups: [
          {
            id: "afternoon-club",
            name: "Lincoln Afternoon Club",
            role: "passenger" as const,
            pickupTime: "4:00 PM",
            status: "Mike driving",
            driverName: "Mike Chen",
          },
        ],
      },
    ],
    stats: {
      daysThisMonth: { driven: 15, passenger: 12 },
      reliability: 98,
      communityScore: 4.8,
    },
  };

  const data = family || mockData;

  const upcomingDeadlines = [
    { task: "Submit Emma's preferences", due: "Sat 10 PM" },
    { task: "Tommy's group swap response needed", due: "Sun 5 PM" },
  ];

  const conflictAlert = {
    date: "Tuesday, Jan 16",
    conflicts: [
      { child: "Emma", time: "7:45 AM", group: "Emma's group" },
      { child: "Tommy", time: "7:30 AM", group: "Tommy's group" },
    ],
    suggestion:
      "Request swap for Tommy's group - Lisa M. is available and lives nearby.",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Role Switching */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                👨‍👩‍👧‍👦 {data.parentName} Family Dashboard
              </h1>
              <p className="text-gray-600">
                Good morning! Here's your family's carpool status:
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowRoleSwitch(!showRoleSwitch)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                ⚙️ {currentView === "parent" ? "Parent" : "Admin"} View
              </button>
            </div>
          </div>

          {showRoleSwitch && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">🔄 Switch View</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setCurrentView("parent");
                    setShowRoleSwitch(false);
                  }}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    currentView === "parent"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-blue-600 border border-blue-300"
                  }`}
                >
                  👩‍👧‍👦 Parent Dashboard
                </button>
                <button
                  onClick={() => {
                    setCurrentView("admin");
                    setShowRoleSwitch(false);
                  }}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    currentView === "admin"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-blue-600 border border-blue-300"
                  }`}
                >
                  ⚙️ Trip Admin View
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Conflict Alert */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-yellow-600 text-xl">⚠️</span>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-yellow-800">
                Schedule Conflict Detected
              </h3>
              <p className="text-yellow-700 mt-1">
                Your children have overlapping carpool responsibilities on{" "}
                {conflictAlert.date}:
              </p>
              <ul className="mt-2 space-y-1">
                {conflictAlert.conflicts.map((conflict, index) => (
                  <li key={index} className="text-sm text-yellow-700">
                    • {conflict.group}: You're scheduled to drive (
                    {conflict.time})
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex space-x-3">
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors">
                  Auto-request Tommy swap
                </button>
                <button className="px-4 py-2 bg-white text-yellow-700 border border-yellow-300 rounded-md hover:bg-yellow-50 transition-colors">
                  Manual coordination
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📅 Today (Monday, January 15)
          </h2>
          <div className="space-y-4">
            {data.children.map((child) => (
              <div
                key={child.id}
                className="bg-white rounded-lg shadow-sm border p-4"
              >
                {child.groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="text-lg mr-2">
                          {group.role === "driver" ? "🚗" : "👥"}
                        </span>
                        <span className="font-medium text-gray-900">
                          {child.name} ({child.grade}) - {group.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{group.name}</p>
                      <p className="text-sm text-gray-500">
                        Pickup: {group.pickupTime}{" "}
                        {group.role === "driver" ? "| 3 kids total" : ""}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors">
                        View Route
                      </button>
                      <button className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md text-sm hover:bg-orange-200 transition-colors">
                        Running Late
                      </button>
                      <button className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors">
                        Contact {group.role === "driver" ? "Group" : "Driver"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🎯 Quick Family Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Submit All Preferences
              </button>
              <button className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                Emergency Alert
              </button>
              <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                Family Calendar
              </button>
            </div>
          </div>

          {/* Family Stats */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Family Carpool Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">This Month:</span>
                <span className="font-medium">
                  {data.stats.daysThisMonth.driven} days driven |{" "}
                  {data.stats.daysThisMonth.passenger} days passenger
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reliability:</span>
                <span className="font-medium text-green-600">
                  {data.stats.reliability}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Community Score:</span>
                <span className="font-medium text-blue-600">
                  {data.stats.communityScore}/5
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚡ Upcoming Deadlines
          </h3>
          <div className="space-y-2">
            {upcomingDeadlines.map((deadline, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-md"
              >
                <span className="text-gray-800">• {deadline.task}</span>
                <span className="text-sm text-orange-600 font-medium">
                  Due {deadline.due}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Admin View Content */}
        {currentView === "admin" && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              ⚙️ Trip Admin Dashboard
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-800">• 3 pending join requests</span>
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
                  Review
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-800">
                  • Schedule Emma's group for next week
                </span>
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
                  Generate
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-800">
                  • 1 swap request needs review
                </span>
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
                  Review
                </button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
              <p className="text-sm text-blue-800">
                💡 <strong>Smart Suggestion:</strong> 2 new families at Lincoln
                Elementary might be interested in joining Emma's group. Send
                invites?
              </p>
              <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
                Send Invites
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedFamilyDashboard;
