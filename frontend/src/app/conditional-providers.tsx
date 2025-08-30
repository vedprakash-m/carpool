'use client';

import { usePathname } from 'next/navigation';
import { Providers } from './providers';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

interface ConditionalProvidersProps {
  children: React.ReactNode;
}

export function ConditionalProviders({ children }: ConditionalProvidersProps) {
  const pathname = usePathname();

  // Check if we're on registration pages - if so, skip auth providers entirely
  const isRegistrationFlow =
    pathname === '/register' ||
    pathname?.startsWith('/register/') ||
    pathname === '/registration-complete' ||
    pathname?.startsWith('/registration-complete');

  console.log('🔄 CONDITIONAL PROVIDERS - pathname:', pathname);
  console.log(
    '🔄 CONDITIONAL PROVIDERS - isRegistrationFlow:',
    isRegistrationFlow
  );

  if (isRegistrationFlow) {
    console.log(
      '✅ BYPASSING AUTH PROVIDERS - Using minimal providers for registration'
    );
    // Use minimal providers without authentication for registration pages
    return (
      <ErrorBoundary>
        <NotificationProvider>
          {children}
          <Toaster position="bottom-right" gutter={8} />
        </NotificationProvider>
      </ErrorBoundary>
    );
  }

  console.log('🔑 USING FULL PROVIDERS - Including authentication providers');
  // Use full providers including authentication for all other pages
  return <Providers>{children}</Providers>;
}
