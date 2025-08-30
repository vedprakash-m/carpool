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
    console.log('🔍 DEBUG - Providers useEffect running...');
    console.log('🔍 DEBUG - Current pathname:', pathname);

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

    console.log('🔍 DEBUG - Is registration flow:', isRegistrationFlow);
    console.log('🔍 DEBUG - Is public page:', isPublicPage);

    // Only initialize authentication for authenticated app areas
    const shouldInitializeAuth = !isRegistrationFlow && !isPublicPage;

    console.log('🔍 DEBUG - Should initialize auth:', shouldInitializeAuth);

    if (shouldInitializeAuth) {
      console.log(
        '🔑 INITIALIZING AUTH - This should NOT happen on registration pages'
      );
      initializeEntra().catch(error => {
        console.error('Failed to initialize Entra authentication:', error);
      });
    } else {
      console.log(
        '✅ SKIPPING AUTH - Correctly identified as registration/public page - PATHNAME:',
        pathname
      );
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
