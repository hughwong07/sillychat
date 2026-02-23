/**
 * XiaoShagua (小傻瓜) Chat Protocol - Core Types
 */

// 基础枚举类型
export enum MessageType {
  CHAT = 'chat',
  COMMAND = 'command',
  EVENT = 'event',
  SYSTEM = 'system',
  FILE = 'file',
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SKILL = 'skill',
  AUDIO = 'audio',
  VIDEO = 'video',
  RICHTEXT = 'richtext',
}

export enum SenderRole {
  HUMAN = 'human',
  AI = 'ai',
  HYBRID = 'hybrid',
  SYSTEM = 'system',
}

export enum ChannelType {
  DIRECT = 'direct',
  GROUP = 'group',
  PROJECT = 'project',
}

export enum AgentCommandType {
  CHAT = 'chat',
  SKILL = 'skill',
  TOOL = 'tool',
  MEMORY = 'memory',
  CONFIG = 'config',
}

export enum SystemEventType {
  USER_JOIN = 'user_join',
  USER_LEAVE = 'user_leave',
  AGENT_ADDED = 'agent_added',
  AGENT_REMOVED = 'agent_removed',
  CHANNEL_CREATED = 'channel_created',
  CHANNEL_UPDATED = 'channel_updated',
  CHANNEL_DELETED = 'channel_deleted',
  FILE_UPLOADED = 'file_uploaded',
  SYNC_STARTED = 'sync_started',
  SYNC_COMPLETED = 'sync_completed',
  ERROR = 'error',
  AGENT_ONLINE = 'agent_online',
  AGENT_OFFLINE = 'agent_offline',
  SETTINGS_CHANGED = 'settings_changed',
}

export enum SerializationFormat {
  JSON = 'json',
  PROTOBUF = 'protobuf',
}

export enum PermissionLevel {
  OWNER = 100,
  ADMIN = 80,
  COLLABORATOR = 60,
  READONLY = 40,
  GUEST = 20,
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  WEB = 'web',
  SERVER = 'server',
}

export enum TransportProtocol {
  WEBSOCKET = 'websocket',
  HTTP = 'http',
  HTTPS = 'https',
}

export enum FileTransferStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// 基础接口定义
export interface Sender {
  userId: string;
  agentId?: string;
  role: SenderRole;
  deviceId: string;
  deviceType?: DeviceType;
  displayName?: string;
  avatarUrl?: string;
}

export interface Target {
  channelId: string;
  threadId?: string;
  userId?: string;
  channelType?: ChannelType;
  parentMessageId?: string;
}

export interface MessageContent {
  type: ContentType;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export interface AuthContext {
  level: PermissionLevel | number;
  signature?: string;
  token?: string;
  expiresAt?: number;
  sessionId?: string;
}

export interface TextContent {
  text: string;
  format?: 'plain' | 'markdown' | 'html';
  mentions?: string[];
}

export interface ImageContent {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  thumbnailUrl?: string;
}

export interface FileContent {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  checksum?: string;
}

export interface SkillContent {
  skillId: string;
  skillName: string;
  command: string;
  args: Record<string, unknown>;
  result?: unknown;
}

// 核心消息接口
export interface XSGMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  sender: Sender;
  target: Target;
  content: MessageContent;
  auth: AuthContext;
  replyTo?: string;
  editedAt?: number;
  expiresAt?: number;
  extensions?: Record<string, unknown>;
  version?: string;
  editHistory?: Array<{ content: unknown; timestamp: number }>;
}

export interface ChatMessage extends XSGMessage {
  type: MessageType.CHAT;
  content: MessageContent;
  editHistory?: Array<{ content: unknown; timestamp: number }>;
}

export interface AgentCommand {
  id: string;
  type: MessageType.COMMAND;
  agentId: string;
  commandType?: AgentCommandType;
  command: {
    type: string;
    payload: unknown;
  };
  context: {
    history: Array<{ role: string; content: string }>;
    files: string[];
    permissions: string[];
    sessionState?: Record<string, unknown>;
  };
  sender: Sender;
  auth: AuthContext;
  timestamp: number;
  timeout?: number;
  priority?: number;
  version?: string;
}

export interface SystemEvent {
  id: string;
  type: MessageType.EVENT;
  eventType: SystemEventType;
  timestamp: number;
  channelId?: string;
  userId?: string;
  agentId?: string;
  data: unknown;
  description?: string;
  sender?: Sender;
  target?: Target;
  version?: string;
}

