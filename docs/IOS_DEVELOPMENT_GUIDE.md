# 📱 iOS App Development Guide - vCarpool

## 🎯 **Overview**

This guide covers building an iOS app for vCarpool using React Native + Expo, leveraging your existing backend and shared business logic.

## 🔧 **Prerequisites**

### **Development Environment**

- **macOS**: Required for iOS development
- **Xcode**: Latest version from Mac App Store
- **Node.js**: 20+ (compatible with your current setup)
- **iOS Simulator**: Comes with Xcode
- **Physical iPhone**: Optional but recommended for testing

### **Install Tools**

```bash
# Install Expo CLI
npm install -g @expo/cli

# Install React Native CLI
npm install -g @react-native-community/cli

# Verify installations
expo --version
npx react-native --version
```

## 🚀 **Project Setup**

### **1. Create React Native Project**

```bash
# Navigate to your project root
cd vcarpool

# Create mobile app directory
mkdir mobile
cd mobile

# Initialize Expo project
npx create-expo-app@latest vcarpool-mobile --template blank-typescript

cd vcarpool-mobile
```

### **2. Install Required Dependencies**

```bash
# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs

# Expo dependencies
npx expo install react-native-screens react-native-safe-area-context

# Form handling (same as web)
npm install react-hook-form @hookform/resolvers

# HTTP client
npm install axios

# Date handling
npm install date-fns

# State management
npm install zustand

# Icons
npm install @expo/vector-icons

# Async storage
npx expo install @react-native-async-storage/async-storage

# Push notifications
npx expo install expo-notifications

# Location services
npx expo install expo-location

# Maps (for carpool routes)
npm install react-native-maps
npx expo install expo-location expo-maps
```

### **3. Project Structure**

```
mobile/vcarpool-mobile/
├── app.json
├── App.tsx
├── babel.config.js
├── package.json
├── src/
│   ├── components/           # Reusable UI components
│   ├── screens/             # App screens
│   ├── navigation/          # Navigation setup
│   ├── services/            # API calls (reuse backend endpoints)
│   ├── store/               # Zustand stores (similar to web)
│   ├── types/               # Import from shared package
│   ├── utils/               # Utilities
│   └── constants/
└── shared/                  # Symlink to ../../../shared
```

## 📦 **Reusing Shared Logic**

### **1. Link Shared Package**

```bash
# Create symlink to shared package
ln -s ../../../shared ./shared

# Or copy the shared package
cp -r ../../../shared ./src/shared
```

### **2. Import Shared Types & Validations**

```typescript
// src/types/index.ts
export * from "../shared/src/types";
export * from "../shared/src/validations";
export * from "../shared/src/utils";
```

### **3. API Service Setup**

```typescript
// src/services/api.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://vcarpool-api-prod.azurewebsites.net/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token interceptor
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

## 🎨 **UI/UX Considerations**

### **Design System**

```bash
# Install UI components
npm install react-native-elements react-native-vector-icons
npx expo install react-native-svg

# Or use NativeBase
npm install react-native-svg react-native-safe-area-context native-base
```

### **Color Scheme (Match Web App)**

```typescript
// src/constants/colors.ts
export const colors = {
  primary: "#3B82F6", // Blue
  secondary: "#10B981", // Green
  background: "#F9FAFB", // Light gray
  surface: "#FFFFFF", // White
  text: "#111827", // Dark gray
  textSecondary: "#6B7280", // Medium gray
  error: "#EF4444", // Red
  warning: "#F59E0B", // Amber
  success: "#10B981", // Green
};
```

## 📱 **Key Screens to Implement**

### **1. Authentication Flow**

- **Login Screen**
- **Register Screen**
- **Forgot Password Screen**

### **2. Main App Flow**

- **Dashboard/Home** - Trip overview
- **Trip Search** - Find available trips
- **Create Trip** - Post new trip
- **My Trips** - User's trips (as driver/passenger)
- **Profile** - User settings and preferences
- **Notifications** - Trip updates and messages

### **3. Advanced Features**

- **Map View** - Show trip routes
- **Push Notifications** - Trip reminders and updates
- **Offline Support** - Basic functionality without internet

## 🔄 **Data Flow**

### **Authentication Store**

```typescript
// src/store/authStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../shared/src/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // API call to your backend
        // Save token and user data
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## 🗺️ **Maps Integration**

### **Route Display**

```typescript
// src/components/TripMap.tsx
import MapView, { Marker, Polyline } from "react-native-maps";

export const TripMap = ({ trip }) => (
  <MapView style={{ flex: 1 }}>
    <Marker coordinate={trip.origin} title="Pickup" />
    <Marker coordinate={trip.destination} title="Destination" />
    <Polyline coordinates={trip.route} strokeColor="#3B82F6" strokeWidth={3} />
  </MapView>
);
```

## 📲 **Push Notifications**

### **Setup**

```typescript
// src/services/notifications.ts
import * as Notifications from "expo-notifications";

export const setupNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Notification permission denied");
  }

  return await Notifications.getExpoPushTokenAsync();
};
```

## 🚀 **Build & Deployment**

### **Development Build**

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on physical device (scan QR code with Expo Go app)
```

### **Production Build**

```bash
# Configure app.json for production
# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

## 📋 **Development Timeline**

### **Phase 1 (2-3 weeks)**

- ✅ Project setup and dependencies
- ✅ Authentication screens
- ✅ Basic navigation
- ✅ API integration

### **Phase 2 (3-4 weeks)**

- ✅ Main app screens (Dashboard, Trips, Profile)
- ✅ Form handling and validation
- ✅ Basic UI/UX implementation

### **Phase 3 (2-3 weeks)**

- ✅ Maps integration
- ✅ Push notifications
- ✅ Advanced features

### **Phase 4 (1-2 weeks)**

- ✅ Testing and optimization
- ✅ App Store submission

## 🔧 **Alternative: Expo Web**

If you want to test quickly:

```bash
# Add web support to existing Expo project
npx expo install react-dom react-native-web

# Run on web
npx expo start --web
```

## 📚 **Resources**

- **React Native Docs**: https://reactnative.dev/
- **Expo Docs**: https://docs.expo.dev/
- **React Navigation**: https://reactnavigation.org/
- **Zustand**: https://github.com/pmndrs/zustand
- **React Native Maps**: https://github.com/react-native-maps/react-native-maps

---

**💡 Advantage**: This approach lets you reuse 90% of your business logic, validations, and API calls from your existing web application!
