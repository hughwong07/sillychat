/**
 * SillyChat Protocol - Message Factory Functions
 */

import {
  XSGMessage,
  ChatMessage,
  AgentCommand,
  SystemEvent,
  FileTransfer,
  FileChunk,
  Sender,
  Target,
  Content,
  AuthContext,
  MessageType,
  ContentType,
  SenderRole,
  ChannelType,
  AgentCommandType,
  SystemEventType,
  FileTransferStatus,
  PermissionLevel,
} from "./types";
import {
  PROTOCOL_VERSION,
  DEFAULT_COMMAND_TIMEOUT,
  FILE_CHUNK_SIZE,
  ErrorCode,
} from "./constants";

// ID Generators
export function generateId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).substr(2, 9);
}

export function generateMessageId(): string {
  return "msg-" + generateId();
}

export function generateCommandId(): string {
  return "cmd-" + generateId();
}

export function generateEventId(): string {
  return "evt-" + generateId();
}

export function generateFileId(): string {
  return "file-" + generateId();
}

export function generateDeviceId(): string {
  return "dev-" + generateId();
}

// Sender Factory
export interface SenderOptions {
  userId: string;
  deviceId: string;
  agentId?: string;
  role?: SenderRole;
  displayName?: string;
  avatarUrl?: string;
}

export function createSender(options: SenderOptions): Sender {
  return {
    userId: options.userId,
    deviceId: options.deviceId,
    agentId: options.agentId,
    role: options.role || SenderRole.HUMAN,
    displayName: options.displayName,
    avatarUrl: options.avatarUrl,
  };
}

export function createHumanSender(userId: string, deviceId: string, displayName?: string): Sender {
  return createSender({ userId, deviceId, role: SenderRole.HUMAN, displayName });
}

export function createAISender(agentId: string, userId: string, deviceId: string, displayName?: string): Sender {
  return createSender({ userId, deviceId, agentId, role: SenderRole.AI, displayName });
}

export function createSystemSender(deviceId: string): Sender {
  return createSender({ userId: "system", deviceId, role: SenderRole.SYSTEM, displayName: "System" });
}

// Target Factory
export interface TargetOptions {
  channelId: string;
  channelType?: ChannelType;
  threadId?: string;
  parentMessageId?: string;
}

export function createTarget(options: TargetOptions): Target {
  return {
    channelId: options.channelId,
    channelType: options.channelType || ChannelType.DIRECT,
    threadId: options.threadId,
    parentMessageId: options.parentMessageId,
  };
}

export function createDirectTarget(channelId: string): Target {
  return createTarget({ channelId, channelType: ChannelType.DIRECT });
}

export function createGroupTarget(channelId: string): Target {
  return createTarget({ channelId, channelType: ChannelType.GROUP });
}

export function createProjectTarget(channelId: string): Target {
  return createTarget({ channelId, channelType: ChannelType.PROJECT });
}

export function createReplyTarget(channelId: string, parentMessageId: string, threadId?: string): Target {
  return createTarget({ channelId, channelType: ChannelType.DIRECT, parentMessageId, threadId });
}

// Content Factory
export function createTextContent(text: string, metadata?: Record<string, unknown>): Content {
  return { type: ContentType.TEXT, data: text, metadata };
}

export interface ImageContentData {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  mimeType?: string;
  fileSize?: number;
}

export function createImageContent(data: ImageContentData, metadata?: Record<string, unknown>): Content {
  return { type: ContentType.IMAGE, data, metadata };
}

export interface FileContentData {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url?: string;
  thumbnailUrl?: string;
}

export function createFileContent(data: FileContentData, metadata?: Record<string, unknown>): Content {
  return { type: ContentType.FILE, data, metadata };
}

export interface SkillContentData {
  skillId: string;
  skillName: string;
  command: string;
  parameters: Record<string, unknown>;
  executionId?: string;
}

export function createSkillContent(data: SkillContentData, metadata?: Record<string, unknown>): Content {
  return { type: ContentType.SKILL, data, metadata };
}

