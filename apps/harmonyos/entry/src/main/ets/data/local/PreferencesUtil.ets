import { preferences } from '@kit.ArkData';
import { Logger } from '../../utils/Logger';

const TAG = 'PreferencesUtil';

/**
 * 轻量级偏好存储工具类
 * 用于存储应用配置和用户设置
 */
export class PreferencesUtil {
  private static instance: PreferencesUtil;
  private preferences: preferences.Preferences | null = null;
  private readonly context: Context;

  private constructor(context: Context) {
    this.context = context;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context: Context): PreferencesUtil {
    if (!PreferencesUtil.instance) {
      PreferencesUtil.instance = new PreferencesUtil(context);
    }
    return PreferencesUtil.instance;
  }

  /**
   * 初始化Preferences
   */
  public async initPreferences(name: string = 'sillychat_prefs'): Promise<void> {
    try {
      this.preferences = preferences.getPreferencesSync(this.context, name);
      Logger.info(TAG, `Preferences initialized: ${name}`);
    } catch (error) {
      Logger.error(TAG, `Failed to initialize preferences: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  /**
   * 存储字符串值
   */
  public putString(key: string, value: string): void {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return;
    }
    try {
      this.preferences.putSync(key, value);
      this.preferences.flushSync();
      Logger.debug(TAG, `Put string: ${key} = ${value}`);
    } catch (error) {
      Logger.error(TAG, `Failed to put string: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 获取字符串值
   */
  public getString(key: string, defaultValue: string = ''): string {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return defaultValue;
    }
    try {
      const value = this.preferences.getSync(key, defaultValue) as string;
      return value;
    } catch (error) {
      Logger.error(TAG, `Failed to get string: ${JSON.stringify(error)}`);
      return defaultValue;
    }
  }

  /**
   * 存储数字值
   */
  public putNumber(key: string, value: number): void {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return;
    }
    try {
      this.preferences.putSync(key, value);
      this.preferences.flushSync();
      Logger.debug(TAG, `Put number: ${key} = ${value}`);
    } catch (error) {
      Logger.error(TAG, `Failed to put number: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 获取数字值
   */
  public getNumber(key: string, defaultValue: number = 0): number {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return defaultValue;
    }
    try {
      const value = this.preferences.getSync(key, defaultValue) as number;
      return value;
    } catch (error) {
      Logger.error(TAG, `Failed to get number: ${JSON.stringify(error)}`);
      return defaultValue;
    }
  }

  /**
   * 存储布尔值
   */
  public putBoolean(key: string, value: boolean): void {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return;
    }
    try {
      this.preferences.putSync(key, value);
      this.preferences.flushSync();
      Logger.debug(TAG, `Put boolean: ${key} = ${value}`);
    } catch (error) {
      Logger.error(TAG, `Failed to put boolean: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 获取布尔值
   */
  public getBoolean(key: string, defaultValue: boolean = false): boolean {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return defaultValue;
    }
    try {
      const value = this.preferences.getSync(key, defaultValue) as boolean;
      return value;
    } catch (error) {
      Logger.error(TAG, `Failed to get boolean: ${JSON.stringify(error)}`);
      return defaultValue;
    }
  }

  /**
   * 存储对象（JSON序列化）
   */
  public putObject<T>(key: string, value: T): void {
    try {
      const jsonString = JSON.stringify(value);
      this.putString(key, jsonString);
      Logger.debug(TAG, `Put object: ${key}`);
    } catch (error) {
      Logger.error(TAG, `Failed to put object: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 获取对象（JSON反序列化）
   */
  public getObject<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const jsonString = this.getString(key, '');
      if (!jsonString) {
        return defaultValue;
      }
      return JSON.parse(jsonString) as T;
    } catch (error) {
      Logger.error(TAG, `Failed to get object: ${JSON.stringify(error)}`);
      return defaultValue;
    }
  }

  /**
   * 删除指定键
   */
  public delete(key: string): void {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return;
    }
    try {
      this.preferences.deleteSync(key);
      this.preferences.flushSync();
      Logger.debug(TAG, `Deleted key: ${key}`);
    } catch (error) {
      Logger.error(TAG, `Failed to delete key: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 清空所有数据
   */
  public clear(): void {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return;
    }
    try {
      this.preferences.clearSync();
      this.preferences.flushSync();
      Logger.info(TAG, 'All preferences cleared');
    } catch (error) {
      Logger.error(TAG, `Failed to clear preferences: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 检查键是否存在
   */
  public hasKey(key: string): boolean {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return false;
    }
    try {
      return this.preferences.hasSync(key);
    } catch (error) {
      Logger.error(TAG, `Failed to check key: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 获取所有键
   */
  public getAllKeys(): string[] {
    if (!this.preferences) {
      Logger.error(TAG, 'Preferences not initialized');
      return [];
    }
    try {
      const all = this.preferences.getAllSync();
      return Object.keys(all);
    } catch (error) {
      Logger.error(TAG, `Failed to get all keys: ${JSON.stringify(error)}`);
      return [];
    }
  }
}

/**
 * 偏好存储键名常量
 */
export class PrefKeys {
  // 用户相关
  static readonly USER_ID = 'user_id';
  static readonly USER_NAME = 'user_name';
  static readonly USER_EMAIL = 'user_email';
  static readonly USER_AVATAR = 'user_avatar';
  static readonly USER_TOKEN = 'user_token';

  // 应用设置
  static readonly THEME_MODE = 'theme_mode';
  static readonly LANGUAGE = 'language';
  static readonly NOTIFICATION_ENABLED = 'notification_enabled';
  static readonly SOUND_ENABLED = 'sound_enabled';
  static readonly VIBRATION_ENABLED = 'vibration_enabled';

  // 聊天设置
  static readonly DEFAULT_AGENT_ID = 'default_agent_id';
  static readonly LAST_CONVERSATION_ID = 'last_conversation_id';
  static readonly MESSAGE_FONT_SIZE = 'message_font_size';
  static readonly SHOW_TIMESTAMP = 'show_timestamp';

  // 代理设置
  static readonly AGENTS_SYNCED = 'agents_synced';
  static readonly LAST_SYNC_TIME = 'last_sync_time';

  // 同步设置
  static readonly AUTO_SYNC = 'auto_sync';
  static readonly SYNC_INTERVAL = 'sync_interval';

  // 应用信息
  static readonly FIRST_LAUNCH = 'first_launch';
  static readonly APP_VERSION = 'app_version';
  static readonly LAST_VERSION = 'last_version';
}
