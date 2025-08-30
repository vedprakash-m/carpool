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
    console.log('Providers useEffect running...');
    console.log('Current pathname:', pathname);

    // DON'T initialize auth on registration page - users should see forms first
    const isRegistrationPage =
      pathname === '/register' || pathname?.startsWith('/register/');
    const isPublicPage =
      pathname === '/login' || pathname === '/forgot-password';

    console.log('Is registration page:', isRegistrationPage);
    console.log('Is public page:', isPublicPage);

    if (isRegistrationPage || isPublicPage) {
      console.log(
        `✅ Skipping auth initialization on ${pathname} - public page`
      );
      return;
    }

    console.log('🔑 Starting Entra ID Authentication initialization...');
    // CRITICAL FIX: Only initialize Entra ID authentication to prevent conflicts
    initializeEntra().catch(error => {
      console.error('Failed to initialize Entra authentication:', error);
    });
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
