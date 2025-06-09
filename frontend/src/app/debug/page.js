"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DebugPage;
const react_1 = require("react");
const auth_store_1 = require("../../store/auth.store");
const trip_store_1 = require("../../store/trip.store");
const trip_api_1 = require("../../lib/trip-api");
function DebugPage() {
    const { user, isAuthenticated } = (0, auth_store_1.useAuthStore)();
    const { stats, loading: statsLoading } = (0, trip_store_1.useTripStore)();
    const [directApiResponse, setDirectApiResponse] = (0, react_1.useState)(null);
    const [directApiError, setDirectApiError] = (0, react_1.useState)(null);
    const [simpleFetchResponse, setSimpleFetchResponse] = (0, react_1.useState)(null);
    const [simpleFetchError, setSimpleFetchError] = (0, react_1.useState)(null);
    const testDirectAPI = async () => {
        try {
            console.log("Testing direct API call...");
            const response = await trip_api_1.tripApi.getTripStats();
            console.log("Direct API response:", response);
            setDirectApiResponse(response);
        }
        catch (error) {
            console.error("Direct API error:", error);
            setDirectApiError(error instanceof Error ? error.message : "Unknown error");
        }
    };
    const testSimpleFetch = async () => {
        try {
            console.log("Testing simple fetch without custom headers...");
            const response = await fetch("https://vcarpool-api-prod.azurewebsites.net/api/trips/stats");
            const data = await response.json();
            console.log("Simple fetch response:", data);
            setSimpleFetchResponse(data);
            setSimpleFetchError(null);
        }
        catch (error) {
            console.error("Simple fetch error:", error);
            setSimpleFetchError(error instanceof Error ? error.message : "Unknown error");
        }
    };
    // Force deployment trigger for CORS fix
    (0, react_1.useEffect)(() => {
        testDirectAPI();
    }, []);
    return (<div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Debug Dashboard
        </h1>

        {/* Authentication Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Authenticated:</span>
              <span className={isAuthenticated ? "text-green-600" : "text-red-600"}>
                {isAuthenticated ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">User:</span>
              <span>
                {user
            ? `${user.firstName} ${user.lastName} (${user.email})`
            : "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Role:</span>
              <span>{user?.role || "None"}</span>
            </div>
          </div>
        </div>

        {/* Direct API Test */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Direct API Test</h2>
          <button onClick={testDirectAPI} className="bg-blue-500 text-white px-4 py-2 rounded mb-4 mr-4 hover:bg-blue-600">
            Test API Call
          </button>
          <button onClick={testSimpleFetch} className="bg-green-500 text-white px-4 py-2 rounded mb-4 hover:bg-green-600">
            Test Simple Fetch (No Headers)
          </button>

          {directApiError && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>API Client Error:</strong> {directApiError}
            </div>)}

          {simpleFetchError && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Simple Fetch Error:</strong> {simpleFetchError}
            </div>)}

          {directApiResponse && (<div className="bg-gray-100 p-4 rounded mb-4">
              <h3 className="font-semibold mb-2">Direct API Response:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(directApiResponse, null, 2)}
              </pre>
            </div>)}

          {simpleFetchResponse && (<div className="bg-green-100 p-4 rounded">
              <h3 className="font-semibold mb-2">Simple Fetch Response:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(simpleFetchResponse, null, 2)}
              </pre>
            </div>)}
        </div>

        {/* Trip Store State */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trip Store State</h2>
          <div className="space-y-4">
            <div>
              <span className="font-medium">Loading:</span>
              <span className={`ml-2 ${statsLoading ? "text-yellow-600" : "text-green-600"}`}>
                {statsLoading ? "Yes" : "No"}
              </span>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Stats Object:</h3>
              <div className="bg-gray-100 p-4 rounded">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              </div>
            </div>

            {stats && (<div>
                <h3 className="font-semibold mb-2">Individual Stats:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span>Total Trips:</span>
                    <span>{stats.totalTrips}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>As Driver:</span>
                    <span>{stats.tripsAsDriver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>As Passenger:</span>
                    <span>{stats.tripsAsPassenger}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost Savings:</span>
                    <span>${stats.costSavings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Upcoming:</span>
                    <span>{stats.upcomingTrips}</span>
                  </div>
                </div>
              </div>)}
          </div>
        </div>

        {/* Manual API Test */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Manual API Test</h2>
          <p className="text-sm text-gray-600 mb-4">
            Open browser console (F12) and check for any errors. Also test these
            URLs directly:
          </p>
          <div className="space-y-2">
            <div>
              <a href="https://vcarpool-api-prod.azurewebsites.net/api/trips/stats" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Direct Trip Stats API
              </a>
            </div>
            <div>
              <a href="https://vcarpool-api-prod.azurewebsites.net/api/users/me" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Direct Users Me API
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
