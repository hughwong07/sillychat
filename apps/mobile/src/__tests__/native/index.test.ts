/**
 * Integration tests for native module exports
 */

import * as NativeModules from '../../native';

describe('Native Modules Index', () => {
  it('should export NotificationModule', () => {
    expect(NativeModules.NotificationModule).toBeDefined();
    expect(typeof NativeModules.requestNotificationPermissions).toBe('function');
    expect(typeof NativeModules.checkNotificationPermissions).toBe('function');
    expect(typeof NativeModules.getNotificationToken).toBe('function');
    expect(typeof NativeModules.displayNotification).toBe('function');
    expect(typeof NativeModules.cancelNotification).toBe('function');
    expect(typeof NativeModules.cancelAllNotifications).toBe('function');
    expect(typeof NativeModules.addNotificationListener).toBe('function');
    expect(typeof NativeModules.removeNotificationListener).toBe('function');
    expect(typeof NativeModules.removeAllNotificationListeners).toBe('function');
    expect(NativeModules.NOTIFICATION_EVENTS).toBeDefined();
  });

  it('should export StorageModule', () => {
    expect(NativeModules.StorageModule).toBeDefined();
    expect(typeof NativeModules.setItem).toBe('function');
    expect(typeof NativeModules.getItem).toBe('function');
    expect(typeof NativeModules.removeItem).toBe('function');
    expect(typeof NativeModules.clearStorage).toBe('function');
    expect(typeof NativeModules.getAllKeys).toBe('function');
    expect(typeof NativeModules.setItemWithBiometric).toBe('function');
    expect(typeof NativeModules.getItemWithBiometric).toBe('function');
    expect(typeof NativeModules.setObject).toBe('function');
    expect(typeof NativeModules.getObject).toBe('function');
    expect(typeof NativeModules.hasItem).toBe('function');
    expect(typeof NativeModules.mergeObject).toBe('function');
    expect(NativeModules.StorageError).toBeDefined();
  });

  it('should export BiometricModule', () => {
    expect(NativeModules.BiometricModule).toBeDefined();
    expect(typeof NativeModules.isSensorAvailable).toBe('function');
    expect(typeof NativeModules.getBiometryType).toBe('function');
    expect(typeof NativeModules.simplePrompt).toBe('function');
    expect(typeof NativeModules.authenticateWithDeviceCredential).toBe('function');
    expect(typeof NativeModules.authenticate).toBe('function');
    expect(typeof NativeModules.isBiometricAvailable).toBe('function');
    expect(typeof NativeModules.isAuthenticated).toBe('function');
    expect(typeof NativeModules.isCanceled).toBe('function');
    expect(typeof NativeModules.isLockedOut).toBe('function');
    expect(NativeModules.BiometricError).toBeDefined();
    expect(NativeModules.BiometricErrorCodes).toBeDefined();
    expect(NativeModules.BiometricType).toBeDefined();
    expect(NativeModules.BiometricConstants).toBeDefined();
  });

  it('should export all types', () => {
    // Type exports are compile-time only, but we can verify the exports exist
    expect(NativeModules.NotificationModule).toBeDefined();
    expect(NativeModules.StorageModule).toBeDefined();
    expect(NativeModules.BiometricModule).toBeDefined();
  });
});
