import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ConditionalProviders } from './conditional-providers';
import { Toaster } from 'react-hot-toast';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { RBACProvider } from '@/contexts/RBACContext';
import { SkipLink } from '@/components/ui/AccessibleComponents';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
};

export const metadata: Metadata = {
  title: 'Carpool - Smart Carpool Management',
  description:
    'Efficient carpool management for schools and families with real-time coordination',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
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
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={inter.className}>
        <SkipLink targetId="main-content" />
        <RBACProvider>
          <ConditionalProviders>
            <OnboardingProvider>
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </OnboardingProvider>
          </ConditionalProviders>
        </RBACProvider>
      </body>
    </html>
  );
}
