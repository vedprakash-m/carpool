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
exports.SkipLink = SkipLink;
exports.AccessibleModal = AccessibleModal;
exports.AccessibleDropdown = AccessibleDropdown;
exports.LiveRegion = LiveRegion;
exports.FormField = FormField;
exports.AccessibleProgress = AccessibleProgress;
exports.AccessibleToast = AccessibleToast;
exports.HighContrastToggle = HighContrastToggle;
/**
 * Accessible UI Components
 * WCAG 2.1 AA compliant components for VCarpool
 */
const react_1 = __importStar(require("react"));
const accessibility_service_1 = require("../../services/accessibility.service");
// Skip Link Component
function SkipLink({ targetId, children = "Skip to main content", }) {
    return (<a href={`#${targetId}`} className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg transition-all" onFocus={(e) => {
            e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
        }}>
      {children}
    </a>);
}
function AccessibleModal({ isOpen, onClose, title, children, className = "", }) {
    const { trapFocus } = (0, accessibility_service_1.useAccessibility)();
    const { saveFocus, restoreFocus } = (0, accessibility_service_1.useFocusManagement)();
    const modalRef = (0, react_1.useRef)(null);
    const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            saveFocus();
            // Trap focus within modal
            const cleanup = modalRef.current ? trapFocus(modalRef.current) : null;
            // Prevent body scroll
            document.body.style.overflow = "hidden";
            return () => {
                cleanup?.();
                document.body.style.overflow = "";
                restoreFocus();
            };
        }
    }, [isOpen, saveFocus, restoreFocus, trapFocus]);
    // Handle escape key
    (0, react_1.useEffect)(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby={titleId} aria-modal="true" role="dialog">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"/>

        {/* Modal */}
        <div ref={modalRef} className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${className}`}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start">
              <div className="w-full">
                <h3 id={titleId} className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {title}
                </h3>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
function AccessibleDropdown({ trigger, children, align = "left", className = "", }) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const { trapFocus } = (0, accessibility_service_1.useAccessibility)();
    const dropdownRef = (0, react_1.useRef)(null);
    const triggerId = `dropdown-trigger-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    const menuId = `dropdown-menu-${Math.random().toString(36).substr(2, 9)}`;
    (0, react_1.useEffect)(() => {
        if (isOpen && dropdownRef.current) {
            const cleanup = trapFocus(dropdownRef.current);
            return cleanup;
        }
    }, [isOpen, trapFocus]);
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setIsOpen(false);
        }
    };
    (0, react_1.useEffect)(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);
    return (<div className={`relative inline-block text-left ${className}`}>
      <div id={triggerId} onClick={() => setIsOpen(!isOpen)} onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
        }} role="button" tabIndex={0} aria-expanded={isOpen} aria-controls={menuId} aria-haspopup="true">
        {trigger}
      </div>

      {isOpen && (<div ref={dropdownRef} id={menuId} className={`absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 ${align === "right" ? "right-0" : "left-0"}`} role="menu" aria-labelledby={triggerId}>
          <div className="py-1" role="none">
            {children}
          </div>
        </div>)}
    </div>);
}
// Live Region for Announcements
function LiveRegion({ message, priority = "polite", }) {
    return (<div aria-live={priority} aria-atomic="true" className="sr-only">
      {message}
    </div>);
}
function FormField({ label, id, error, description, required = false, children, }) {
    const errorId = error ? `${id}-error` : undefined;
    const descId = description ? `${id}-description` : undefined;
    const describedBy = [errorId, descId].filter(Boolean).join(" ");
    return (<div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (<span className="text-red-500 ml-1" aria-label="required">
            *
          </span>)}
      </label>

      {description && (<p id={descId} className="text-sm text-gray-500">
          {description}
        </p>)}

      <div>
        {react_1.default.cloneElement(children, {
            id,
            "aria-describedby": describedBy || undefined,
            "aria-invalid": error ? "true" : undefined,
            "aria-required": required,
        })}
      </div>

      {error && (<p id={errorId} className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>)}
    </div>);
}
function AccessibleProgress({ value, max = 100, label, showPercentage = true, className = "", }) {
    const percentage = Math.round((value / max) * 100);
    return (<div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        {showPercentage && <span className="text-gray-500">{percentage}%</span>}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={`${label}: ${percentage}% complete`}>
        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${percentage}%` }}/>
      </div>
    </div>);
}
function AccessibleToast({ message, type = "info", onClose, autoClose = true, duration = 5000, }) {
    const { announceLive } = (0, accessibility_service_1.useAccessibility)();
    (0, react_1.useEffect)(() => {
        // Announce to screen readers
        const priority = type === "error" ? "assertive" : "polite";
        announceLive(message, priority);
        if (autoClose) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [message, type, onClose, autoClose, duration, announceLive]);
    const typeStyles = {
        success: "bg-green-50 border-green-200 text-green-800",
        error: "bg-red-50 border-red-200 text-red-800",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
        info: "bg-blue-50 border-blue-200 text-blue-800",
    };
    const typeIcons = {
        success: "✓",
        error: "✕",
        warning: "⚠",
        info: "ℹ",
    };
    return (<div className={`fixed top-4 right-4 max-w-sm w-full border rounded-lg p-4 shadow-lg z-50 ${typeStyles[type]}`} role={type === "error" ? "alert" : "status"} aria-live={type === "error" ? "assertive" : "polite"}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg font-semibold" aria-hidden="true">
            {typeIcons[type]}
          </span>
        </div>

        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>

        <button className="ml-4 flex-shrink-0 text-current hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 rounded" onClick={onClose} aria-label="Close notification">
          <span className="text-lg" aria-hidden="true">
            ×
          </span>
        </button>
      </div>
    </div>);
}
// High Contrast Toggle
function HighContrastToggle({ className = "" }) {
    const [highContrast, setHighContrast] = (0, react_1.useState)(false);
    const { announceLive } = (0, accessibility_service_1.useAccessibility)();
    (0, react_1.useEffect)(() => {
        const isHighContrast = document.documentElement.classList.contains("high-contrast");
        setHighContrast(isHighContrast);
    }, []);
    const toggleHighContrast = () => {
        const newState = !highContrast;
        setHighContrast(newState);
        if (newState) {
            document.documentElement.classList.add("high-contrast");
            announceLive("High contrast mode enabled");
        }
        else {
            document.documentElement.classList.remove("high-contrast");
            announceLive("High contrast mode disabled");
        }
    };
    return (<button onClick={toggleHighContrast} className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`} aria-pressed={highContrast} aria-label={`${highContrast ? "Disable" : "Enable"} high contrast mode`}>
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"/>
      </svg>
      High Contrast
    </button>);
}
exports.default = {
    SkipLink,
    AccessibleModal,
    AccessibleDropdown,
    LiveRegion,
    FormField,
    AccessibleProgress,
    AccessibleToast,
    HighContrastToggle,
};
