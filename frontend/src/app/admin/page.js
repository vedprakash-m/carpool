"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminDashboard;
const react_1 = __importDefault(require("react"));
const ProtectedRoute_1 = require("@/components/auth/ProtectedRoute");
const card_1 = require("@/components/ui/card");
const RBACContext_1 = require("@/contexts/RBACContext");
function AdminDashboard() {
    const { permissions } = (0, RBACContext_1.useRBAC)();
    const adminPermissions = permissions;
    return (<ProtectedRoute_1.AdminRoute>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminPermissions?.platform_management && (<card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Platform Management</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <p className="text-gray-600">
                  Manage platform settings, user roles, and system
                  configuration.
                </p>
                {/* Add platform management controls here */}
              </card_1.CardContent>
            </card_1.Card>)}

          {adminPermissions?.group_admin_promotion && (<card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Group Admin Management</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <p className="text-gray-600">
                  Promote users to group admin roles and manage group
                  permissions.
                </p>
                {/* Add group admin management controls here */}
              </card_1.CardContent>
            </card_1.Card>)}

          {adminPermissions?.system_configuration && (<card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>System Configuration</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <p className="text-gray-600">
                  Configure system-wide settings, notifications, and
                  integrations.
                </p>
                {/* Add system configuration controls here */}
              </card_1.CardContent>
            </card_1.Card>)}
        </div>
      </div>
    </ProtectedRoute_1.AdminRoute>);
}
