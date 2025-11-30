'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useEntraAuthStore } from '@/store/entra-auth.store';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

/**
 * Root Providers Component
 *
 * Handles conditional authentication initialization based on route.
 * Public routes (registration, login, landing) skip auth initialization
 * to allow unauthenticated access to those pages.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initializeEntra = useEntraAuthStore(state => state.initialize);

  useEffect(() => {
    // Define public routes that don't require authentication
    const isPublicRoute =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname?.startsWith('/register/') ||
      pathname === '/registration-complete' ||
      pathname?.startsWith('/registration-complete') ||
      pathname === '/forgot-password' ||
      pathname?.startsWith('/about');

    // Only initialize authentication for protected routes
    if (!isPublicRoute) {
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
