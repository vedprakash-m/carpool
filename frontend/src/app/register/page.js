"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RegisterPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const shared_1 = require("../../types/shared");
const auth_store_1 = require("@/store/auth.store");
const outline_1 = require("@heroicons/react/24/outline");
function RegisterPage() {
    const router = (0, navigation_1.useRouter)();
    const register = (0, auth_store_1.useAuthStore)((state) => state.register);
    const isLoading = (0, auth_store_1.useAuthStore)((state) => state.isLoading);
    const [currentStep, setCurrentStep] = (0, react_1.useState)(1);
    const { register: registerField, control, handleSubmit, formState: { errors }, } = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(shared_1.registerSchema),
        defaultValues: {
            children: [{ firstName: "", lastName: "", grade: "", school: "" }],
        },
    });
    const { fields, append, remove } = (0, react_hook_form_1.useFieldArray)({
        control,
        name: "children",
    });
    const onSubmit = async (data) => {
        try {
            await register(data);
            react_hot_toast_1.default.success("Account created successfully!");
            router.push("/dashboard");
        }
        catch (error) {
            react_hot_toast_1.default.error(error.message || "Registration failed");
        }
    };
    const nextStep = () => setCurrentStep((prev) => prev + 1);
    const prevStep = () => setCurrentStep((prev) => prev - 1);
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <outline_1.UsersIcon className="h-12 w-12 text-primary-600"/>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join VCarpool as a Family
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <link_1.default href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </link_1.default>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {currentStep === 1 && (<section>
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Step 1: Family and Parent Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="familyName" className="block text-sm font-medium text-gray-700">
                    Family Name
                  </label>
                  <input {...registerField("familyName")} type="text" className="mt-1 input" placeholder="e.g., The Johnson Family"/>
                  {errors.familyName && (<p className="mt-1 text-sm text-red-600">
                      {errors.familyName.message}
                    </p>)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="parent.firstName" className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input {...registerField("parent.firstName")} type="text" className="mt-1 input" placeholder="Parent's First Name"/>
                    {errors.parent?.firstName && (<p className="mt-1 text-sm text-red-600">
                        {errors.parent.firstName.message}
                      </p>)}
                  </div>
                  <div>
                    <label htmlFor="parent.lastName" className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input {...registerField("parent.lastName")} type="text" className="mt-1 input" placeholder="Parent's Last Name"/>
                    {errors.parent?.lastName && (<p className="mt-1 text-sm text-red-600">
                        {errors.parent.lastName.message}
                      </p>)}
                  </div>
                </div>

                <div>
                  <label htmlFor="parent.email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input {...registerField("parent.email")} type="email" className="mt-1 input" placeholder="Parent's Email Address"/>
                  {errors.parent?.email && (<p className="mt-1 text-sm text-red-600">
                      {errors.parent.email.message}
                    </p>)}
                </div>

                <div>
                  <label htmlFor="parent.password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input {...registerField("parent.password")} type="password" className="mt-1 input" placeholder="Minimum 8 characters"/>
                  {errors.parent?.password && (<p className="mt-1 text-sm text-red-600">
                      {errors.parent.password.message}
                    </p>)}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={nextStep} className="btn-primary">
                  Next: Add Children
                </button>
              </div>
            </section>)}

          {currentStep === 2 && (<section>
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Step 2: Children's Information
              </h3>
              <div className="space-y-6">
                {fields.map((field, index) => (<div key={field.id} className="p-4 border border-gray-200 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-800">
                        Child {index + 1}
                      </h4>
                      {fields.length > 1 && (<button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                          <outline_1.TrashIcon className="h-5 w-5"/>
                        </button>)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input {...registerField(`children.${index}.firstName`)} placeholder="First Name" className="input"/>
                      <input {...registerField(`children.${index}.lastName`)} placeholder="Last Name" className="input"/>
                    </div>
                    <input {...registerField(`children.${index}.grade`)} placeholder="Grade (e.g., 5th)" className="input"/>
                    <input {...registerField(`children.${index}.school`)} placeholder="School Name" className="input"/>
                  </div>))}
                <button type="button" onClick={() => append({
                firstName: "",
                lastName: "",
                grade: "",
                school: "",
            })} className="btn-secondary">
                  <outline_1.PlusIcon className="h-5 w-5 mr-2"/>
                  Add Another Child
                </button>
              </div>
              <div className="mt-6 flex justify-between">
                <button type="button" onClick={prevStep} className="btn-secondary">
                  Back
                </button>
                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </section>)}
        </form>
      </div>
    </div>);
}
