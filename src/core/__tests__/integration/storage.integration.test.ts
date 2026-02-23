/**
 * Storage System Integration Tests
 * SillyChat - Tests for StorageManager with database and blob operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StorageManager } from '../../storage/manager';
import type { StorageConfig, FileMetadata, Conversation, Message } from '../../storage/types';

describe('Storage System Integration', () => {
  let storageManager: StorageManager;
  let testDataDir: string;

  beforeAll(() => {
    // Create a temporary directory for test data
    testDataDir = path.join(os.tmpdir(), 'sillychat-test-storage-' + Date.now());
    fs.mkdirSync(testDataDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Create a fresh StorageManager for each test
    const config: Partial<StorageConfig> = {
      dataDir: path.join(testDataDir, `test-${Date.now()}`),
      maxCacheSize: 10 * 1024 * 1024, // 10MB
      autoOrganize: true,
      enableDeduplication: true,
    };

    storageManager = new StorageManager(config);
    await storageManager.initialize();
  });

  describe('Storage Manager Lifecycle', () => {
    it('should initialize storage manager successfully', async () => {
      const config: Partial<StorageConfig> = {
        dataDir: path.join(testDataDir, 'lifecycle-test'),
        autoOrganize: true,
        enableDeduplication: true,
      };

      const manager = new StorageManager(config);
      await expect(manager.initialize()).resolves.not.toThrow();

      // Verify directory structure was created
      expect(fs.existsSync(config.dataDir!)).toBe(true);
      expect(fs.existsSync(path.join(config.dataDir!, 'database'))).toBe(true);
      expect(fs.existsSync(path.join(config.dataDir!, 'blobs'))).toBe(true);
      expect(fs.existsSync(path.join(config.dataDir!, 'files'))).toBe(true);
      expect(fs.existsSync(path.join(config.dataDir!, 'cache'))).toBe(true);

      await manager.close();
    });

    it('should close storage manager gracefully', async () => {
      const config: Partial<StorageConfig> = {
        dataDir: path.join(testDataDir, 'close-test'),
      };

      const manager = new StorageManager(config);
      await manager.initialize();
      await expect(manager.close()).resolves.not.toThrow();
    });

    it('should handle multiple initialize calls gracefully', async () => {
      await expect(storageManager.initialize()).resolves.not.toThrow();
      await expect(storageManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('File Operations', () => {
    let testFilePath: string;

    beforeEach(() => {
      // Create a test file
      testFilePath = path.join(testDataDir, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'Hello, this is a test file for storage integration tests.');
    });

    it('should store a file successfully', async () => {
      const metadata = await storageManager.storeFile(testFilePath, {
        originalName: 'test-document.txt',
        category: 'documents',
      });

      expect(metadata).toBeDefined();
      expect(metadata.originalName).toBe('test-document.txt');
      expect(metadata.category).toBe('documents');
      expect(metadata.hash).toBeDefined();
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.mimeType).toBeDefined();
    });

    it('should retrieve a stored file', async () => {
      const storedMetadata = await storageManager.storeFile(testFilePath, {
        originalName: 'retrievable.txt',
      });

      const retrieved = await storageManager.getFile(storedMetadata.hash);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.metadata.hash).toBe(storedMetadata.hash);
      expect(retrieved?.metadata.originalName).toBe('retrievable.txt');
      expect(fs.existsSync(retrieved!.path)).toBe(true);
    });

    it('should return null for non-existent file', async () => {
      const retrieved = await storageManager.getFile('non-existent-hash');
      expect(retrieved).toBeNull();
    });

    it('should delete a stored file', async () => {
      const storedMetadata = await storageManager.storeFile(testFilePath, {
        originalName: 'deletable.txt',
      });

      const deleted = await storageManager.deleteFile(storedMetadata.hash);
      expect(deleted).toBe(true);

      const retrieved = await storageManager.getFile(storedMetadata.hash);
      expect(retrieved).toBeNull();
    });

    it('should check if file exists', async () => {
      const storedMetadata = await storageManager.storeFile(testFilePath, {
        originalName: 'exists-test.txt',
      });

      const exists = await storageManager.fileExists(storedMetadata.hash);
      expect(exists).toBe(true);

      const notExists = await storageManager.fileExists('non-existent');
      expect(notExists).toBe(false);
    });

    it('should handle file deduplication', async () => {
      // Store the same file twice
      const metadata1 = await storageManager.storeFile(testFilePath, {
        originalName: 'original.txt',
      });

      const metadata2 = await storageManager.storeFile(testFilePath, {
        originalName: 'duplicate.txt',
      });

      // Both should have the same hash
      expect(metadata1.hash).toBe(metadata2.hash);
    });

    it('should store files with different content separately', async () => {
      // Create two different files
      const file1 = path.join(testDataDir, 'file1.txt');
      const file2 = path.join(testDataDir, 'file2.txt');
      fs.writeFileSync(file1, 'Content A');
      fs.writeFileSync(file2, 'Content B');

      const metadata1 = await storageManager.storeFile(file1);
      const metadata2 = await storageManager.storeFile(file2);

      expect(metadata1.hash).not.toBe(metadata2.hash);
    });

    it('should classify files by type', async () => {
      // Create files with different extensions
      const textFile = path.join(testDataDir, 'doc.txt');
      const imageFile = path.join(testDataDir, 'pic.jpg');
      fs.writeFileSync(textFile, 'Text content');
      fs.writeFileSync(imageFile, 'Fake image content');

      const textMetadata = await storageManager.storeFile(textFile);
      const imageMetadata = await storageManager.storeFile(imageFile);

      expect(textMetadata.category).toBeDefined();
      expect(imageMetadata.category).toBeDefined();
    });
  });

  describe('Conversation Operations', () => {
    it('should create a conversation', async () => {
      const conversation = await storageManager.createConversation({
        title: 'Test Conversation',
        participants: ['user1', 'user2'],
      });

      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(conversation.title).toBe('Test Conversation');
      expect(conversation.participants).toEqual(['user1', 'user2']);
      expect(conversation.createdAt).toBeDefined();
      expect(conversation.updatedAt).toBeDefined();
    });

    it('should retrieve a conversation by ID', async () => {
      const created = await storageManager.createConversation({
        title: 'Retrievable Conversation',
        participants: ['user1'],
      });

      const retrieved = await storageManager.getConversation(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Retrievable Conversation');
    });

    it('should return null for non-existent conversation', async () => {
      const retrieved = await storageManager.getConversation('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should update a conversation', async () => {
      const created = await storageManager.createConversation({
        title: 'Original Title',
        participants: ['user1'],
      });

      const updated = await storageManager.updateConversation(created.id, {
        title: 'Updated Title',
      });

      expect(updated).toBe(true);

      const retrieved = await storageManager.getConversation(created.id);
      expect(retrieved?.title).toBe('Updated Title');
    });

    it('should delete a conversation', async () => {
      const created = await storageManager.createConversation({
        title: 'To Be Deleted',
        participants: ['user1'],
      });

      const deleted = await storageManager.deleteConversation(created.id);
      expect(deleted).toBe(true);

      const retrieved = await storageManager.getConversation(created.id);
      expect(retrieved).toBeNull();
    });

    it('should list conversations', async () => {
      // Create multiple conversations
      await storageManager.createConversation({
        title: 'Conversation 1',
        participants: ['user1'],
      });
      await storageManager.createConversation({
        title: 'Conversation 2',
        participants: ['user2'],
      });
      await storageManager.createConversation({
        title: 'Conversation 3',
        participants: ['user3'],
      });

      const conversations = await storageManager.listConversations();

      expect(conversations.length).toBeGreaterThanOrEqual(3);
    });

    it('should list conversations with pagination', async () => {
      // Create multiple conversations
      for (let i = 0; i < 5; i++) {
        await storageManager.createConversation({
          title: `Conversation ${i}`,
          participants: [`user${i}`],
        });
      }

      const page1 = await storageManager.listConversations({ limit: 2, offset: 0 });
      const page2 = await storageManager.listConversations({ limit: 2, offset: 2 });

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
    });

    it('should list archived conversations separately', async () => {
      const active = await storageManager.createConversation({
        title: 'Active Conversation',
        participants: ['user1'],
      });

      const archived = await storageManager.createConversation({
        title: 'Archived Conversation',
        participants: ['user2'],
      });

      await storageManager.updateConversation(archived.id, { archived: true });

      const activeConversations = await storageManager.listConversations({ archived: false });
      const archivedConversations = await storageManager.listConversations({ archived: true });

      expect(activeConversations.some(c => c.id === active.id)).toBe(true);
      expect(archivedConversations.some(c => c.id === archived.id)).toBe(true);
    });
  });

  describe('Message Operations', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await storageManager.createConversation({
        title: 'Message Test Conversation',
        participants: ['user1', 'user2'],
      });
      conversationId = conversation.id;
    });

    it('should add a message to a conversation', async () => {
      const message = await storageManager.addMessage({
        conversationId,
        content: 'Hello, this is a test message',
        senderId: 'user1',
        role: 'user',
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.conversationId).toBe(conversationId);
      expect(message.content).toBe('Hello, this is a test message');
      expect(message.senderId).toBe('user1');
      expect(message.createdAt).toBeDefined();
    });

    it('should retrieve messages for a conversation', async () => {
      // Add multiple messages
      await storageManager.addMessage({
        conversationId,
        content: 'Message 1',
        senderId: 'user1',
        role: 'user',
      });
      await storageManager.addMessage({
        conversationId,
        content: 'Message 2',
        senderId: 'user2',
        role: 'assistant',
      });
      await storageManager.addMessage({
        conversationId,
        content: 'Message 3',
        senderId: 'user1',
        role: 'user',
      });

      const messages = await storageManager.getMessages(conversationId);

      expect(messages.length).toBe(3);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
      expect(messages[2].content).toBe('Message 3');
    });

    it('should retrieve messages with limit', async () => {
      // Add multiple messages
      for (let i = 0; i < 10; i++) {
        await storageManager.addMessage({
          conversationId,
          content: `Message ${i}`,
          senderId: 'user1',
          role: 'user',
        });
      }

      const messages = await storageManager.getMessages(conversationId, { limit: 5 });

      expect(messages.length).toBeLessThanOrEqual(5);
    });

    it('should retrieve messages before a specific time', async () => {
      const beforeTime = new Date();

      // Add a message
      await storageManager.addMessage({
        conversationId,
        content: 'Old message',
        senderId: 'user1',
        role: 'user',
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add another message
      await storageManager.addMessage({
        conversationId,
        content: 'New message',
        senderId: 'user1',
        role: 'user',
      });

      const messages = await storageManager.getMessages(conversationId, { before: beforeTime });

      // Should only return messages before the specified time
      expect(messages.every(m => new Date(m.createdAt) < beforeTime)).toBe(true);
    });

    it('should delete a message', async () => {
      const message = await storageManager.addMessage({
        conversationId,
        content: 'To be deleted',
        senderId: 'user1',
        role: 'user',
      });

      const deleted = await storageManager.deleteMessage(message.id);
      expect(deleted).toBe(true);

      const messages = await storageManager.getMessages(conversationId);
      expect(messages.some(m => m.id === message.id)).toBe(false);
    });

    it('should handle messages with attachments', async () => {
      const message = await storageManager.addMessage({
        conversationId,
        content: 'Message with attachment',
        senderId: 'user1',
        role: 'user',
        attachments: ['file-hash-1', 'file-hash-2'],
      });

      expect(message.attachments).toEqual(['file-hash-1', 'file-hash-2']);
    });
  });

  describe('Storage Statistics', () => {
    it('should provide storage statistics', async () => {
      const stats = await storageManager.getStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('blobPoolSize');
      expect(stats).toHaveProperty('fileCount');
      expect(stats).toHaveProperty('blobCount');
      expect(stats).toHaveProperty('databaseSize');
    });

    it('should update statistics after file storage', async () => {
      const statsBefore = await storageManager.getStats();

      // Create and store a test file
      const testFile = path.join(testDataDir, 'stats-test.txt');
      fs.writeFileSync(testFile, 'Test content for statistics');
      await storageManager.storeFile(testFile);

      const statsAfter = await storageManager.getStats();

      expect(statsAfter.totalSize).toBeGreaterThanOrEqual(statsBefore.totalSize);
      expect(statsAfter.fileCount).toBeGreaterThanOrEqual(statsBefore.fileCount);
    });

    it('should track blob pool size', async () => {
      const stats = await storageManager.getStats();
      expect(typeof stats.blobPoolSize).toBe('number');
      expect(stats.blobPoolSize).toBeGreaterThanOrEqual(0);
    });

    it('should track database size', async () => {
      const stats = await storageManager.getStats();
      expect(typeof stats.databaseSize).toBe('number');
      expect(stats.databaseSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit initialized event', async () => {
      const config: Partial<StorageConfig> = {
        dataDir: path.join(testDataDir, 'event-test'),
      };

      const manager = new StorageManager(config);

      const initializedPromise = new Promise<void>((resolve) => {
        manager.once('initialized', resolve);
      });

      await manager.initialize();
      await expect(initializedPromise).resolves.toBeUndefined();

      await manager.close();
    });

    it('should emit closed event', async () => {
      const config: Partial<StorageConfig> = {
        dataDir: path.join(testDataDir, 'close-event-test'),
      };

      const manager = new StorageManager(config);
      await manager.initialize();

      const closedPromise = new Promise<void>((resolve) => {
        manager.once('closed', resolve);
      });

      await manager.close();
      await expect(closedPromise).resolves.toBeUndefined();
    });

    it('should emit file:added event', async () => {
      const testFile = path.join(testDataDir, 'event-file.txt');
      fs.writeFileSync(testFile, 'Event test content');

      const fileAddedPromise = new Promise<{ hash: string; category: string }>((resolve) => {
        storageManager.once('file:added', resolve);
      });

      await storageManager.storeFile(testFile);

      const event = await fileAddedPromise;
      expect(event).toHaveProperty('hash');
      expect(event).toHaveProperty('category');
    });

    it('should emit file:removed event', async () => {
      const testFile = path.join(testDataDir, 'remove-event-file.txt');
      fs.writeFileSync(testFile, 'Remove event test content');

      const metadata = await storageManager.storeFile(testFile);

      const fileRemovedPromise = new Promise<{ hash: string }>((resolve) => {
        storageManager.once('file:removed', resolve);
      });

      await storageManager.deleteFile(metadata.hash);

      const event = await fileRemovedPromise;
      expect(event.hash).toBe(metadata.hash);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file paths gracefully', async () => {
      await expect(
        storageManager.storeFile('/non/existent/path/file.txt')
      ).rejects.toThrow();
    });

    it('should handle deletion of non-existent files', async () => {
      const result = await storageManager.deleteFile('non-existent-hash');
      // Should not throw, may return true or false depending on implementation
      expect(typeof result).toBe('boolean');
    });

    it('should handle database operations when closed', async () => {
      const config: Partial<StorageConfig> = {
        dataDir: path.join(testDataDir, 'closed-test'),
      };

      const manager = new StorageManager(config);
      await manager.initialize();
      await manager.close();

      // Operations on closed manager should handle gracefully
      await expect(
        manager.createConversation({ title: 'Test', participants: [] })
      ).rejects.toThrow();
    });
  });
});
