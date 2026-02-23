import { NativeModules, Platform } from 'react-native';

const { StorageModule } = NativeModules;

// Storage key types
export type StorageKey = string;

// Storage options
export interface StorageOptions {
  useEncryption?: boolean;
}

// Biometric prompt options
export interface BiometricPromptOptions {
  title: string;
  subtitle: string;
}

// Type for the native module interface
interface StorageNativeModuleInterface {
  setItem(key: string, value: string, useEncryption: boolean): Promise<null>;
  getItem(key: string, useEncryption: boolean): Promise<string | null>;
  removeItem(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
  getAllKeys(): Promise<string[]>;
  setItemWithBiometric(
    key: string,
    value: string,
    promptTitle: string,
    promptSubtitle: string
  ): Promise<null>;
  getItemWithBiometric(
    key: string,
    promptTitle: string,
    promptSubtitle: string
  ): Promise<string | null>;
}

// Check if native module is available
const isNativeModuleAvailable = (): boolean => {
  if (!StorageModule) {
    console.warn('StorageModule is not available. Using mock implementation.');
    return false;
  }
  return true;
};

// Memory storage for mock implementation with size limit
const mockStorage: Map<string, string> = new Map();
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for mock storage

/**
 * Calculate total storage size
 */
const getStorageSize = (): number => {
  let size = 0;
  mockStorage.forEach((value) => {
    size += value.length * 2; // UTF-16 encoding
  });
  return size;
};

// Mock implementation for development/testing
const mockImplementation: StorageNativeModuleInterface = {
  setItem: async (key: string, value: string): Promise<null> => {
    // Check storage size limit
    const newValueSize = value.length * 2;
    const currentSize = getStorageSize();
    const existingValueSize = (mockStorage.get(key)?.length || 0) * 2;

    if (currentSize - existingValueSize + newValueSize > MAX_STORAGE_SIZE) {
      throw new Error('Storage quota exceeded');
    }

    mockStorage.set(key, value);
    return null;
  },
  getItem: async (key: string): Promise<string | null> => {
    return mockStorage.get(key) || null;
  },
  removeItem: async (key: string): Promise<boolean> => {
    return mockStorage.delete(key);
  },
  clear: async (): Promise<boolean> => {
    mockStorage.clear();
    return true;
  },
  getAllKeys: async (): Promise<string[]> => {
    return Array.from(mockStorage.keys());
  },
  setItemWithBiometric: async (): Promise<null> => {
    console.warn('Biometric storage not available in mock mode');
    return null;
  },
  getItemWithBiometric: async (): Promise<string | null> => {
    console.warn('Biometric storage not available in mock mode');
    return null;
  },
};

// Get native module or mock
const getNativeModule = (): StorageNativeModuleInterface => {
  return isNativeModuleAvailable()
    ? (StorageModule as StorageNativeModuleInterface)
    : mockImplementation;
};

/**
 * Storage error class
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Store a value in secure storage
 * @param key The storage key
 * @param value The value to store
 * @param options Storage options including encryption flag
 */
export const setItem = async (
  key: StorageKey,
  value: string,
  options: StorageOptions = {}
): Promise<void> => {
  try {
    const useEncryption = options.useEncryption ?? true;
    await getNativeModule().setItem(key, value, useEncryption);
  } catch (error) {
    const err = error as Error;
    throw new StorageError(
      `Failed to store item with key "${key}": ${err.message}`,
      'SET_ITEM_ERROR',
      err
    );
  }
};

/**
 * Retrieve a value from secure storage
 * @param key The storage key
 * @param options Storage options including encryption flag
 * @returns The stored value or null if not found
 */
export const getItem = async (
  key: StorageKey,
  options: StorageOptions = {}
): Promise<string | null> => {
  try {
    const useEncryption = options.useEncryption ?? true;
    const result = await getNativeModule().getItem(key, useEncryption);
    return result;
  } catch (error) {
    const err = error as Error;
    throw new StorageError(
      `Failed to retrieve item with key "${key}": ${err.message}`,
      'GET_ITEM_ERROR',
      err
    );
  }
};

/**
 * Remove a value from secure storage
 * @param key The storage key to remove
 * @returns Boolean indicating success
 */
export const removeItem = async (key: StorageKey): Promise<boolean> => {
  try {
    return await getNativeModule().removeItem(key);
  } catch (error) {
    const err = error as Error;
    throw new StorageError(
      `Failed to remove item with key "${key}": ${err.message}`,
      'REMOVE_ITEM_ERROR',
      err
    );
  }
};

/**
 * Clear all values from secure storage
 * @returns Boolean indicating success
 */
export const clearStorage = async (): Promise<boolean> => {
  try {
    return await getNativeModule().clear();
  } catch (error) {
    const err = error as Error;
    throw new StorageError(
      `Failed to clear storage: ${err.message}`,
      'CLEAR_ERROR',
      err
    );
  }
};

/**
 * Get all keys from secure storage
 * @returns Array of storage keys
 */
export const getAllKeys = async (): Promise<string[]> => {
  try {
    return await getNativeModule().getAllKeys();
  } catch (error) {
    const err = error as Error;
    throw new StorageError(
      `Failed to get all keys: ${err.message}`,
      'GET_ALL_KEYS_ERROR',
      err
    );
  }
};

/**
 * Store a value with biometric authentication required
 * @param key The storage key
 * @param value The value to store
 * @param promptOptions Biometric prompt configuration
 */
export const setItemWithBiometric = async (
  key: StorageKey,
  value: string,
  promptOptions: BiometricPromptOptions
): Promise<void> => {
  try {
    await getNativeModule().setItemWithBiometric(
      key,
      value,
      promptOptions.title,
      promptOptions.subtitle
    );
  } catch (error) {
    const err = error as Error;
    throw new StorageError(
      `Failed to store item with biometric for key "${key}": ${err.message}`,
      'BIOMETRIC_SET_ERROR',
      err
    );
  }
};

/**
 * Retrieve a value with biometric authentication required
 * @param key The storage key
 * @param promptOptions Biometric prompt configuration
 * @returns The stored value or null if not found
 */
export const getItemWithBiometric = async (
  key: StorageKey,
  promptOptions: BiometricPromptOptions
): Promise<string | null> => {
  try {
    return await getNativeModule().getItemWithBiometric(
      key,
      promptOptions.title,
      promptOptions.subtitle
    );
  } catch (error) {
    const err = error as Error;
    throw new StorageError(
      `Failed to retrieve item with biometric for key "${key}": ${err.message}`,
      'BIOMETRIC_GET_ERROR',
      err
    );
  }
};

/**
 * Store an object as JSON
 * @param key The storage key
 * @param value The object to store
 * @param options Storage options
 */
export const setObject = async <T extends object>(
  key: StorageKey,
  value: T,
  options?: StorageOptions
): Promise<void> => {
  const jsonString = JSON.stringify(value);
  await setItem(key, jsonString, options);
};

/**
 * Retrieve an object from JSON storage
 * @param key The storage key
 * @param options Storage options
 * @returns The parsed object or null if not found
 */
export const getObject = async <T extends object>(
  key: StorageKey,
  options?: StorageOptions
): Promise<T | null> => {
  const jsonString = await getItem(key, options);
  if (jsonString === null) {
    return null;
  }
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new StorageError(
      `Failed to parse JSON for key "${key}"`,
      'JSON_PARSE_ERROR',
      error as Error
    );
  }
};

/**
 * Check if a key exists in storage
 * @param key The storage key
 * @returns Boolean indicating if key exists
 */
export const hasItem = async (key: StorageKey): Promise<boolean> => {
  const value = await getItem(key, { useEncryption: false });
  return value !== null;
};

/**
 * Merge an object with existing stored object
 * @param key The storage key
 * @param value Partial object to merge
 * @param options Storage options
 */
export const mergeObject = async <T extends object>(
  key: StorageKey,
  value: Partial<T>,
  options?: StorageOptions
): Promise<void> => {
  const existing = await getObject<T>(key, options);
  const merged = existing ? { ...existing, ...value } : value;
  await setObject(key, merged as T, options);
};

// Default export with all methods
export default {
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
};
