'use client';

import { useEffect } from 'react';
import { useEntraAuthStore } from '@/store/entra-auth.store';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  // AUTHENTICATION REMEDIATION: Single source of truth - Only Entra Auth
  const initializeEntra = useEntraAuthStore(state => state.initialize);

  useEffect(() => {
    console.log('Providers useEffect running...');
    console.log('Starting Entra ID Authentication initialization...');

    // CRITICAL FIX: Only initialize Entra ID authentication to prevent conflicts
    initializeEntra().catch(error => {
      console.error('Failed to initialize Entra authentication:', error);
    });
  }, [initializeEntra]);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        {children}
        <Toaster position="bottom-right" gutter={8} />
      </NotificationProvider>
    </ErrorBoundary>
  );
}
