"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardLayout;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const auth_store_1 = require("@/store/auth.store");
const Navigation_1 = __importDefault(require("./Navigation"));
const publicPaths = ["/", "/login", "/register"];
function DashboardLayout({ children }) {
    const router = (0, navigation_1.useRouter)();
    const pathname = (0, navigation_1.usePathname)();
    const { isAuthenticated, isLoading, loading } = (0, auth_store_1.useAuthStore)();
    // Combine both loading states to avoid hydration mismatches
    const isAuthLoading = isLoading || loading;
    (0, react_1.useEffect)(() => {
        // Don't redirect if we're still loading or on a public path
        if (isAuthLoading || publicPaths.includes(pathname)) {
            return;
        }
        // Redirect to login if not authenticated
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isAuthLoading, pathname, router]);
    // Show loading spinner while checking authentication
    if (isAuthLoading) {
        return (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>);
    }
    // Don't show navigation on public pages
    if (publicPaths.includes(pathname)) {
        return <>{children}</>;
    }
    // For development: Allow access to trips page even when not authenticated
    // This bypasses the authentication redirect for testing purposes
    if (!isAuthenticated && pathname === "/trips") {
        // Show the layout but mark user as not authenticated
        console.log("Development mode: Allowing access to trips page without authentication");
    }
    // Redirect to login if not authenticated (after loading is complete)
    else if (!isAuthenticated) {
        return (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 flex-shrink-0">
        <Navigation_1.default />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>);
}
