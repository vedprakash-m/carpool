"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const DashboardLayout_1 = __importDefault(require("@/components/DashboardLayout"));
const SectionErrorBoundary_1 = require("@/components/SectionErrorBoundary");
const auth_store_1 = require("@/store/auth.store");
const trip_store_1 = require("@/store/trip.store");
const outline_1 = require("@heroicons/react/24/outline");
function DashboardPage() {
    const router = (0, navigation_1.useRouter)();
    const { user, isAuthenticated } = (0, auth_store_1.useAuthStore)();
    const { stats, loading, fetchTripStats } = (0, trip_store_1.useTripStore)();
    (0, react_1.useEffect)(() => {
        if (isAuthenticated && user) {
            fetchTripStats().catch(console.error);
        }
    }, [isAuthenticated, user, fetchTripStats]);
    // Don't render if not authenticated or user is missing
    if (!isAuthenticated || !user) {
        return null;
    }
    const handleScheduleSchoolRun = () => {
        router.push("/trips/create?type=school");
    };
    const handleFindSchoolCarpool = () => {
        router.push("/trips?filter=school");
    };
    const handleWeeklyPreferences = () => {
        router.push("/parents/preferences");
    };
    const handleManageChildren = () => {
        router.push("/family/children");
    };
    return (<DashboardLayout_1.default>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <outline_1.AcademicCapIcon className="h-8 w-8 text-blue-600"/>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Good morning, {user.firstName}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                2 school runs are scheduled for tomorrow - all pickups confirmed
              </p>
            </div>
          </div>
        </div>

        {/* School Statistics */}
        <SectionErrorBoundary_1.SectionErrorBoundary sectionName="School Statistics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <outline_1.CalendarIcon className="h-8 w-8 text-blue-600"/>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    This Week's School Runs
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : stats?.weeklySchoolTrips || 0}
                  </p>
                  <p className="text-sm text-gray-500">
                    Morning + afternoon trips
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <outline_1.UserGroupIcon className="h-8 w-8 text-green-600"/>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Children in Carpool
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : stats?.childrenCount || 0}
                  </p>
                  <p className="text-sm text-gray-500">
                    Active student profiles
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <outline_1.CurrencyDollarIcon className="h-8 w-8 text-yellow-600"/>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Monthly Fuel Savings
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading
            ? "..."
            : `$${(stats?.monthlyFuelSavings || 0).toFixed(2)}`}
                  </p>
                  <p className="text-sm text-gray-500">vs. driving alone</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <outline_1.ClockIcon className="h-8 w-8 text-purple-600"/>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Time Saved This Month
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : `${stats?.timeSavedHours || 0}h`}
                  </p>
                  <p className="text-sm text-gray-500">
                    from coordinated pickups
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionErrorBoundary_1.SectionErrorBoundary>

        {/* School-Specific Quick Actions */}
        <SectionErrorBoundary_1.SectionErrorBoundary sectionName="School Quick Actions">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Quick Actions
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={handleScheduleSchoolRun} className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <outline_1.TruckIcon className="h-8 w-8 text-blue-600 mb-2"/>
                  <span className="font-medium text-gray-900">
                    Schedule School Run
                  </span>
                  <span className="text-sm text-gray-500 text-center mt-1">
                    Create morning or afternoon school trip
                  </span>
                </button>

                <button onClick={handleFindSchoolCarpool} className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                  <outline_1.UserGroupIcon className="h-8 w-8 text-green-600 mb-2"/>
                  <span className="font-medium text-gray-900">
                    Find School Carpool
                  </span>
                  <span className="text-sm text-gray-500 text-center mt-1">
                    Join existing school trips in your area
                  </span>
                </button>

                <button onClick={handleWeeklyPreferences} className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
                  <outline_1.CalendarIcon className="h-8 w-8 text-purple-600 mb-2"/>
                  <span className="font-medium text-gray-900">
                    Weekly Preferences
                  </span>
                  <span className="text-sm text-gray-500 text-center mt-1">
                    Submit your weekly driving preferences
                  </span>
                </button>

                <button onClick={handleManageChildren} className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors">
                  <outline_1.AcademicCapIcon className="h-8 w-8 text-yellow-600 mb-2"/>
                  <span className="font-medium text-gray-900">
                    Manage Children
                  </span>
                  <span className="text-sm text-gray-500 text-center mt-1">
                    Add or edit student profiles
                  </span>
                </button>
              </div>
            </div>
          </div>
        </SectionErrorBoundary_1.SectionErrorBoundary>

        {/* Upcoming School Trips */}
        <SectionErrorBoundary_1.SectionErrorBoundary sectionName="Upcoming School Trips">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Today's School Schedule
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Morning Drop-off */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Morning Drop-off
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <outline_1.MapPinIcon className="h-4 w-4 mr-1"/>
                      Lincoln Elementary
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">7:45 AM</p>
                    <p className="text-sm text-gray-600">Tomorrow</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Children: Emma, Jake
                    </p>
                    <p className="text-sm text-gray-600">
                      Passengers: Tom (Grade 3), Lisa (Grade 2)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Confirmed
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      🚗 You're driving
                    </p>
                  </div>
                </div>
              </div>

              {/* Afternoon Pickup */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Afternoon Pickup
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <outline_1.MapPinIcon className="h-4 w-4 mr-1"/>
                      Lincoln Elementary
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">3:15 PM</p>
                    <p className="text-sm text-gray-600">Tomorrow</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Children: Emma</p>
                    <p className="text-sm text-gray-600">Driver: You</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Confirmed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionErrorBoundary_1.SectionErrorBoundary>

        {/* Family Efficiency Metrics */}
        <SectionErrorBoundary_1.SectionErrorBoundary sectionName="Family Efficiency Metrics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* This Week's Impact */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <outline_1.ChartBarIcon className="h-5 w-5 text-blue-600 mr-2"/>
                  <h3 className="text-lg font-medium text-gray-900">
                    This Week's Impact
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">8</p>
                    <p className="text-sm text-gray-600">Trips coordinated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      45 miles
                    </p>
                    <p className="text-sm text-gray-600">Miles shared</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">12 lbs</p>
                    <p className="text-sm text-gray-600">CO2 saved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">$3.25</p>
                    <p className="text-sm text-gray-600">Cost per trip</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Community Connection */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <outline_1.UserGroupIcon className="h-5 w-5 text-green-600 mr-2"/>
                  <h3 className="text-lg font-medium text-gray-900">
                    Community Connection
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">98%</p>
                    <p className="text-sm text-gray-600">Reliability</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">6</p>
                    <p className="text-sm text-gray-600">Families connected</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">2</p>
                    <p className="text-sm text-gray-600">Emergency pickups</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      ⭐ 4.8/5
                    </p>
                    <p className="text-sm text-gray-600">Parent rating</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionErrorBoundary_1.SectionErrorBoundary>
      </div>
    </DashboardLayout_1.default>);
}
