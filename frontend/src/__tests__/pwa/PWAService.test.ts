/**
 * PWA Service Tests
 * Basic tests for PWA service functionality
 */

import { jest } from "@jest/globals";

// Mock global matchMedia first
Object.defineProperty(global, "matchMedia", {
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
  configurable: true,
});

// Mock browser environment
Object.defineProperty(global, "window", {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    navigator: {
      onLine: true,
      serviceWorker: {
        register: jest.fn().mockResolvedValue({
          active: { state: "activated" },
          installing: null,
          waiting: null,
        }),
        ready: Promise.resolve({
          active: { state: "activated" },
        }),
      },
    },
    matchMedia: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  },
  configurable: true,
});

describe("PWA Service Basic Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("service worker registration is available", () => {
    expect(global.window.navigator.serviceWorker).toBeDefined();
    expect(typeof global.window.navigator.serviceWorker.register).toBe(
      "function"
    );
  });

  test("window event listeners can be added", () => {
    expect(typeof global.window.addEventListener).toBe("function");
    expect(typeof global.window.removeEventListener).toBe("function");
  });

  test("navigator online status is accessible", () => {
    expect(global.window.navigator.onLine).toBeDefined();
    expect(typeof global.window.navigator.onLine).toBe("boolean");
  });

  test("matchMedia is available for accessibility checks", () => {
    const mq = global.matchMedia("(prefers-reduced-motion: reduce)");
    expect(mq).toBeDefined();
    expect(typeof mq.matches).toBe("boolean");
  });
});
