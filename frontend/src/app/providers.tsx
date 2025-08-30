'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useEntraAuthStore } from '@/store/entra-auth.store';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // AUTHENTICATION REMEDIATION: Single source of truth - Only Entra Auth
  const initializeEntra = useEntraAuthStore(state => state.initialize);

  useEffect(() => {
    // CRITICAL FIX: Completely disable authentication on registration flow
    // Registration pages should show forms, not authentication prompts
    const isRegistrationFlow =
      pathname === '/register' ||
      pathname?.startsWith('/register/') ||
      pathname === '/registration-complete' ||
      pathname?.startsWith('/registration-complete');

    const isPublicPage =
      pathname === '/login' ||
      pathname === '/forgot-password' ||
      pathname === '/' ||
      pathname?.startsWith('/about');

    // Only initialize authentication for authenticated app areas
    const shouldInitializeAuth = !isRegistrationFlow && !isPublicPage;

    if (shouldInitializeAuth) {
      initializeEntra().catch(error => {
        console.error('Failed to initialize Entra authentication:', error);
      });
    }
  }, [initializeEntra, pathname]);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        {children}
        <Toaster position="bottom-right" gutter={8} />
      </NotificationProvider>
    </ErrorBoundary>
  );
}
