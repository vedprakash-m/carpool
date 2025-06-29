import { MobileService } from '../services/mobile.service';

describe('MobileService', () => {
  beforeEach(() => {
    // Reset DOM and global mocks
    document.body.innerHTML = '';
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        maxTouchPoints: 5,
      },
      writable: true,
    });

    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      writable: true,
    });

    Object.defineProperty(window, 'innerHeight', {
      value: 667,
      writable: true,
    });
  });

  describe('Device Detection', () => {
    it('detects mobile device correctly', () => {
      expect(MobileService.isMobile()).toBe(true);
    });

    it('detects tablet device correctly', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X)',
          maxTouchPoints: 5,
        },
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 768,
        writable: true,
      });

      expect(MobileService.isTablet()).toBe(true);
    });

    it('detects desktop device correctly', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          maxTouchPoints: 0,
        },
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
      });

      expect(MobileService.isMobile()).toBe(false);
      expect(MobileService.isTablet()).toBe(false);
    });

    it('detects touch support correctly', () => {
      expect(MobileService.isTouchDevice()).toBe(true);
    });
  });

  describe('Viewport Utils', () => {
    it('gets viewport dimensions correctly', () => {
      const viewport = MobileService.getViewportDimensions();
      expect(viewport.width).toBe(375);
      expect(viewport.height).toBe(667);
    });

    it('detects portrait orientation', () => {
      expect(MobileService.isPortrait()).toBe(true);
    });

    it('detects landscape orientation', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 667,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 375,
        writable: true,
      });

      expect(MobileService.isPortrait()).toBe(false);
    });
  });

  describe('Gesture Handling', () => {
    it('initializes touch tracking correctly', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      const mockCallback = jest.fn();
      MobileService.initializeTouchTracking(element, mockCallback);

      // Simulate touch start
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      element.dispatchEvent(touchEvent);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'start',
          position: { x: 100, y: 100 },
        })
      );
    });

    it('tracks swipe gestures correctly', done => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      MobileService.addSwipeListener(element, direction => {
        expect(direction).toBe('right');
        done();
      });

      // Simulate swipe right
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 50, clientY: 100 } as Touch],
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 } as Touch],
      });

      element.dispatchEvent(touchStart);
      setTimeout(() => {
        element.dispatchEvent(touchEnd);
      }, 100);
    });

    it('detects pinch gestures correctly', done => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      MobileService.addPinchListener(element, scale => {
        expect(scale).toBeCloseTo(1.5, 1);
        done();
      });

      // Simulate pinch zoom
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          { clientX: 100, clientY: 100 } as Touch,
          { clientX: 200, clientY: 100 } as Touch,
        ],
      });
      const touchMove = new TouchEvent('touchmove', {
        touches: [
          { clientX: 80, clientY: 100 } as Touch,
          { clientX: 220, clientY: 100 } as Touch,
        ],
      });

      element.dispatchEvent(touchStart);
      element.dispatchEvent(touchMove);
    });
  });

  describe('Mobile Optimizations', () => {
    it('optimizes scrolling performance', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      MobileService.optimizeScrolling(element);

      expect(element.style.webkitOverflowScrolling).toBe('touch');
      expect(element.style.overflowScrolling).toBe('touch');
    });

    it('prevents zoom on input focus', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      MobileService.preventInputZoom(input);

      const focusEvent = new Event('focus');
      input.dispatchEvent(focusEvent);

      const viewportMeta = document.querySelector(
        'meta[name="viewport"]'
      ) as HTMLMetaElement;
      expect(viewportMeta?.content).toContain('user-scalable=no');
    });

    it('enables safe area support', () => {
      MobileService.enableSafeAreaSupport();

      const style = document.head.querySelector('style');
      expect(style?.textContent).toContain('env(safe-area-inset-');
    });
  });

  describe('Performance Optimizations', () => {
    it('reduces motion for accessibility', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      expect(MobileService.shouldReduceMotion()).toBe(true);
    });

    it('optimizes animation performance', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      MobileService.optimizeAnimations(element);

      expect(element.style.transform).toBe('translateZ(0)');
      expect(element.style.backfaceVisibility).toBe('hidden');
      expect(element.style.perspective).toBe('1000px');
    });

    it('lazy loads images correctly', done => {
      const img = document.createElement('img');
      img.setAttribute('data-src', 'test-image.jpg');
      document.body.appendChild(img);

      // Mock IntersectionObserver
      global.IntersectionObserver = jest.fn().mockImplementation(callback => ({
        observe: jest.fn().mockImplementation(() => {
          callback([{ isIntersecting: true, target: img }]);
        }),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));

      MobileService.enableLazyLoading();

      setTimeout(() => {
        expect(img.src).toContain('test-image.jpg');
        done();
      }, 100);
    });
  });

  describe('Haptic Feedback', () => {
    it('provides haptic feedback when supported', () => {
      const mockVibrate = jest.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
      });

      MobileService.hapticFeedback('light');
      expect(mockVibrate).toHaveBeenCalledWith(50);

      MobileService.hapticFeedback('medium');
      expect(mockVibrate).toHaveBeenCalledWith(100);

      MobileService.hapticFeedback('heavy');
      expect(mockVibrate).toHaveBeenCalledWith(200);
    });

    it('handles missing vibration API gracefully', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
      });

      expect(() => MobileService.hapticFeedback('light')).not.toThrow();
    });
  });

  describe('Network Detection', () => {
    it('detects network status correctly', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });

      expect(MobileService.isOnline()).toBe(true);
    });

    it('detects slow network connections', () => {
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 300,
        },
        writable: true,
      });

      expect(MobileService.isSlowConnection()).toBe(true);
    });

    it('adds network change listeners', done => {
      MobileService.addNetworkListener(isOnline => {
        expect(isOnline).toBe(false);
        done();
      });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
    });
  });

  describe('Battery API', () => {
    it('gets battery status when supported', async () => {
      const mockBattery = {
        level: 0.8,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: 3600,
      };

      Object.defineProperty(navigator, 'getBattery', {
        value: jest.fn().mockResolvedValue(mockBattery),
        writable: true,
      });

      const battery = await MobileService.getBatteryStatus();
      expect(battery?.level).toBe(0.8);
      expect(battery?.charging).toBe(false);
    });

    it('handles missing battery API gracefully', async () => {
      Object.defineProperty(navigator, 'getBattery', {
        value: undefined,
        writable: true,
      });

      const battery = await MobileService.getBatteryStatus();
      expect(battery).toBeNull();
    });
  });
});