export interface AudioContentData {
  url: string;
  duration: number;
  mimeType?: string;
  waveform?: number[];
}

export function createAudioContent(data: AudioContentData, metadata?: Record<string, unknown>): Content {
  return { type: ContentType.AUDIO, data, metadata };
}

export interface VideoContentData {
  url: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  mimeType?: string;
}

export function createVideoContent(data: VideoContentData, metadata?: Record<string, unknown>): Content {
  return { type: ContentType.VIDEO, data, metadata };
}

export interface RichTextContentData {
  html: string;
  plainText: string;
  mentions?: Array<{ userId: string; displayName: string }>;
  links?: Array<{ url: string; title?: string }>;
}

export function createRichTextContent(data: RichTextContentData, metadata?: Record<string, unknown>): Content {
  return { type: ContentType.RICHTEXT, data, metadata };
}

// Auth Context
export interface AuthContextOptions {
  level: PermissionLevel;
  signature?: string;
  token?: string;
  sessionId?: string;
}

export function createAuthContext(options: AuthContextOptions): AuthContext {
  return {
    level: options.level,
    signature: options.signature,
    token: options.token,
    sessionId: options.sessionId,
  };
}

export function createOwnerAuth(signature?: string, token?: string): AuthContext {
  return createAuthContext({ level: PermissionLevel.OWNER, signature, token });
}

export function createAdminAuth(signature?: string, token?: string): AuthContext {
  return createAuthContext({ level: PermissionLevel.ADMIN, signature, token });
}

export function createGuestAuth(token?: string): AuthContext {
  return createAuthContext({ level: PermissionLevel.GUEST, token });
}

// Base Message
export interface BaseMessageOptions {
  sender: Sender;
  target: Target;
  content: Content;
  auth: AuthContext;
  type: MessageType;
  id?: string;
  timestamp?: number;
  version?: string;
  replyTo?: string;
  editHistory?: Array<{ timestamp: number; content: unknown }>;
}

export function createBaseMessage(options: BaseMessageOptions): XSGMessage {
  return {
    id: options.id || generateMessageId(),
    timestamp: options.timestamp || Date.now(),
    type: options.type,
    version: options.version || PROTOCOL_VERSION.name,
    sender: options.sender,
    target: options.target,
    content: options.content,
    auth: options.auth,
    replyTo: options.replyTo,
    editHistory: options.editHistory,
  };
}

// Chat Message
export interface ChatMessageOptions {
  sender: Sender;
  target: Target;
  content: Content;
  auth: AuthContext;
  id?: string;
  timestamp?: number;
  replyTo?: string;
}

export function createChatMessage(options: ChatMessageOptions): ChatMessage {
  return createBaseMessage({ ...options, type: MessageType.CHAT }) as ChatMessage;
}

export function createTextMessage(
  sender: Sender,
  target: Target,
  text: string,
  auth: AuthContext,
  replyTo?: string
): ChatMessage {
  return createChatMessage({ sender, target, content: createTextContent(text), auth, replyTo });
}

export function createImageMessage(
  sender: Sender,
  target: Target,
  imageData: ImageContentData,
  auth: AuthContext,
  replyTo?: string
): ChatMessage {
  return createChatMessage({ sender, target, content: createImageContent(imageData), auth, replyTo });
}

export function createFileMessage(
  sender: Sender,
  target: Target,
  fileData: FileContentData,
  auth: AuthContext,
  replyTo?: string
): ChatMessage {
  return createChatMessage({ sender, target, content: createFileContent(fileData), auth, replyTo });
}

// Agent Command
export interface AgentCommandOptions {
  agentId: string;
  commandType: AgentCommandType;
  payload: unknown;
  sender: Sender;
  auth: AuthContext;
  id?: string;
  timestamp?: number;
  timeout?: number;
  context?: {
    history?: Array<{ role: string; content: string }>;
    files?: string[];
    permissions?: string[];
  };
}

