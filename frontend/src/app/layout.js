"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const providers_1 = require("./providers");
const react_hot_toast_1 = require("react-hot-toast");
const OnboardingContext_1 = require("@/contexts/OnboardingContext");
const RBACContext_1 = require("@/contexts/RBACContext");
const PWAInitializer_1 = __importDefault(require("@/components/PWAInitializer"));
const AccessibleComponents_1 = require("@/components/ui/AccessibleComponents");
const inter = (0, google_1.Inter)({ subsets: ["latin"] });
exports.metadata = {
    title: "VCarpool - Smart Carpool Management",
    description: "Efficient carpool management for schools and families with real-time coordination",
    manifest: "/manifest.json",
    themeColor: "#3b82f6",
    viewport: {
        width: "device-width",
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
        viewportFit: "cover",
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "VCarpool",
    },
    icons: {
        icon: [
            { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icon-180x180.png", sizes: "180x180", type: "image/png" }],
    },
};
function RootLayout({ children, }) {
    return (<html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json"/>
        <meta name="theme-color" content="#3b82f6"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta name="apple-mobile-web-app-title" content="VCarpool"/>
        <link rel="apple-touch-icon" href="/icon-180x180.png"/>
      </head>
      <body className={inter.className}>
        <AccessibleComponents_1.SkipLink targetId="main-content"/>
        <RBACContext_1.RBACProvider>
          <providers_1.Providers>
            <OnboardingContext_1.OnboardingProvider>
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <PWAInitializer_1.default />
              <react_hot_toast_1.Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: {
                background: "#363636",
                color: "#fff",
            },
        }}/>
            </OnboardingContext_1.OnboardingProvider>
          </providers_1.Providers>
        </RBACContext_1.RBACProvider>
      </body>
    </html>);
}
