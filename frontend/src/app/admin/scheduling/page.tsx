"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface GenerateScheduleRequest {
  weekStartDate: string;
  forceRegenerate: boolean;
}

interface SchedulingResult {
  weekStartDate: string;
  assignmentsCreated: number;
  slotsAssigned: number;
  unassignedSlots: string[];
  algorithmSteps: string[];
}

export default function AdminSchedulingPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const [generateRequest, setGenerateRequest] =
    useState<GenerateScheduleRequest>({
      weekStartDate: "",
      forceRegenerate: false,
    });
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedulingResult, setSchedulingResult] =
    useState<SchedulingResult | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // Set default week start date to next Monday
  useEffect(() => {
    const getNextMonday = () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      return nextMonday.toISOString().split("T")[0];
    };

    setGenerateRequest((prev) => ({
      ...prev,
      weekStartDate: getNextMonday(),
    }));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You must be an administrator to access this page.
          </p>
        </div>
      </div>
    );
  }

  const handleGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setMessage(null);
    setSchedulingResult(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ||
          "https://vcarpool-api-prod.azurewebsites.net/api"
        }/v1/admin/generate-schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(generateRequest),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to generate schedule");
      }

      setSchedulingResult(result.data);
      setMessage({
        type: "success",
        text: `✅ Schedule generated successfully! ${result.data.assignmentsCreated} assignments created`,
      });
    } catch (error) {
      console.error("Generate schedule error:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to generate schedule",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  📅 Schedule Management
                </h1>
                <p className="text-green-100 mt-1">
                  Automated weekly driving schedule generation
                </p>
              </div>
              <Link
                href="/admin"
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Welcome, {user.firstName} {user.lastName} 👋
            </h2>
            <p className="text-gray-600">
              Generate optimized driving schedules using parent preferences
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className="px-6 py-4">
              <div
                className={`p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            </div>
          )}

          {/* Schedule Generation Form */}
          <div className="px-6 py-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              🤖 Automated Schedule Generation
            </h3>
            <p className="text-gray-600 mb-6">
              Generate weekly driving schedules based on parent preferences
              using our 5-step optimization algorithm.
            </p>

            <form onSubmit={handleGenerateSchedule} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Week Start Date (Monday) *
                  </label>
                  <input
                    type="date"
                    required
                    value={generateRequest.weekStartDate}
                    onChange={(e) =>
                      setGenerateRequest((prev) => ({
                        ...prev,
                        weekStartDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="forceRegenerate"
                    checked={generateRequest.forceRegenerate}
                    onChange={(e) =>
                      setGenerateRequest((prev) => ({
                        ...prev,
                        forceRegenerate: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="forceRegenerate"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Force regeneration (overwrite existing schedule)
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">
                  📋 Algorithm Process:
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Step 1: Exclude drivers marked as unavailable</li>
                  <li>• Step 2: Assign preferable slots (max 3 per driver)</li>
                  <li>
                    • Step 3: Assign less-preferable slots (max 2 per driver)
                  </li>
                  <li>• Step 4: Fill neutral slots with fair distribution</li>
                  <li>• Step 5: Historical tie-breaking for equity</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      Generating Schedule...
                    </>
                  ) : (
                    "🚀 Generate Weekly Schedule"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Scheduling Results */}
          {schedulingResult && (
            <div className="border-t border-gray-200 px-6 py-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                📊 Generation Results
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {schedulingResult.assignmentsCreated}
                  </div>
                  <div className="text-sm text-green-700">
                    Assignments Created
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {schedulingResult.slotsAssigned}
                  </div>
                  <div className="text-sm text-blue-700">Slots Assigned</div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {schedulingResult.unassignedSlots?.length || 0}
                  </div>
                  <div className="text-sm text-orange-700">
                    Unassigned Slots
                  </div>
                </div>
              </div>

              {schedulingResult.algorithmSteps && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-800 mb-3">
                    Algorithm Execution Log:
                  </h5>
                  <div className="space-y-1">
                    {schedulingResult.algorithmSteps.map(
                      (step: string, index: number) => (
                        <div
                          key={index}
                          className="text-sm text-gray-600 font-mono"
                        >
                          {step}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
