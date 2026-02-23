/**
 * 小傻瓜聊天工具 - 配置类型定义
 * 定义所有配置相关的类型和接口
 */

// ============================================
// 基础类型
// ============================================

/**
 * 主题类型
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * 语言代码
 */
export type Language = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR';

/**
 * 通知级别
 */
export type NotificationLevel = 'all' | 'mentions' | 'none';

/**
 * AI模型提供商
 */
export type ModelProvider = 'openclaw' | 'anthropic' | 'openai' | 'local' | 'custom';

/**
 * 同步模式
 */
export type SyncMode = 'realtime' | 'periodic' | 'manual';

/**
 * 云端存储提供商
 */
export type CloudProvider = 's3' | 'oss' | 'onedrive' | 'dropbox' | 'webdav' | 'custom';

/**
 * 存储加密级别
 */
export type EncryptionLevel = 'none' | 'local' | 'full';

// ============================================
// 用户设置配置
// ============================================

/**
 * 界面设置
 */
export interface UISettings {
  theme: Theme;
  language: Language;
  fontSize: number;
  zoomLevel: number;
  sidebarWidth: number;
  showAvatars: boolean;
  showTimestamps: boolean;
  compactMode: boolean;
  enableAnimations: boolean;
  alwaysOnTop: boolean;
  minimizeToTray: boolean;
  minimizeOnClose: boolean;
}

/**
 * 通知设置
 */
export interface NotificationSettings {
  level: NotificationLevel;
  desktopNotifications: boolean;
  soundEnabled: boolean;
  soundType: 'default' | 'subtle' | 'none';
  dndStartTime: string | null;
  dndEndTime: string | null;
  messagePreview: boolean;
}

/**
 * 快捷键设置
 */
export interface ShortcutSettings {
  sendMessage: string;
  newConversation: string;
  search: string;
  toggleSidebar: string;
  fullscreen: string;
  quickScreenshot: string;
}

/**
 * 用户设置配置
 */
export interface UserSettings {
  ui: UISettings;
  notifications: NotificationSettings;
  shortcuts: ShortcutSettings;
  updatedAt: string;
}

// ============================================
// AI代理配置
// ============================================

/**
 * AI模型配置
 */
export interface AIModelConfig {
  provider: ModelProvider;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  timeout: number;
  customParams?: Record<string, unknown>;
}

/**
 * AI代理能力配置
 */
export interface AICapabilities {
  skills: string[];
  tools: string[];
  memory: boolean;
  fileAccess: boolean;
  webAccess: boolean;
  codeExecution: boolean;
}

/**
 * AI代理身份配置
 */
export interface AIIdentity {
  name: string;
  avatar: string;
  role: 'master' | 'assistant' | 'expert';
  description?: string;
  personality?: string;
  systemPrompt?: string;
  welcomeMessage?: string;
}

/**
 * AI代理配置
 */
export interface AIAgentConfig {
  id: string;
  identity: AIIdentity;
  model: AIModelConfig;
  capabilities: AICapabilities;
  permissionLevel: number;
  isDefault: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 存储配置
// ============================================

/**
 * 本地存储配置
 */
export interface LocalStorageConfig {
  dataPath: string;
  dbPath: string;
  filesPath: string;
  cachePath: string;
  logsPath: string;
  maxDbSize: number;
  maxFilesSize: number;
  maxCacheSize: number;
  cleanupThreshold: number;
}

/**
 * 云端存储提供商配置
 */
export interface CloudProviderConfig {
  id: string;
  name: string;
  type: CloudProvider;
  config: Record<string, string>;
  isEnabled: boolean;
  priority: number;
  syncMode: SyncMode;
  syncInterval?: number;
  bandwidthLimit: number;
  lastSyncAt?: string;
  createdAt: string;
}

/**
 * 存储配置
 */
export interface StorageConfig {
  local: LocalStorageConfig;
  cloudProviders: CloudProviderConfig[];
  defaultCloudProvider?: string;
}

// ============================================
// 同步配置
// ============================================

/**
 * 同步项配置
 */
export interface SyncItemConfig {
  entityType: 'conversation' | 'message' | 'blob' | 'settings' | 'agents';
  enabled: boolean;
  conflictResolution: 'newest' | 'local' | 'remote' | 'manual';
  excludePatterns: string[];
}

/**
 * 同步配置
 */
export interface SyncConfig {
  enabled: boolean;
  defaultMode: SyncMode;
  defaultInterval: number;
  items: SyncItemConfig[];
  wifiOnly: boolean;
  chargingOnly: boolean;
  batteryThreshold: number;
  retryCount: number;
  retryInterval: number;
}

// ============================================
// 安全配置
// ============================================

/**
 * 加密配置
 */
export interface EncryptionConfig {
  level: EncryptionLevel;
  storageAlgorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  keyDerivation: 'Argon2id' | 'PBKDF2';
  autoLockTimeout: number;
  requirePasswordOnStartup: boolean;
  enableBiometric: boolean;
}

/**
 * 隐私配置
 */
export interface PrivacyConfig {
  sendAnalytics: boolean;
  autoCheckUpdates: boolean;
  messageRetentionDays: number;
  autoDeleteArchived: boolean;
  clipboardAccess: boolean;
  screenCaptureAccess: boolean;
}

/**
 * 安全配置
 */
export interface SecurityConfig {
  encryption: EncryptionConfig;
  privacy: PrivacyConfig;
  trustedDevices: string[];
  lastAuditAt?: string;
}

// ============================================
// 应用配置根对象
// ============================================

/**
 * 配置版本
 */
export interface ConfigVersion {
  version: number;
  updatedAt: string;
  migrationHistory: string[];
}

/**
 * 应用完整配置
 */
export interface AppConfig {
  _version: ConfigVersion;
  user: UserSettings;
  agents: AIAgentConfig[];
  storage: StorageConfig;
  sync: SyncConfig;
  security: SecurityConfig;
}

// ============================================
// 配置加载结果
// ============================================

/**
 * 配置加载结果
 */
export interface ConfigLoadResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isDefault: boolean;
}

/**
 * 配置验证错误
 */
export interface ConfigValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
}

// ============================================
// 配置事件
// ============================================

/**
 * 配置变更事件类型
 */
export type ConfigChangeEventType = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'reloaded';

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent<T = unknown> {
  type: ConfigChangeEventType;
  key: string;
  oldValue?: T;
  newValue?: T;
  timestamp: number;
}

/**
 * 配置变更监听器
 */
export type ConfigChangeListener<T = unknown> = (
  event: ConfigChangeEvent<T>
) => void | Promise<void>;
