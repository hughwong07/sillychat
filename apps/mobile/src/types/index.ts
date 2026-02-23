/**
 * 类型定义文件
 * 定义应用中使用的所有 TypeScript 类型
 */

// ==================== 用户类型 ====================

/**
 * 用户角色类型
 */
export type UserRole = 'user' | 'admin' | 'guest';

/**
 * 用户信息
 */
export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

// ==================== 消息类型 ====================

/**
 * 消息内容类型
 */
export type MessageContentType = 'text' | 'image' | 'file' | 'voice' | 'system';

/**
 * 消息发送者类型
 */
export type MessageSenderType = 'user' | 'agent' | 'system';

/**
 * 消息状态
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * 消息对象
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: MessageSenderType;
  content: string;
  contentType: MessageContentType;
  status: MessageStatus;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ==================== 对话类型 ====================

/**
 * 对话类型
 */
export type ConversationType = 'single' | 'group' | 'agent';

/**
 * 对话对象
 */
export interface Conversation {
  id: string;
  type: ConversationType;
  title: string;
  avatar?: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: number;
  updatedAt: number;
}

// ==================== 代理类型 ====================

/**
 * 代理状态
 */
export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error';

/**
 * 代理能力
 */
export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

/**
 * 代理对象
 */
export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  description: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  personality?: string;
  knowledgeBase?: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// ==================== 主题类型 ====================

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  // 主色调 - 草绿主调 #A4D037
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // 点缀色 - 青蓝点缀 #2DB5C8
  accent: string;
  accentLight: string;
  accentDark: string;

  // 背景色
  background: string;
  surface: string;
  card: string;

  // 文字色
  text: string;
  textSecondary: string;
  textTertiary: string;

  // 边框和分割线
  border: string;
  divider: string;

  // 状态色
  success: string;
  warning: string;
  error: string;
  info: string;

  // 其他
  placeholder: string;
  backdrop: string;
  notification: string;
}

/**
 * 完整主题配置
 */
export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
}

// ==================== 设置类型 ====================

/**
 * 应用设置
 */
export interface AppSettings {
  theme: ThemeMode;
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
    showPreview: boolean;
  };
  privacy: {
    readReceipts: boolean;
    typingIndicators: boolean;
  };
  sync: {
    autoSync: boolean;
    syncInterval: number;
    offlineMode: boolean;
  };
}

// ==================== 导航类型 ====================

/**
 * 主导航参数列表
 */
export type MainStackParamList = {
  MainTabs: undefined;
  Chat: { conversationId: string; title: string };
  AgentDetail: { agentId: string };
  Settings: undefined;
  Profile: undefined;
  About: undefined;
};

/**
 * 底部导航参数列表
 */
export type BottomTabParamList = {
  Conversations: undefined;
  Agents: undefined;
  Discover: undefined;
  Profile: undefined;
};

/**
 * 侧边导航参数列表
 */
export type DrawerParamList = {
  Main: undefined;
  Settings: undefined;
  About: undefined;
};

// ==================== 网络类型 ====================

/**
 * WebSocket 连接状态
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * 网关配置
 */
export interface GatewayConfig {
  host: string;
  port: number;
  secure: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

/**
 * API 响应
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
}

// ==================== 存储类型 ====================

/**
 * 存储键名
 */
export enum StorageKey {
  USER = '@sillychat_user',
  TOKEN = '@sillychat_token',
  SETTINGS = '@sillychat_settings',
  CONVERSATIONS = '@sillychat_conversations',
  MESSAGES = '@sillychat_messages',
  AGENTS = '@sillychat_agents',
  THEME = '@sillychat_theme',
  LAST_SYNC = '@sillychat_last_sync',
}

// ==================== UI 类型 ====================

/**
 * 列表项数据
 */
export interface ListItemData {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  avatar?: string;
  badge?: number | string;
  timestamp?: number;
  onPress?: () => void;
}

/**
 * 菜单项
 */
export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  onPress: () => void;
  badge?: number;
  danger?: boolean;
}

/**
 * 表单字段
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'number' | 'select' | 'switch';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: any }[];
  validation?: (value: any) => string | undefined;
}
