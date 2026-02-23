/**
 * 配置常量
 * 定义应用的配置参数
 */
export class Config {
  // 应用信息
  static readonly APP_NAME: string = 'SillyChat';
  static readonly APP_VERSION: string = '1.0.0';
  static readonly APP_PACKAGE: string = 'com.sillychat.app';
  static readonly BUILD_NUMBER: string = '1';

  // API配置
  static readonly API_BASE_URL: string = 'https://api.sillychat.com/v1';
  static readonly API_TIMEOUT: number = 30000; // 30秒
  static readonly API_CONNECT_TIMEOUT: number = 10000; // 10秒
  static readonly API_RETRY_COUNT: number = 3;

  // WebSocket配置
  static readonly WS_BASE_URL: string = 'wss://api.sillychat.com/v1/ws';
  static readonly WS_RECONNECT_INTERVAL: number = 5000; // 5秒
  static readonly WS_MAX_RECONNECT_ATTEMPTS: number = 5;

  // 分页配置
  static readonly DEFAULT_PAGE_SIZE: number = 20;
  static readonly MAX_PAGE_SIZE: number = 100;

  // 消息配置
  static readonly MAX_MESSAGE_LENGTH: number = 4000;
  static readonly MAX_ATTACHMENTS: number = 10;
  static readonly MAX_FILE_SIZE: number = 50 * 1024 * 1024; // 50MB
  static readonly MESSAGE_SYNC_INTERVAL: number = 30000; // 30秒

  // 缓存配置
  static readonly CACHE_MAX_AGE: number = 7 * 24 * 60 * 60 * 1000; // 7天
  static readonly CACHE_MAX_SIZE: number = 100 * 1024 * 1024; // 100MB

  // 日志配置
  static readonly LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error' = 'debug';
  static readonly LOG_MAX_FILES: number = 7;
  static readonly LOG_MAX_SIZE: number = 10 * 1024 * 1024; // 10MB

  // 功能开关
  static readonly ENABLE_PUSH_NOTIFICATION: boolean = true;
  static readonly ENABLE_MESSAGE_ENCRYPTION: boolean = true;
  static readonly ENABLE_MESSAGE_SEARCH: boolean = true;
  static readonly ENABLE_VOICE_INPUT: boolean = true;
  static readonly ENABLE_FILE_ATTACHMENT: boolean = true;
  static readonly ENABLE_IMAGE_ATTACHMENT: boolean = true;

  // 代理默认配置
  static readonly DEFAULT_AGENT_MODEL: string = 'gpt-3.5-turbo';
  static readonly DEFAULT_AGENT_TEMPERATURE: number = 0.7;
  static readonly DEFAULT_AGENT_MAX_TOKENS: number = 2048;
  static readonly DEFAULT_AGENT_TOP_P: number = 1.0;
  static readonly DEFAULT_AGENT_FREQUENCY_PENALTY: number = 0.0;
  static readonly DEFAULT_AGENT_PRESENCE_PENALTY: number = 0.0;

  // UI配置
  static readonly ANIMATION_DURATION: number = 300;
  static readonly TOAST_DURATION: number = 2000;
  static readonly DEBOUNCE_DELAY: number = 300;
  static readonly THROTTLE_DELAY: number = 500;

  // 存储键名
  static readonly STORAGE_KEYS = {
    USER_TOKEN: 'user_token',
    USER_ID: 'user_id',
    USER_NAME: 'user_name',
    USER_EMAIL: 'user_email',
    USER_AVATAR: 'user_avatar',
    THEME_MODE: 'theme_mode',
    LANGUAGE: 'language',
    NOTIFICATION_ENABLED: 'notification_enabled',
    SOUND_ENABLED: 'sound_enabled',
    VIBRATION_ENABLED: 'vibration_enabled',
    DEFAULT_AGENT_ID: 'default_agent_id',
    LAST_CONVERSATION_ID: 'last_conversation_id',
    MESSAGE_FONT_SIZE: 'message_font_size',
    SHOW_TIMESTAMP: 'show_timestamp',
    FIRST_LAUNCH: 'first_launch',
    APP_VERSION: 'app_version',
    LAST_SYNC_TIME: 'last_sync_time'
  };

  // 错误码
  static readonly ERROR_CODES = {
    NETWORK_ERROR: 1001,
    TIMEOUT_ERROR: 1002,
    SERVER_ERROR: 1003,
    AUTH_ERROR: 1004,
    NOT_FOUND: 1005,
    VALIDATION_ERROR: 1006,
    UNKNOWN_ERROR: 9999
  };

  // 错误消息
  static readonly ERROR_MESSAGES: Record<number, string> = {
    [Config.ERROR_CODES.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
    [Config.ERROR_CODES.TIMEOUT_ERROR]: '请求超时，请稍后重试',
    [Config.ERROR_CODES.SERVER_ERROR]: '服务器错误，请稍后重试',
    [Config.ERROR_CODES.AUTH_ERROR]: '登录已过期，请重新登录',
    [Config.ERROR_CODES.NOT_FOUND]: '请求的资源不存在',
    [Config.ERROR_CODES.VALIDATION_ERROR]: '输入数据验证失败',
    [Config.ERROR_CODES.UNKNOWN_ERROR]: '发生未知错误'
  };

  // 支持的语言
  static readonly SUPPORTED_LANGUAGES = [
    { code: 'zh-CN', name: '简体中文' },
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'en-US', name: 'English' }
  ];

  // 默认语言
  static readonly DEFAULT_LANGUAGE: string = 'zh-CN';

  // 文件类型限制
  static readonly ALLOWED_IMAGE_TYPES: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  static readonly ALLOWED_FILE_TYPES: string[] = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
}

/**
 * 环境配置
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

/**
 * 获取当前环境配置
 */
export function getCurrentEnvironment(): Environment {
  // 实际应用中根据构建配置返回
  return Environment.DEVELOPMENT;
}

/**
 * 根据环境获取API基础URL
 */
export function getApiBaseUrl(): string {
  const env = getCurrentEnvironment();
  switch (env) {
    case Environment.DEVELOPMENT:
      return 'https://api-dev.sillychat.com/v1';
    case Environment.STAGING:
      return 'https://api-staging.sillychat.com/v1';
    case Environment.PRODUCTION:
      return 'https://api.sillychat.com/v1';
    default:
      return Config.API_BASE_URL;
  }
}
