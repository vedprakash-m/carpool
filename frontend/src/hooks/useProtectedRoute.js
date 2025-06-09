"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useProtectedRoute = useProtectedRoute;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const RBACContext_1 = require("../contexts/RBACContext");
const auth_store_1 = require("../store/auth.store");
function useProtectedRoute({ requiredRole, requiredPermission, redirectTo = "/unauthorized", } = {}) {
    const router = (0, navigation_1.useRouter)();
    const { isAuthenticated } = (0, auth_store_1.useAuthStore)();
    const { hasRole, hasPermission } = (0, RBACContext_1.useRBAC)();
    (0, react_1.useEffect)(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        if (requiredRole && !hasRole(requiredRole)) {
            router.push(redirectTo);
            return;
        }
        if (requiredPermission && !hasPermission(requiredPermission)) {
            router.push(redirectTo);
            return;
        }
    }, [
        isAuthenticated,
        requiredRole,
        requiredPermission,
        hasRole,
        hasPermission,
        router,
        redirectTo,
    ]);
    return {
        isAuthorized: isAuthenticated &&
            (!requiredRole || hasRole(requiredRole)) &&
            (!requiredPermission || hasPermission(requiredPermission)),
    };
}
