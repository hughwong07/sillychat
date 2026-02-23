/**
 * SillyChat Native Modules
 *
 * This module exports all native module interfaces for the SillyChat React Native application.
 *
 * @module native
 */

// Notification Module
export {
  default as NotificationModule,
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
  // Types
  type NotificationPermissions,
  type NotificationAction,
  type NotificationData,
  type NotificationOptions,
  type NotificationResult,
  type NotificationEvent,
  type NotificationOpenEvent,
} from './NotificationNativeModule';

// Storage Module
export {
  default as StorageModule,
  setItem,
  getItem,
  removeItem,
  clearStorage,
  getAllKeys,
  setItemWithBiometric,
  getItemWithBiometric,
  setObject,
  getObject,
  hasItem,
  mergeObject,
  StorageError,
  // Types
  type StorageKey,
  type StorageOptions,
  type BiometricPromptOptions as StorageBiometricPromptOptions,
} from './StorageNativeModule';

// Biometric Module
export {
  default as BiometricModule,
  isSensorAvailable,
  getBiometryType,
  simplePrompt,
  authenticateWithDeviceCredential,
  authenticate,
  isBiometricAvailable,
  isAuthenticated,
  isCanceled,
  isLockedOut,
  BiometricError,
  BiometricErrorCodes,
  BiometricType,
  Constants as BiometricConstants,
  // Types
  type BiometryType,
  type BiometricAvailability,
  type BiometricPromptOptions,
  type BiometricAuthResult,
} from './BiometricNativeModule';
