'use client';

import React from 'react';
import Link from 'next/link';
import { LoginForm } from '../../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-primary-600">
                Carpool
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/register"
                className="text-gray-600 hover:text-gray-900"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <LoginForm />
    </div>
  );
}
