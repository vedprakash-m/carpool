'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    // Initialize auth state on app startup
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        {children}
        <Toaster position="bottom-right" gutter={8} />
      </NotificationProvider>
    </ErrorBoundary>
  );
}
