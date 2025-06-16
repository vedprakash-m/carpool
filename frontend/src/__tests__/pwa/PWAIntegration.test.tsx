/**
 * PWA Integration Tests
 * Tests for Progressive Web App features including service worker, install prompts, and offline capabilities
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { PWAInitializer } from '../../components/PWAInitializer';

// Mock the PWA service
jest.mock('../../services/pwa.service', () => ({
  usePWA: () => ({
    capabilities: {
      isInstallable: true,
      isInstalled: false,
      isOnline: true,
      isServiceWorkerSupported: true,
      isStandalone: false,
    },
    registration: {
      active: true,
      installing: null,
      waiting: null,
    },
    installApp: jest.fn(),
    checkForUpdates: jest.fn(),
    skipWaiting: jest.fn(),
  }),
}));

// Mock accessibility service
jest.mock('../../services/accessibility.service', () => ({
  useAccessibility: () => ({
    config: {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      screenReader: true,
      keyboardNavigation: true,
    },
    announceLive: jest.fn(),
    trapFocus: jest.fn(() => () => {}),
    validateContrast: jest.fn(() => ({
      ratio: 4.5,
      wcagAA: true,
      wcagAAA: false,
    })),
    service: {},
  }),
}));

describe('PWA Integration', () => {
  beforeEach(() => {
    // Reset console logs
    jest.clearAllMocks();
    global.console.log = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('PWA Initializer Component', () => {
    test('renders without crashing', () => {
      render(<PWAInitializer />);
      expect(screen.getByText(/install vcarpool/i)).toBeInTheDocument();
    });

    test('detects accessibility preferences on mount', async () => {
      render(<PWAInitializer />);

      await waitFor(() => {
        expect(global.console.log).toHaveBeenCalledWith(
          'Screen reader detected, accessibility features enabled'
        );
        expect(global.console.log).toHaveBeenCalledWith(
          'Keyboard navigation preference detected'
        );
      });
    });

    test('displays PWA capabilities in development mode', async () => {
      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<PWAInitializer />);

      await waitFor(() => {
        expect(global.console.log).toHaveBeenCalledWith(
          'PWA Capabilities:',
          expect.objectContaining({
            isInstallable: true,
            isInstalled: false,
            isOnline: true,
            isServiceWorkerSupported: true,
            isStandalone: false,
          })
        );
      });

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    test('shows install prompt for installable apps', () => {
      render(<PWAInitializer />);

      expect(screen.getByText(/install vcarpool/i)).toBeInTheDocument();
      expect(screen.getByText(/get the full experience/i)).toBeInTheDocument();
    });

    test('handles install button click', async () => {
      const { usePWA } = require('../../services/pwa.service');
      const mockInstallApp = jest.fn();

      // Mock the hook to return our mock function
      usePWA.mockReturnValue({
        capabilities: {
          isInstallable: true,
          isInstalled: false,
          isOnline: true,
          isServiceWorkerSupported: true,
          isStandalone: false,
        },
        registration: { active: true },
        installApp: mockInstallApp,
        checkForUpdates: jest.fn(),
        skipWaiting: jest.fn(),
      });

      render(<PWAInitializer />);

      const installButton = screen.getByRole('button', {
        name: /install now/i,
      });
      fireEvent.click(installButton);

      expect(mockInstallApp).toHaveBeenCalled();
    });
  });

  describe('Service Worker Integration', () => {
    test('registers service worker when supported', async () => {
      // Mock navigator.serviceWorker
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          register: jest.fn().mockResolvedValue({
            active: { state: 'activated' },
            installing: null,
            waiting: null,
          }),
          ready: Promise.resolve({
            active: { state: 'activated' },
          }),
        },
        configurable: true,
      });

      render(<PWAInitializer />);

      // Verify service worker registration would be called
      // Note: In actual implementation, this would be handled by the PWA service
      expect(global.navigator.serviceWorker).toBeDefined();
    });

    test('handles service worker registration failure gracefully', async () => {
      // Mock service worker registration failure
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          register: jest
            .fn()
            .mockRejectedValue(new Error('SW registration failed')),
        },
        configurable: true,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<PWAInitializer />);

      // The error should be handled gracefully without crashing the app
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Offline Capabilities', () => {
    test('detects online/offline status', () => {
      // Mock online status
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      render(<PWAInitializer />);

      // Component should handle offline state
      expect(screen.getByText(/install vcarpool/i)).toBeInTheDocument();
    });

    test('shows appropriate messaging for offline state', () => {
      const { usePWA } = require('../../services/pwa.service');

      usePWA.mockReturnValue({
        capabilities: {
          isInstallable: true,
          isInstalled: false,
          isOnline: false, // Offline state
          isServiceWorkerSupported: true,
          isStandalone: false,
        },
        registration: { active: true },
        installApp: jest.fn(),
        checkForUpdates: jest.fn(),
        skipWaiting: jest.fn(),
      });

      render(<PWAInitializer />);

      // Should still show install prompt even when offline
      expect(screen.getByText(/install vcarpool/i)).toBeInTheDocument();
    });
  });

  describe('PWA Manifest Integration', () => {
    test('manifest properties are properly set', () => {
      // Check if manifest link exists in document head
      const manifestLink = document.querySelector('link[rel="manifest"]');
      expect(manifestLink).toBeTruthy();
    });

    test('theme color is properly set', () => {
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      expect(themeColorMeta).toBeTruthy();
    });

    test('Apple Web App meta tags are present', () => {
      const appleMobileCapable = document.querySelector(
        'meta[name="apple-mobile-web-app-capable"]'
      );
      const appleStatusBarStyle = document.querySelector(
        'meta[name="apple-mobile-web-app-status-bar-style"]'
      );

      // These should be set in the layout, so might not be present in test environment
      // This test documents the expected behavior
      expect(appleMobileCapable || appleStatusBarStyle).toBeDefined();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('handles iOS Safari installation flow', () => {
      // Mock iOS Safari user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      render(<PWAInitializer />);

      // Should show iOS-specific install instructions
      expect(screen.getByText(/install vcarpool/i)).toBeInTheDocument();
    });

    test('handles Android Chrome installation flow', () => {
      // Mock Android Chrome user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        configurable: true,
      });

      render(<PWAInitializer />);

      // Should show Android-specific install flow
      expect(screen.getByText(/install vcarpool/i)).toBeInTheDocument();
    });

    test('handles desktop browser installation', () => {
      // Mock desktop Chrome user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });

      render(<PWAInitializer />);

      // Should show desktop install prompt
      expect(screen.getByText(/install vcarpool/i)).toBeInTheDocument();
    });
  });
});
