"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACProvider = RBACProvider;
exports.useRBAC = useRBAC;
exports.withRole = withRole;
exports.withPermission = withPermission;
const react_1 = __importStar(require("react"));
const auth_store_1 = require("../store/auth.store");
const RBACContext = (0, react_1.createContext)(undefined);
// Default permissions for each role
const defaultPermissions = {
    admin: {
        platform_management: true,
        group_admin_promotion: true,
        system_configuration: true,
    },
    group_admin: {
        group_management: true,
        member_management: true,
        trip_scheduling: true,
        emergency_coordination: true,
    },
    parent: {
        trip_participation: true,
        preference_submission: true,
        child_management: true,
    },
    child: {
        schedule_viewing: true,
        safety_reporting: true,
        profile_management: true,
    },
};
function RBACProvider({ children }) {
    const { user } = (0, auth_store_1.useAuthStore)();
    const value = (0, react_1.useMemo)(() => {
        const userRole = user?.role || null;
        const permissions = userRole ? defaultPermissions[userRole] : null;
        const hasPermission = (permission) => {
            if (!userRole || !permissions)
                return false;
            return permissions[permission] === true;
        };
        const hasRole = (role) => {
            return userRole === role;
        };
        return {
            hasPermission,
            hasRole,
            userRole,
            permissions,
        };
    }, [user]);
    return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}
function useRBAC() {
    const context = (0, react_1.useContext)(RBACContext);
    if (context === undefined) {
        throw new Error("useRBAC must be used within a RBACProvider");
    }
    return context;
}
// Higher-order component for role-based access control
function withRole(WrappedComponent, requiredRole) {
    return function WithRoleComponent(props) {
        const { hasRole } = useRBAC();
        if (!hasRole(requiredRole)) {
            return null; // Or a custom access denied component
        }
        return <WrappedComponent {...props}/>;
    };
}
// Higher-order component for permission-based access control
function withPermission(WrappedComponent, requiredPermission) {
    return function WithPermissionComponent(props) {
        const { hasPermission } = useRBAC();
        if (!hasPermission(requiredPermission)) {
            return null; // Or a custom access denied component
        }
        return <WrappedComponent {...props}/>;
    };
}
