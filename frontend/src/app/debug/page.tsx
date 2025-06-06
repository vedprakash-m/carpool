"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/auth.store";
import { useTripStore } from "../../store/trip.store";
import { apiClient } from "../../lib/api-client";

export default function DebugPage() {
  const { user, isAuthenticated, token } = useAuthStore();
  const { stats, loading: statsLoading, fetchTripStats } = useTripStore();
  const [apiTests, setApiTests] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test health endpoint
      console.log("Testing health endpoint...");
      const healthResponse = await fetch(
        "https://vcarpool-api-prod.azurewebsites.net/api/health"
      );
      results.health = {
        status: healthResponse.status,
        data: await healthResponse.text(),
      };
    } catch (error) {
      results.health = { error: (error as Error).message };
    }

    try {
      // Test auth endpoint
      console.log("Testing auth endpoint...");
      const authResponse = await fetch(
        "https://vcarpool-api-prod.azurewebsites.net/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "admin@vcarpool.com",
            password: "Admin123!",
          }),
        }
      );
      results.auth = {
        status: authResponse.status,
        data: await authResponse.text(),
      };
    } catch (error) {
      results.auth = { error: (error as Error).message };
    }

    try {
      // Test stats endpoint
      console.log("Testing stats endpoint...");
      const statsResponse = await fetch(
        "https://vcarpool-api-prod.azurewebsites.net/api/trips/stats"
      );
      results.stats = {
        status: statsResponse.status,
        data: await statsResponse.text(),
      };
    } catch (error) {
      results.stats = { error: (error as Error).message };
    }

    try {
      // Test using apiClient
      console.log("Testing via apiClient...");
      const apiClientStats = await apiClient.get("/trips/stats");
      results.apiClientStats = apiClientStats;
    } catch (error) {
      results.apiClientStats = { error: (error as Error).message };
    }

    setApiTests(results);
    setLoading(false);
  };

  useEffect(() => {
    testAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          VCarpool Debug Page
        </h1>

        {/* Authentication Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Is Authenticated:</strong>{" "}
              {isAuthenticated ? "Yes" : "No"}
            </div>
            <div>
              <strong>Has Token:</strong> {token ? "Yes" : "No"}
            </div>
            <div className="col-span-2">
              <strong>User:</strong>{" "}
              {user
                ? `${user.firstName} ${user.lastName} (${user.email})`
                : "None"}
            </div>
          </div>
        </div>

        {/* Trip Stats from Store */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trip Stats from Store</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Loading:</strong> {statsLoading ? "Yes" : "No"}
            </div>
            <div>
              <strong>Stats:</strong>{" "}
              {stats ? JSON.stringify(stats, null, 2) : "None"}
            </div>
          </div>
          <button
            onClick={() => fetchTripStats()}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Fetch Trip Stats
          </button>
        </div>

        {/* API Tests */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Direct API Tests</h2>
          <button
            onClick={testAPI}
            disabled={loading}
            className="mb-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? "Testing..." : "Run API Tests"}
          </button>

          {Object.keys(apiTests).length > 0 && (
            <div className="space-y-4">
              {Object.entries(apiTests).map(([key, result]: [string, any]) => (
                <div key={key} className="border border-gray-200 rounded p-4">
                  <h3 className="font-semibold mb-2">{key}</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Console Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <div className="text-sm text-gray-600">
            <p>1. Open browser console (F12) to see detailed logs</p>
            <p>2. Check if there are any JavaScript errors</p>
            <p>3. Look for failed network requests</p>
            <p>4. Verify API responses match expected format</p>
          </div>
        </div>
      </div>
    </div>
  );
}
