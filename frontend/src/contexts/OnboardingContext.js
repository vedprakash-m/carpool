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
exports.OnboardingProvider = OnboardingProvider;
exports.useOnboarding = useOnboarding;
const react_1 = __importStar(require("react"));
const auth_store_1 = require("@/store/auth.store");
const defaultSteps = [
    {
        id: "welcome_tour",
        title: "Welcome to VCarpool",
        description: "Let's take a quick tour of your dashboard and key features",
        component: "WelcomeTour",
        isCompleted: false,
        isOptional: false,
    },
    {
        id: "profile_completion",
        title: "Complete Your Profile",
        description: "Add contact information and emergency details",
        component: "ProfileCompletion",
        isCompleted: false,
        isOptional: false,
    },
    {
        id: "notification_setup",
        title: "Notification Preferences",
        description: "Choose how you'd like to receive carpool updates",
        component: "NotificationSetup",
        isCompleted: false,
        isOptional: true,
    },
    {
        id: "preference_tutorial",
        title: "Weekly Preferences Guide",
        description: "Learn how to submit your driving preferences",
        component: "PreferenceTutorial",
        isCompleted: false,
        isOptional: false,
    },
    {
        id: "first_week_simulation",
        title: "How It All Works",
        description: "See an example of assignments and swap requests",
        component: "FirstWeekSimulation",
        isCompleted: false,
        isOptional: true,
    },
];
const defaultState = {
    isOnboardingActive: false,
    currentStepIndex: 0,
    steps: defaultSteps,
    userProgress: {
        profileCompleted: false,
        notificationsSetup: false,
        preferencesTourCompleted: false,
        firstWeekSimulated: false,
    },
    showTooltips: true,
    canSkip: true,
};
const OnboardingContext = (0, react_1.createContext)(undefined);
function OnboardingProvider({ children, }) {
    const { user } = (0, auth_store_1.useAuthStore)();
    const [onboardingState, setOnboardingState] = (0, react_1.useState)(defaultState);
    // Check if user needs onboarding on mount
    (0, react_1.useEffect)(() => {
        if (user && shouldShowOnboarding(user)) {
            const savedState = loadOnboardingState(user.id);
            if (savedState) {
                setOnboardingState(savedState);
            }
            else {
                setOnboardingState((prev) => ({ ...prev, isOnboardingActive: true }));
            }
        }
    }, [user]);
    // Save state to localStorage whenever it changes
    (0, react_1.useEffect)(() => {
        if (user?.id) {
            saveOnboardingState(user.id, onboardingState);
        }
    }, [user?.id, onboardingState]);
    const startOnboarding = () => {
        setOnboardingState((prev) => ({
            ...prev,
            isOnboardingActive: true,
            currentStepIndex: 0,
        }));
    };
    const completeStep = (stepId) => {
        setOnboardingState((prev) => ({
            ...prev,
            steps: prev.steps.map((step) => step.id === stepId ? { ...step, isCompleted: true } : step),
        }));
    };
    const nextStep = () => {
        setOnboardingState((prev) => {
            const nextIndex = prev.currentStepIndex + 1;
            if (nextIndex >= prev.steps.length) {
                return { ...prev, isOnboardingActive: false };
            }
            return { ...prev, currentStepIndex: nextIndex };
        });
    };
    const previousStep = () => {
        setOnboardingState((prev) => ({
            ...prev,
            currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
        }));
    };
    const skipOnboarding = () => {
        setOnboardingState((prev) => ({ ...prev, isOnboardingActive: false }));
        if (user?.id) {
            markOnboardingCompleted(user.id);
        }
    };
    const completeOnboarding = () => {
        setOnboardingState((prev) => ({
            ...prev,
            isOnboardingActive: false,
            steps: prev.steps.map((step) => ({ ...step, isCompleted: true })),
        }));
        if (user?.id) {
            markOnboardingCompleted(user.id);
        }
    };
    const toggleTooltips = () => {
        setOnboardingState((prev) => ({
            ...prev,
            showTooltips: !prev.showTooltips,
        }));
    };
    const updateUserProgress = (progress) => {
        setOnboardingState((prev) => ({
            ...prev,
            userProgress: { ...prev.userProgress, ...progress },
        }));
    };
    const resetOnboarding = () => {
        setOnboardingState(defaultState);
        if (user?.id) {
            clearOnboardingState(user.id);
        }
    };
    return (<OnboardingContext.Provider value={{
            onboardingState,
            startOnboarding,
            completeStep,
            nextStep,
            previousStep,
            skipOnboarding,
            completeOnboarding,
            toggleTooltips,
            updateUserProgress,
            resetOnboarding,
        }}>
      {children}
    </OnboardingContext.Provider>);
}
function useOnboarding() {
    const context = (0, react_1.useContext)(OnboardingContext);
    if (context === undefined) {
        throw new Error("useOnboarding must be used within an OnboardingProvider");
    }
    return context;
}
// Helper functions
function shouldShowOnboarding(user) {
    // Show onboarding for new parent users who haven't completed it
    if (user.role !== "parent")
        return false;
    const completed = localStorage.getItem(`onboarding_completed_${user.id}`);
    return !completed;
}
function loadOnboardingState(userId) {
    try {
        const saved = localStorage.getItem(`onboarding_state_${userId}`);
        return saved ? JSON.parse(saved) : null;
    }
    catch {
        return null;
    }
}
function saveOnboardingState(userId, state) {
    try {
        localStorage.setItem(`onboarding_state_${userId}`, JSON.stringify(state));
    }
    catch {
        // Handle storage errors silently
    }
}
function markOnboardingCompleted(userId) {
    try {
        localStorage.setItem(`onboarding_completed_${userId}`, "true");
        localStorage.removeItem(`onboarding_state_${userId}`);
    }
    catch {
        // Handle storage errors silently
    }
}
function clearOnboardingState(userId) {
    try {
        localStorage.removeItem(`onboarding_completed_${userId}`);
        localStorage.removeItem(`onboarding_state_${userId}`);
    }
    catch {
        // Handle storage errors silently
    }
}
