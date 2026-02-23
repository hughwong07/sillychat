/**
 * 本地存储封装
 * 基于 AsyncStorage 提供类型安全的存储服务
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKey } from '../types';

/**
 * 存储服务类
 * 封装 AsyncStorage 操作，提供类型安全和错误处理
 */
export class StorageService {
  /**
   * 存储数据
   * @param key 存储键名
   * @param value 存储值
   */
  static async setItem<T>(key: StorageKey | string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`存储数据失败 [${key}]:`, error);
      throw new Error(`存储数据失败: ${error}`);
    }
  }

  /**
   * 获取数据
   * @param key 存储键名
   * @returns 存储值，不存在时返回 null
   */
  static async getItem<T>(key: StorageKey | string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue === null) {
        return null;
      }
      return JSON.parse(jsonValue) as T;
    } catch (error) {
      console.error(`读取数据失败 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 删除数据
   * @param key 存储键名
   */
  static async removeItem(key: StorageKey | string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`删除数据失败 [${key}]:`, error);
      throw new Error(`删除数据失败: ${error}`);
    }
  }

  /**
   * 批量存储数据
   * @param items 键值对数组
   */
  static async multiSet(items: [StorageKey | string, any][]): Promise<void> {
    try {
      const pairs: [string, string][] = items.map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]);
      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      console.error('批量存储数据失败:', error);
      throw new Error(`批量存储数据失败: ${error}`);
    }
  }

  /**
   * 批量获取数据
   * @param keys 键名数组
   * @returns 键值对对象
   */
  static async multiGet<T>(
    keys: (StorageKey | string)[]
  ): Promise<Record<string, T | null>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, T | null> = {};

      pairs.forEach(([key, value]) => {
        result[key] = value ? JSON.parse(value) : null;
      });

      return result;
    } catch (error) {
      console.error('批量读取数据失败:', error);
      return {};
    }
  }

  /**
   * 批量删除数据
   * @param keys 键名数组
   */
  static async multiRemove(keys: (StorageKey | string)[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('批量删除数据失败:', error);
      throw new Error(`批量删除数据失败: ${error}`);
    }
  }

  /**
   * 获取所有键名
   * @returns 键名数组
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('获取所有键名失败:', error);
      return [];
    }
  }

  /**
   * 清除所有存储数据（慎用）
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('清除存储失败:', error);
      throw new Error(`清除存储失败: ${error}`);
    }
  }

  /**
   * 获取存储空间使用情况
   * @returns 使用字节数
   */
  static async getStorageUsage(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      let totalSize = 0;

      items.forEach(([, value]) => {
        if (value) {
          totalSize += value.length * 2; // UTF-16 每个字符2字节
        }
      });

      return totalSize;
    } catch (error) {
      console.error('获取存储使用情况失败:', error);
      return 0;
    }
  }

  // ==================== 便捷方法 ====================

  /**
   * 保存用户信息
   */
  static async saveUser<T>(user: T): Promise<void> {
    return this.setItem(StorageKey.USER, user);
  }

  /**
   * 获取用户信息
   */
  static async getUser<T>(): Promise<T | null> {
    return this.getItem<T>(StorageKey.USER);
  }

  /**
   * 保存认证令牌
   */
  static async saveToken(token: string): Promise<void> {
    return this.setItem(StorageKey.TOKEN, token);
  }

  /**
   * 获取认证令牌
   */
  static async getToken(): Promise<string | null> {
    return this.getItem<string>(StorageKey.TOKEN);
  }

  /**
   * 保存应用设置
   */
  static async saveSettings<T>(settings: T): Promise<void> {
    return this.setItem(StorageKey.SETTINGS, settings);
  }

  /**
   * 获取应用设置
   */
  static async getSettings<T>(): Promise<T | null> {
    return this.getItem<T>(StorageKey.SETTINGS);
  }

  /**
   * 保存主题设置
   */
  static async saveTheme(theme: string): Promise<void> {
    return this.setItem(StorageKey.THEME, theme);
  }

  /**
   * 获取主题设置
   */
  static async getTheme(): Promise<string | null> {
    return this.getItem<string>(StorageKey.THEME);
  }

  /**
   * 清除用户相关数据（退出登录时使用）
   */
  static async clearUserData(): Promise<void> {
    await this.multiRemove([
      StorageKey.USER,
      StorageKey.TOKEN,
      StorageKey.CONVERSATIONS,
      StorageKey.MESSAGES,
    ]);
  }

  /**
   * 导出所有数据（用于备份）
   */
  static async exportAllData(): Promise<Record<string, any>> {
    try {
      const keys = await this.getAllKeys();
      const data: Record<string, any> = {};

      for (const key of keys) {
        const value = await this.getItem(key);
        if (value !== null) {
          data[key] = value;
        }
      }

      return data;
    } catch (error) {
      console.error('导出数据失败:', error);
      return {};
    }
  }

  /**
   * 导入数据（用于恢复）
   */
  static async importData(data: Record<string, any>): Promise<void> {
    try {
      const entries = Object.entries(data);
      await this.multiSet(entries);
    } catch (error) {
      console.error('导入数据失败:', error);
      throw new Error(`导入数据失败: ${error}`);
    }
  }
}

export default StorageService;
