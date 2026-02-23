import {
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
} from '../../native/BiometricNativeModule';

// Mock React Native NativeModules
jest.mock('react-native', () => ({
  NativeModules: {
    BiometricModule: {
      isSensorAvailable: jest.fn(),
      getBiometryType: jest.fn(),
      simplePrompt: jest.fn(),
      authenticateWithDeviceCredential: jest.fn(),
      BIOMETRIC_TYPE_FINGERPRINT: 1,
      BIOMETRIC_TYPE_FACE: 2,
      BIOMETRIC_TYPE_IRIS: 4,
      ERROR_CODE_CANCELED: 'USER_CANCELED',
      ERROR_CODE_NOT_AVAILABLE: 'NOT_AVAILABLE',
      ERROR_CODE_NOT_ENROLLED: 'NOT_ENROLLED',
      ERROR_CODE_LOCKOUT: 'LOCKOUT',
      ERROR_CODE_AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    },
  },
  Platform: {
    OS: 'ios',
  },
}));

const { NativeModules } = require('react-native');
const mockBiometricModule = NativeModules.BiometricModule;

describe('BiometricNativeModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isSensorAvailable', () => {
    it('should return availability info when sensor is available', async () => {
      const mockResult = {
        available: true,
        biometryType: 'FaceID',
        strongBiometric: true,
        weakBiometric: false,
        deviceCredential: true,
      };
      mockBiometricModule.isSensorAvailable.mockResolvedValue(mockResult);

      const result = await isSensorAvailable();

      expect(mockBiometricModule.isSensorAvailable).toHaveBeenCalled();
      expect(result.available).toBe(true);
      expect(result.biometryType).toBe('FaceID');
    });

    it('should return error info when sensor is not available', async () => {
      const mockResult = {
        available: false,
        biometryType: 'None',
        strongBiometric: false,
        weakBiometric: false,
        deviceCredential: true,
        error: 'Biometric authentication not available',
      };
      mockBiometricModule.isSensorAvailable.mockResolvedValue(mockResult);

      const result = await isSensorAvailable();

      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw BiometricError when check fails', async () => {
      const mockError = new Error('Hardware error');
      mockBiometricModule.isSensorAvailable.mockRejectedValue(mockError);

      await expect(isSensorAvailable()).rejects.toThrow(BiometricError);
    });
  });

  describe('getBiometryType', () => {
    it('should return FaceID on iOS with Face ID', async () => {
      mockBiometricModule.getBiometryType.mockResolvedValue('FaceID');

      const result = await getBiometryType();

      expect(result).toBe('FaceID');
    });

    it('should return Fingerprint on Android', async () => {
      mockBiometricModule.getBiometryType.mockResolvedValue('Fingerprint');

      const result = await getBiometryType();

      expect(result).toBe('Fingerprint');
    });

    it('should return None when not available', async () => {
      mockBiometricModule.getBiometryType.mockResolvedValue('None');

      const result = await getBiometryType();

      expect(result).toBe('None');
    });
  });

  describe('simplePrompt', () => {
    it('should resolve with success result', async () => {
      const mockResult = {
        success: true,
        message: 'Authentication successful',
        authenticationType: 'FaceID',
      };
      mockBiometricModule.simplePrompt.mockResolvedValue(mockResult);

      const result = await simplePrompt({
        title: 'Authenticate',
        subtitle: 'Please authenticate to continue',
      });

      expect(mockBiometricModule.simplePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Authenticate',
          subtitle: 'Please authenticate to continue',
        })
      );
      expect(result.success).toBe(true);
    });

    it('should resolve with failure result when authentication fails', async () => {
      const mockResult = {
        success: false,
        error: BiometricErrorCodes.AUTHENTICATION_FAILED,
        errorMessage: 'Authentication failed',
        errorCode: -1,
      };
      mockBiometricModule.simplePrompt.mockResolvedValue(mockResult);

      const result = await simplePrompt({ title: 'Auth' });

      expect(result.success).toBe(false);
      expect(result.error).toBe(BiometricErrorCodes.AUTHENTICATION_FAILED);
    });

    it('should use default options when not provided', async () => {
      mockBiometricModule.simplePrompt.mockResolvedValue({ success: true });

      await simplePrompt();

      expect(mockBiometricModule.simplePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Authentication Required',
          subtitle: 'Authenticate to continue',
          cancelButtonText: 'Cancel',
          fallbackToDeviceCredentials: false,
        })
      );
    });
  });

  describe('authenticateWithDeviceCredential', () => {
    it('should authenticate with device credential', async () => {
      const mockResult = {
        success: true,
        message: 'Authentication successful',
        authenticationType: 'deviceCredential',
      };
      mockBiometricModule.authenticateWithDeviceCredential.mockResolvedValue(mockResult);

      const result = await authenticateWithDeviceCredential({
        title: 'Enter PIN',
        subtitle: 'Use your device PIN',
      });

      expect(mockBiometricModule.authenticateWithDeviceCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Enter PIN',
          subtitle: 'Use your device PIN',
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('authenticate', () => {
    it('should use biometric when available', async () => {
      mockBiometricModule.isSensorAvailable.mockResolvedValue({
        available: true,
        biometryType: 'FaceID',
        deviceCredential: true,
      });
      mockBiometricModule.simplePrompt.mockResolvedValue({
        success: true,
        authenticationType: 'FaceID',
      });

      const result = await authenticate({ title: 'Auth' });

      expect(mockBiometricModule.simplePrompt).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should fallback to device credential when biometric unavailable and fallback enabled', async () => {
      mockBiometricModule.isSensorAvailable.mockResolvedValue({
        available: false,
        biometryType: 'None',
        deviceCredential: true,
        error: 'Not available',
      });
      mockBiometricModule.authenticateWithDeviceCredential.mockResolvedValue({
        success: true,
        authenticationType: 'deviceCredential',
      });

      const result = await authenticate({
        title: 'Auth',
        fallbackToDeviceCredentials: true,
      });

      expect(mockBiometricModule.authenticateWithDeviceCredential).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return error when biometric unavailable and no fallback', async () => {
      mockBiometricModule.isSensorAvailable.mockResolvedValue({
        available: false,
        biometryType: 'None',
        deviceCredential: true,
        error: 'Biometric not available',
      });

      const result = await authenticate({ title: 'Auth' });

      expect(result.success).toBe(false);
      expect(result.error).toBe(BiometricErrorCodes.NOT_AVAILABLE);
    });
  });

  describe('isBiometricAvailable', () => {
    it('should return true when sensor is available', async () => {
      mockBiometricModule.isSensorAvailable.mockResolvedValue({
        available: true,
        biometryType: 'FaceID',
      });

      const result = await isBiometricAvailable();

      expect(result).toBe(true);
    });

    it('should return false when sensor is not available', async () => {
      mockBiometricModule.isSensorAvailable.mockResolvedValue({
        available: false,
        biometryType: 'None',
      });

      const result = await isBiometricAvailable();

      expect(result).toBe(false);
    });
  });

  describe('Result helper functions', () => {
    describe('isAuthenticated', () => {
      it('should return true for successful authentication', () => {
        const result = { success: true };
        expect(isAuthenticated(result)).toBe(true);
      });

      it('should return false for failed authentication', () => {
        const result = { success: false, error: 'FAILED' };
        expect(isAuthenticated(result)).toBe(false);
      });
    });

    describe('isCanceled', () => {
      it('should return true when user canceled', () => {
        const result = { success: false, error: BiometricErrorCodes.USER_CANCELED };
        expect(isCanceled(result)).toBe(true);
      });

      it('should return false for other errors', () => {
        const result = { success: false, error: BiometricErrorCodes.LOCKOUT };
        expect(isCanceled(result)).toBe(false);
      });
    });

    describe('isLockedOut', () => {
      it('should return true when locked out', () => {
        const result = { success: false, error: BiometricErrorCodes.LOCKOUT };
        expect(isLockedOut(result)).toBe(true);
      });

      it('should return false for other errors', () => {
        const result = { success: false, error: BiometricErrorCodes.USER_CANCELED };
        expect(isLockedOut(result)).toBe(false);
      });
    });
  });

  describe('BiometricError', () => {
    it('should create error with code and message', () => {
      const error = new BiometricError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('BiometricError');
    });

    it('should include original error', () => {
      const originalError = new Error('Original');
      const error = new BiometricError('Test error', 'TEST_CODE', originalError);

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('BiometricType enum', () => {
    it('should have correct values', () => {
      expect(BiometricType.NONE).toBe(0);
      expect(BiometricType.FINGERPRINT).toBe(1);
      expect(BiometricType.FACE).toBe(2);
      expect(BiometricType.IRIS).toBe(4);
    });
  });

  describe('BiometricErrorCodes', () => {
    it('should have correct error codes', () => {
      expect(BiometricErrorCodes.USER_CANCELED).toBe('USER_CANCELED');
      expect(BiometricErrorCodes.NOT_AVAILABLE).toBe('NOT_AVAILABLE');
      expect(BiometricErrorCodes.NOT_ENROLLED).toBe('NOT_ENROLLED');
      expect(BiometricErrorCodes.LOCKOUT).toBe('LOCKOUT');
      expect(BiometricErrorCodes.AUTHENTICATION_FAILED).toBe('AUTHENTICATION_FAILED');
    });
  });
});
