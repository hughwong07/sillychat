import {
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
} from '../../native/StorageNativeModule';

// Mock React Native NativeModules
jest.mock('react-native', () => ({
  NativeModules: {
    StorageModule: {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      getAllKeys: jest.fn(),
      setItemWithBiometric: jest.fn(),
      getItemWithBiometric: jest.fn(),
    },
  },
  Platform: {
    OS: 'ios',
  },
}));

const { NativeModules } = require('react-native');
const mockStorageModule = NativeModules.StorageModule;

describe('StorageNativeModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setItem', () => {
    it('should store value with encryption by default', async () => {
      mockStorageModule.setItem.mockResolvedValue(null);

      await setItem('testKey', 'testValue');

      expect(mockStorageModule.setItem).toHaveBeenCalledWith('testKey', 'testValue', true);
    });

    it('should store value without encryption when specified', async () => {
      mockStorageModule.setItem.mockResolvedValue(null);

      await setItem('testKey', 'testValue', { useEncryption: false });

      expect(mockStorageModule.setItem).toHaveBeenCalledWith('testKey', 'testValue', false);
    });

    it('should throw StorageError when setItem fails', async () => {
      const mockError = new Error('Storage full');
      mockStorageModule.setItem.mockRejectedValue(mockError);

      await expect(setItem('testKey', 'testValue')).rejects.toThrow(StorageError);
    });
  });

  describe('getItem', () => {
    it('should retrieve value with encryption by default', async () => {
      mockStorageModule.getItem.mockResolvedValue('storedValue');

      const result = await getItem('testKey');

      expect(mockStorageModule.getItem).toHaveBeenCalledWith('testKey', true);
      expect(result).toBe('storedValue');
    });

    it('should return null when key not found', async () => {
      mockStorageModule.getItem.mockResolvedValue(null);

      const result = await getItem('nonExistentKey');

      expect(result).toBeNull();
    });

    it('should throw StorageError when getItem fails', async () => {
      const mockError = new Error('Decryption failed');
      mockStorageModule.getItem.mockRejectedValue(mockError);

      await expect(getItem('testKey')).rejects.toThrow(StorageError);
    });
  });

  describe('removeItem', () => {
    it('should remove item by key', async () => {
      mockStorageModule.removeItem.mockResolvedValue(true);

      const result = await removeItem('testKey');

      expect(mockStorageModule.removeItem).toHaveBeenCalledWith('testKey');
      expect(result).toBe(true);
    });

    it('should return false when key not found', async () => {
      mockStorageModule.removeItem.mockResolvedValue(false);

      const result = await removeItem('nonExistentKey');

      expect(result).toBe(false);
    });
  });

  describe('clearStorage', () => {
    it('should clear all storage', async () => {
      mockStorageModule.clear.mockResolvedValue(true);

      const result = await clearStorage();

      expect(mockStorageModule.clear).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('getAllKeys', () => {
    it('should return all storage keys', async () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      mockStorageModule.getAllKeys.mockResolvedValue(mockKeys);

      const result = await getAllKeys();

      expect(mockStorageModule.getAllKeys).toHaveBeenCalled();
      expect(result).toEqual(mockKeys);
    });

    it('should return empty array when no keys exist', async () => {
      mockStorageModule.getAllKeys.mockResolvedValue([]);

      const result = await getAllKeys();

      expect(result).toEqual([]);
    });
  });

  describe('setItemWithBiometric', () => {
    it('should store value with biometric authentication', async () => {
      mockStorageModule.setItemWithBiometric.mockResolvedValue(null);

      await setItemWithBiometric('secureKey', 'secureValue', {
        title: 'Authenticate',
        subtitle: 'Store secure data',
      });

      expect(mockStorageModule.setItemWithBiometric).toHaveBeenCalledWith(
        'secureKey',
        'secureValue',
        'Authenticate',
        'Store secure data'
      );
    });

    it('should throw StorageError when biometric set fails', async () => {
      const mockError = new Error('Biometric authentication failed');
      mockStorageModule.setItemWithBiometric.mockRejectedValue(mockError);

      await expect(
        setItemWithBiometric('key', 'value', { title: 'Auth', subtitle: 'Test' })
      ).rejects.toThrow(StorageError);
    });
  });

  describe('getItemWithBiometric', () => {
    it('should retrieve value with biometric authentication', async () => {
      mockStorageModule.getItemWithBiometric.mockResolvedValue('biometricValue');

      const result = await getItemWithBiometric('secureKey', {
        title: 'Authenticate',
        subtitle: 'Access secure data',
      });

      expect(mockStorageModule.getItemWithBiometric).toHaveBeenCalledWith(
        'secureKey',
        'Authenticate',
        'Access secure data'
      );
      expect(result).toBe('biometricValue');
    });

    it('should return null when biometric item not found', async () => {
      mockStorageModule.getItemWithBiometric.mockResolvedValue(null);

      const result = await getItemWithBiometric('nonExistentKey', {
        title: 'Auth',
        subtitle: 'Test',
      });

      expect(result).toBeNull();
    });
  });

  describe('setObject', () => {
    it('should store object as JSON string', async () => {
      mockStorageModule.setItem.mockResolvedValue(null);
      const testObject = { name: 'Test', value: 123 };

      await setObject('objectKey', testObject);

      expect(mockStorageModule.setItem).toHaveBeenCalledWith(
        'objectKey',
        JSON.stringify(testObject),
        true
      );
    });
  });

  describe('getObject', () => {
    it('should retrieve and parse JSON object', async () => {
      const testObject = { name: 'Test', value: 123 };
      mockStorageModule.getItem.mockResolvedValue(JSON.stringify(testObject));

      const result = await getObject('objectKey');

      expect(result).toEqual(testObject);
    });

    it('should return null when object key not found', async () => {
      mockStorageModule.getItem.mockResolvedValue(null);

      const result = await getObject('nonExistentKey');

      expect(result).toBeNull();
    });

    it('should throw StorageError when JSON parsing fails', async () => {
      mockStorageModule.getItem.mockResolvedValue('invalid json');

      await expect(getObject('objectKey')).rejects.toThrow(StorageError);
    });
  });

  describe('hasItem', () => {
    it('should return true when key exists', async () => {
      mockStorageModule.getItem.mockResolvedValue('value');

      const result = await hasItem('existingKey');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockStorageModule.getItem.mockResolvedValue(null);

      const result = await hasItem('nonExistentKey');

      expect(result).toBe(false);
    });
  });

  describe('mergeObject', () => {
    it('should merge with existing object', async () => {
      const existingObject = { name: 'Test', value: 123 };
      mockStorageModule.getItem.mockResolvedValue(JSON.stringify(existingObject));
      mockStorageModule.setItem.mockResolvedValue(null);

      await mergeObject('objectKey', { value: 456, extra: 'data' });

      expect(mockStorageModule.setItem).toHaveBeenCalledWith(
        'objectKey',
        JSON.stringify({ name: 'Test', value: 456, extra: 'data' }),
        true
      );
    });

    it('should create new object when key does not exist', async () => {
      mockStorageModule.getItem.mockResolvedValue(null);
      mockStorageModule.setItem.mockResolvedValue(null);

      await mergeObject('newKey', { name: 'New' });

      expect(mockStorageModule.setItem).toHaveBeenCalledWith(
        'newKey',
        JSON.stringify({ name: 'New' }),
        true
      );
    });
  });

  describe('StorageError', () => {
    it('should create error with code and message', () => {
      const error = new StorageError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('StorageError');
    });

    it('should include original error', () => {
      const originalError = new Error('Original');
      const error = new StorageError('Test error', 'TEST_CODE', originalError);

      expect(error.originalError).toBe(originalError);
    });
  });
});
