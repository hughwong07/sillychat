import { z } from 'zod';

const themeSchema = z.enum(["light", "dark", "system"]);
const languageSchema = z.enum(["zh-CN", "zh-TW", "en-US", "ja-JP", "ko-KR"]);
const notificationLevelSchema = z.enum(["all", "mentions", "none"]);
const modelProviderSchema = z.enum(["openclaw", "anthropic", "openai", "local", "custom"]);
const syncModeSchema = z.enum(["realtime", "periodic", "manual"]);
const cloudProviderSchema = z.enum(["s3", "oss", "onedrive", "dropbox", "webdav", "custom"]);
const encryptionLevelSchema = z.enum(["none", "local", "full"]);

export const uiSettingsSchema = z.object({
  theme: themeSchema.default('system'),
  language: languageSchema.default('zh-CN'),
  fontSize: z.number().min(10).max(24).default(14),
  zoomLevel: z.number().min(0.5).max(2).default(1),
  sidebarWidth: z.number().min(150).max(500).default(250),
  showAvatars: z.boolean().default(true),
  showTimestamps: z.boolean().default(true),
  compactMode: z.boolean().default(false),
  enableAnimations: z.boolean().default(true),
  alwaysOnTop: z.boolean().default(false),
  minimizeToTray: z.boolean().default(true),
  minimizeOnClose: z.boolean().default(true),
});

export const notificationSettingsSchema = z.object({
  level: notificationLevelSchema.default('all'),
  desktopNotifications: z.boolean().default(true),
  soundEnabled: z.boolean().default(true),
  soundType: z.enum(['default', 'subtle', 'none']).default('default'),
  dndStartTime: z.string().nullable().default(null),
  dndEndTime: z.string().nullable().default(null),
  messagePreview: z.boolean().default(true),
});

export const shortcutSettingsSchema = z.object({
  sendMessage: z.string().default('Enter'),
  newConversation: z.string().default('Ctrl+N'),
  search: z.string().default('Ctrl+K'),
  toggleSidebar: z.string().default('Ctrl+B'),
  fullscreen: z.string().default('F11'),
  quickScreenshot: z.string().default('Ctrl+Shift+S'),
});

export const userSettingsSchema = z.object({
  ui: uiSettingsSchema,
  notifications: notificationSettingsSchema,
  shortcuts: shortcutSettingsSchema,
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});

export const aiModelConfigSchema = z.object({
  provider: modelProviderSchema,
  modelId: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(128000).default(4096),
  contextWindow: z.number().min(1).max(200000).default(8192),
  timeout: z.number().min(1).max(300).default(60),
  customParams: z.record(z.unknown()).optional(),
});

export const aiCapabilitiesSchema = z.object({
  skills: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  memory: z.boolean().default(true),
  fileAccess: z.boolean().default(true),
  webAccess: z.boolean().default(false),
  codeExecution: z.boolean().default(false),
});

export const aiIdentitySchema = z.object({
  name: z.string().min(1).max(50),
  avatar: z.string().default(''),
  role: z.enum(['master', 'assistant', 'expert']).default('assistant'),
  personality: z.string().max(1000).optional(),
  systemPrompt: z.string().max(10000).optional(),
  welcomeMessage: z.string().max(500).optional(),
});

