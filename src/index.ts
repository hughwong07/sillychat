/**
 * XiaoShagua Chat - Core Module Exports
 */

// Re-export types without duplicates
export type {
  // Config types
  AppConfig,
  UserSettings,
  AIAgentConfig,
  StorageConfig,
  SyncConfig,
  SecurityConfig,
} from './core/config/types.js';

// Utils - exclude validation due to duplicate ValidationResult
export * from './core/utils/logger.js';
export * from './core/utils/network.js';
export * from './core/utils/datetime.js';

// Protocol types - exclude to avoid duplicate ChatMessage and PermissionLevel
// export * from './core/protocol/types.js';
export type {
  // Export specific protocol types that don't conflict
  MessageType,
  ContentType,
  SenderRole,
  ChannelType,
  XSGMessage,
  Sender,
  Target,
  MessageContent,
} from './core/protocol/types.js';

// Storage types
export type {
  BlobEntry,
  StorageStats,
} from './core/storage/types.js';

// Gateway types
export * from './core/gateway/types.js';

// Agents types
export * from './core/agents/types.js';

// Memory types
export * from './core/memory/types.js';

// Version
export const VERSION = '1.0.0';
export const APP_NAME = '小傻瓜聊天工具';
