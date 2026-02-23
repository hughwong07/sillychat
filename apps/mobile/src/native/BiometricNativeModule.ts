import { NativeModules, Platform } from 'react-native';

const { BiometricModule } = NativeModules;

// Biometric types
export enum BiometricType {
  NONE = 0,
  FINGERPRINT = 1,
  FACE = 2,
  IRIS = 4,
}

// Error codes
export const BiometricErrorCodes = {
  USER_CANCELED: 'USER_CANCELED',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  NOT_ENROLLED: 'NOT_ENROLLED',
  LOCKOUT: 'LOCKOUT',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  INVALID_ACTIVITY: 'INVALID_ACTIVITY',
} as const;

// Types
export type BiometryType = 'FaceID' | 'TouchID' | 'Fingerprint' | 'Iris' | 'Biometric' | 'None';

export interface BiometricAvailability {
  available: boolean;
  biometryType: BiometryType;
  strongBiometric: boolean;
  weakBiometric: boolean;
  deviceCredential: boolean;
  error?: string;
}

export interface BiometricPromptOptions {
  title?: string;
  subtitle?: string;
  description?: string;
  cancelButtonText?: string;
  fallbackToDeviceCredentials?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  message?: string;
  authenticationType?: 'biometric' | 'deviceCredential' | 'FaceID' | 'TouchID' | 'Fingerprint' | 'Iris' | 'unknown';
  error?: string;
  errorMessage?: string;
  errorCode?: number;
}

// Type for the native module interface
interface BiometricNativeModuleInterface {
  BIOMETRIC_TYPE_FINGERPRINT: number;
  BIOMETRIC_TYPE_FACE: number;
  BIOMETRIC_TYPE_IRIS: number;
  ERROR_CODE_CANCELED: string;
  ERROR_CODE_NOT_AVAILABLE: string;
  ERROR_CODE_NOT_ENROLLED: string;
  ERROR_CODE_LOCKOUT: string;
  ERROR_CODE_AUTHENTICATION_FAILED: string;

  isSensorAvailable(): Promise<BiometricAvailability>;
  getBiometryType(): Promise<BiometryType>;
  simplePrompt(options: BiometricPromptOptions): Promise<BiometricAuthResult>;
  authenticateWithDeviceCredential(options: BiometricPromptOptions): Promise<BiometricAuthResult>;
}

// Check if native module is available
const isNativeModuleAvailable = (): boolean => {
  if (!BiometricModule) {
    console.warn('BiometricModule is not available. Using mock implementation.');
    return false;
  }
  return true;
};

// Mock implementation for development/testing
const mockImplementation: BiometricNativeModuleInterface = {
  BIOMETRIC_TYPE_FINGERPRINT: 1,
  BIOMETRIC_TYPE_FACE: 2,
  BIOMETRIC_TYPE_IRIS: 4,
  ERROR_CODE_CANCELED: 'USER_CANCELED',
  ERROR_CODE_NOT_AVAILABLE: 'NOT_AVAILABLE',
  ERROR_CODE_NOT_ENROLLED: 'NOT_ENROLLED',
  ERROR_CODE_LOCKOUT: 'LOCKOUT',
  ERROR_CODE_AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',

  isSensorAvailable: async () => ({
    available: true,
    biometryType: Platform.OS === 'ios' ? 'FaceID' : 'Fingerprint',
    strongBiometric: true,
    weakBiometric: false,
    deviceCredential: true,
  }),

  getBiometryType: async () => (Platform.OS === 'ios' ? 'FaceID' : 'Fingerprint'),

  simplePrompt: async (options: BiometricPromptOptions) => {
    // Simulate async behavior
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      message: 'Authentication successful (mock)',
      authenticationType: Platform.OS === 'ios' ? 'FaceID' : 'Fingerprint',
    };
  },

  authenticateWithDeviceCredential: async (options: BiometricPromptOptions) => {
    // Simulate async behavior
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      message: 'Authentication successful (mock)',
      authenticationType: 'deviceCredential',
    };
  },
};

// Get native module or mock
const getNativeModule = (): BiometricNativeModuleInterface => {
  return isNativeModuleAvailable()
    ? (BiometricModule as BiometricNativeModuleInterface)
    : mockImplementation;
};

/**
 * Biometric error class
 */
export class BiometricError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BiometricError';
  }
}