export const aiAgentConfigSchema = z.object({
  id: z.string().uuid(),
  identity: aiIdentitySchema,
  model: aiModelConfigSchema,
  capabilities: aiCapabilitiesSchema,
  permissionLevel: z.number().min(0).max(100).default(50),
  isDefault: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const localStorageConfigSchema = z.object({
  dataPath: z.string().min(1),
  dbPath: z.string().min(1),
  filesPath: z.string().min(1),
  cachePath: z.string().min(1),
  logsPath: z.string().min(1),
  maxDbSize: z.number().min(10).max(1000).default(100),
  maxFilesSize: z.number().min(1).max(100).default(10),
  maxCacheSize: z.number().min(10).max(2000).default(500),
  cleanupThreshold: z.number().min(0.5).max(0.99).default(0.9),
});

export const cloudProviderConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: cloudProviderSchema,
  config: z.record(z.string()),
  isEnabled: z.boolean().default(true),
  priority: z.number().min(0).max(100).default(0),
  syncMode: syncModeSchema.default('manual'),
  syncInterval: z.number().min(1).max(1440).optional(),
  bandwidthLimit: z.number().min(0).default(0),
  lastSyncAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export const storageConfigSchema = z.object({
  local: localStorageConfigSchema,
  cloudProviders: z.array(cloudProviderConfigSchema).default([]),
  defaultCloudProvider: z.string().uuid().optional(),
});

export const syncItemConfigSchema = z.object({
  entityType: z.enum(['conversation', 'message', 'blob', 'settings', 'agents']),
  enabled: z.boolean().default(true),
  conflictResolution: z.enum(['newest', 'local', 'remote', 'manual']).default('newest'),
  excludePatterns: z.array(z.string()).default([]),
});

export const syncConfigSchema = z.object({
  enabled: z.boolean().default(false),
  defaultMode: syncModeSchema.default('manual'),
  defaultInterval: z.number().min(1).max(1440).default(30),
  items: z.array(syncItemConfigSchema).default([]),
  wifiOnly: z.boolean().default(false),
  chargingOnly: z.boolean().default(false),
  batteryThreshold: z.number().min(0).max(100).default(20),
  retryCount: z.number().min(0).max(10).default(3),
  retryInterval: z.number().min(1).max(300).default(5),
});

export const encryptionConfigSchema = z.object({
  level: encryptionLevelSchema.default('local'),
  storageAlgorithm: z.enum(['AES-256-GCM', 'ChaCha20-Poly1305']).default('AES-256-GCM'),
  keyDerivation: z.enum(['Argon2id', 'PBKDF2']).default('Argon2id'),
  autoLockTimeout: z.number().min(0).max(1440).default(30),
  requirePasswordOnStartup: z.boolean().default(false),
  enableBiometric: z.boolean().default(false),
});

export const privacyConfigSchema = z.object({
  sendAnalytics: z.boolean().default(false),
  autoCheckUpdates: z.boolean().default(true),
  messageRetentionDays: z.number().min(0).max(3650).default(0),
  autoDeleteArchived: z.boolean().default(false),
  clipboardAccess: z.boolean().default(true),
  screenCaptureAccess: z.boolean().default(false),
});

export const securityConfigSchema = z.object({
  encryption: encryptionConfigSchema,
  privacy: privacyConfigSchema,
  trustedDevices: z.array(z.string()).default([]),
  lastAuditAt: z.string().datetime().optional(),
});

export const configVersionSchema = z.object({
  version: z.number().min(1).default(1),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
  migrationHistory: z.array(z.string()).default([]),
});

export const appConfigSchema = z.object({
  _version: configVersionSchema,
  user: userSettingsSchema,
  agents: z.array(aiAgentConfigSchema).default([]),
  storage: storageConfigSchema,
  sync: syncConfigSchema,
  security: securityConfigSchema,
});

export type AppConfigSchema = z.infer<typeof appConfigSchema>;
export type UserSettingsSchema = z.infer<typeof userSettingsSchema>;
export type AIAgentConfigSchema = z.infer<typeof aiAgentConfigSchema>;
export type StorageConfigSchema = z.infer<typeof storageConfigSchema>;
export type SyncConfigSchema = z.infer<typeof syncConfigSchema>;
export type SecurityConfigSchema = z.infer<typeof securityConfigSchema>;

export function validateAppConfig(config: unknown) {
  return appConfigSchema.safeParse(config);
}

export function validateUserSettings(config: unknown) {
  return userSettingsSchema.safeParse(config);
}

export function validateAIAgentConfig(config: unknown) {
  return aiAgentConfigSchema.safeParse(config);
}

export function validateStorageConfig(config: unknown) {
  return storageConfigSchema.safeParse(config);
}

export function validateSyncConfig(config: unknown) {
  return syncConfigSchema.safeParse(config);
}

export function validateSecurityConfig(config: unknown) {
  return securityConfigSchema.safeParse(config);
}
