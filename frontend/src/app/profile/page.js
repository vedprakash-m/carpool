"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProfilePage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const shared_1 = require("../../types/shared");
const auth_store_1 = require("../../store/auth.store");
const DashboardLayout_1 = __importDefault(require("../../components/DashboardLayout"));
const SectionErrorBoundary_1 = require("../../components/SectionErrorBoundary");
const outline_1 = require("@heroicons/react/24/outline");
const ChangePasswordForm_1 = __importDefault(require("../../components/ChangePasswordForm"));
function ProfilePage() {
    const router = (0, navigation_1.useRouter)();
    const { user, updateProfile, loading, error } = (0, auth_store_1.useAuthStore)();
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const [showChangePassword, setShowChangePassword] = (0, react_1.useState)(false);
    const { register, handleSubmit, formState: { errors }, reset, } = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(shared_1.updateUserSchema),
        defaultValues: user
            ? {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || "",
                grade: user.grade || "",
                emergencyContact: user.emergencyContact || "",
            }
            : {},
    });
    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const success = await updateProfile(data);
            if (success) {
                // Show success message or redirect
                // For now, just show an alert
                alert("Profile updated successfully!");
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!user) {
        return null; // DashboardLayout will handle redirect
    }
    return (<DashboardLayout_1.default>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-primary-100 rounded-lg p-3">
              <outline_1.UserIcon className="h-8 w-8 text-primary-600"/>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Profile Settings
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your personal information and account settings
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <SectionErrorBoundary_1.SectionErrorBoundary sectionName="Profile Information Form">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Personal Information
                  </h2>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                  {error && (<div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>)}

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First Name *
                      </label>
                      <input type="text" id="firstName" {...register("firstName")} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                      {errors.firstName && (<p className="mt-1 text-sm text-red-600">
                          {errors.firstName.message}
                        </p>)}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Last Name *
                      </label>
                      <input type="text" id="lastName" {...register("lastName")} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                      {errors.lastName && (<p className="mt-1 text-sm text-red-600">
                          {errors.lastName.message}
                        </p>)}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email *
                    </label>
                    <input type="email" id="email" {...register("email")} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                    {errors.email && (<p className="mt-1 text-sm text-red-600">
                        {errors.email.message}
                      </p>)}
                  </div>

                  {/* Phone and Grade */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input type="tel" id="phone" {...register("phone")} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                      {errors.phone && (<p className="mt-1 text-sm text-red-600">
                          {errors.phone.message}
                        </p>)}
                    </div>

                    <div>
                      <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
                        Grade/Year
                      </label>
                      <select id="grade" {...register("grade")} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="">Select Grade</option>
                        <option value="9">9th Grade</option>
                        <option value="10">10th Grade</option>
                        <option value="11">11th Grade</option>
                        <option value="12">12th Grade</option>
                        <option value="freshman">Freshman</option>
                        <option value="sophomore">Sophomore</option>
                        <option value="junior">Junior</option>
                        <option value="senior">Senior</option>
                        <option value="graduate">Graduate</option>
                        <option value="faculty">Faculty</option>
                        <option value="staff">Staff</option>
                      </select>
                      {errors.grade && (<p className="mt-1 text-sm text-red-600">
                          {errors.grade.message}
                        </p>)}
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700">
                      Emergency Contact
                    </label>
                    <input type="text" id="emergencyContact" placeholder="Name and phone number" {...register("emergencyContact")} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                    {errors.emergencyContact && (<p className="mt-1 text-sm text-red-600">
                        {errors.emergencyContact.message}
                      </p>)}
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-6 border-t border-gray-200">
                    <button type="submit" disabled={isSubmitting || loading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting || loading ? (<>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>) : ("Update Profile")}
                    </button>
                  </div>
                </form>
              </div>
            </SectionErrorBoundary_1.SectionErrorBoundary>
          </div>

          {/* Account Settings Sidebar */}
          <div>
            <SectionErrorBoundary_1.SectionErrorBoundary sectionName="Account Settings">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Account Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center text-sm">
                    <outline_1.UserIcon className="h-5 w-5 text-gray-400 mr-3"/>
                    <span className="text-gray-600">Role:</span>
                    <span className="ml-auto font-medium text-gray-900 capitalize">
                      {user.role}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <outline_1.EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3"/>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-auto font-medium text-gray-900">
                      {user.email}
                    </span>
                  </div>
                  {user.phone && (<div className="flex items-center text-sm">
                      <outline_1.PhoneIcon className="h-5 w-5 text-gray-400 mr-3"/>
                      <span className="text-gray-600">Phone:</span>
                      <span className="ml-auto font-medium text-gray-900">
                        {user.phone}
                      </span>
                    </div>)}
                  {user.grade && (<div className="flex items-center text-sm">
                      <outline_1.AcademicCapIcon className="h-5 w-5 text-gray-400 mr-3"/>
                      <span className="text-gray-600">Grade:</span>
                      <span className="ml-auto font-medium text-gray-900 capitalize">
                        {user.grade}
                      </span>
                    </div>)}
                </div>
              </div>

              {/* Security Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Security
                </h3>
                <div className="space-y-3">
                  <button onClick={() => setShowChangePassword(!showChangePassword)} className="flex items-center w-full text-sm text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-50">
                    <outline_1.KeyIcon className="h-5 w-5 mr-3"/>
                    Change Password
                  </button>
                </div>
              </div>
            </SectionErrorBoundary_1.SectionErrorBoundary>
          </div>
        </div>

        {/* Change Password Modal - Functional implementation */}
        {showChangePassword && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Change Password
              </h3>
              <ChangePasswordForm_1.default onClose={() => setShowChangePassword(false)}/>
            </div>
          </div>)}
      </div>
    </DashboardLayout_1.default>);
}
