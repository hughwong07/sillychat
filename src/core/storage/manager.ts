/**
 * Storage Manager
 * 小傻瓜聊天工具 - 存储管理器主类
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { DatabaseManager } from './database';
import { BlobPool } from './blob';
import { FileOrganizer } from './organizer';
import type {
  IStorageManager,
  StorageConfig,
  FileMetadata,
  FileCategory,
  StorageStats,
  Conversation,
  Message,
} from './types';

const DEFAULT_DATA_DIR = path.join(os.homedir(), '.silly', 'data');

export class StorageManager extends EventEmitter implements IStorageManager {
  private config: Required<StorageConfig>;
  private db: DatabaseManager;
  private blobPool: BlobPool;
  private organizer: FileOrganizer;
  private initialized = false;

  constructor(config?: Partial<StorageConfig>) {
    super();
    this.config = {
      dataDir: config?.dataDir || DEFAULT_DATA_DIR,
      maxCacheSize: config?.maxCacheSize || 100 * 1024 * 1024, // 100MB
      autoOrganize: config?.autoOrganize ?? true,
      enableDeduplication: config?.enableDeduplication ?? true,
    };

    const dbPath = path.join(this.config.dataDir, 'database', 'silly.db');
    this.db = new DatabaseManager({ dbPath });
    
    this.blobPool = new BlobPool({
      poolPath: path.join(this.config.dataDir, 'blobs'),
    });
    
    this.organizer = new FileOrganizer({
      filesPath: path.join(this.config.dataDir, 'files'),
      organizeBy: 'date',
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create data directory structure
    const dirs = [
      path.join(this.config.dataDir, 'database'),
      path.join(this.config.dataDir, 'blobs'),
      path.join(this.config.dataDir, 'files'),
      path.join(this.config.dataDir, 'cache'),
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Initialize components
    await this.db.connect();
    await this.blobPool.initialize();
    await this.organizer.initialize();

    this.initialized = true;
    this.emit('initialized');
  }

  async close(): Promise<void> {
    await this.db.close();
    this.initialized = false;
    this.emit('closed');
  }

  // File Operations
  async storeFile(sourcePath: string, metadata?: Partial<FileMetadata>): Promise<FileMetadata> {
    // Store in blob pool (deduplication)
    const blobResult = await this.blobPool.store(sourcePath);
    
    // Get file classification
    const classification = await this.organizer.classifyFile(sourcePath);
    
    // Create file metadata
    const fileMetadata: FileMetadata = {
      originalName: metadata?.originalName || path.basename(sourcePath),
      originalPath: sourcePath,
      mimeType: metadata?.mimeType || classification.mimeType,
      size: blobResult.size,
      category: metadata?.category || classification.category,
      hash: blobResult.hash,
      createdAt: new Date(),
      modifiedAt: new Date(),
      ...metadata,
    };

    // Store blob entry in database
    await this.db.upsertBlobEntry(blobResult.hash, blobResult.size, fileMetadata.mimeType);

    // Create symlink in organized folder
    if (this.config.autoOrganize) {
      const symlinkPath = await this.organizer.createSymlink(
        blobResult.hash,
        fileMetadata.category,
        fileMetadata.originalName
      );
      await this.db.createSymlink(
        crypto.randomUUID(),
        blobResult.hash,
        fileMetadata.category,
        symlinkPath,
        fileMetadata.originalName
      );
    }

    this.emit('file:added', { hash: blobResult.hash, path: blobResult.path, category: fileMetadata.category });
    
    if (!blobResult.isNew) {
      this.emit('file:deduplicated', { hash: blobResult.hash, savedSpace: blobResult.size });
    }

    return fileMetadata;
  }

  async getFile(hash: string): Promise<{ path: string; metadata: FileMetadata } | null> {
    const blobPath = await this.blobPool.getPath(hash);
    if (!blobPath) return null;

    const entry = await this.db.getBlobEntry(hash);
    if (!entry) return null;

    const symlinks = await this.db.getSymlinksByHash(hash);
    const symlink = symlinks[0];

    const metadata: FileMetadata = {
      originalName: symlink?.fileName || hash,
      mimeType: entry.mimeType,
      size: entry.size,
      category: (symlink?.category as FileCategory) || 'others',
      hash,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    return { path: blobPath, metadata };
  }

  async deleteFile(hash: string): Promise<boolean> {
    const refCount = await this.db.decrementBlobRef(hash);
    
    if (refCount <= 0) {
      // Delete blob from pool
      await this.blobPool.delete(hash);
      await this.db.deleteBlobEntry(hash);
    }

    // Delete symlinks
    const symlinks = await this.db.getSymlinksByHash(hash);
    for (const symlink of symlinks) {
      await this.organizer.removeSymlink(symlink.relativePath);
      await this.db.deleteSymlink(symlink.relativePath);
    }

    this.emit('file:removed', { hash });
    return true;
  }

  async fileExists(hash: string): Promise<boolean> {
    return this.blobPool.exists(hash);
  }

  // Conversation Operations
  async createConversation(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation> {
    return this.db.createConversation(conversation);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.db.getConversation(id);
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<boolean> {
    return this.db.updateConversation(id, updates);
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.db.deleteConversation(id);
  }

  async listConversations(options?: { archived?: boolean; limit?: number; offset?: number }): Promise<Conversation[]> {
    return this.db.listConversations(options);
  }

  // Message Operations
  async addMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    return this.db.addMessage(message);
  }

  async getMessages(conversationId: string, options?: { limit?: number; before?: Date }): Promise<Message[]> {
    return this.db.getMessages(conversationId, options);
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.db.deleteMessage(id);
  }

  // Stats
  async getStats(): Promise<StorageStats> {
    const blobStats = await this.blobPool.getStats();
    const dbStats = fs.statSync(path.join(this.config.dataDir, 'database', 'silly.db'));

    return {
      totalSize: blobStats.totalSize + dbStats.size,
      blobPoolSize: blobStats.totalSize,
      fileCount: blobStats.count,
      blobCount: blobStats.count,
      cacheSize: 0,
      databaseSize: dbStats.size,
    };
  }
}
