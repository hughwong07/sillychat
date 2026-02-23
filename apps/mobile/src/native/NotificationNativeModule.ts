import { NativeModules, NativeEventEmitter, Platform, EmitterSubscription } from 'react-native';

const { NotificationModule } = NativeModules;

// Event names
export const NOTIFICATION_EVENTS = {
  NOTIFICATION_RECEIVED: 'onNotificationReceived',
  NOTIFICATION_OPENED: 'onNotificationOpened',
  TOKEN_RECEIVED: 'onTokenReceived',
} as const;

// Types
export interface NotificationPermissions {
  alert: boolean;
  badge: boolean;
  sound: boolean;
}

export interface NotificationAction {
  id: string;
  title: string;
}

export interface NotificationData {
  [key: string]: string | number | boolean | object;
}

export interface NotificationOptions {
  title: string;
  body: string;
  data?: NotificationData;
  actions?: NotificationAction[];
}

export interface NotificationResult {
  notificationId: string | number;
  success: boolean;
}

export interface NotificationEvent {
  title?: string;
  body?: string;
  data: NotificationData;
  foreground?: boolean;
}

export interface NotificationOpenEvent extends NotificationEvent {
  notificationId: string;
  actionId?: string;
}

// Type for the native module interface
interface NotificationNativeModuleInterface {
  requestPermissions(): Promise<NotificationPermissions>;
  checkPermissions(): Promise<NotificationPermissions>;
  getToken(): Promise<string>;
  displayNotification(options: NotificationOptions): Promise<NotificationResult>;
  cancelNotification(notificationId: string | number): Promise<boolean>;
  cancelAllNotifications(): Promise<boolean>;
}

// Check if native module is available
const isNativeModuleAvailable = (): boolean => {
  if (!NotificationModule) {
    console.warn('NotificationModule is not available. Using mock implementation.');
    return false;
  }
  return true;
};

// Event emitter - singleton pattern with cleanup
let eventEmitter: NativeEventEmitter | null = null;
let emitterRefCount = 0;

const getEventEmitter = (): NativeEventEmitter | null => {
  if (!isNativeModuleAvailable()) return null;
  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(NotificationModule);
  }
  emitterRefCount++;
  return eventEmitter;
};

/**
 * Release event emitter reference
 * When all references are released, the emitter is cleaned up
 */
const releaseEventEmitter = (): void => {
  emitterRefCount--;
  if (emitterRefCount <= 0 && eventEmitter) {
    eventEmitter.removeAllListeners();
    eventEmitter = null;
    emitterRefCount = 0;
  }
};

// Mock implementation for development/testing
const mockImplementation: NotificationNativeModuleInterface = {
  requestPermissions: async () => ({
    alert: true,
    badge: true,
    sound: true,
  }),
  checkPermissions: async () => ({
    alert: true,
    badge: true,
    sound: true,
  }),
  getToken: async () => `mock_token_${Platform.OS}_${Date.now()}`,
  displayNotification: async (options: NotificationOptions) => ({
    notificationId: Date.now(),
    success: true,
  }),
  cancelNotification: async () => true,
  cancelAllNotifications: async () => true,
};

// Get native module or mock
const getNativeModule = (): NotificationNativeModuleInterface => {
  return isNativeModuleAvailable()
    ? (NotificationModule as NotificationNativeModuleInterface)
    : mockImplementation;
};

/**
 * Request notification permissions from the user
 * @returns Promise resolving to permission status
 */
export const requestNotificationPermissions = async (): Promise<NotificationPermissions> => {
  try {
    return await getNativeModule().requestPermissions();
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    throw error;
  }
};

/**
 * Check current notification permissions
 * @returns Promise resolving to current permission status
 */
export const checkNotificationPermissions = async (): Promise<NotificationPermissions> => {
  try {
    return await getNativeModule().checkPermissions();
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    throw error;
  }
};

/**
 * Get the device notification token (FCM for Android, APNS for iOS)
 * @returns Promise resolving to the token string
 */
export const getNotificationToken = async (): Promise<string> => {
  try {
    return await getNativeModule().getToken();
  } catch (error) {
    console.error('Error getting notification token:', error);
    throw error;
  }
};

/**
 * Display a local notification
 * @param options Notification options including title, body, data, and actions
 * @returns Promise resolving to notification result with ID
 */
export const displayNotification = async (
  options: NotificationOptions
): Promise<NotificationResult> => {
  try {
    return await getNativeModule().displayNotification(options);
  } catch (error) {
    console.error('Error displaying notification:', error);
    throw error;
  }
};

/**
 * Cancel a specific notification by ID
 * @param notificationId The ID of the notification to cancel
 * @returns Promise resolving to boolean success status
 */
export const cancelNotification = async (notificationId: string | number): Promise<boolean> => {
  try {
    return await getNativeModule().cancelNotification(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
    throw error;
  }
};

/**
 * Cancel all pending and delivered notifications
 * @returns Promise resolving to boolean success status
 */
export const cancelAllNotifications = async (): Promise<boolean> => {
  try {
    return await getNativeModule().cancelAllNotifications();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    throw error;
  }
};

/**
 * Add a listener for notification events
 * @param eventName The event name to listen for
 * @param callback The callback function to invoke when event occurs
 * @returns EmitterSubscription or null if native module unavailable
 */
export const addNotificationListener = <T extends NotificationEvent | NotificationOpenEvent>(
  eventName: typeof NOTIFICATION_EVENTS[keyof typeof NOTIFICATION_EVENTS],
  callback: (event: T) => void
): EmitterSubscription | null => {
  const emitter = getEventEmitter();
  if (!emitter) {
    console.warn(`Cannot add listener for ${eventName}: Native module unavailable`);
    return null;
  }

  return emitter.addListener(eventName, callback);
};

/**
 * Remove a specific notification listener
 * @param subscription The subscription to remove
 */
export const removeNotificationListener = (subscription: EmitterSubscription | null): void => {
  if (subscription) {
    subscription.remove();
    releaseEventEmitter();
  }
};

/**
 * Remove all notification listeners
 * Call this when component unmounts or app closes
 */
export const removeAllNotificationListeners = (): void => {
  if (eventEmitter) {
    eventEmitter.removeAllListeners(NOTIFICATION_EVENTS.NOTIFICATION_RECEIVED);
    eventEmitter.removeAllListeners(NOTIFICATION_EVENTS.NOTIFICATION_OPENED);
    eventEmitter.removeAllListeners(NOTIFICATION_EVENTS.TOKEN_RECEIVED);
  }
  // Reset ref count and clean up emitter
  emitterRefCount = 0;
  eventEmitter = null;
};

// Default export with all methods
export default {
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
};
