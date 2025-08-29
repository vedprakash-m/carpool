'use client';

import { useEffect, useState } from 'react';
import { useEntraAuthStore } from '@/store/entra-auth.store';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { handleAuthRedirect, isLoading, error, isAuthenticated } =
    useEntraAuthStore();
  const [processComplete, setProcessComplete] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log(
          'Auth callback page: Processing authentication redirect...'
        );
        await handleAuthRedirect();
        setProcessComplete(true);

        // Wait a bit to ensure state is updated
        setTimeout(() => {
          if (useEntraAuthStore.getState().isAuthenticated) {
            console.log(
              'Authentication successful, redirecting to dashboard...'
            );
            router.replace('/dashboard');
          } else {
            console.log('Authentication failed, redirecting to login...');
            router.replace('/auth/login');
          }
        }, 1000);
      } catch (error) {
        console.error('Error processing auth callback:', error);
        setProcessComplete(true);
        router.replace('/auth/login?error=auth_callback_failed');
      }
    };

    processCallback();
  }, [handleAuthRedirect, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Authentication Failed
            </h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <button
              onClick={() => router.replace('/auth/login')}
              className="mt-4 group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {processComplete
              ? 'Redirecting...'
              : 'Processing Authentication...'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we complete your sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}