export interface FileTransfer {
  id: string;
  type: MessageType.FILE;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum?: string;
  sender: Sender;
  target: Target;
  recipient?: {
    userId?: string;
    channelId?: string;
  };
  status: FileTransferStatus;
  transferredBytes?: number;
  chunkSize: number;
  totalChunks: number;
  completedChunks?: number[];
  createdAt?: number;
  timestamp?: number;
  completedAt?: number;
  storageLocation?: string;
  version?: string;
  auth: AuthContext;
  chunks?: FileChunk[];
  resumeFromChunk?: number;
  encryptionKey?: string;
}

export interface FileChunk {
  transferId?: string;
  fileId: string;
  index?: number;
  chunkIndex: number;
  data: Uint8Array;
  size?: number;
  checksum?: string;
  isLast?: boolean;
}

// 协议元数据类型
export interface ProtocolVersion {
  major: number;
  minor: number;
  patch: number;
  name?: string;
}

export interface DeviceDiscovery {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  capabilities: string[];
  endpoint: string;
  publicKey: string;
  protocolVersion: ProtocolVersion;
  discoveredAt: number;
}

export interface DiscoveryResponse {
  challenge: string;
  signature: string;
  deviceId: string;
  timestamp: number;
}

// 序列化相关类型
export interface SerializationOptions {
  format: SerializationFormat;
  compress?: boolean;
  encryptionKey?: string;
  includeTypeInfo?: boolean;
}

export interface SerializationResult {
  format: SerializationFormat;
  data: string | Uint8Array;
  originalSize?: number;
  serializedSize?: number;
  byteLength?: number;
  checksum?: string;
  success: boolean;
  error?: string | { code: string; message: string };
  errorCode?: string;
}

export interface ProtocolPacket {
  header: {
    version: ProtocolVersion;
    format: SerializationFormat;
    timestamp: number;
    sequenceNumber: number;
  };
  payload: XSGMessage | AgentCommand | SystemEvent | FileTransfer;
  signature?: string;
}

// 验证相关类型
export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  success?: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  code: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  path: string;
  code: string;
  message: string;
}

export interface ValidationOptions {
  strict?: boolean;
  allowUnknownFields?: boolean;
  maxMessageSize?: number;
  validatePermissions?: boolean;
}

// 工具类型
export type MessageTypeMap = {
  [MessageType.CHAT]: ChatMessage;
  [MessageType.COMMAND]: AgentCommand;
  [MessageType.EVENT]: SystemEvent;
  [MessageType.SYSTEM]: SystemEvent;
  [MessageType.FILE]: FileTransfer;
};

export type ContentTypeMap = {
  [ContentType.TEXT]: TextContent;
  [ContentType.IMAGE]: ImageContent;
  [ContentType.FILE]: FileContent;
  [ContentType.SKILL]: SkillContent;
};

export type Serializable =
  | XSGMessage
  | ChatMessage
  | AgentCommand
  | SystemEvent
  | FileTransfer
  | FileChunk
  | DeviceDiscovery
  | ProtocolPacket;

// Additional types for compatibility
export type Content = MessageContent;

export interface DeserializationResult<T = unknown> {
  success: boolean;
  data?: T;
  format?: SerializationFormat;
  error?: string | { code: string; message: string };
  errorCode?: string;
}

// Extend existing interfaces with missing properties
export interface ExtendedSender extends Sender {
  displayName?: string;
}

export interface ExtendedTarget extends Target {
  channelType?: ChannelType;
}

export interface ExtendedAuthContext extends AuthContext {
  sessionId?: string;
}

export interface ExtendedXSGMessage extends XSGMessage {
  version?: string;
}

export interface ExtendedChatMessage extends ChatMessage {
  editHistory?: Array<{ content: string; timestamp: number }>;
}

export interface ExtendedFileChunk extends Omit<FileChunk, 'fileId'> {
  fileId?: string;
  isLast?: boolean;
  receivedAt?: number;
  transferId?: string;
}

// Error codes enum
export enum ErrorCode {
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_JSON = 'INVALID_JSON',
  INVALID_PROTOBUF = 'INVALID_PROTOBUF',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_TYPE = 'INVALID_TYPE',
  SIZE_EXCEEDED = 'SIZE_EXCEEDED',
  INVALID_ID = 'INVALID_ID',
}

// Extend SystemEventType
export enum ExtendedSystemEventType {
  AGENT_ONLINE = 'agent_online',
  AGENT_OFFLINE = 'agent_offline',
  SETTINGS_CHANGED = 'settings_changed',
}
