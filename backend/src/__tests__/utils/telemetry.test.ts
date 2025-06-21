/* eslint-disable @typescript-eslint/no-var-requires */

describe('Telemetry Utils', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('initializeTelemetry', () => {
    it('should not initialize when OTEL_ENABLED is not true', () => {
      process.env.OTEL_ENABLED = 'false';
      
      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');
      
      initializeTelemetry();
      
      expect(mockConsoleLog).toHaveBeenCalledWith('OpenTelemetry disabled via OTEL_ENABLED env var');
    });

    it('should not initialize when OTEL_ENABLED is undefined', () => {
      delete process.env.OTEL_ENABLED;
      
      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');
      
      initializeTelemetry();
      
      expect(mockConsoleLog).toHaveBeenCalledWith('OpenTelemetry disabled via OTEL_ENABLED env var');
    });

    it('should attempt to initialize telemetry when OTEL_ENABLED is true', () => {
      process.env.OTEL_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      
      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');
      
      // Should not throw an error
      expect(() => initializeTelemetry()).not.toThrow();
      
      // Should log initialization success or handle gracefully
      expect(mockConsoleLog.mock.calls.some(call => 
        call[0]?.includes('OpenTelemetry') || call[0]?.includes('initialization')
      )).toBe(true);
    });

    it('should handle multiple initialization calls gracefully', () => {
      process.env.OTEL_ENABLED = 'false';
      
      // Reset module cache to get fresh import
      jest.resetModules();
      const { initializeTelemetry } = require('../../utils/telemetry');
      
      // Should handle multiple calls without error
      expect(() => {
        initializeTelemetry();
        initializeTelemetry();
        initializeTelemetry();
      }).not.toThrow();
      
      // Should log the disabled message each time (or only once depending on implementation)
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should be importable without errors', () => {
      // Test that the module can be imported without throwing
      expect(() => {
        require('../../utils/telemetry');
      }).not.toThrow();
    });
  });
});
