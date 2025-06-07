"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserPlusIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";

// Define the interface inline since shared package imports are having issues
interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "parent" | "student" | "trip_admin";
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

  const adminFeatures = [
    {
      title: "User Management",
      description: "Create and manage parent and student accounts",
      icon: UserPlusIcon,
      href: "/admin/users",
      color: "bg-blue-600",
      hoverColor: "hover:bg-blue-700",
      implemented: true,
    },
    {
      title: "Role Management",
      description: "Promote parents to Trip Admin and manage user roles",
      icon: UserGroupIcon,
      href: "/admin/roles",
      color: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
      implemented: true,
      new: true,
    },
    {
      title: "Schedule Templates",
      description: "Create and manage weekly schedule templates",
      icon: DocumentIcon,
      href: "/admin/templates",
      color: "bg-green-600",
      hoverColor: "hover:bg-green-700",
      implemented: true,
      new: true,
    },
    {
      title: "Carpool Groups",
      description: "Create and manage carpool groups and invitations",
      icon: UserGroupIcon,
      href: "/admin/groups",
      color: "bg-indigo-600",
      hoverColor: "hover:bg-indigo-700",
      implemented: true,
      new: true,
    },
    {
      title: "Driver Management",
      description: "Designate active drivers for weekly schedules",
      icon: UserGroupIcon,
      href: "/admin/drivers",
      color: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
      implemented: true,
      new: true,
    },
    {
      title: "Schedule Generation",
      description: "Generate and manage weekly carpool schedules",
      icon: CalendarIcon,
      href: "/admin/scheduling",
      color: "bg-orange-600",
      hoverColor: "hover:bg-orange-700",
      implemented: true,
    },
    {
      title: "Reports & Analytics",
      description: "View system usage and driver participation reports",
      icon: ClipboardDocumentListIcon,
      href: "/admin/reports",
      color: "bg-indigo-600",
      hoverColor: "hover:bg-indigo-700",
      implemented: false,
    },
    {
      title: "System Settings",
      description: "Configure system-wide settings and preferences",
      icon: Cog6ToothIcon,
      href: "/admin/settings",
      color: "bg-gray-600",
      hoverColor: "hover:bg-gray-700",
      implemented: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  🛡️ Admin Dashboard
                </h1>
                <p className="text-green-100 mt-2">
                  Welcome back, {user.firstName}! Manage your carpool system.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Admin Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminFeatures.map((feature) => (
            <div key={feature.title} className="relative">
              {feature.new && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                    NEW
                  </span>
                </div>
              )}

              {feature.implemented ? (
                <Link
                  href={feature.href}
                  className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className={`${feature.color} p-3 rounded-lg`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${feature.color} ${feature.hoverColor} text-white transition-colors`}
                      >
                        Access Feature →
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="bg-white rounded-lg shadow-md opacity-75">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="bg-gray-400 p-3 rounded-lg">
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium text-gray-500">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-300 text-gray-600">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              🚀 Quick Actions
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/admin/users"
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <UserPlusIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">
                    Create User
                  </p>
                  <p className="text-xs text-blue-700">
                    Add new parent/student
                  </p>
                </div>
              </Link>

              <Link
                href="/admin/templates"
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <DocumentIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">
                    Manage Templates
                  </p>
                  <p className="text-xs text-green-700">
                    Weekly schedule slots
                  </p>
                </div>
              </Link>

              <Link
                href="/admin/drivers"
                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <UserGroupIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">
                    Select Drivers
                  </p>
                  <p className="text-xs text-purple-700">Weekly designations</p>
                </div>
              </Link>

              <Link
                href="/admin/scheduling"
                className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <CalendarIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">
                    Generate Schedule
                  </p>
                  <p className="text-xs text-orange-700">Auto assignment</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              📊 System Status
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">✅</div>
                <div className="text-sm text-gray-600 mt-2">
                  Template Management
                </div>
                <div className="text-xs text-gray-500">Ready for use</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">✅</div>
                <div className="text-sm text-gray-600 mt-2">
                  Driver Selection
                </div>
                <div className="text-xs text-gray-500">Fully operational</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">🔄</div>
                <div className="text-sm text-gray-600 mt-2">Calendar View</div>
                <div className="text-xs text-gray-500">Coming next</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
