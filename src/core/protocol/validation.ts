/**
 * SillyChat Protocol - Validation Module
 * 
 * Message validation and schema verification
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
  AuthContext,
  Content,
  MessageType,
  ContentType,
  SenderRole,
  ChannelType,
  AgentCommandType,
  SystemEventType,
  FileTransferStatus,
  PermissionLevel,
  type ValidationError,
  type ValidationResult,
} from "./types";
import {
  PROTOCOL_VERSION,
  MAX_MESSAGE_SIZE,
  MAX_TEXT_LENGTH,
  MAX_FILE_SIZE,
  ErrorCode,
} from "./constants";

interface ValidationWarning {
  path: string;
  code: string;
  message: string;
}

// ============================================================================
// Validation Helpers
// ============================================================================

function createError(code: string, message: string, field?: string): ValidationError {
  return { code, message, path: field || '' };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && value > 0 && value <= Date.now() + 86400000;
}

function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ============================================================================
// Sender Validation
// ============================================================================

export function validateSender(sender: unknown): ValidationResult<Sender> {
  const errors: ValidationError[] = [];
  
  if (!isValidObject(sender)) {
    return {
      valid: false,
      errors: [createError(ErrorCode.VALIDATION_MISSING_FIELD, "Sender must be an object")],
    };
  }
  
  const s = sender as Record<string, unknown>;
  
  // Validate userId
  if (!isNonEmptyString(s.userId)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "Sender userId is required", "sender.userId"));
  }
  
  // Validate deviceId
  if (!isNonEmptyString(s.deviceId)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "Sender deviceId is required", "sender.deviceId"));
  }
  
  // Validate role if present
  if (s.role !== undefined && !Object.values(SenderRole).includes(s.role as SenderRole)) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Invalid sender role", "sender.role"));
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// Target Validation
// ============================================================================

export function validateTarget(target: unknown): ValidationResult<Target> {
  const errors: ValidationError[] = [];
  
  if (!isValidObject(target)) {
    return {
      valid: false,
      errors: [createError(ErrorCode.VALIDATION_MISSING_FIELD, "Target must be an object")],
    };
  }
  
  const t = target as Record<string, unknown>;
  
  // Validate channelId
  if (!isNonEmptyString(t.channelId)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "Target channelId is required", "target.channelId"));
  }
  
  // Validate channelType if present
  if (t.channelType !== undefined && !Object.values(ChannelType).includes(t.channelType as ChannelType)) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Invalid channel type", "target.channelType"));
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// Content Validation
// ============================================================================

export function validateContent(content: unknown): ValidationResult<Content> {
  const errors: ValidationError[] = [];
  
  if (!isValidObject(content)) {
    return {
      valid: false,
      errors: [createError(ErrorCode.VALIDATION_MISSING_FIELD, "Content must be an object")],
    };
  }
  
  const c = content as Record<string, unknown>;
  
  // Validate type
  if (!Object.values(ContentType).includes(c.type as ContentType)) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Invalid content type", "content.type"));
  }
  
  // Validate data exists
  if (c.data === undefined) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "Content data is required", "content.data"));
  }
  
  // Type-specific validation
  if (c.type === ContentType.TEXT && typeof c.data === "string") {
    if (c.data.length > MAX_TEXT_LENGTH) {
      errors.push(createError(
        ErrorCode.VALIDATION_SIZE_EXCEEDED,
        `Text content exceeds maximum length of ${MAX_TEXT_LENGTH}`,
        "content.data"
      ));
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// Auth Context Validation
// ============================================================================

export function validateAuthContext(auth: unknown): ValidationResult<AuthContext> {
  const errors: ValidationError[] = [];
  
  if (!isValidObject(auth)) {
    return {
      valid: false,
      errors: [createError(ErrorCode.VALIDATION_MISSING_FIELD, "Auth context must be an object")],
    };
  }
  
  const a = auth as Record<string, unknown>;
  
  // Validate level
  if (typeof a.level !== "number") {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "Auth level is required", "auth.level"));
  } else if (a.level < 0 || a.level > 100) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TIMESTAMP, "Auth level must be between 0 and 100", "auth.level"));
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// Base Message Validation
// ============================================================================

export function validateBaseMessage(message: unknown): ValidationResult<XSGMessage> {
  const errors: ValidationError[] = [];
  
  if (!isValidObject(message)) {
    return {
      valid: false,
      errors: [createError(ErrorCode.VALIDATION_INVALID_FORMAT, "Message must be an object")],
    };
  }
  
  const m = message as Record<string, unknown>;
  
  // Validate id
  if (!isNonEmptyString(m.id)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "Message id is required", "id"));
  }
  
  // Validate timestamp
  if (!isValidTimestamp(m.timestamp)) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TIMESTAMP, "Valid timestamp is required", "timestamp"));
  }
  
  // Validate type
  if (!Object.values(MessageType).includes(m.type as MessageType)) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Valid message type is required", "type"));
  }
  
  // Validate version
  if (!isNonEmptyString(m.version)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "Protocol version is required", "version"));
  }
  
  // Validate nested objects
  const senderResult = validateSender(m.sender);
  if (!senderResult.valid) {
    errors.push(...(senderResult.errors || []));
  }
  
  const targetResult = validateTarget(m.target);
  if (!targetResult.valid) {
    errors.push(...(targetResult.errors || []));
  }
  
  const contentResult = validateContent(m.content);
  if (!contentResult.valid) {
    errors.push(...(contentResult.errors || []));
  }
  
  const authResult = validateAuthContext(m.auth);
  if (!authResult.valid) {
    errors.push(...(authResult.errors || []));
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// Specific Message Type Validation
// ============================================================================

export function validateChatMessage(message: unknown): ValidationResult<ChatMessage> {
  const baseResult = validateBaseMessage(message);
  const errors = baseResult.errors ? [...baseResult.errors] : [];
  
  const m = message as Record<string, unknown>;
  
  if (m.type !== MessageType.CHAT) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Message must be of type CHAT", "type"));
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function validateAgentCommand(message: unknown): ValidationResult<AgentCommand> {
  const errors: ValidationError[] = [];

  if (!isValidObject(message)) {
    return {
      valid: false,
      errors: [createError(ErrorCode.VALIDATION_INVALID_FORMAT, "Message must be an object")],
    };
  }
  
  const m = message as Record<string, unknown>;
  
  if (m.type !== MessageType.COMMAND) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Message must be of type COMMAND", "type"));
  }
  
  // Validate agentId
  if (!isNonEmptyString(m.agentId)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "Agent ID is required for commands", "agentId"));
  }
  
  // Validate command structure
  if (!isValidObject(m.command)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "Command object is required", "command"));
  } else {
    const cmd = m.command as Record<string, unknown>;
    if (!Object.values(AgentCommandType).includes(cmd.type as AgentCommandType)) {
      errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Valid command type is required", "command.type"));
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function validateSystemEvent(message: unknown): ValidationResult<SystemEvent> {
  const errors: ValidationError[] = [];

  if (!isValidObject(message)) {
    return {
      valid: false,
      errors: [createError(ErrorCode.VALIDATION_INVALID_FORMAT, "Message must be an object")],
    };
  }

  const m = message as Record<string, unknown>;
  
  if (m.type !== MessageType.EVENT) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Message must be of type EVENT", "type"));
  }
  
  // Validate eventType
  if (!Object.values(SystemEventType).includes(m.eventType as SystemEventType)) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Valid event type is required", "eventType"));
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function validateFileTransfer(message: unknown): ValidationResult<FileTransfer> {
  const errors: ValidationError[] = [];

  if (!isValidObject(message)) {
    return {
      valid: false,
      errors: [createError(ErrorCode.VALIDATION_INVALID_FORMAT, "Message must be an object")],
    };
  }

  const m = message as Record<string, unknown>;

  if (m.type !== MessageType.FILE) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TYPE, "Message must be of type FILE", "type"));
  }
  
  // Validate file-specific fields
  if (!isNonEmptyString(m.fileId)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "File ID is required", "fileId"));
  }
  
  if (!isNonEmptyString(m.fileName)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "File name is required", "fileName"));
  }
  
  if (typeof m.fileSize !== "number" || m.fileSize <= 0) {
    errors.push(createError(ErrorCode.VALIDATION_INVALID_TIMESTAMP, "Valid file size is required", "fileSize"));
  } else if (m.fileSize > MAX_FILE_SIZE) {
    errors.push(createError(
      ErrorCode.VALIDATION_SIZE_EXCEEDED,
      `File size exceeds maximum of ${MAX_FILE_SIZE} bytes`,
      "fileSize"
    ));
  }
  
  if (!isNonEmptyString(m.mimeType)) {
    errors.push(createError(ErrorCode.VALIDATION_MISSING_FIELD, "MIME type is required", "mimeType"));
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// Generic Message Validation
// ============================================================================

export function validateMessage(message: unknown): ValidationResult<unknown> {
  const baseResult = validateBaseMessage(message);
  if (!baseResult.valid) {
    return baseResult;
  }

  const m = message as Record<string, unknown>;
  const type = m.type as MessageType;

  switch (type) {
    case MessageType.CHAT:
      return validateChatMessage(message);
    case MessageType.COMMAND:
      return validateAgentCommand(message);
    case MessageType.EVENT:
      return validateSystemEvent(message);
    case MessageType.FILE:
      return validateFileTransfer(message);
    case MessageType.SYSTEM:
      return baseResult;
    default:
      return {
        valid: false,
        errors: [createError(ErrorCode.VALIDATION_INVALID_TYPE, "Unknown message type: " + type, "type")],
      };
  }
}

// Batch Validation
export interface BatchValidationResult {
  valid: boolean;
  total: number;
  validCount: number;
  invalidCount: number;
  errors: Array<{ index: number; errors: ValidationError[] }>;
}

export function validateBatch(messages: unknown[]): BatchValidationResult {
  const errors: Array<{ index: number; errors: ValidationError[] }> = [];
  let validCount = 0;
  
  for (let i = 0; i < messages.length; i++) {
    const result = validateMessage(messages[i]);
    if (result.valid) {
      validCount++;
    } else if (result.errors) {
      errors.push({ index: i, errors: result.errors });
    }
  }
  
  return {
    valid: errors.length === 0,
    total: messages.length,
    validCount,
    invalidCount: messages.length - validCount,
    errors,
  };
}

// Sanitization
export function sanitizeText(text: string): string {
  return text
    .replace(/\u003c/g, "\u0026lt;")
    .replace(/\u003e/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/\u0027/g, "\u0026#x27;")
    .replace(/\//g, "\u0026#x2F;");
}

export function sanitizeContent(content: Content): Content {
  if (content.type === ContentType.TEXT && typeof content.data === "string") {
    return {
      ...content,
      data: sanitizeText(content.data),
    };
  }
  return content;
}

// Schema Version Check
export function checkVersionCompatibility(version: string): {
  compatible: boolean;
  currentVersion: string;
  message: string;
} {
  const current = PROTOCOL_VERSION.name;
  
  if (version === current) {
    return {
      compatible: true,
      currentVersion: current,
      message: "Versions match",
    };
  }
  
  const versionParts = version.split("-v");
  const currentParts = current.split("-v");
  
  if (versionParts[0] !== currentParts[0]) {
    return {
      compatible: false,
      currentVersion: current,
      message: "Protocol family mismatch: " + versionParts[0] + " vs " + currentParts[0],
    };
  }
  
  return {
    compatible: true,
    currentVersion: current,
    message: "Version mismatch but same protocol family: " + version + " vs " + current,
  };
}

// Protocol Validator Class
export class ProtocolValidator {
  private schemas: Map<string, unknown> = new Map();

  validateMessage(message: unknown): { success: boolean; data?: unknown; errors?: string[] } {
    if (!message || typeof message !== 'object') {
      return { success: false, errors: ['Message must be an object'] };
    }

    const msg = message as Record<string, unknown>;

    if (!msg.type || typeof msg.type !== 'string') {
      return { success: false, errors: ['Message must have a type string'] };
    }

    return { success: true, data: message };
  }

  registerSchema(type: string, schema: unknown): void {
    this.schemas.set(type, schema);
  }

  validate<T>(type: string, data: unknown): { success: boolean; data?: T; errors?: string[] } {
    const schema = this.schemas.get(type);
    if (!schema) {
      return { success: false, errors: [`Unknown type: ${type}`] };
    }
    return { success: true, data: data as T };
  }
}
