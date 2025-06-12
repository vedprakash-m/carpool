"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { RegisterRequest } from "@/types/shared";
import { useAuthStore } from "@/store/auth.store";
import {
  SchoolSelect,
  GradeSelect,
} from "@/components/shared/SchoolGradeSelects";
import { TESLA_STEM_HIGH_SCHOOL } from "@/config/schools";
import {
  UserIcon,
  UsersIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMemo } from "react";

// Local schema definition to avoid import issues
const registerSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  parent: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
  secondParent: z
    .object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters"),
    })
    .optional(),
  children: z
    .array(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        grade: z.string().min(1, "Grade is required"),
        school: z.string().min(1, "School is required"),
      })
    )
    .min(1, "At least one child is required"),
});

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register: registerField,
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      children: [
        {
          firstName: "",
          lastName: "",
          grade: "",
          school: TESLA_STEM_HIGH_SCHOOL.name,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "children",
  });

  // Debug logging for fields array
  console.log("Current fields array:", fields);
  console.log("Fields length:", fields?.length);
  console.log("Fields type:", typeof fields);

  // Ensure fields array is never empty with comprehensive safety checks
  const safeFields = useMemo(() => {
    // If fields is undefined or empty, return a default child to prevent crashes
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      console.warn("Fields array is empty or undefined, using default child");
      return [
        {
          id: "default-child",
          firstName: "",
          lastName: "",
          grade: "",
          school: TESLA_STEM_HIGH_SCHOOL.name,
        },
      ];
    }

    // Return fields as-is if it's properly populated
    return fields.map((field, index) => ({
      ...field,
      // Ensure each field has required properties
      id: field.id || `child-${index}`,
      firstName: field.firstName || "",
      lastName: field.lastName || "",
      grade: field.grade || "",
      school: field.school || TESLA_STEM_HIGH_SCHOOL.name,
    }));
  }, [fields]);

  const onSubmit = async (data: RegisterRequest) => {
    try {
      // Add validation to ensure children array is properly populated
      if (!data.children || data.children.length === 0) {
        toast.error("Please add at least one child");
        return;
      }

      // Validate each child has required fields
      const invalidChild = data.children.find(
        (child) =>
          !child.firstName || !child.lastName || !child.grade || !child.school
      );

      if (invalidChild) {
        toast.error("Please fill in all required fields for each child");
        return;
      }

      console.log("Submitting registration data:", data);
      await register(data);
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    }
  };

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <UsersIcon className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join VCarpool as a Family
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {currentStep === 1 && (
            <section>
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Step 1: Family and Parent Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="familyName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Family Name
                  </label>
                  <input
                    {...registerField("familyName")}
                    type="text"
                    className="mt-1 input"
                    placeholder="e.g., The Johnson Family"
                  />
                  {errors.familyName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.familyName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="parent.firstName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      First Name
                    </label>
                    <input
                      {...registerField("parent.firstName")}
                      type="text"
                      className="mt-1 input"
                      placeholder="Parent's First Name"
                    />
                    {errors.parent?.firstName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.parent.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="parent.lastName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Last Name
                    </label>
                    <input
                      {...registerField("parent.lastName")}
                      type="text"
                      className="mt-1 input"
                      placeholder="Parent's Last Name"
                    />
                    {errors.parent?.lastName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.parent.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="parent.email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    {...registerField("parent.email")}
                    type="email"
                    className="mt-1 input"
                    placeholder="Parent's Email Address"
                    autoComplete="email"
                  />
                  {errors.parent?.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parent.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="parent.password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <input
                    {...registerField("parent.password")}
                    type="password"
                    className="mt-1 input"
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                  {errors.parent?.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parent.password.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary"
                >
                  Next: Add Children
                </button>
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section>
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Step 2: Children's Information
              </h3>
              <div className="space-y-6">
                {safeFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 border border-gray-200 rounded-lg space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-800">
                        Child {index + 1}
                      </h4>
                      {safeFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            // Enhanced safety checks for remove operation
                            if (
                              index >= 0 &&
                              index < safeFields.length &&
                              fields &&
                              fields.length > 1 &&
                              index < fields.length
                            ) {
                              console.log(
                                `Removing child at index ${index}, current fields length: ${fields.length}`
                              );
                              remove(index);
                            } else {
                              console.warn(
                                `Cannot remove child at index ${index}. Fields length: ${fields?.length}, SafeFields length: ${safeFields.length}`
                              );
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        {...registerField(`children.${index}.firstName`)}
                        placeholder="First Name"
                        className="input"
                        autoComplete="given-name"
                      />
                      <input
                        {...registerField(`children.${index}.lastName`)}
                        placeholder="Last Name"
                        className="input"
                        autoComplete="family-name"
                      />
                    </div>

                    {/* Grade Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grade *
                      </label>
                      <Controller
                        name={`children.${index}.grade`}
                        control={control}
                        render={({ field }) => (
                          <GradeSelect
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select Grade"
                            required
                          />
                        )}
                      />
                      {errors.children?.[index]?.grade && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.children?.[index]?.grade?.message}
                        </p>
                      )}
                    </div>

                    {/* School Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        School *
                      </label>
                      <Controller
                        name={`children.${index}.school`}
                        control={control}
                        render={({ field }) => (
                          <SchoolSelect
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select School"
                            required
                          />
                        )}
                      />
                      {errors.children?.[index]?.school && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.children?.[index]?.school?.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      console.log("Adding new child to form");
                      append({
                        firstName: "",
                        lastName: "",
                        grade: "",
                        school: TESLA_STEM_HIGH_SCHOOL.name,
                      });
                    } catch (error) {
                      console.error("Error adding child:", error);
                      toast.error("Failed to add child. Please try again.");
                    }
                  }}
                  className="btn-secondary"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Another Child
                </button>
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  );
}
