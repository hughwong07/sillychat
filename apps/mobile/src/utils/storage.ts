/**
 * 本地存储工具函数
 * 使用 AsyncStorage 进行数据持久化
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {StorageKey} from '../types';

/**
 * 存储数据
 * @param key 存储键
 * @param value 要存储的值
 */
export async function setItem<T>(key: StorageKey | string, value: T): Promise<void> {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error('存储数据失败:', error);
    throw error;
  }
}

/**
 * 获取数据
 * @param key 存储键
 * @returns 存储的值，如果不存在返回 null
 */
export async function getItem<T>(key: StorageKey | string): Promise<T | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('读取数据失败:', error);
    return null;
  }
}

/**
 * 删除数据
 * @param key 存储键
 */
export async function removeItem(key: StorageKey | string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('删除数据失败:', error);
    throw error;
  }
}

/**
 * 批量存储数据
 * @param items 键值对数组
 */
export async function multiSet(items: [string, any][]): Promise<void> {
  try {
    const pairs = items.map(([key, value]) => [key, JSON.stringify(value)] as [string, string]);
    await AsyncStorage.multiSet(pairs);
  } catch (error) {
    console.error('批量存储数据失败:', error);
    throw error;
  }
}

/**
 * 批量获取数据
 * @param keys 存储键数组
 * @returns 键值对数组
 */
export async function multiGet(keys: string[]): Promise<Record<string, any>> {
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const result: Record<string, any> = {};
    pairs.forEach(([key, value]) => {
      if (value != null) {
        result[key] = JSON.parse(value);
      }
    });
    return result;
  } catch (error) {
    console.error('批量读取数据失败:', error);
    return {};
  }
}

/**
 * 批量删除数据
 * @param keys 存储键数组
 */
export async function multiRemove(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('批量删除数据失败:', error);
    throw error;
  }
}

/**
 * 清空所有存储
 */
export async function clear(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('清空存储失败:', error);
    throw error;
  }
}

/**
 * 获取所有存储的键
 * @returns 键数组
 */
export async function getAllKeys(): Promise<string[]> {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('获取所有键失败:', error);
    return [];
  }
}

/**
 * 获取存储空间使用情况（近似值）
 * @returns 字节数
 */
export async function getStorageSize(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);
    let size = 0;
    items.forEach(([, value]) => {
      if (value) {
        size += value.length * 2; // UTF-16 每个字符 2 字节
      }
    });
    return size;
  } catch (error) {
    console.error('获取存储空间失败:', error);
    return 0;
  }
}

/**
 * 清理过期数据
 * @param maxAge 最大保存时间（毫秒）
 */
export async function cleanExpiredData(maxAge: number): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (parsed._timestamp && now - parsed._timestamp > maxAge) {
            keysToRemove.push(key);
          }
        } catch {
          // 不是 JSON 格式，跳过
        }
      }
    }

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`清理了 ${keysToRemove.length} 条过期数据`);
    }
  } catch (error) {
    console.error('清理过期数据失败:', error);
  }
}
