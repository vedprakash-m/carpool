import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { RBACProvider } from "@/contexts/RBACContext";
import PWAInitializer from "@/components/PWAInitializer";
import { SkipLink } from "@/components/ui/AccessibleComponents";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VCarpool - Smart Carpool Management",
  description:
    "Efficient carpool management for schools and families with real-time coordination",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VCarpool" />
        <link rel="apple-touch-icon" href="/icon-180x180.png" />
      </head>
      <body className={inter.className}>
        <SkipLink targetId="main-content" />
        <RBACProvider>
          <Providers>
            <OnboardingProvider>
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <PWAInitializer />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "#363636",
                    color: "#fff",
                  },
                }}
              />
            </OnboardingProvider>
          </Providers>
        </RBACProvider>
      </body>
    </html>
  );
}