/**
 * Check if biometric sensor is available and get details
 * @returns Promise resolving to availability details
 */
export const isSensorAvailable = async (): Promise<BiometricAvailability> => {
  try {
    return await getNativeModule().isSensorAvailable();
  } catch (error) {
    const err = error as Error;
    throw new BiometricError(
      `Failed to check sensor availability: ${err.message}`,
      'SENSOR_CHECK_ERROR',
      err
    );
  }
};

/**
 * Get the type of biometric sensor available
 * @returns Promise resolving to the biometric type
 */
export const getBiometryType = async (): Promise<BiometryType> => {
  try {
    return await getNativeModule().getBiometryType();
  } catch (error) {
    const err = error as Error;
    throw new BiometricError(
      `Failed to get biometry type: ${err.message}`,
      'BIOMETRY_TYPE_ERROR',
      err
    );
  }
};

/**
 * Show a simple biometric authentication prompt
 * @param options Prompt configuration options
 * @returns Promise resolving to authentication result
 */
export const simplePrompt = async (
  options: BiometricPromptOptions = {}
): Promise<BiometricAuthResult> => {
  try {
    const result = await getNativeModule().simplePrompt({
      title: 'Authentication Required',
      subtitle: 'Authenticate to continue',
      cancelButtonText: 'Cancel',
      fallbackToDeviceCredentials: false,
      ...options,
    });

    return result;
  } catch (error) {
    const err = error as Error;
    throw new BiometricError(
      `Biometric prompt failed: ${err.message}`,
      'PROMPT_ERROR',
      err
    );
  }
};

/**
 * Authenticate using device credentials (PIN/Pattern/Password)
 * @param options Prompt configuration options
 * @returns Promise resolving to authentication result
 */
export const authenticateWithDeviceCredential = async (
  options: BiometricPromptOptions = {}
): Promise<BiometricAuthResult> => {
  try {
    const result = await getNativeModule().authenticateWithDeviceCredential({
      title: 'Authentication Required',
      subtitle: 'Authenticate to continue',
      cancelButtonText: 'Cancel',
      ...options,
    });

    return result;
  } catch (error) {
    const err = error as Error;
    throw new BiometricError(
      `Device credential authentication failed: ${err.message}`,
      'DEVICE_CREDENTIAL_ERROR',
      err
    );
  }
};

/**
 * Check if biometric authentication is available
 * @returns Boolean indicating if biometric is available
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  const availability = await isSensorAvailable();
  return availability.available;
};

/**
 * Authenticate with biometric, falling back to device credentials if specified
 * @param options Prompt configuration options
 * @returns Promise resolving to authentication result
 */
export const authenticate = async (
  options: BiometricPromptOptions = {}
): Promise<BiometricAuthResult> => {
  const availability = await isSensorAvailable();

  if (!availability.available) {
    // If biometric is not available but device credential is, and fallback is enabled
    if (options.fallbackToDeviceCredentials && availability.deviceCredential) {
      return authenticateWithDeviceCredential(options);
    }

    return {
      success: false,
      error: BiometricErrorCodes.NOT_AVAILABLE,
      errorMessage: availability.error || 'Biometric authentication not available',
    };
  }

  return simplePrompt(options);
};

/**
 * Check if the authentication result indicates success
 * @param result The authentication result
 * @returns Boolean indicating if authentication was successful
 */
export const isAuthenticated = (result: BiometricAuthResult): boolean => {
  return result.success === true;
};

/**
 * Check if the authentication was canceled by the user
 * @param result The authentication result
 * @returns Boolean indicating if authentication was canceled
 */
export const isCanceled = (result: BiometricAuthResult): boolean => {
  return result.error === BiometricErrorCodes.USER_CANCELED;
};

/**
 * Check if the biometric sensor is locked out
 * @param result The authentication result
 * @returns Boolean indicating if the sensor is locked out
 */
export const isLockedOut = (result: BiometricAuthResult): boolean => {
  return result.error === BiometricErrorCodes.LOCKOUT;
};

// Constants export
export const Constants = {
  BIOMETRIC_TYPE_FINGERPRINT: BiometricType.FINGERPRINT,
  BIOMETRIC_TYPE_FACE: BiometricType.FACE,
  BIOMETRIC_TYPE_IRIS: BiometricType.IRIS,
  ...BiometricErrorCodes,
};

// Default export with all methods
export default {
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
  Constants,
};