export function createAgentCommand(options: AgentCommandOptions): AgentCommand {
  return {
    id: options.id || generateCommandId(),
    timestamp: options.timestamp || Date.now(),
    type: MessageType.COMMAND,
    version: PROTOCOL_VERSION.name,
    agentId: options.agentId,
    command: { type: options.commandType, payload: options.payload },
    context: {
      history: options.context?.history || [],
      files: options.context?.files || [],
      permissions: options.context?.permissions || [],
    },
    timeout: options.timeout || DEFAULT_COMMAND_TIMEOUT,
    sender: options.sender,
    auth: options.auth,
  };
}

export function createChatCommand(
  agentId: string,
  message: string,
  sender: Sender,
  auth: AuthContext,
  history?: Array<{ role: string; content: string }>
): AgentCommand {
  return createAgentCommand({
    agentId,
    commandType: AgentCommandType.CHAT,
    payload: { text: message },
    sender,
    auth,
    context: { history },
  });
}

export function createSkillCommand(
  agentId: string,
  skillId: string,
  command: string,
  parameters: Record<string, unknown>,
  sender: Sender,
  auth: AuthContext
): AgentCommand {
  return createAgentCommand({
    agentId,
    commandType: AgentCommandType.SKILL,
    payload: { skillId, command, parameters },
    sender,
    auth,
  });
}

export function createToolCommand(
  agentId: string,
  toolName: string,
  parameters: Record<string, unknown>,
  sender: Sender,
  auth: AuthContext
): AgentCommand {
  return createAgentCommand({
    agentId,
    commandType: AgentCommandType.TOOL,
    payload: { toolName, parameters },
    sender,
    auth,
  });
}

// System Event
export interface SystemEventOptions {
  eventType: SystemEventType;
  data: unknown;
  sender?: Sender;
  target?: Target;
  id?: string;
  timestamp?: number;
}

export function createSystemEvent(options: SystemEventOptions): SystemEvent {
  return {
    id: options.id || generateEventId(),
    timestamp: options.timestamp || Date.now(),
    type: MessageType.EVENT,
    version: PROTOCOL_VERSION.name,
    eventType: options.eventType,
    data: options.data,
    sender: options.sender,
    target: options.target,
  };
}

export function createUserJoinEvent(userId: string, channelId: string, displayName?: string): SystemEvent {
  return createSystemEvent({
    eventType: SystemEventType.USER_JOIN,
    data: { userId, channelId, displayName },
    target: createGroupTarget(channelId),
  });
}

export function createUserLeaveEvent(userId: string, channelId: string, reason?: string): SystemEvent {
  return createSystemEvent({
    eventType: SystemEventType.USER_LEAVE,
    data: { userId, reason },
    target: createGroupTarget(channelId),
  });
}

export function createAgentOnlineEvent(agentId: string, channelId?: string): SystemEvent {
  return createSystemEvent({
    eventType: SystemEventType.AGENT_ONLINE,
    data: { agentId, timestamp: Date.now() },
    target: channelId ? createGroupTarget(channelId) : undefined,
  });
}

export function createAgentOfflineEvent(agentId: string, channelId?: string): SystemEvent {
  return createSystemEvent({
    eventType: SystemEventType.AGENT_OFFLINE,
    data: { agentId, timestamp: Date.now() },
    target: channelId ? createGroupTarget(channelId) : undefined,
  });
}

export function createChannelCreatedEvent(channelId: string, channelName: string, createdBy: string): SystemEvent {
  return createSystemEvent({
    eventType: SystemEventType.CHANNEL_CREATED,
    data: { channelId, channelName, createdBy },
    target: createGroupTarget(channelId),
  });
}

export function createSettingsChangedEvent(
  userId: string,
  changes: Record<string, { old: unknown; new: unknown }>
): SystemEvent {
  return createSystemEvent({
    eventType: SystemEventType.SETTINGS_CHANGED,
    data: { userId, changes },
  });
}

