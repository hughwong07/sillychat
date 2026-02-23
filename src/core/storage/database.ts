/**
 * Database Manager
 * SillyChat - 数据库管理器
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DatabaseConfig, DatabaseStatus, BlobEntry, Conversation, Message } from './types';

export class DatabaseManager {
  private config: DatabaseConfig;
  private connected = false;
  private db: any = null;
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private blobEntries: Map<string, BlobEntry> = new Map();
  private symlinks: Map<string, any[]> = new Map();

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    // Ensure directory exists
    const dir = path.dirname(this.config.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize in-memory storage for now
    // In production, this would use sqlite-vec or better-sqlite3
    this.connected = true;
  }

  async close(): Promise<void> {
    this.connected = false;
    this.conversations.clear();
    this.messages.clear();
    this.blobEntries.clear();
    this.symlinks.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Blob Operations
  async upsertBlobEntry(hash: string, size: number, mimeType: string): Promise<void> {
    const existing = this.blobEntries.get(hash);
    if (existing) {
      existing.refCount++;
      existing.lastAccessedAt = new Date();
    } else {
      this.blobEntries.set(hash, {
        hash,
        size,
        mimeType,
        refCount: 1,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      });
    }
  }

  async getBlobEntry(hash: string): Promise<BlobEntry | null> {
    return this.blobEntries.get(hash) || null;
  }

  async deleteBlobEntry(hash: string): Promise<void> {
    this.blobEntries.delete(hash);
  }

  async decrementBlobRef(hash: string): Promise<number> {
    const entry = this.blobEntries.get(hash);
    if (entry) {
      entry.refCount--;
      if (entry.refCount <= 0) {
        this.blobEntries.delete(hash);
        return 0;
      }
      return entry.refCount;
    }
    return 0;
  }

  async incrementBlobRef(hash: string): Promise<number> {
    const entry = this.blobEntries.get(hash);
    if (entry) {
      entry.refCount++;
      entry.lastAccessedAt = new Date();
      return entry.refCount;
    }
    return 0;
  }

  // Symlink Operations
  async createSymlink(
    id: string,
    hash: string,
    category: string,
    relativePath: string,
    fileName: string
  ): Promise<void> {
    const symlinkList = this.symlinks.get(hash) || [];
    symlinkList.push({ id, hash, category, relativePath, fileName });
    this.symlinks.set(hash, symlinkList);
  }

  async getSymlinksByHash(hash: string): Promise<any[]> {
    return this.symlinks.get(hash) || [];
  }

  async deleteSymlink(relativePath: string): Promise<void> {
    for (const [hash, links] of this.symlinks.entries()) {
      const filtered = links.filter((link) => link.relativePath !== relativePath);
      if (filtered.length !== links.length) {
        this.symlinks.set(hash, filtered);
        return;
      }
    }
  }

  // Conversation Operations
  private checkConnected(): void {
    if (!this.connected) {
      throw new Error('Database is not connected');
    }
  }

  async createConversation(
    conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Conversation> {
    this.checkConnected();
    const id = crypto.randomUUID();
    const now = new Date();
    const newConversation: Conversation = {
      ...conversation,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async updateConversation(id: string, updates: Partial<Conversation> & { archived?: boolean }): Promise<boolean> {
    this.checkConnected();
    const conversation = this.conversations.get(id);
    if (!conversation) return false;

    const updateData: Partial<Conversation> = { ...updates, updatedAt: new Date() };

    // Handle archived field - convert to archivedAt
    if (updates.archived !== undefined) {
      updateData.archivedAt = updates.archived ? new Date() : undefined;
      delete (updateData as any).archived;
    }

    Object.assign(conversation, updateData);
    this.conversations.set(id, conversation);
    return true;
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }

  async listConversations(options?: {
    archived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> {
    let results = Array.from(this.conversations.values());

    if (options?.archived !== undefined) {
      results = results.filter((c) =>
        options.archived ? c.archivedAt : !c.archivedAt
      );
    }

    // Sort by updatedAt desc
    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || results.length;
    return results.slice(offset, offset + limit);
  }

  async searchConversations(query: string): Promise<Conversation[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.conversations.values()).filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQuery) ||
        (c.metadata && JSON.stringify(c.metadata).toLowerCase().includes(lowerQuery))
    );
  }

  // Message Operations
  async addMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    return this.createMessage(message);
  }

  async createMessage(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const id = crypto.randomUUID();
    const newMessage: Message = {
      ...message,
      id,
      createdAt: new Date(),
    };

    const conversationMessages = this.messages.get(message.conversationId) || [];
    conversationMessages.push(newMessage);
    this.messages.set(message.conversationId, conversationMessages);

    // Update conversation updatedAt
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
    }

    return newMessage;
  }

  async getMessage(id: string, conversationId: string): Promise<Message | null> {
    const conversationMessages = this.messages.get(conversationId) || [];
    return conversationMessages.find((m) => m.id === id) || null;
  }

  async getMessages(conversationId: string, options?: { limit?: number; offset?: number; before?: Date }): Promise<Message[]> {
    let results = this.messages.get(conversationId) || [];

    // Filter by before date if provided
    if (options?.before) {
      results = results.filter(m => m.createdAt < options.before!);
    }

    // Sort by createdAt asc
    results = [...results].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || results.length;
    return results.slice(offset, offset + limit);
  }

  async listMessages(conversationId: string, options?: { limit?: number; offset?: number }): Promise<Message[]> {
    let results = this.messages.get(conversationId) || [];

    // Sort by createdAt asc
    results = [...results].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || results.length;
    return results.slice(offset, offset + limit);
  }

  async deleteMessage(id: string, conversationId?: string): Promise<boolean> {
    if (conversationId) {
      const conversationMessages = this.messages.get(conversationId) || [];
      const index = conversationMessages.findIndex((m) => m.id === id);
      if (index !== -1) {
        conversationMessages.splice(index, 1);
        this.messages.set(conversationId, conversationMessages);
        return true;
      }
      return false;
    }

    // Search in all conversations if conversationId not provided
    for (const [convId, msgs] of this.messages.entries()) {
      const index = msgs.findIndex((m) => m.id === id);
      if (index !== -1) {
        msgs.splice(index, 1);
        this.messages.set(convId, msgs);
        return true;
      }
    }
    return false;
  }

  async searchMessages(query: string, conversationId?: string): Promise<Message[]> {
    const lowerQuery = query.toLowerCase();
    let allMessages: Message[] = [];

    if (conversationId) {
      allMessages = this.messages.get(conversationId) || [];
    } else {
      for (const msgs of this.messages.values()) {
        allMessages.push(...msgs);
      }
    }

    return allMessages.filter((m) => m.content.toLowerCase().includes(lowerQuery));
  }

  // Statistics
  async getStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalBlobs: number;
    totalBlobSize: number;
  }> {
    let totalMessages = 0;
    for (const msgs of this.messages.values()) {
      totalMessages += msgs.length;
    }

    let totalBlobSize = 0;
    for (const entry of this.blobEntries.values()) {
      totalBlobSize += entry.size;
    }

    return {
      totalConversations: this.conversations.size,
      totalMessages,
      totalBlobs: this.blobEntries.size,
      totalBlobSize,
    };
  }
}
