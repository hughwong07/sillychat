/**
 * XiaoShagua Gateway Module - Type Definitions
 */

import type { WebSocket } from 'ws';
import {
  DeviceType,
  PermissionLevel,
  ProtocolVersion,
} from '../protocol/types.js';
import type { XSGMessage } from '../protocol/types.js';

// 网关配置类型
export interface GatewayConfig {
  wsPort: number;
  httpPort: number;
  port: number;
  host: string;
  enableDiscovery: boolean;
  deviceName: string;
  deviceType: DeviceType;
  capabilities: string[];
  jwtSecret: string;
  jwtExpiresIn: number;
  maxConnections: number;
  maxMessageSize: number;
  shutdownTimeout: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  discovery: DiscoveryConfig;
  tls?: {
    enabled: boolean;
    cert?: string;
    key?: string;
  };
  cors?: {
    enabled: boolean;
    origins: string[];
  };
}

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  wsPort: 18789,
  httpPort: 18790,
  port: 18789,
  host: '0.0.0.0',
  enableDiscovery: true,
  deviceName: 'XiaoShagua-Gateway',
  deviceType: DeviceType.DESKTOP,
  capabilities: ['chat', 'file-transfer', 'sync', 'skills'],
  jwtSecret: process.env.XSG_JWT_SECRET || 'xiaoshagua-default-secret',
  jwtExpiresIn: 7 * 24 * 60 * 60 * 1000,
  maxConnections: 100,
  maxMessageSize: 10 * 1024 * 1024,
  shutdownTimeout: 30000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
  discovery: {
    enabled: true,
    method: 'bonjour',
    serviceName: 'xsg-chat',
  },
  cors: {
    enabled: true,
    origins: ['http://localhost', 'http://localhost:3000'],
  },
};

// 连接状态
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// 客户端连接信息
export interface ClientConnection {
  id: string;
  socket: WebSocket;
  state: ConnectionState;
  connectedAt: number;
  lastActivityAt: number;
  auth?: ClientAuth;
  device?: ClientDevice;
  heartbeatTimer?: NodeJS.Timeout;
  heartbeatTimeoutTimer?: NodeJS.Timeout;
  metadata: Map<string, unknown>;
}

export interface ClientAuth {
  userId: string;
  token: string;
  permissionLevel: PermissionLevel;
  authenticatedAt: number;
  expiresAt: number;
}

export interface ClientDevice {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  capabilities: string[];
  version: string;
  publicKey?: string;
}

// 会话类型
export enum SessionState {
  ACTIVE = 'active',
  IDLE = 'idle',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export interface Session {
  id: string;
  userId: string | null;
  clientId?: string;
  clientIds: Set<string>;
  state: SessionState;
  authenticated: boolean;
  createdAt: number;
  lastActivityAt: number;
  lastActivity?: number;
  data: Map<string, unknown>;
  subscribedChannels: Set<string>;
  metadata?: Record<string, unknown>;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  idleSessions: number;
  totalClients: number;
  averageSessionDuration: number;
}

// 消息处理类型
export interface MessageHandler {
  handle(message: GatewayMessage, context: MessageContext): Promise<void>;
}

export interface MessageContext {
  session?: Session;
  server: GatewayServer;
  receivedAt: number;
  clientId: string;
  ws: import('ws').WebSocket;
  sessionManager: import('./session.js').SessionManager;
  authManager: import('./auth.js').AuthManager;
}

export interface MessageHandlerResult {
  success: boolean;
  response?: XSGMessage;
  error?: string;
  broadcast?: boolean;
  targetUserIds?: string[];
}

export interface MessageRoute {
  id: string;
  messageType: string;
  contentType?: string;
  handler: MessageHandler;
  priority: number;
  requireAuth: boolean;
  minPermissionLevel?: PermissionLevel;
}

// 认证授权类型
export interface JWTPayload {
  sub: string;
  deviceId: string;
  level: PermissionLevel;
  iat: number;
  exp: number;
  sessionId?: string;
  claims?: Record<string, unknown>;
}

export interface AuthRequest {
  type: 'jwt' | 'password' | 'token' | 'challenge';
  credentials: Record<string, unknown>;
  device: ClientDevice;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: {
    userId: string;
    permissionLevel: PermissionLevel;
  };
  error?: string;
}

// 设备发现类型
export interface DiscoveredDevice {
  id: string;
  name: string;
  type: DeviceType;
  host: string;
  port: number;
  wsEndpoint: string;
  httpEndpoint: string;
  capabilities: string[];
  publicKey?: string;
  protocolVersion: ProtocolVersion;
  discoveredAt: number;
  lastSeenAt: number;
}

export interface DiscoveryEvent {
  type: 'device_found' | 'device_lost' | 'device_updated';
  device: DiscoveredDevice;
  timestamp: number;
}

// 网关服务器状态
export enum GatewayServerState {
  INITIALIZING = 'initializing',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export interface GatewayServer {
  readonly state: GatewayServerState;
  readonly config: GatewayConfig;
  readonly startedAt?: number;
  
  start(): Promise<void>;
  stop(): Promise<void>;
  broadcast(message: XSGMessage, excludeClientIds?: string[]): void;
  sendToUser(userId: string, message: XSGMessage): void;
  sendToClient(clientId: string, message: XSGMessage): boolean;
  getStats(): GatewayStats;
}

export interface GatewayStats {
  state: GatewayServerState;
  uptime: number;
  wsConnections: number;
  httpRequests: number;
  activeSessions: number;
  totalMessages: number;
  messagesPerSecond: number;
  memoryUsage: number;
  totalConnections: number;
  activeConnections: number;
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  errors: number;
  startTime: number;
}

// HTTP API 类型
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
  requestId: string;
}

export enum APIErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
}

