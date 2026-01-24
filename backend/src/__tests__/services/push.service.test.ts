/* eslint-disable @typescript-eslint/no-var-requires */

import { PushService } from '../../services/push.service';
import { configService } from '../../services/config.service';

// Mock the web-push module
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

// Mock the config service
jest.mock('../../services/config.service', () => ({
  configService: {
    getConfig: jest.fn(),
  },
}));

describe('PushService', () => {
  let pushService: PushService;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  const mockGetConfig = configService.getConfig as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('constructor', () => {
    it('should set VAPID details when environment variables are provided', () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: 'test-public-key',
          vapidPrivateKey: 'test-private-key',
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      const webpush = require('web-push');

      pushService = new PushService();

      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:support@carpool.com',
        'test-public-key',
        'test-private-key',
      );
    });

    it('should not set VAPID details when environment variables are missing', () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: undefined,
          vapidPrivateKey: undefined,
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      const webpush = require('web-push');

      pushService = new PushService();

      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('should not set VAPID details when only public key is provided', () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: 'test-public-key',
          vapidPrivateKey: undefined,
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      const webpush = require('web-push');

      pushService = new PushService();

      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('should not set VAPID details when only private key is provided', () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: undefined,
          vapidPrivateKey: 'test-private-key',
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      const webpush = require('web-push');

      pushService = new PushService();

      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });
  });

  describe('sendPush', () => {
    it('should send push notification when VAPID is set', async () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: 'test-public-key',
          vapidPrivateKey: 'test-private-key',
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      const webpush = require('web-push');
      webpush.sendNotification.mockResolvedValue(undefined);

      pushService = new PushService();

      const subscription = { endpoint: 'test-endpoint' };
      const payload = { title: 'Test', body: 'Test message' };

      await pushService.sendPush(subscription, payload);

      expect(webpush.sendNotification).toHaveBeenCalledWith(subscription, JSON.stringify(payload));
    });

    it('should not send push notification when VAPID is not set', async () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: undefined,
          vapidPrivateKey: undefined,
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      const webpush = require('web-push');

      pushService = new PushService();

      const subscription = { endpoint: 'test-endpoint' };
      const payload = { title: 'Test', body: 'Test message' };

      await pushService.sendPush(subscription, payload);

      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: 'test-public-key',
          vapidPrivateKey: 'test-private-key',
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      const webpush = require('web-push');
      const error = new Error('Push failed');
      webpush.sendNotification.mockRejectedValue(error);

      pushService = new PushService();

      const subscription = { endpoint: 'test-endpoint' };
      const payload = { title: 'Test', body: 'Test message' };

      await expect(pushService.sendPush(subscription, payload)).resolves.not.toThrow();

      expect(mockConsoleError).toHaveBeenCalledWith('Error sending push', error);
    });
  });

  describe('sendPushNotification', () => {
    it('should log notification when VAPID is set', async () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: 'test-public-key',
          vapidPrivateKey: 'test-private-key',
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      pushService = new PushService();

      const userId = 'user123';
      const payload = { title: 'Test', body: 'Test message' };

      await pushService.sendPushNotification(userId, payload);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        `Push notification would be sent to user ${userId}:`,
        payload,
      );
    });

    it('should not send notification when VAPID is not set', async () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: undefined,
          vapidPrivateKey: undefined,
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      pushService = new PushService();

      const userId = 'user123';
      const payload = { title: 'Test', body: 'Test message' };

      await pushService.sendPushNotification(userId, payload);

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGetConfig.mockReturnValue({
        push: {
          vapidPublicKey: 'test-public-key',
          vapidPrivateKey: 'test-private-key',
          vapidSubject: 'mailto:support@carpool.com',
        },
      });

      // Mock console.log to throw an error
      mockConsoleLog.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      pushService = new PushService();

      const userId = 'user123';
      const payload = { title: 'Test', body: 'Test message' };

      await expect(pushService.sendPushNotification(userId, payload)).resolves.not.toThrow();

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error sending push notification',
        expect.any(Error),
      );
    });
  });
});
