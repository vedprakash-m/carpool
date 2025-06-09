"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginPage;
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const shared_1 = require("../../types/shared");
const auth_store_1 = require("@/store/auth.store");
const outline_1 = require("@heroicons/react/24/outline");
function LoginPage() {
    const router = (0, navigation_1.useRouter)();
    const login = (0, auth_store_1.useAuthStore)((state) => state.login);
    const isLoading = (0, auth_store_1.useAuthStore)((state) => state.isLoading);
    const { register, handleSubmit, formState: { errors }, } = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(shared_1.loginSchema),
    });
    const onSubmit = async (data) => {
        try {
            await login(data);
            react_hot_toast_1.default.success("Welcome back!");
            router.push("/dashboard");
        }
        catch (error) {
            react_hot_toast_1.default.error(error.message || "Login failed");
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <outline_1.TruckIcon className="h-12 w-12 text-primary-600"/>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <link_1.default href="/register" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </link_1.default>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input {...register("email")} type="email" autoComplete="email" className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" placeholder="Email address"/>
              {errors.email && (<p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>)}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input {...register("password")} type="password" autoComplete="current-password" className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" placeholder="Password"/>
              {errors.password && (<p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <link_1.default href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                Forgot your password?
              </link_1.default>
            </div>
          </div>

          <div>
            <button type="submit" disabled={isLoading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