export interface APIRequestContext {
  requestId: string;
  userId?: string;
  permissionLevel?: PermissionLevel;
  deviceId?: string;
  timestamp: number;
}

// 事件类型
export enum GatewayEventType {
  CLIENT_CONNECT = 'client:connect',
  CLIENT_DISCONNECT = 'client:disconnect',
  CLIENT_AUTHENTICATE = 'client:authenticate',
  CLIENT_ERROR = 'client:error',
  MESSAGE_RECEIVE = 'message:receive',
  MESSAGE_SEND = 'message:send',
  SESSION_CREATE = 'session:create',
  SESSION_DESTROY = 'session:destroy',
  SERVER_START = 'server:start',
  SERVER_STOP = 'server:stop',
  SERVER_ERROR = 'server:error',
  DEVICE_DISCOVER = 'device:discover',
  DEVICE_LOST = 'device:lost',
}

export interface GatewayEvent {
  type: GatewayEventType;
  timestamp: number;
  data: unknown;
}

export type GatewayEventHandler = (event: GatewayEvent) => void | Promise<void>;

// 网关模块选项
export interface GatewayModuleOptions {
  config?: Partial<GatewayConfig>;
  messageHandlers?: MessageHandler[];
  routes?: MessageRoute[];
  eventHandlers?: Partial<Record<GatewayEventType, GatewayEventHandler[]>>;
}

// 额外导出类型 (用于兼容其他模块)
export interface AuthConfig {
  enabled: boolean;
  jwtSecret: string;
  tokenExpiry: number;
  minPasswordLength: number;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  userId?: string;
  token?: string;
  expiresAt?: number;
  error?: string;
}

export interface AuthToken {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface UserInfo {
  id: string;
  username: string;
  permissions: string[];
  createdAt: number;
  lastLoginAt: number | null;
}

export interface GatewayClientConfig {
  host: string;
  port: number;
  token?: string;
  reconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
}

export interface GatewayMessage {
  type: string;
  [key: string]: unknown;
}

export interface ChatMessage extends GatewayMessage {
  type: 'chat.message';
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  timestamp: number;
}

export interface SystemMessage extends GatewayMessage {
  type: 'system';
  code: string;
  message: string;
}

export interface DiscoveryConfig {
  enabled: boolean;
  method: 'mdns' | 'bonjour';
  serviceName: string;
  instanceName?: string;
}

export interface ServiceInfo {
  name: string;
  type: string;
  host: string;
  port: number;
  addresses?: string[];
  txt?: Record<string, string>;
  lastSeen: number;
}

export interface SessionManagerConfig {
  maxAge: number;
  inactiveThreshold: number;
}

export interface SessionInfo extends Session {
  isActive: boolean;
  isValid: boolean;
}

export interface ConnectionInfo {
  clientId: string;
  remoteAddress: string;
  userAgent: string;
  connectedAt: number;
  lastActivity: number;
}

export enum GatewayState {
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
}
