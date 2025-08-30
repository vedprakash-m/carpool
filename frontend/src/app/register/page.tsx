'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { RegisterRequest } from '@/types/shared';
import { apiClient } from '@/lib/api-client';
import {
  SchoolSelect,
  GradeSelect,
} from '@/components/shared/SchoolGradeSelects';
import AddressValidation from '@/components/AddressValidation';
import { TESLA_STEM_HIGH_SCHOOL } from '@/config/schools';
import {
  UserIcon,
  UsersIcon,
  PlusIcon,
  TrashIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { useMemo } from 'react';

// Local schema definition to avoid import issues
const registerSchema = z.object({
  familyName: z.string().min(1, 'Family name is required'),
  parent: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
  homeAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(5, 'Valid ZIP code is required'),
  }),
  secondParent: z
    .object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    })
    .optional(),
  children: z
    .array(
      z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        grade: z.string().min(1, 'Grade is required'),
        school: z.string().min(1, 'School is required'),
      })
    )
    .min(1, 'At least one child is required'),
});

export default function RegisterPage() {
  const router = useRouter();
  // Direct registration without authentication store dependency
  const [isLoading, setIsLoading] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [addressValidated, setAddressValidated] = useState(false);

  const {
    register: registerField,
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      homeAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
      children: [
        {
          firstName: '',
          lastName: '',
          grade: '',
          school: TESLA_STEM_HIGH_SCHOOL.name,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'children',
  });

  // Debug logging for fields array
  console.log('Current fields array:', fields);
  console.log('Fields length:', fields?.length);
  console.log('Fields type:', typeof fields);

  // Ensure fields array is never empty with comprehensive safety checks
  const safeFields = useMemo(() => {
    // If fields is undefined or empty, return a default child to prevent crashes
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      console.warn('Fields array is empty or undefined, using default child');
      return [
        {
          id: 'default-child',
          firstName: '',
          lastName: '',
          grade: '',
          school: TESLA_STEM_HIGH_SCHOOL.name,
        },
      ];
    }

    // Return fields with safety checks for each individual field
    return fields.map((field, index) => {
      // Handle null, undefined, or invalid field objects
      if (!field || typeof field !== 'object') {
        console.warn(`Invalid field at index ${index}:`, field);
        return {
          id: `fallback-child-${index}`,
          firstName: '',
          lastName: '',
          grade: '',
          school: TESLA_STEM_HIGH_SCHOOL.name,
        };
      }

      return {
        ...field,
        // Ensure each field has required properties with fallbacks
        id: field.id || `child-${index}`,
        firstName: field.firstName || '',
        lastName: field.lastName || '',
        grade: field.grade || '',
        school: field.school || TESLA_STEM_HIGH_SCHOOL.name,
      };
    });
  }, [fields]);

  const onSubmit = async (data: RegisterRequest) => {
    try {
      // Add validation to ensure children array is properly populated
      if (!data.children || data.children.length === 0) {
        toast.error('Please add at least one child');
        return;
      }

      // Validate each child has required fields
      const invalidChild = data.children.find(
        child =>
          !child.firstName || !child.lastName || !child.grade || !child.school
      );

      if (invalidChild) {
        toast.error('Please fill in all required fields for each child');
        return;
      }

      // Validate address is provided
      if (
        !data.homeAddress ||
        !data.homeAddress.street ||
        !data.homeAddress.city ||
        !data.homeAddress.state ||
        !data.homeAddress.zipCode
      ) {
        toast.error('Please provide a complete home address');
        return;
      }

      // Use the new provisioning flow instead of legacy registration
      await handleProvisioningSignup(data);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    }
  };

  const handleProvisioningSignup = async (data: RegisterRequest) => {
    try {
      // Submit family registration for Microsoft account provisioning
      const response = await fetch('/api/family-registration-provisioning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyName: `${data.parent.firstName} ${data.parent.lastName} Family`,
          parent: data.parent,
          homeAddress: data.homeAddress,
          children: data.children,
          emergencyContact: {
            name: 'Emergency Contact', // You might want to collect this
            phone: data.parent.email, // Placeholder
            relationship: 'Parent',
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          'Account provisioned! Check your email for login instructions.'
        );

        // Show provisioning success page with login instructions
        router.push(`/registration-complete?familyId=${result.familyId}`);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Account provisioning error:', error);
      toast.error(
        error.message || 'Account provisioning failed. Please try again.'
      );
    }
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <UsersIcon className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Carpool as a Family
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Complete your family registration to get Microsoft accounts for
            carpool access
          </p>
        </div>

        {/* Family Registration Form */}
        <div className="mt-8">
          <form
            className="mt-8 space-y-6"
            onSubmit={handleSubmit(onSubmit)}
            data-testid="registration-form"
          >
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
                      {...registerField('familyName')}
                      type="text"
                      className="mt-1 input"
                      placeholder="e.g., The Johnson Family"
                      data-testid="family-name-input"
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
                        {...registerField('parent.firstName')}
                        type="text"
                        className="mt-1 input"
                        placeholder="Parent's First Name"
                        data-testid="parent-first-name-input"
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
                        {...registerField('parent.lastName')}
                        type="text"
                        className="mt-1 input"
                        placeholder="Parent's Last Name"
                        data-testid="parent-last-name-input"
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
                      {...registerField('parent.email')}
                      type="email"
                      className="mt-1 input"
                      placeholder="Parent's Email Address"
                      autoComplete="email"
                      data-testid="parent-email-input"
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
                      {...registerField('parent.password')}
                      type="password"
                      className="mt-1 input"
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      data-testid="parent-password-input"
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
                    data-testid="next-step-button"
                  >
                    Next: Home Address
                  </button>
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <section>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  <MapPinIcon className="h-5 w-5 inline mr-2" />
                  Step 2: Home Address Verification
                </h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Your home address is used to verify eligibility and optimize
                    carpool routes. We validate that your address is within the
                    Tesla STEM High School service area.
                  </p>

                  <AddressValidation
                    onValidationComplete={(verified: boolean) => {
                      setAddressValidated(verified);
                    }}
                    required={true}
                  />

                  {!addressValidated && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex">
                        <MapPinIcon className="h-5 w-5 text-yellow-400 mr-2" />
                        <p className="text-sm text-yellow-800">
                          Please validate your home address to continue with
                          registration.
                        </p>
                      </div>
                    </div>
                  )}
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
                    type="button"
                    onClick={nextStep}
                    className="btn-primary"
                    disabled={!addressValidated}
                  >
                    Next: Add Children
                  </button>
                </div>
              </section>
            )}

            {currentStep === 3 && (
              <section>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Step 2: Children's Information
                </h3>
                <div className="space-y-6">
                  {(() => {
                    try {
                      // Extra safety check for rendering children
                      if (
                        !safeFields ||
                        !Array.isArray(safeFields) ||
                        safeFields.length === 0
                      ) {
                        console.error(
                          'SafeFields is not a valid array:',
                          safeFields
                        );
                        return (
                          <div className="text-red-600 p-4 border border-red-200 rounded">
                            Error loading children form. Please refresh the
                            page.
                          </div>
                        );
                      }

                      return safeFields.map((field, index) => {
                        // Safety check for each field
                        if (!field || typeof field !== 'object') {
                          console.error(
                            `Invalid field at index ${index}:`,
                            field
                          );
                          return null;
                        }

                        return (
                          <div
                            key={field.id || `fallback-${index}`}
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
                                    try {
                                      if (
                                        index >= 0 &&
                                        index < safeFields.length &&
                                        fields &&
                                        Array.isArray(fields) &&
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
                                    } catch (error) {
                                      console.error(
                                        'Error removing child:',
                                        error
                                      );
                                      toast.error(
                                        'Failed to remove child. Please try again.'
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
                                {...registerField(
                                  `children.${index}.firstName`
                                )}
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
                              {errors.children &&
                                Array.isArray(errors.children) &&
                                errors.children[index] &&
                                errors.children[index]?.grade && (
                                  <p className="mt-1 text-sm text-red-600">
                                    {errors.children[index]?.grade?.message}
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
                              {errors.children &&
                                Array.isArray(errors.children) &&
                                errors.children[index] &&
                                errors.children[index]?.school && (
                                  <p className="mt-1 text-sm text-red-600">
                                    {errors.children[index]?.school?.message}
                                  </p>
                                )}
                            </div>
                          </div>
                        );
                      });
                    } catch (error) {
                      console.error('Error rendering children form:', error);
                      return (
                        <div className="text-red-600 p-4 border border-red-200 rounded">
                          Error rendering form. Please refresh the page.
                        </div>
                      );
                    }
                  })()}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        console.log('Adding new child to form');
                        append({
                          firstName: '',
                          lastName: '',
                          grade: '',
                          school: TESLA_STEM_HIGH_SCHOOL.name,
                        });
                      } catch (error) {
                        console.error('Error adding child:', error);
                        toast.error('Failed to add child. Please try again.');
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
                    data-testid="submit-registration-button"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
              </section>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
