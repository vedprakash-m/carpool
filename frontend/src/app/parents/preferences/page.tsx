"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { apiClient } from "@/lib/api-client";
import {
  DriverWeeklyPreference,
  SubmitWeeklyPreferencesRequest,
} from "@vcarpool/shared";
import VisualCalendarGrid from "@/components/preferences/VisualCalendarGrid";
import BulkSelectionTools from "@/components/preferences/BulkSelectionTools";

// Mock template slots - replace with real data from API
const TEMPLATE_SLOTS = [
  {
    id: "slot-monday-morning",
    dayOfWeek: 1,
    startTime: "07:30",
    endTime: "08:30",
    routeType: "school_dropoff" as const,
    description: "Monday Morning Drop-off",
    maxPassengers: 4,
  },
  {
    id: "slot-monday-afternoon",
    dayOfWeek: 1,
    startTime: "15:00",
    endTime: "16:00",
    routeType: "school_pickup" as const,
    description: "Monday Afternoon Pick-up",
    maxPassengers: 4,
  },
  {
    id: "slot-tuesday-morning",
    dayOfWeek: 2,
    startTime: "07:30",
    endTime: "08:30",
    routeType: "school_dropoff" as const,
    description: "Tuesday Morning Drop-off",
    maxPassengers: 4,
  },
  {
    id: "slot-tuesday-afternoon",
    dayOfWeek: 2,
    startTime: "15:00",
    endTime: "16:00",
    routeType: "school_pickup" as const,
    description: "Tuesday Afternoon Pick-up",
    maxPassengers: 4,
  },
  {
    id: "slot-wednesday-morning",
    dayOfWeek: 3,
    startTime: "07:30",
    endTime: "08:30",
    routeType: "school_dropoff" as const,
    description: "Wednesday Morning Drop-off",
    maxPassengers: 4,
  },
  {
    id: "slot-wednesday-afternoon",
    dayOfWeek: 3,
    startTime: "15:00",
    endTime: "16:00",
    routeType: "school_pickup" as const,
    description: "Wednesday Afternoon Pick-up",
    maxPassengers: 4,
  },
  {
    id: "slot-thursday-morning",
    dayOfWeek: 4,
    startTime: "07:30",
    endTime: "08:30",
    routeType: "school_dropoff" as const,
    description: "Thursday Morning Drop-off",
    maxPassengers: 4,
  },
  {
    id: "slot-thursday-afternoon",
    dayOfWeek: 4,
    startTime: "15:00",
    endTime: "16:00",
    routeType: "school_pickup" as const,
    description: "Thursday Afternoon Pick-up",
    maxPassengers: 4,
  },
  {
    id: "slot-friday-morning",
    dayOfWeek: 5,
    startTime: "07:30",
    endTime: "08:30",
    routeType: "school_dropoff" as const,
    description: "Friday Morning Drop-off",
    maxPassengers: 4,
  },
  {
    id: "slot-friday-afternoon",
    dayOfWeek: 5,
    startTime: "15:00",
    endTime: "16:00",
    routeType: "school_pickup" as const,
    description: "Friday Afternoon Pick-up",
    maxPassengers: 4,
  },
];

interface PreferenceFormData {
  [slotId: string]: "preferable" | "less_preferable" | "unavailable" | "";
}