export function createSyncCompletedEvent(deviceId: string, syncType: string, itemsSynced: number): SystemEvent {
  return createSystemEvent({
    eventType: SystemEventType.SYNC_COMPLETED,
    data: { deviceId, syncType, itemsSynced, timestamp: Date.now() },
  });
}

export function createErrorEvent(errorCode: string, errorMessage: string, originalMessageId?: string): SystemEvent {
  return createSystemEvent({
    eventType: SystemEventType.ERROR,
    data: { errorCode, errorMessage, originalMessageId },
  });
}

// File Transfer
export interface FileTransferOptions {
  fileId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sender: Sender;
  target: Target;
  auth: AuthContext;
  chunkSize?: number;
  totalChunks?: number;
  checksum?: string;
  encryptionKey?: string;
  resumeFromChunk?: number;
}

export function createFileTransfer(options: FileTransferOptions): FileTransfer {
  const fileId = options.fileId || generateFileId();
  const chunkSize = options.chunkSize || FILE_CHUNK_SIZE;
  const totalChunks = options.totalChunks || Math.ceil(options.fileSize / chunkSize);

  return {
    id: fileId,
    timestamp: Date.now(),
    type: MessageType.FILE,
    version: PROTOCOL_VERSION.name,
    fileId,
    fileName: options.fileName,
    fileSize: options.fileSize,
    mimeType: options.mimeType,
    chunkSize,
    totalChunks,
    chunks: [],
    status: FileTransferStatus.PENDING,
    checksum: options.checksum,
    encryptionKey: options.encryptionKey,
    resumeFromChunk: options.resumeFromChunk || 0,
    sender: options.sender,
    target: options.target,
    auth: options.auth,
  };
}

export interface FileChunkOptions {
  fileId: string;
  chunkIndex: number;
  data: Uint8Array;
  checksum?: string;
  isLast?: boolean;
}

export function createFileChunk(options: FileChunkOptions): FileChunk {
  return {
    fileId: options.fileId,
    chunkIndex: options.chunkIndex,
    data: options.data,
    checksum: options.checksum,
    isLast: options.isLast || false,
  };
}

export function createImageFileTransfer(
  fileName: string,
  fileSize: number,
  sender: Sender,
  target: Target,
  auth: AuthContext,
  options?: { width?: number; height?: number; checksum?: string }
): FileTransfer {
  const ext = fileName.split(".").pop() || "png";
  return createFileTransfer({
    fileName,
    fileSize,
    mimeType: "image/" + ext,
    sender,
    target,
    auth,
    checksum: options?.checksum,
  });
}

// Utility Functions
export function isMessageExpired(message: XSGMessage, maxAgeMs: number = 86400000): boolean {
  // If message has explicit expiresAt, use that
  if (message.expiresAt) {
    return Date.now() > message.expiresAt;
  }
  // Otherwise use timestamp + maxAge
  return Date.now() - message.timestamp > maxAgeMs;
}

export function getMessagePreview(message: XSGMessage, maxLength: number = 100): string {
  if (typeof message.content.data === "string") {
    return message.content.data.length > maxLength
      ? message.content.data.substring(0, maxLength) + "..."
      : message.content.data;
  }
  return "[" + message.content.type + "]";
}

export function isReplyMessage(message: XSGMessage): boolean {
  return !!message.replyTo;
}

export function cloneMessage(message: XSGMessage, newSender?: Sender): XSGMessage {
  return {
    ...message,
    id: generateMessageId(),
    timestamp: Date.now(),
    sender: newSender || message.sender,
  };
}

export function createEditedMessage(
  originalMessage: ChatMessage,
  newContent: Content,
  editor: Sender
): ChatMessage {
  const editHistory = originalMessage.editHistory || [];
  editHistory.push({
    timestamp: originalMessage.timestamp,
    content: originalMessage.content,
  });

  return {
    ...originalMessage,
    content: newContent,
    timestamp: Date.now(),
    editHistory,
    sender: editor,
  };
}
