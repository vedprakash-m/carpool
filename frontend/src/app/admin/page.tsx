"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";

// Define the interface inline since shared package imports are having issues
interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "parent" | "student";
  phoneNumber?: string;
  homeAddress?: string;
  isActiveDriver?: boolean;
}

export default function AdminPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [createUserData, setCreateUserData] = useState<CreateUserRequest>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "parent",
    phoneNumber: "",
    homeAddress: "",
    isActiveDriver: false,
  });
  const [isCreating, setIsCreating] = useState(false);
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

  const handleInputChange = (
    field: keyof CreateUserRequest,
    value: string | boolean
  ) => {
    setCreateUserData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ||
          "https://vcarpool-api-prod.azurewebsites.net/api"
        }/v1/admin/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(createUserData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to create user");
      }

      setMessage({
        type: "success",
        text: `✅ ${result.data.user.firstName} ${result.data.user.lastName} (${result.data.user.role}) created successfully!`,
      });

      // Reset form
      setCreateUserData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "parent",
        phoneNumber: "",
        homeAddress: "",
        isActiveDriver: false,
      });
    } catch (error) {
      console.error("Create user error:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create user",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-blue-100 mt-1">
              Manage users and system settings
            </p>
          </div>

          {/* Welcome Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Welcome, {user.firstName} {user.lastName} 👋
            </h2>
            <p className="text-gray-600">
              System Administrator • VCarpool Management
            </p>
          </div>

          {/* Navigation Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🚀 Admin Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/admin/scheduling"
                className="block p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📅</span>
                  <div>
                    <h4 className="font-semibold text-green-800">
                      Schedule Management
                    </h4>
                    <p className="text-sm text-green-600">
                      Generate weekly driving schedules automatically
                    </p>
                  </div>
                </div>
              </a>

              <div className="block p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">👥</span>
                  <div>
                    <h4 className="font-semibold text-blue-800">
                      User Management
                    </h4>
                    <p className="text-sm text-blue-600">
                      Create parent and student accounts (current page)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Create User Form */}
          <div className="px-6 py-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Create New User
            </h3>

            {message && (
              <div
                className={`mb-4 p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createUserData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createUserData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createUserData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={createUserData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Min 8 characters"
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={createUserData.phoneNumber || ""}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    value={createUserData.role}
                    onChange={(e) =>
                      handleInputChange(
                        "role",
                        e.target.value as "parent" | "student"
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="parent">Parent</option>
                    <option value="student">Student</option>
                  </select>
                </div>
              </div>

              {/* Parent-specific fields */}
              {createUserData.role === "parent" && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">
                    Parent-Specific Information
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Home Address
                      </label>
                      <input
                        type="text"
                        value={createUserData.homeAddress || ""}
                        onChange={(e) =>
                          handleInputChange("homeAddress", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="123 Main St, City, State 12345"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActiveDriver"
                        checked={createUserData.isActiveDriver}
                        onChange={(e) =>
                          handleInputChange("isActiveDriver", e.target.checked)
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="isActiveDriver"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Designate as Active Driver
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      Creating User...
                    </>
                  ) : (
                    `Create ${
                      createUserData.role === "parent" ? "Parent" : "Student"
                    } Account`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
