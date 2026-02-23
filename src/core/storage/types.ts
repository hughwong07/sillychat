/**
 * Storage Module Type Definitions
 * SillyChat - 存储模块类型定义
 */

import { EventEmitter } from 'events';

/** 文件类型分类 */
export type FileCategory = 'images' | 'videos' | 'documents' | 'audio' | 'others';

/** 文件元数据 */
export interface FileMetadata {
  originalName: string;
  originalPath?: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  hash: string;
  createdAt: Date;
  modifiedAt: Date;
  width?: number;
  height?: number;
  duration?: number;
  tags?: string[];
  description?: string;
}

/** Blob存储项 */
export interface BlobEntry {
  hash: string;
  size: number;
  mimeType: string;
  refCount: number;
  createdAt: Date;
  lastAccessedAt: Date;
}

/** 数据库配置 */
export interface DatabaseConfig {
  dbPath: string;
  enableWAL?: boolean;
  busyTimeout?: number;
}

/** 数据库连接状态 */
export interface DatabaseStatus {
  connected: boolean;
  path: string;
  size: number;
  version: number;
}

/** 会话记录 */
export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  systemPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  metadata?: Record<string, unknown>;
}

/** 消息记录 */
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed?: number;
  createdAt: Date;
  attachments?: string[];
}

/** 存储管理器配置 */
export interface StorageConfig {
  dataDir: string;
  database?: DatabaseConfig;
  maxCacheSize?: number;
  autoOrganize?: boolean;
  enableDeduplication?: boolean;
}

/** 存储统计信息 */
export interface StorageStats {
  totalSize: number;
  blobPoolSize: number;
  fileCount: number;
  blobCount: number;
  cacheSize: number;
  databaseSize: number;
}

/** Blob池配置 */
export interface BlobPoolConfig {
  poolPath: string;
  hashAlgorithm?: 'sha256' | 'sha512' | 'md5';
  prefixLength?: number;
}

/** Blob存储结果 */
export interface BlobStoreResult {
  hash: string;
  isNew: boolean;
  path: string;
  size: number;
}

/** 整理器配置 */
export interface OrganizerConfig {
  filesPath: string;
  organizeBy: 'date' | 'type' | 'both';
  dateFormat?: string;
}

/** 文件分类结果 */
export interface ClassificationResult {
  category: FileCategory;
  mimeType: string;
  confidence: number;
}

/** 存储错误 */
export class StorageError extends Error {
  code: string;
  cause?: Error;
  
  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.cause = cause;
  }
}

/** 数据库错误 */
export class DatabaseError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_ERROR', cause);
    this.name = 'DatabaseError';
  }
}

/** Blob池错误 */
export class BlobPoolError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, 'BLOB_POOL_ERROR', cause);
    this.name = 'BlobPoolError';
  }
}

/** 存储管理器接口 */
export interface IStorageManager extends EventEmitter {
  initialize(): Promise<void>;
  close(): Promise<void>;
  storeFile(sourcePath: string, metadata?: Partial<FileMetadata>): Promise<FileMetadata>;
  getFile(hash: string): Promise<{ path: string; metadata: FileMetadata } | null>;
  deleteFile(hash: string): Promise<boolean>;
  fileExists(hash: string): Promise<boolean>;
  createConversation(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<boolean>;
  deleteConversation(id: string): Promise<boolean>;
  listConversations(options?: { archived?: boolean; limit?: number; offset?: number }): Promise<Conversation[]>;
  addMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message>;
  getMessages(conversationId: string, options?: { limit?: number; before?: Date }): Promise<Message[]>;
  deleteMessage(id: string): Promise<boolean>;
  getStats(): Promise<StorageStats>;
}

/** 数据库管理器接口 */
export interface IDatabaseManager {
  connect(): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<{ lastID: number; changes: number }>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  migrate(): Promise<void>;
  getVersion(): Promise<number>;
}

/** Blob池接口 */
export interface IBlobPool {
  initialize(): Promise<void>;
  store(sourcePath: string): Promise<BlobStoreResult>;
  storeBuffer(buffer: Buffer, mimeType: string): Promise<BlobStoreResult>;
  getPath(hash: string): Promise<string | null>;
  getBuffer(hash: string): Promise<Buffer | null>;
  getStream(hash: string): Promise<NodeJS.ReadableStream | null>;
  exists(hash: string): Promise<boolean>;
  delete(hash: string): Promise<boolean>;
  incrementRef(hash: string): Promise<void>;
  decrementRef(hash: string): Promise<void>;
  getRefCount(hash: string): Promise<number>;
  getStats(): Promise<{ totalSize: number; count: number }>;
  cleanup(): Promise<number>;
}

/** 文件整理器接口 */
export interface IFileOrganizer {
  initialize(): Promise<void>;
  classifyFile(filePath: string): Promise<ClassificationResult>;
  classifyByMimeType(mimeType: string): FileCategory;
  organizeFile(hash: string, originalName: string, category: FileCategory): Promise<string>;
  getFilePath(hash: string, category: FileCategory): string;
  createSymlink(hash: string, category: FileCategory, fileName: string): Promise<string>;
  removeSymlink(relativePath: string): Promise<boolean>;
  scanCategory(category: FileCategory): Promise<string[]>;
}
