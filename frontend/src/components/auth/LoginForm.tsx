'use client';

import React from 'react';
import { useEntraAuthStore } from '../../store/entra-auth.store';

export function LoginForm() {
  const { loginWithEntra, isLoading, error, clearError } = useEntraAuthStore();

  const handleEntraLogin = async () => {
    try {
      clearError();
      await loginWithEntra();
      // Redirect will happen automatically
    } catch (error) {
      console.error('Microsoft login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 text-blue-600">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="w-12 h-12"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Carpool
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use your Microsoft account to access the carpool platform
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Sign in failed
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Microsoft Entra ID Login (Only Option) */}
          <div>
            <button
              onClick={handleEntraLogin}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M23.64 12.204c0-.815-.073-1.636-.22-2.425H12v4.598h6.54c-.288 1.494-1.158 2.776-2.465 3.627v3.009h3.992c2.34-2.148 3.573-5.307 3.573-8.809z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 24c3.24 0 5.954-1.077 7.94-2.907l-3.992-3.009c-1.077.72-2.465 1.158-3.948 1.158-3.043 0-5.622-2.058-6.54-4.817H1.46v3.105C3.485 21.318 7.466 24 12 24z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.46 14.425c-.234-.72-.372-1.494-.372-2.425s.138-1.705.372-2.425V6.47H1.46C.533 8.275 0 10.077 0 12s.533 3.725 1.46 5.53l3.1-2.405z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 4.817c1.714 0 3.252.588 4.467 1.746l3.35-3.35C17.954 1.144 15.24 0 12 0 7.466 0 3.485 2.682 1.46 6.47l4 3.105C6.378 6.875 8.957 4.817 12 4.817z"
                    />
                  </svg>
                  Continue with Microsoft
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our terms of service and privacy policy.
            <br />
            Secure authentication provided by Microsoft Entra ID.
          </p>
        </div>
      </div>
    </div>
  );
}
