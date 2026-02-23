/**
 * AI代理模块 - 类型定义
 */

import type { AIAgentConfig, AIModelConfig } from '@config/types';

// ============================================
// 角色类型定义
// ============================================

export enum RoleType {
  HUMAN = 'human',
  AI_AVATAR = 'ai_avatar',
  AI_GUEST = 'ai_guest'
}

export const PermissionLevel = {
  MASTER: 100,
  ADMIN: 80,
  AI_COLLABORATE: 60,
  AI_READONLY: 40,
  VISITOR: 20
} as const;

export type PermissionLevelType = typeof PermissionLevel[keyof typeof PermissionLevel];


export interface IRole {
  id: string;
  type: RoleType;
  ownerId: string;
  name: string;
  avatar: string;
  permissionLevel: number;
  createdAt: Date;
  updatedAt: Date;
}


export interface IHumanRole extends IRole {
  type: RoleType.HUMAN;
  permissionLevel: 100;
  isMaster: true;
  email: string;
  phone?: string;
  aiAvatars: string[];
}


export interface IAIAvatarRole extends IRole {
  type: RoleType.AI_AVATAR;
  ownerId: string;
  parentAIId?: string;
  skills: string[];
  personality: Record<string, unknown>;
  knowledgeBases: string[];
  isActive: boolean;
  modelConfig: AIModelConfig;
}


export interface IAIGuestRole extends IRole {
  type: RoleType.AI_GUEST;
  ownerId: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt?: Date;
  scope: 'session' | 'group';
  allowedSkills: string[];
  restrictedTopics: string[];
}

export type Role = IHumanRole | IAIAvatarRole | IAIGuestRole;


export enum AgentStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  DISABLED = 'disabled'
}


export interface AgentCapabilities {
  textGeneration: boolean;
  imageUnderstanding: boolean;
  codeExecution: boolean;
  toolUse: boolean;
  memory: boolean;
  streaming: boolean;
  maxContextTokens: number;
  supportedSkills: string[];
}


export interface AgentIdentity {
  id: string;
  name: string;
  avatar: string;
  role: 'master' | 'assistant' | 'expert' | 'guest';
  description?: string;
  personality?: string;
  welcomeMessage?: string;
  systemPrompt?: string;
}

export interface PermissionContext {
  userId: string;
  operation: OperationType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  modifiers?: PermissionModifier[];
}

export interface PermissionModifier {
  type: 'grant' | 'revoke' | 'elevate' | 'override' | 'boost' | 'reduce';
  targetUserId?: string;
  operation?: OperationType;
  level?: number;
  value?: number;
  expiresAt?: Date;
}


export interface AgentStats {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentState {
  status: AgentStatus;
  currentConversationId?: string;
  activeTools: string[];
  errorMessage?: string;
  lastErrorAt?: Date;
}


export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  senderId: string;
  senderType: RoleType;
  timestamp: Date;
  tokensUsed?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}


export enum ConversationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

export interface Conversation {
  id: string;
  title: string;
  agentId: string;
  ownerId: string;
  status: ConversationStatus;
  messageCount: number;
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
}


export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: unknown[];
  returns?: {
    type: string;
    description: string;
  };
  requiresPermission?: boolean;
  minPermissionLevel?: number;
}

export interface ToolExecutionContext {
  agentId: string;
  conversationId: string;
  userId: string;
  permissionLevel: number;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
}

export interface ITool {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionResult>;
}


export enum OperationType {
  CREATE_SESSION = 'create_session',
  DELETE_SESSION = 'delete_session',
  SEND_MESSAGE = 'send_message',
  CREATE_AI = 'create_ai',
  DELETE_AI = 'delete_ai',
  UPDATE_AI_CONFIG = 'update_ai_config',
  USE_SKILL = 'use_skill',
  GRANT_PERMISSION = 'grant_permission'
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiredLevel?: number;
  currentLevel?: number;
}


export type AIProviderType = 'openai' | 'anthropic' | 'openclaw' | 'local' | 'custom';

export interface StreamChunk {
  id: string;
  content?: string;
  role?: MessageRole;
  finishReason?: string;
}

export type AgentEventType =
  | 'status_changed'
  | 'message_received'
  | 'message_sent'
  | 'error_occurred'
  | 'conversation_created'
  | 'conversation_updated'
  | 'conversation_deleted';

export interface AgentEvent {
  type: AgentEventType;
  agentId: string;
  timestamp: Date;
  data?: unknown;
}

export type AgentEventListener = (event: AgentEvent) => void | Promise<void>;


export enum AgentErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  MODEL_ERROR = 'MODEL_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TOOL_ERROR = 'TOOL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  TOKEN_EXCEEDED = 'TOKEN_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class AgentError extends Error {
  code: AgentErrorCode;
  cause?: Error;
  context?: Record<string, unknown>;

  constructor(
    message: string,
    code: AgentErrorCode,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.cause = cause;
    this.context = context;
  }
}


export interface IAgentManager {
  createAgent(config: AIAgentConfig): Promise<AIAgent>;
  getAgent(id: string): Promise<AIAgent | null>;
  updateAgent(id: string, updates: Partial<AIAgentConfig>): Promise<AIAgent>;
  deleteAgent(id: string): Promise<boolean>;
  listAgents(options?: { ownerId?: string; status?: AgentStatus }): Promise<AIAgent[]>;
  getDefaultAgent(): Promise<AIAgent | null>;
  setDefaultAgent(id: string): Promise<void>;
  on(event: AgentEventType, listener: AgentEventListener): void;
  off(event: AgentEventType, listener: AgentEventListener): void;
}

export interface IConversationManager {
  createConversation(config: {
    agentId: string;
    title?: string;
    ownerId: string;
  }): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  deleteConversation(id: string): Promise<boolean>;
  listConversations(options?: {
    agentId?: string;
    ownerId?: string;
  }): Promise<Conversation[]>;
  addMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<AgentMessage>;
  getMessages(conversationId: string): Promise<AgentMessage[]>;
}


export interface AIAgent {
  readonly id: string;
  readonly identity: AgentIdentity;
  readonly config: AIAgentConfig;
  readonly state: AgentState;
  readonly stats: AgentStats;

  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  createConversation(title?: string): Promise<Conversation>;
  sendMessage(conversationId: string, content: string): Promise<AgentMessage>;
  streamMessage(
    conversationId: string,
    content: string,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<AgentMessage>;
  registerTool(tool: ITool): void;
  unregisterTool(toolId: string): void;
  getRegisteredTools(): ToolDefinition[];
  on(event: AgentEventType, listener: AgentEventListener): void;
  off(event: AgentEventType, listener: AgentEventListener): void;
}

