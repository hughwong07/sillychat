import {
  requestNotificationPermissions,
  checkNotificationPermissions,
  getNotificationToken,
  displayNotification,
  cancelNotification,
  cancelAllNotifications,
  addNotificationListener,
  removeNotificationListener,
  removeAllNotificationListeners,
  NOTIFICATION_EVENTS,
} from '../../native/NotificationNativeModule';

// Mock React Native NativeModules
jest.mock('react-native', () => ({
  NativeModules: {
    NotificationModule: {
      requestPermissions: jest.fn(),
      checkPermissions: jest.fn(),
      getToken: jest.fn(),
      displayNotification: jest.fn(),
      cancelNotification: jest.fn(),
      cancelAllNotifications: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
  })),
  Platform: {
    OS: 'ios',
  },
}));

const { NativeModules } = require('react-native');
const mockNotificationModule = NativeModules.NotificationModule;

describe('NotificationNativeModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestNotificationPermissions', () => {
    it('should resolve with permission result when successful', async () => {
      const mockResult = {
        alert: true,
        badge: true,
        sound: true,
      };
      mockNotificationModule.requestPermissions.mockResolvedValue(mockResult);

      const result = await requestNotificationPermissions();

      expect(mockNotificationModule.requestPermissions).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should throw error when request fails', async () => {
      const mockError = new Error('Permission denied');
      mockNotificationModule.requestPermissions.mockRejectedValue(mockError);

      await expect(requestNotificationPermissions()).rejects.toThrow('Permission denied');
    });
  });

  describe('checkNotificationPermissions', () => {
    it('should resolve with current permission status', async () => {
      const mockResult = {
        alert: false,
        badge: false,
        sound: true,
      };
      mockNotificationModule.checkPermissions.mockResolvedValue(mockResult);

      const result = await checkNotificationPermissions();

      expect(mockNotificationModule.checkPermissions).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should throw error when check fails', async () => {
      const mockError = new Error('Check failed');
      mockNotificationModule.checkPermissions.mockRejectedValue(mockError);

      await expect(checkNotificationPermissions()).rejects.toThrow('Check failed');
    });
  });

  describe('getNotificationToken', () => {
    it('should resolve with token string', async () => {
      const mockToken = 'mock_fcm_token_12345';
      mockNotificationModule.getToken.mockResolvedValue(mockToken);

      const result = await getNotificationToken();

      expect(mockNotificationModule.getToken).toHaveBeenCalled();
      expect(result).toBe(mockToken);
    });

    it('should throw error when getting token fails', async () => {
      const mockError = new Error('Token unavailable');
      mockNotificationModule.getToken.mockRejectedValue(mockError);

      await expect(getNotificationToken()).rejects.toThrow('Token unavailable');
    });
  });

  describe('displayNotification', () => {
    it('should display notification with correct options', async () => {
      const mockOptions = {
        title: 'Test Title',
        body: 'Test Body',
        data: { key: 'value' },
      };
      const mockResult = {
        notificationId: '123',
        success: true,
      };
      mockNotificationModule.displayNotification.mockResolvedValue(mockResult);

      const result = await displayNotification(mockOptions);

      expect(mockNotificationModule.displayNotification).toHaveBeenCalledWith(mockOptions);
      expect(result).toEqual(mockResult);
    });

    it('should display notification with actions', async () => {
      const mockOptions = {
        title: 'Test Title',
        body: 'Test Body',
        actions: [
          { id: 'action1', title: 'Action 1' },
          { id: 'action2', title: 'Action 2' },
        ],
      };
      const mockResult = {
        notificationId: '456',
        success: true,
      };
      mockNotificationModule.displayNotification.mockResolvedValue(mockResult);

      const result = await displayNotification(mockOptions);

      expect(mockNotificationModule.displayNotification).toHaveBeenCalledWith(mockOptions);
      expect(result.success).toBe(true);
    });

    it('should throw error when display fails', async () => {
      const mockError = new Error('Display failed');
      mockNotificationModule.displayNotification.mockRejectedValue(mockError);

      await expect(displayNotification({ title: 'Test', body: 'Body' }))
        .rejects.toThrow('Display failed');
    });
  });

  describe('cancelNotification', () => {
    it('should cancel notification by id', async () => {
      mockNotificationModule.cancelNotification.mockResolvedValue(true);

      const result = await cancelNotification('123');

      expect(mockNotificationModule.cancelNotification).toHaveBeenCalledWith('123');
      expect(result).toBe(true);
    });

    it('should cancel notification with numeric id', async () => {
      mockNotificationModule.cancelNotification.mockResolvedValue(true);

      const result = await cancelNotification(123);

      expect(mockNotificationModule.cancelNotification).toHaveBeenCalledWith(123);
      expect(result).toBe(true);
    });
  });

  describe('cancelAllNotifications', () => {
    it('should cancel all notifications', async () => {
      mockNotificationModule.cancelAllNotifications.mockResolvedValue(true);

      const result = await cancelAllNotifications();

      expect(mockNotificationModule.cancelAllNotifications).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('Notification Events', () => {
    it('should add notification received listener', () => {
      const callback = jest.fn();
      const subscription = addNotificationListener(
        NOTIFICATION_EVENTS.NOTIFICATION_RECEIVED,
        callback
      );

      expect(subscription).not.toBeNull();
    });

    it('should add notification opened listener', () => {
      const callback = jest.fn();
      const subscription = addNotificationListener(
        NOTIFICATION_EVENTS.NOTIFICATION_OPENED,
        callback
      );

      expect(subscription).not.toBeNull();
    });

    it('should remove notification listener', () => {
      const mockRemove = jest.fn();
      const mockSubscription = { remove: mockRemove };

      removeNotificationListener(mockSubscription as any);

      expect(mockRemove).toHaveBeenCalled();
    });

    it('should handle null subscription when removing listener', () => {
      expect(() => removeNotificationListener(null)).not.toThrow();
    });

    it('should remove all notification listeners', () => {
      expect(() => removeAllNotificationListeners()).not.toThrow();
    });
  });

  describe('NOTIFICATION_EVENTS constants', () => {
    it('should have correct event names', () => {
      expect(NOTIFICATION_EVENTS.NOTIFICATION_RECEIVED).toBe('onNotificationReceived');
      expect(NOTIFICATION_EVENTS.NOTIFICATION_OPENED).toBe('onNotificationOpened');
      expect(NOTIFICATION_EVENTS.TOKEN_RECEIVED).toBe('onTokenReceived');
    });
  });
});
