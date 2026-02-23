/**
 * SillyChat Protocol - Constants
 *
 * 协议常量定义
 */

import { ProtocolVersion } from './types';

// ============================================
// 协议版本
// ============================================

export const PROTOCOL_VERSION: ProtocolVersion = {
  major: 1,
  minor: 0,
  patch: 0,
  name: 'SillyChat-Protocol-v1',
};

// ============================================
// 消息大小限制
// ============================================

/** 最大消息大小 (10MB) */
export const MAX_MESSAGE_SIZE = 10 * 1024 * 1024;

/** 最大文本内容长度 (64KB) */
export const MAX_TEXT_LENGTH = 64 * 1024;

/** 最大文件大小 (1GB) */
export const MAX_FILE_SIZE = 1024 * 1024 * 1024;

/** 文件块大小 (64KB) */
export const FILE_CHUNK_SIZE = 64 * 1024;

/** 最大历史消息数 */
export const MAX_HISTORY_MESSAGES = 100;

// ============================================
// 超时配置
// ============================================

/** 默认命令超时 (30秒) */
export const DEFAULT_COMMAND_TIMEOUT = 30000;

/** 最大命令超时 (5分钟) */
export const MAX_COMMAND_TIMEOUT = 5 * 60 * 1000;

/** 连接超时 (10秒) */
export const CONNECTION_TIMEOUT = 10000;

/** 心跳间隔 (30秒) */
export const HEARTBEAT_INTERVAL = 30000;

/** 心跳超时 (90秒) */
export const HEARTBEAT_TIMEOUT = 90000;

// ============================================
// 重试配置
// ============================================

/** 最大重试次数 */
export const MAX_RETRY_COUNT = 3;

/** 重试间隔 (毫秒) */
export const RETRY_INTERVALS = [1000, 2000, 4000];

// ============================================
// 验证规则
// ============================================

/** ID长度限制 */
export const ID_MIN_LENGTH = 8;
export const ID_MAX_LENGTH = 64;

/** 用户ID正则 */
export const USER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 通道ID正则 */
export const CHANNEL_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 设备ID正则 */
export const DEVICE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// ============================================
// 序列化配置
// ============================================

/** 默认序列化格式 */
export const DEFAULT_SERIALIZATION_FORMAT = 'json' as const;

/** Protobuf wire type */
export const PROTOBUF_WIRE_TYPES = {
  VARINT: 0,
  FIXED64: 1,
  LENGTH_DELIMITED: 2,
  START_GROUP: 3,
  END_GROUP: 4,
  FIXED32: 5,
} as const;

// ============================================
// 错误代码
// ============================================

export const ErrorCode = {
  // 验证错误 (1000-1999)
  VALIDATION_INVALID_FORMAT: '1000',
  VALIDATION_MISSING_FIELD: '1001',
  VALIDATION_INVALID_TYPE: '1002',
  VALIDATION_SIZE_EXCEEDED: '1003',
  VALIDATION_INVALID_ID: '1004',
  VALIDATION_INVALID_TIMESTAMP: '1005',
  VALIDATION_INVALID_SIGNATURE: '1006',

  // 序列化错误 (2000-2999)
  SERIALIZATION_FAILED: '2000',
  DESERIALIZATION_FAILED: '2001',
  UNSUPPORTED_FORMAT: '2002',
  COMPRESSION_FAILED: '2003',

  // 权限错误 (3000-3999)
  PERMISSION_DENIED: '3000',
  INVALID_TOKEN: '3001',
  TOKEN_EXPIRED: '3002',
  INSUFFICIENT_LEVEL: '3003',

  // 传输错误 (4000-4999)
  TRANSPORT_FAILED: '4000',
  CONNECTION_LOST: '4001',
  TIMEOUT: '4002',
  RATE_LIMITED: '4003',

  // 文件传输错误 (5000-5999)
  FILE_NOT_FOUND: '5000',
  FILE_TOO_LARGE: '5001',
  CHECKSUM_MISMATCH: '5002',
  TRANSFER_CANCELLED: '5003',
} as const;

// ============================================
// 内容类型 MIME 映射
// ============================================

export const CONTENT_TYPE_MIME_MAP: Record<string, string> = {
  text: 'text/plain',
  image: 'image/*',
  file: 'application/octet-stream',
  skill: 'application/json',
  audio: 'audio/*',
  video: 'video/*',
  richtext: 'text/html',
};

// ============================================
// 默认字段值
// ============================================

export const DEFAULTS = {
  /** 默认权限级别 */
  PERMISSION_LEVEL: 20,
  /** 默认内容格式 */
  TEXT_FORMAT: 'plain' as const,
  /** 默认优先级 */
  PRIORITY: 0,
  /** 默认超时 */
  TIMEOUT: 30000,
} as const;
