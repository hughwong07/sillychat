/**
 * Memory Module Type Definitions
 * SillyChat - 记忆模块类型定义
 */

import { EventEmitter } from 'events';

export type MemoryType = 'short_term' | 'long_term' | 'working' | 'episodic';
export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';
export type MemorySource = 'user_message' | 'assistant_message' | 'system' | 'extracted' | 'summarized';
export type MemoryStatus = 'active' | 'archived' | 'consolidated' | 'forgotten';

export const VECTOR_DIMENSION = 1536;


export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  source: MemorySource;
  status: MemoryStatus;
  importance: ImportanceLevel;
  importanceScore: number;
  createdAt: Date;
  updatedAt: Date;
  accessedAt?: Date;
  accessCount: number;
  conversationId?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}

export interface ShortTermMemory extends Memory {
  type: 'short_term' | 'working';
  position: number;
  processed: boolean;
  tokenCount: number;
}

export interface LongTermMemory extends Memory {
  type: 'long_term' | 'episodic';
  embedding?: Float32Array;
  vectorId?: number;
  relatedMemories?: string[];
  summary?: string;
  archivedAt?: Date;
}

export interface MemorySearchResult {
  memory: LongTermMemory;
  similarity: number;
  distance: number;
}

export interface ContextWindowConfig {
  maxTokens: number;
  maxMessages: number;
  reserveSystemMessages: number;
  reserveRecentMessages: number;
}

export interface ContextWindow {
  conversationId: string;
  messages: ShortTermMemory[];
  totalTokens: number;
  config: ContextWindowConfig;
  isFull: boolean;
}

export interface VectorStoreConfig {
  dbPath: string;
  dimension: number;
  metric: 'cosine' | 'l2' | 'inner_product';
  enableWAL?: boolean;
}

export interface EmbeddingConfig {
  provider: 'openai' | 'ollama' | 'local';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  ollamaUrl?: string;
  dimension: number;
  batchSize?: number;
  timeout?: number;
  enableCache?: boolean;
}

export interface SemanticSearchOptions {
  query: string;
  queryEmbedding?: Float32Array;
  limit?: number;
  threshold?: number;
  memoryType?: MemoryType;
  conversationId?: string;
  timeRange?: { start?: Date; end?: Date };
  minImportance?: ImportanceLevel;
}

export interface ArchivalConfig {
  enabled: boolean;
  checkInterval: number;
  shortTermRetention: number;
  importanceThreshold: ImportanceLevel;
  maxActiveMemories: number;
  batchSize: number;
}

export interface ImportanceConfig {
  contentWeight: number;
  accessWeight: number;
  recencyWeight: number;
  sentimentWeight: number;
  keywordWeight: number;
}

export interface MemoryStats {
  shortTermCount: number;
  longTermCount: number;
  vectorCount: number;
  totalSize: number;
  avgImportanceScore: number;
  todayAdded: number;
  todayAccessed: number;
}


export interface IMemoryManager extends EventEmitter {
  initialize(): Promise<void>;
  close(): Promise<void>;
  addToShortTerm(memory: Omit<ShortTermMemory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShortTermMemory>;
  getShortTerm(conversationId: string): Promise<ShortTermMemory[]>;
  clearShortTerm(conversationId: string): Promise<void>;
  addToLongTerm(memory: Omit<LongTermMemory, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>): Promise<LongTermMemory>;
  getLongTerm(id: string): Promise<LongTermMemory | null>;
  updateLongTerm(id: string, updates: Partial<LongTermMemory>): Promise<boolean>;
  deleteLongTerm(id: string): Promise<boolean>;
  semanticSearch(options: SemanticSearchOptions): Promise<MemorySearchResult[]>;
  searchByConversation(conversationId: string, limit?: number): Promise<LongTermMemory[]>;
  getContextWindow(conversationId: string): Promise<ContextWindow>;
  updateContextWindow(conversationId: string, messages: ShortTermMemory[]): Promise<void>;
  archiveMemories(): Promise<number>;
  getArchivedMemories(limit?: number): Promise<LongTermMemory[]>;
  getStats(): Promise<MemoryStats>;
}

export interface IVectorStore {
  initialize(): Promise<void>;
  close(): Promise<void>;
  store(id: string, embedding: Float32Array, metadata?: Record<string, unknown>): Promise<number>;
  storeBatch(items: Array<{ id: string; embedding: Float32Array; metadata?: Record<string, unknown> }>): Promise<number[]>;
  search(embedding: Float32Array, limit?: number, threshold?: number): Promise<Array<{ id: string; distance: number; metadata?: Record<string, unknown> }>>;
  delete(id: string): Promise<boolean>;
  update(id: string, embedding: Float32Array, metadata?: Record<string, unknown>): Promise<boolean>;
  getStats(): Promise<{ count: number; size: number }>;
}

export interface IEmbeddingService {
  initialize(): Promise<void>;
  generate(text: string): Promise<Float32Array>;
  generateBatch(texts: string[]): Promise<Float32Array[]>;
  similarity(a: Float32Array, b: Float32Array): number;
  similarityWithText(embedding: Float32Array, text: string): Promise<number>;
  getConfig(): EmbeddingConfig;
}


export class MemoryError extends Error {
  code: string;
  cause?: Error;
  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'MemoryError';
    this.code = code;
    this.cause = cause;
  }
}

export class VectorStoreError extends MemoryError {
  constructor(message: string, cause?: Error) {
    super(message, 'VECTOR_STORE_ERROR', cause);
    this.name = 'VectorStoreError';
  }
}

export class EmbeddingError extends MemoryError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMBEDDING_ERROR', cause);
    this.name = 'EmbeddingError';
  }
}

export class ContextWindowError extends MemoryError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONTEXT_WINDOW_ERROR', cause);
    this.name = 'ContextWindowError';
  }
}

export const DEFAULT_CONTEXT_WINDOW_CONFIG: ContextWindowConfig = {
  maxTokens: 4096,
  maxMessages: 50,
  reserveSystemMessages: 1,
  reserveRecentMessages: 10
};

export const DEFAULT_VECTOR_STORE_CONFIG: VectorStoreConfig = {
  dbPath: './data/vectors.db',
  dimension: VECTOR_DIMENSION,
  metric: 'cosine',
  enableWAL: true
};

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimension: VECTOR_DIMENSION,
  batchSize: 100,
  timeout: 30000,
  enableCache: true
};

export const DEFAULT_ARCHIVAL_CONFIG: ArchivalConfig = {
  enabled: true,
  checkInterval: 3600000,
  shortTermRetention: 86400000,
  importanceThreshold: 'low',
  maxActiveMemories: 10000,
  batchSize: 100
};

export const DEFAULT_IMPORTANCE_CONFIG: ImportanceConfig = {
  contentWeight: 0.3,
  accessWeight: 0.25,
  recencyWeight: 0.25,
  sentimentWeight: 0.1,
  keywordWeight: 0.1
};
