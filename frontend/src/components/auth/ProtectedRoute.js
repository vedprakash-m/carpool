"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectedRoute = ProtectedRoute;
exports.AdminRoute = AdminRoute;
exports.GroupAdminRoute = GroupAdminRoute;
exports.ParentRoute = ParentRoute;
exports.ChildRoute = ChildRoute;
const react_1 = __importDefault(require("react"));
const useProtectedRoute_1 = require("@/hooks/useProtectedRoute");
function ProtectedRoute({ children, requiredRole, requiredPermission, fallback, }) {
    const { isAuthorized } = (0, useProtectedRoute_1.useProtectedRoute)({
        requiredRole,
        requiredPermission,
    });
    if (!isAuthorized) {
        return fallback || null;
    }
    return <>{children}</>;
}
// Convenience components for common role-based routes
function AdminRoute({ children, fallback, }) {
    return (<ProtectedRoute requiredRole="admin" fallback={fallback}>
      {children}
    </ProtectedRoute>);
}
function GroupAdminRoute({ children, fallback, }) {
    return (<ProtectedRoute requiredRole="group_admin" fallback={fallback}>
      {children}
    </ProtectedRoute>);
}
function ParentRoute({ children, fallback, }) {
    return (<ProtectedRoute requiredRole="parent" fallback={fallback}>
      {children}
    </ProtectedRoute>);
}
function ChildRoute({ children, fallback, }) {
    return (<ProtectedRoute requiredRole="child" fallback={fallback}>
      {children}
    </ProtectedRoute>);
}
