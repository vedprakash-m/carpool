"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Providers = Providers;
const react_1 = require("react");
const auth_store_1 = require("@/store/auth.store");
const ErrorBoundary_1 = __importDefault(require("@/components/ErrorBoundary"));
function Providers({ children }) {
    const initialize = (0, auth_store_1.useAuthStore)((state) => state.initialize);
    (0, react_1.useEffect)(() => {
        // Initialize auth state on app startup
        initialize();
    }, [initialize]);
    return (<ErrorBoundary_1.default>
      {children}
    </ErrorBoundary_1.default>);
}
