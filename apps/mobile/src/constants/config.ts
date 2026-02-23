/**
 * 应用配置常量
 */

// ==================== 应用信息 ====================

export const APP_INFO = {
  name: 'SillyChat',
  nameEn: 'SillyChat',
  version: '1.0.0',
  buildNumber: '1',
  description: '智能、简洁、有趣的聊天体验',
  copyright: '© 2024 SillyChat Team',
  website: 'https://sillychat.app',
  supportEmail: 'support@sillychat.app',
} as const;

// ==================== 默认配置 ====================

export const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  language: 'zh-CN',
  fontSize: 'medium' as const,
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
    showPreview: true,
  },
  privacy: {
    readReceipts: true,
    typingIndicators: true,
  },
  sync: {
    autoSync: true,
    syncInterval: 30000, // 30秒
    offlineMode: false,
  },
} as const;

// ==================== 网关配置 ====================

export const GATEWAY_CONFIG = {
  host: 'localhost',
  port: 8080,
  secure: false,
  reconnectInterval: 3000, // 3秒
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000, // 30秒
  timeout: 10000, // 10秒
} as const;

// ==================== 分页配置 ====================

export const PAGINATION = {
  messagesPerPage: 20,
  conversationsPerPage: 15,
  agentsPerPage: 10,
  maxMessagesInMemory: 100,
} as const;

// ==================== 消息限制 ====================

export const MESSAGE_LIMITS = {
  maxTextLength: 2000,
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxVoiceDuration: 60, // 60秒
} as const;

// ==================== 动画时长 ====================

export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  ripple: 400,
} as const;

// ==================== 存储配置 ====================

export const STORAGE = {
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  maxMessageHistory: 1000,
  cleanupInterval: 24 * 60 * 60 * 1000, // 24小时
} as const;

// ==================== 正则表达式 ====================

export const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^1[3-9]\d{9}$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  emoji: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
} as const;

// ==================== 时间格式 ====================

export const TIME_FORMAT = {
  full: 'YYYY-MM-DD HH:mm:ss',
  date: 'YYYY-MM-DD',
  time: 'HH:mm',
  shortTime: 'HH:mm',
  chatTime: 'HH:mm',
  chatDate: 'MM月DD日',
} as const;

// ==================== 错误代码 ====================

export const ERROR_CODES = {
  NETWORK_ERROR: 1001,
  TIMEOUT_ERROR: 1002,
  AUTH_ERROR: 1003,
  NOT_FOUND: 1004,
  SERVER_ERROR: 1005,
  VALIDATION_ERROR: 1006,
  UNKNOWN_ERROR: 9999,
} as const;
