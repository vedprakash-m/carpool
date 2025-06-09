"use strict";
/**
 * PWA Install Prompt Component
 * Provides native app-like installation experience
 */
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
exports.PWAInstallPrompt = PWAInstallPrompt;
exports.PWAInstallButton = PWAInstallButton;
exports.PWAStatus = PWAStatus;
const react_1 = __importStar(require("react"));
const pwa_service_1 = require("../../services/pwa.service");
const accessibility_service_1 = require("../../services/accessibility.service");
function PWAInstallPrompt({ className = "", hideAfterInstall = true, customTrigger, }) {
    const { capabilities, promptInstall, requestNotifications } = (0, pwa_service_1.usePWA)();
    const { announceLive } = (0, accessibility_service_1.useAccessibility)();
    const [showPrompt, setShowPrompt] = (0, react_1.useState)(false);
    const [isInstalling, setIsInstalling] = (0, react_1.useState)(false);
    const [dismissed, setDismissed] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Show prompt if app is installable and not already installed
        if (capabilities.isInstallable && !capabilities.isInstalled && !dismissed) {
            setShowPrompt(true);
        }
        else if (capabilities.isInstalled && hideAfterInstall) {
            setShowPrompt(false);
        }
    }, [capabilities, dismissed, hideAfterInstall]);
    const handleInstall = async () => {
        setIsInstalling(true);
        announceLive("Installing VCarpool app...");
        try {
            const result = await promptInstall();
            if (result.outcome === "accepted") {
                announceLive("VCarpool app installed successfully!");
                setShowPrompt(false);
                // Request notification permission after install
                setTimeout(async () => {
                    await requestNotifications();
                }, 1000);
            }
            else if (result.outcome === "dismissed") {
                announceLive("App installation cancelled");
                setDismissed(true);
                setShowPrompt(false);
            }
        }
        catch (error) {
            console.error("Installation failed:", error);
            announceLive("Installation failed. Please try again.");
        }
        finally {
            setIsInstalling(false);
        }
    };
    const handleDismiss = () => {
        setDismissed(true);
        setShowPrompt(false);
        announceLive("Install prompt dismissed");
    };
    if (!showPrompt || capabilities.isInstalled) {
        return null;
    }
    if (customTrigger) {
        return (<div className={className} onClick={handleInstall} role="button" tabIndex={0} onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleInstall();
                }
            }} aria-label="Install VCarpool app">
        {customTrigger}
      </div>);
    }
    return (<div className={`pwa-install-prompt ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 max-w-sm mx-auto">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
          </div>

          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Install VCarpool
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Get the full app experience with offline access, push
              notifications, and faster loading.
            </p>

            <div className="mt-4 space-y-2">
              <button onClick={handleInstall} disabled={isInstalling} className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-describedby="install-description">
                {isInstalling ? (<>
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Installing...
                    </span>
                  </>) : ("Install App")}
              </button>

              <button onClick={handleDismiss} className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors">
                Not Now
              </button>
            </div>
          </div>

          <button onClick={handleDismiss} className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded" aria-label="Dismiss install prompt">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <h4 className="font-medium mb-1">Benefits:</h4>
          <ul className="space-y-1">
            <li>• Works offline</li>
            <li>• Faster loading</li>
            <li>• Push notifications</li>
            <li>• Home screen access</li>
          </ul>
        </div>
      </div>

      <div id="install-description" className="sr-only" aria-live="polite">
        Install the VCarpool app for better performance and offline access.
      </div>
    </div>);
}
// Compact install button for navigation bars
function PWAInstallButton({ className = "", showText = true, }) {
    const { capabilities, promptInstall } = (0, pwa_service_1.usePWA)();
    const { announceLive } = (0, accessibility_service_1.useAccessibility)();
    const [isInstalling, setIsInstalling] = (0, react_1.useState)(false);
    if (capabilities.isInstalled || !capabilities.isInstallable) {
        return null;
    }
    const handleInstall = async () => {
        setIsInstalling(true);
        announceLive("Installing VCarpool app...");
        try {
            const result = await promptInstall();
            if (result.outcome === "accepted") {
                announceLive("VCarpool app installed successfully!");
            }
            else if (result.outcome === "dismissed") {
                announceLive("App installation cancelled");
            }
        }
        catch (error) {
            console.error("Installation failed:", error);
            announceLive("Installation failed. Please try again.");
        }
        finally {
            setIsInstalling(false);
        }
    };
    return (<button onClick={handleInstall} disabled={isInstalling} className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`} aria-label={showText ? undefined : "Install VCarpool app"}>
      {isInstalling ? (<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>) : (<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>)}
      {showText && (<span className={isInstalling ? "ml-2" : "ml-2"}>
          {isInstalling ? "Installing..." : "Install App"}
        </span>)}
    </button>);
}
// PWA status indicator
function PWAStatus({ className = "" }) {
    const { capabilities } = (0, pwa_service_1.usePWA)();
    if (capabilities.isInstalled) {
        return (<div className={`flex items-center text-green-600 text-sm ${className}`}>
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
        <span>App Installed</span>
      </div>);
    }
    if (!capabilities.isOnline) {
        return (<div className={`flex items-center text-orange-600 text-sm ${className}`}>
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
        <span>Offline Mode</span>
      </div>);
    }
    return null;
}
exports.default = PWAInstallPrompt;
