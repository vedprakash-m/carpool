"use strict";
/**
 * PWA Initializer Component
 * Handles service worker registration and PWA setup
 */
"use client";
/**
 * PWA Initializer Component
 * Handles service worker registration and PWA setup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PWAInitializer = PWAInitializer;
const react_1 = require("react");
const pwa_service_1 = require("@/services/pwa.service");
const accessibility_service_1 = require("@/services/accessibility.service");
const PWAInstallPrompt_1 = require("@/components/ui/PWAInstallPrompt");
function PWAInitializer() {
    const { capabilities, registration } = (0, pwa_service_1.usePWA)();
    const { config } = (0, accessibility_service_1.useAccessibility)();
    (0, react_1.useEffect)(() => {
        // Initialize accessibility features on app load
        if (config.screenReader) {
            console.log("Screen reader detected, accessibility features enabled");
        }
        if (config.keyboardNavigation) {
            console.log("Keyboard navigation preference detected");
        }
        if (config.reducedMotion) {
            console.log("Reduced motion preference detected");
        }
        if (config.highContrast) {
            console.log("High contrast preference detected");
        }
    }, [config]);
    (0, react_1.useEffect)(() => {
        // Log PWA capabilities for debugging
        if (process.env.NODE_ENV === "development") {
            console.log("PWA Capabilities:", {
                isInstallable: capabilities.isInstallable,
                isInstalled: capabilities.isInstalled,
                isOnline: capabilities.isOnline,
                isServiceWorkerSupported: capabilities.isServiceWorkerSupported,
                isStandalone: capabilities.isStandalone,
                registration: !!registration,
            });
        }
    }, [capabilities, registration]);
    return (<>
      {/* PWA Install Prompt - only show on non-installed devices */}
      {!capabilities.isInstalled && capabilities.isInstallable && (<PWAInstallPrompt_1.PWAInstallPrompt className="fixed bottom-4 right-4 z-50" hideAfterInstall={true}/>)}

      {/* PWA Status Indicator - for debugging/info */}
      {process.env.NODE_ENV === "development" && (<PWAInstallPrompt_1.PWAStatus className="fixed top-4 right-4 z-50"/>)}
    </>);
}
exports.default = PWAInitializer;
