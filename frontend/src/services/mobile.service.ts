/**
 * Mobile Service - Enhanced mobile experience and capabilities
 * Handles mobile-specific features, gestures, and optimization
 */

import { useEffect, useState, useCallback } from 'react';

export interface MobileCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: 'sm' | 'md' | 'lg' | 'xl';
  hasNotchSupport: boolean;
  standalone: boolean;
  platform: string;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

class MobileService {
  private static instance: MobileService;

  private constructor() {}

  static getInstance(): MobileService {
    if (!MobileService.instance) {
      MobileService.instance = new MobileService();
    }
    return MobileService.instance;
  }

  /**
   * Detect device capabilities
   */
  getCapabilities(): MobileCapabilities {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        orientation: 'landscape',
        screenSize: 'lg',
        hasNotchSupport: false,
        standalone: false,
        platform: 'unknown',
      };
    }

    const userAgent = navigator.userAgent;
    const isMobile =
      /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      );
    const isTablet =
      /iPad|Android(?=.*Mobile)/i.test(userAgent) && window.innerWidth > 768;
    const isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const width = window.innerWidth;
    let screenSize: 'sm' | 'md' | 'lg' | 'xl' = 'lg';
    if (width < 640) screenSize = 'sm';
    else if (width < 768) screenSize = 'md';
    else if (width < 1024) screenSize = 'lg';
    else screenSize = 'xl';

    const orientation =
      window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

    // Detect notch support (iPhone X and newer)
    const hasNotchSupport =
      'CSS' in window &&
      CSS.supports &&
      (CSS.supports('padding-top', 'env(safe-area-inset-top)') ||
        CSS.supports('padding-top', 'constant(safe-area-inset-top)'));

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    return {
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      isTouchDevice,
      orientation,
      screenSize,
      hasNotchSupport,
      standalone,
      platform: this.getPlatform(),
    };
  }

  /**
   * Get platform information
   */
  private getPlatform(): string {
    if (typeof window === 'undefined') return 'unknown';

    const userAgent = navigator.userAgent;
    if (/iPhone|iPod/.test(userAgent)) return 'ios';
    if (/iPad/.test(userAgent)) return 'ipados';
    if (/Android/.test(userAgent)) return 'android';
    if (/Windows/.test(userAgent)) return 'windows';
    if (/Mac/.test(userAgent)) return 'macos';
    return 'unknown';
  }

  /**
   * Setup swipe gesture detection
   */
  setupSwipeGesture(
    element: HTMLElement,
    onSwipe: (gesture: SwipeGesture) => void,
    options: {
      minDistance?: number;
      maxTime?: number;
      threshold?: number;
    } = {}
  ): () => void {
    const { minDistance = 50, maxTime = 500, threshold = 10 } = options;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;

      if (distance < minDistance || deltaTime > maxTime) return;

      let direction: SwipeGesture['direction'];
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      onSwipe({
        direction,
        distance,
        velocity,
        duration: deltaTime,
      });
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }

  /**
   * Add haptic feedback (iOS Safari and Android Chrome)
   */
  hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (typeof window === 'undefined') return;

    // iOS haptic feedback
    if ('hapticFeedback' in navigator) {
      try {
        (navigator as any).hapticFeedback.impact(type);
      } catch (error) {
        console.debug('Haptic feedback not supported:', error);
      }
    }

    // Android vibration fallback
    if ('vibrate' in navigator) {
      const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
      navigator.vibrate(duration);
    }
  }

  /**
   * Optimize touch targets for mobile
   */
  optimizeTouchTargets(): void {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.textContent = `
      /* Mobile touch optimization */
      @media (pointer: coarse) {
        button, [role="button"], input[type="button"], input[type="submit"] {
          min-height: 44px;
          min-width: 44px;
          padding: 12px 16px;
        }
        
        a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }
        
        input, textarea, select {
          min-height: 44px;
          font-size: 16px; /* Prevent zoom on iOS */
        }
      }
      
      /* Safe area support */
      .safe-area-top {
        padding-top: env(safe-area-inset-top, 0);
      }
      
      .safe-area-bottom {
        padding-bottom: env(safe-area-inset-bottom, 0);
      }
      
      .safe-area-left {
        padding-left: env(safe-area-inset-left, 0);
      }
      
      .safe-area-right {
        padding-right: env(safe-area-inset-right, 0);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup pull-to-refresh
   */
  setupPullToRefresh(
    onRefresh: () => Promise<void>,
    options: {
      threshold?: number;
      resistance?: number;
    } = {}
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    const { threshold = 80, resistance = 2.5 } = options;
    let startY = 0;
    let currentY = 0;
    let isRefreshing = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY !== 0) return;
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY !== 0 || isRefreshing) return;

      currentY = e.touches[0].clientY;
      const pullDistance = Math.max(0, (currentY - startY) / resistance);

      if (pullDistance > 10) {
        document.body.style.transform = `translateY(${Math.min(
          pullDistance,
          threshold
        )}px)`;
        document.body.style.transition = 'none';
      }
    };

    const handleTouchEnd = async () => {
      if (window.scrollY !== 0 || isRefreshing) return;

      const pullDistance = Math.max(0, (currentY - startY) / resistance);

      document.body.style.transition = 'transform 0.3s ease';
      document.body.style.transform = '';

      if (pullDistance >= threshold) {
        isRefreshing = true;
        try {
          await onRefresh();
        } finally {
          isRefreshing = false;
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }
}

/**
 * React hook for mobile capabilities
 */
export function useMobile(): MobileCapabilities & {
  setupSwipeGesture: MobileService['setupSwipeGesture'];
  hapticFeedback: MobileService['hapticFeedback'];
  setupPullToRefresh: MobileService['setupPullToRefresh'];
} {
  const [capabilities, setCapabilities] = useState<MobileCapabilities>(() =>
    MobileService.getInstance().getCapabilities()
  );

  useEffect(() => {
    const updateCapabilities = () => {
      setCapabilities(MobileService.getInstance().getCapabilities());
    };

    // Listen for orientation changes
    const handleOrientationChange = () => {
      setTimeout(updateCapabilities, 100); // Small delay for accurate dimensions
    };

    window.addEventListener('resize', updateCapabilities);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Optimize touch targets on mount
    MobileService.getInstance().optimizeTouchTargets();

    return () => {
      window.removeEventListener('resize', updateCapabilities);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const mobileService = MobileService.getInstance();

  return {
    ...capabilities,
    setupSwipeGesture: useCallback(
      mobileService.setupSwipeGesture.bind(mobileService),
      [mobileService]
    ),
    hapticFeedback: useCallback(
      mobileService.hapticFeedback.bind(mobileService),
      [mobileService]
    ),
    setupPullToRefresh: useCallback(
      mobileService.setupPullToRefresh.bind(mobileService),
      [mobileService]
    ),
  };
}

export default MobileService;
