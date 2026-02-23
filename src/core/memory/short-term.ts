/**
 * Short Term Memory Manager
 * SillyChat - 短期记忆管理模块
 */

import { randomUUID } from 'crypto';
import {
  ShortTermMemory,
  ContextWindow,
  ContextWindowConfig,
  DEFAULT_CONTEXT_WINDOW_CONFIG,
  ContextWindowError,
  MemorySource,
  ImportanceLevel
} from './types';

export class ShortTermMemoryManager {
  private windows: Map<string, ContextWindow> = new Map();
  private config: ContextWindowConfig;

  constructor(config: Partial<ContextWindowConfig> = {}) {
    this.config = { ...DEFAULT_CONTEXT_WINDOW_CONFIG, ...config };
  }

  addMemory(
    conversationId: string,
    content: string,
    source: MemorySource,
    tokenCount: number,
    options: {
      messageId?: string;
      importance?: ImportanceLevel;
      metadata?: Record<string, unknown>;
    } = {}
  ): ShortTermMemory {
    const window = this.getOrCreateWindow(conversationId);
    
    const memory: ShortTermMemory = {
      id: randomUUID(),
      type: 'short_term',
      content,
      source,
      status: 'active',
      importance: options.importance || 'medium',
      importanceScore: this.calculateImportanceScore(options.importance),
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
      conversationId,
      messageId: options.messageId,
      metadata: options.metadata,
      position: window.messages.length,
      processed: false,
      tokenCount
    };

    window.messages.push(memory);
    window.totalTokens += tokenCount;
    this.maybeCompressWindow(window);
    
    return memory;
  }

  getWindow(conversationId: string): ContextWindow | undefined {
    return this.windows.get(conversationId);
  }

  getMemories(conversationId: string): ShortTermMemory[] {
    const window = this.windows.get(conversationId);
    return window ? [...window.messages] : [];
  }

  getRecentMemories(conversationId: string, count: number): ShortTermMemory[] {
    const window = this.windows.get(conversationId);
    if (!window) return [];
    return window.messages.slice(-count);
  }

  markAsProcessed(conversationId: string, memoryId: string): boolean {
    const window = this.windows.get(conversationId);
    if (!window) return false;
    const memory = window.messages.find(m => m.id === memoryId);
    if (!memory) return false;
    memory.processed = true;
    memory.updatedAt = new Date();
    return true;
  }

  touchMemory(conversationId: string, memoryId: string): boolean {
    const window = this.windows.get(conversationId);
    if (!window) return false;
    const memory = window.messages.find(m => m.id === memoryId);
    if (!memory) return false;
    memory.accessCount++;
    memory.accessedAt = new Date();
    return true;
  }

  clearMemories(conversationId: string): void {
    this.windows.delete(conversationId);
  }

  getWindowStats(conversationId: string) {
    const window = this.windows.get(conversationId);
    if (!window) return null;
    return {
      messageCount: window.messages.length,
      totalTokens: window.totalTokens,
      isFull: window.isFull,
      processedCount: window.messages.filter(m => m.processed).length
    };
  }

  private maybeCompressWindow(window: ContextWindow): void {
    if (window.totalTokens > this.config.maxTokens) {
      this.compressByTokens(window);
    }
    if (window.messages.length > this.config.maxMessages) {
      this.compressByCount(window);
    }
    window.isFull = window.totalTokens >= this.config.maxTokens * 0.9 ||
                    window.messages.length >= this.config.maxMessages * 0.9;
  }

  private compressByTokens(window: ContextWindow): void {
    const reserveCount = this.config.reserveSystemMessages + this.config.reserveRecentMessages;
    if (window.messages.length <= reserveCount) return;

    const middleStart = this.config.reserveSystemMessages;
    const middleEnd = window.messages.length - this.config.reserveRecentMessages;
    
    if (middleEnd > middleStart) {
      for (let i = middleStart; i < middleEnd; i++) {
        window.messages[i].status = 'archived';
      }
    }

    window.totalTokens = window.messages
      .filter(m => m.status === 'active')
      .reduce((sum, m) => sum + m.tokenCount, 0);
  }

  private compressByCount(window: ContextWindow): void {
    const excessCount = window.messages.length - this.config.maxMessages;
    if (excessCount <= 0) return;

    const reserveCount = this.config.reserveSystemMessages + this.config.reserveRecentMessages;
    
    if (window.messages.length <= reserveCount) {
      const removable = window.messages
        .filter(m => m.source !== 'system' && m.status === 'active')
        .slice(0, excessCount);
      
      for (const memory of removable) {
        memory.status = 'archived';
      }
    } else {
      const middleStart = this.config.reserveSystemMessages;
      const middleEnd = window.messages.length - this.config.reserveRecentMessages;
      const toArchive = Math.min(excessCount, middleEnd - middleStart);
      
      for (let i = middleStart; i < middleStart + toArchive; i++) {
        if (window.messages[i]) {
          window.messages[i].status = 'archived';
        }
      }
    }
  }

  private getOrCreateWindow(conversationId: string): ContextWindow {
    let window = this.windows.get(conversationId);
    if (!window) {
      window = {
        conversationId,
        messages: [],
        totalTokens: 0,
        config: this.config,
        isFull: false
      };
      this.windows.set(conversationId, window);
    }
    return window;
  }

  private calculateImportanceScore(importance?: ImportanceLevel): number {
    const scores: Record<ImportanceLevel, number> = {
      'low': 0.25,
      'medium': 0.5,
      'high': 0.75,
      'critical': 1.0
    };
    return scores[importance || 'medium'];
  }

  getAllStats() {
    let totalMessages = 0;
    let totalTokens = 0;

    for (const window of this.windows.values()) {
      totalMessages += window.messages.length;
      totalTokens += window.totalTokens;
    }

    return {
      conversationCount: this.windows.size,
      totalMessages,
      totalTokens
    };
  }

  cleanupInactiveWindows(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [conversationId, window] of this.windows.entries()) {
      const lastAccess = window.messages.length > 0 
        ? Math.max(...window.messages.map(m => m.accessedAt?.getTime() || m.createdAt.getTime()))
        : 0;
      
      if (now - lastAccess > maxAgeMs) {
        this.windows.delete(conversationId);
        cleaned++;
      }
    }

    return cleaned;
  }
}