interface PreferenceConstraints {
  preferable: number;
  lessPreferable: number;
  unavailable: number;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ParentPreferencesPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [preferences, setPreferences] = useState<PreferenceFormData>({});
  const [existingPreferences, setExistingPreferences] = useState<
    DriverWeeklyPreference[]
  >([]);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submissionDeadline, setSubmissionDeadline] = useState<Date | null>(
    null
  );
  const [canEdit, setCanEdit] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Wait for auth store to hydrate from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasHydrated(true);
    }, 100); // Give auth store time to hydrate

    return () => clearTimeout(timer);
  }, []);

  // Authentication check with hydration handling
  useEffect(() => {
    console.log("Auth state check:", {
      isAuthenticated,
      isLoading,
      user: user?.email,
      role: user?.role,
      hasHydrated,
    });

    // Don't redirect while auth is still loading OR before hydration
    if (isLoading || !hasHydrated) {
      console.log("Waiting for auth loading or hydration...");
      return;
    }

    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      router.push("/login");
      return;
    }

    if (user?.role !== "parent" && user?.role !== "admin") {
      console.log("Invalid role for parent preferences:", user?.role);
      router.push("/dashboard");
      return;
    }

    console.log("Authentication check passed for user:", user?.email);
  }, [isAuthenticated, isLoading, user, router, hasHydrated]);

  // Set default week to upcoming Monday
  useEffect(() => {
    const getUpcomingMonday = () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // If Sunday, 1 day; otherwise, days until next Monday
      const monday = new Date(today);
      monday.setDate(today.getDate() + daysUntilMonday);
      return monday.toISOString().split("T")[0];
    };

    setSelectedWeek(getUpcomingMonday());
  }, []);

  // Load existing preferences when week changes
  useEffect(() => {
    if (selectedWeek) {
      loadPreferences();
    }
  }, [selectedWeek]);

  const loadPreferences = async () => {
    if (!selectedWeek) return;

    setIsLoadingPrefs(true);
    setError(null);

    try {
      const response = await apiClient.get<{
        weekStartDate: string;
        preferences: DriverWeeklyPreference[];
        submissionDeadline: string;
        canEdit: boolean;
      }>(`/v1/parents/weekly-preferences?weekStartDate=${selectedWeek}`);

      if (response.success && response.data) {
        setExistingPreferences(response.data.preferences);
        setSubmissionDeadline(new Date(response.data.submissionDeadline));
        setCanEdit(response.data.canEdit);

        // Convert existing preferences to form data
        const formData: PreferenceFormData = {};
        response.data.preferences.forEach((pref) => {
          formData[pref.templateSlotId] = pref.preferenceLevel;
        });
        setPreferences(formData);
      }
    } catch (err: any) {
      setError(`Failed to load preferences: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoadingPrefs(false);
    }
  };

  const getConstraintCounts = (): PreferenceConstraints => {
    const counts = { preferable: 0, lessPreferable: 0, unavailable: 0 };

    Object.values(preferences).forEach((level) => {
      if (level === "preferable") counts.preferable++;
      else if (level === "less_preferable") counts.lessPreferable++;
      else if (level === "unavailable") counts.unavailable++;
    });

    return counts;
  };

  const validateConstraints = (): string | null => {
    const counts = getConstraintCounts();

    if (counts.preferable > 3) {
      return "You can select a maximum of 3 preferable time slots per week.";
    }

    if (counts.lessPreferable > 2) {
      return "You can select a maximum of 2 less-preferable time slots per week.";
    }

    if (counts.unavailable > 2) {
      return "You can select a maximum of 2 unavailable time slots per week.";
    }

    return null;
  };

  const handlePreferenceChange = (slotId: string, level: string) => {
    const newPreferences = { ...preferences };

    if (level === "") {
      delete newPreferences[slotId];
    } else {
      newPreferences[slotId] = level as
        | "preferable"
        | "less_preferable"
        | "unavailable";
    }

    setPreferences(newPreferences);
    setError(null);
  };

  const handleBulkPreferenceChange = (slotIds: string[], level: string) => {
    const newPreferences = { ...preferences };

    slotIds.forEach((slotId) => {
      if (level === "") {
        delete newPreferences[slotId];
      } else {
        newPreferences[slotId] = level as
          | "preferable"
          | "less_preferable"
          | "unavailable";
      }
    });

    setPreferences(newPreferences);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      setError("The submission deadline has passed for this week.");
      return;
    }

    const validationError = validateConstraints();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const submitData: SubmitWeeklyPreferencesRequest = {
        weekStartDate: selectedWeek,
        preferences: Object.entries(preferences)
          .filter(([_, level]) => level !== "")
          .map(([templateSlotId, preferenceLevel]) => ({
            templateSlotId,
            preferenceLevel: preferenceLevel as
              | "preferable"
              | "less_preferable"
              | "unavailable",
          })),
      };

      const response = await apiClient.post(
        "/v1/parents/weekly-preferences",
        submitData
      );

      if (response.success) {
        setSuccess("Weekly preferences submitted successfully!");
        await loadPreferences(); // Reload to get updated data
      } else {
        setError(response.error || "Failed to submit preferences");
      }
    } catch (err: any) {
      setError(
        `Failed to submit preferences: ${err.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimeUntilDeadline = (): string => {
    if (!submissionDeadline) return "";

    const now = new Date();
    const timeLeft = submissionDeadline.getTime() - now.getTime();

    if (timeLeft <= 0) return "Deadline passed";

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Show loading screen while auth is hydrating
  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const counts = getConstraintCounts();
  const timeLeft = getTimeUntilDeadline();

  if (!isAuthenticated) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Weekly Driving Preferences
          </h1>
          <p className="text-gray-600">
            Submit your weekly driving preferences to help with automated
            schedule generation.
          </p>
        </div>

        {/* Week Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select Week
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <label
                htmlFor="week"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Week Starting (Monday)
              </label>
              <input
                type="date"
                id="week"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isLoadingPrefs}
              />
            </div>

            {submissionDeadline && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-900">
                  Submission Deadline
                </div>
                <div className="text-sm text-blue-700">
                  {submissionDeadline.toLocaleDateString()} at{" "}
                  {submissionDeadline.toLocaleTimeString()}
                </div>
                {timeLeft && (
                  <div
                    className={`text-sm font-medium ${
                      canEdit ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {canEdit ? `Time left: ${timeLeft}` : "Deadline passed"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Visual Calendar Interface */}
        {isLoadingPrefs ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 mb-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading preferences...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Bulk Selection Tools */}
            <BulkSelectionTools
              slots={TEMPLATE_SLOTS}
              preferences={preferences}
              onBulkPreferenceChange={handleBulkPreferenceChange}
              canEdit={canEdit}
            />

            {/* Visual Calendar Grid */}
            <VisualCalendarGrid
              slots={TEMPLATE_SLOTS}
              preferences={preferences}
              onPreferenceChange={handlePreferenceChange}
              canEdit={canEdit}
              constraints={counts}
            />
          </>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {/* Submit Button */}
        <form onSubmit={handleSubmit}>
          <div className="flex justify-end space-x-4 mb-6">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !canEdit || isLoadingPrefs}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Preferences"}
            </button>
          </div>
        </form>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            How It Works
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • Submit your preferences by Saturday midnight for the following
              week
            </li>
            <li>
              • You can select up to 3 preferable, 2 less-preferable, and 2
              unavailable time slots
            </li>
            <li>
              • The automated scheduling system will use your preferences to
              assign driving duties
            </li>
            <li>
              • You'll receive an email notification once the weekly schedule is
              generated
            </li>
            <li>• Preferences can be updated until the deadline passes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
