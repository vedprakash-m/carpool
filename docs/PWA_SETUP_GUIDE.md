# 📱 Progressive Web App (PWA) Setup - vCarpool

## 🎯 **Overview**

Convert your existing Next.js vCarpool web app into a Progressive Web App that can be installed on iOS devices like a native app.

## ✅ **Advantages**

- **Fastest to implement** (1-2 days)
- **Reuse 100% of existing code**
- **Works on all platforms** (iOS, Android, Desktop)
- **No App Store approval needed**
- **Automatic updates**

## 🔧 **Implementation Steps**

### **1. Install PWA Dependencies**

```bash
cd frontend
npm install next-pwa
```

### **2. Update Next.js Configuration**

```javascript
// frontend/next.config.js
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/vcarpool-api-prod\.azurewebsites\.net\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
});

const nextConfig = {
  // Your existing config
};

module.exports = withPWA(nextConfig);
```

### **3. Create Web App Manifest**

```json
// frontend/public/manifest.json
{
  "name": "vCarpool - Carpool Management",
  "short_name": "vCarpool",
  "description": "Manage your carpool trips and schedules",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### **4. Add Meta Tags to Layout**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "vCarpool",
  description: "Carpool Management Application",
  manifest: "/manifest.json",
  themeColor: "#3B82F6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "vCarpool",
  },
  icons: {
    apple: "/icons/icon-152x152.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="vCarpool" />
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### **5. Create App Icons**

Create icons in `frontend/public/icons/` with these sizes:

- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### **6. Add Install Prompt Component**

```tsx
// frontend/src/components/InstallPrompt.tsx
"use client";

import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowInstall(false);
      }
    }
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Install vCarpool</h3>
          <p className="text-sm opacity-90">
            Add to home screen for better experience
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInstall(false)}
            className="px-3 py-1 text-sm border border-white/20 rounded"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="px-3 py-1 text-sm bg-white text-blue-600 rounded font-medium"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 📱 **iOS Installation Process**

### **For Users:**

1. Open vCarpool website in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. App installs like a native app

### **Features You Get:**

- ✅ App icon on home screen
- ✅ Fullscreen experience (no browser UI)
- ✅ Offline capability
- ✅ Background sync
- ✅ Push notifications (with additional setup)

## 🚀 **Build & Deploy**

```bash
# Build with PWA
npm run build

# Deploy to Azure Static Web Apps (your existing process)
```

## 📋 **Timeline: 1-2 Days**

- ✅ PWA configuration (2-3 hours)
- ✅ Icon creation (1-2 hours)
- ✅ Testing on iOS (1-2 hours)
- ✅ Deployment (30 minutes)

---

**💡 This is the fastest way to get an "app-like" experience on iOS!**
