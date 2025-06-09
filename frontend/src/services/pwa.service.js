"use strict";
/**
 * PWA Installation and Service Worker Management
 * Handles app installation prompts and PWA capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePWA = usePWA;
const react_1 = require("react");
class PWAService {
    installPrompt = null;
    installListeners = new Set();
    onlineListeners = new Set();
    constructor() {
        if (typeof window !== "undefined") {
            this.initializeListeners();
        }
    }
    initializeListeners() {
        // Listen for install prompt
        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            this.installPrompt = e;
            this.notifyInstallListeners(true);
        });
        // Listen for app installed
        window.addEventListener("appinstalled", () => {
            this.installPrompt = null;
            this.notifyInstallListeners(false);
        });
        // Listen for online/offline status
        window.addEventListener("online", () => {
            this.notifyOnlineListeners(true);
        });
        window.addEventListener("offline", () => {
            this.notifyOnlineListeners(false);
        });
    }
    async promptInstall() {
        if (!this.installPrompt) {
            return { outcome: "unavailable" };
        }
        try {
            await this.installPrompt.prompt();
            const choice = await this.installPrompt.userChoice;
            if (choice.outcome === "accepted") {
                this.installPrompt = null;
                this.notifyInstallListeners(false);
            }
            return choice;
        }
        catch (error) {
            console.error("Error showing install prompt:", error);
            return { outcome: "unavailable" };
        }
    }
    getCapabilities() {
        if (typeof window === "undefined") {
            return {
                isInstallable: false,
                isInstalled: false,
                isOnline: false,
                isServiceWorkerSupported: false,
                isStandalone: false,
            };
        }
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator?.standalone === true;
        return {
            isInstallable: !!this.installPrompt,
            isInstalled: isStandalone,
            isOnline: navigator.onLine,
            isServiceWorkerSupported: "serviceWorker" in navigator,
            isStandalone,
        };
    }
    async registerServiceWorker() {
        if (!("serviceWorker" in navigator)) {
            console.warn("Service workers not supported");
            return null;
        }
        try {
            const registration = await navigator.serviceWorker.register("/sw.js");
            console.log("Service worker registered:", registration);
            // Listen for updates
            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" &&
                            navigator.serviceWorker.controller) {
                            // New version available
                            this.notifyUpdateAvailable();
                        }
                    });
                }
            });
            return registration;
        }
        catch (error) {
            console.error("Service worker registration failed:", error);
            return null;
        }
    }
    async requestPushPermission() {
        if (!("Notification" in window)) {
            return "denied";
        }
        if (Notification.permission === "granted") {
            return "granted";
        }
        const permission = await Notification.requestPermission();
        return permission;
    }
    async subscribeToPush(registration) {
        try {
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                console.warn("VAPID public key not configured");
                return null;
            }
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
            });
            return subscription;
        }
        catch (error) {
            console.error("Push subscription failed:", error);
            return null;
        }
    }
    urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    notifyInstallListeners(canInstall) {
        this.installListeners.forEach((listener) => listener(canInstall));
    }
    notifyOnlineListeners(isOnline) {
        this.onlineListeners.forEach((listener) => listener(isOnline));
    }
    notifyUpdateAvailable() {
        // Could dispatch custom event or call registered callbacks
        window.dispatchEvent(new CustomEvent("pwa-update-available"));
    }
    onInstallAvailable(listener) {
        this.installListeners.add(listener);
    }
    onOnlineStatusChange(listener) {
        this.onlineListeners.add(listener);
    }
    removeInstallListener(listener) {
        this.installListeners.delete(listener);
    }
    removeOnlineListener(listener) {
        this.onlineListeners.delete(listener);
    }
}
// React Hook for PWA functionality
function usePWA() {
    const [capabilities, setCapabilities] = (0, react_1.useState)({
        isInstallable: false,
        isInstalled: false,
        isOnline: true,
        isServiceWorkerSupported: false,
        isStandalone: false,
    });
    const [updateAvailable, setUpdateAvailable] = (0, react_1.useState)(false);
    const [registration, setRegistration] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const pwaService = new PWAService();
        // Update capabilities
        const updateCapabilities = () => {
            setCapabilities(pwaService.getCapabilities());
        };
        // Set up listeners
        pwaService.onInstallAvailable(updateCapabilities);
        pwaService.onOnlineStatusChange(updateCapabilities);
        // Listen for updates
        const handleUpdate = () => setUpdateAvailable(true);
        window.addEventListener("pwa-update-available", handleUpdate);
        // Register service worker
        pwaService.registerServiceWorker().then(setRegistration);
        // Initial capabilities check
        updateCapabilities();
        return () => {
            pwaService.removeInstallListener(updateCapabilities);
            pwaService.removeOnlineListener(updateCapabilities);
            window.removeEventListener("pwa-update-available", handleUpdate);
        };
    }, []);
    const promptInstall = async () => {
        const pwaService = new PWAService();
        return await pwaService.promptInstall();
    };
    const requestNotifications = async () => {
        const pwaService = new PWAService();
        const permission = await pwaService.requestPushPermission();
        if (permission === "granted" && registration) {
            const subscription = await pwaService.subscribeToPush(registration);
            return { permission, subscription };
        }
        return { permission, subscription: null };
    };
    const reloadApp = () => {
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
        }
    };
    return {
        capabilities,
        updateAvailable,
        promptInstall,
        requestNotifications,
        reloadApp,
        registration,
    };
}
exports.default = PWAService;
