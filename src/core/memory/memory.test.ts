/**
 * Memory Module Tests
 * 小傻瓜聊天工具 - 记忆模块单元测试
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  ShortTermMemoryManager,
} from "./short-term";
import { EmbeddingService } from "./embeddings";
import { MemoryIndexer } from "./indexer";
import {
  ImportanceLevel,
  DEFAULT_CONTEXT_WINDOW_CONFIG,
  DEFAULT_EMBEDDING_CONFIG,
} from "./types";

describe("Memory Module", () => {
  describe("ShortTermMemoryManager", () => {
    let manager: ShortTermMemoryManager;

    beforeEach(() => {
      manager = new ShortTermMemoryManager(DEFAULT_CONTEXT_WINDOW_CONFIG);
    });

    afterEach(() => {
      // Cleanup
    });

    test("should add memory to short term", () => {
      const memory = manager.addMemory(
        "conv-1",
        "Hello, this is a test message",
        "user_message",
        10
      );

      expect(memory).toBeDefined();
      expect(memory.id).toBeDefined();
      expect(memory.content).toBe("Hello, this is a test message");
      expect(memory.source).toBe("user_message");
      expect(memory.tokenCount).toBe(10);
      expect(memory.status).toBe("active");
    });

    test("should get memories by conversation", () => {
      manager.addMemory("conv-1", "Message 1", "user_message", 5);
      manager.addMemory("conv-1", "Message 2", "assistant_message", 8);

      const memories = manager.getMemories("conv-1");

      expect(memories).toHaveLength(2);
      expect(memories[0].content).toBe("Message 1");
      expect(memories[1].content).toBe("Message 2");
    });

    test("should get recent memories", () => {
      manager.addMemory("conv-1", "Message 1", "user_message", 5);
      manager.addMemory("conv-1", "Message 2", "user_message", 5);
      manager.addMemory("conv-1", "Message 3", "user_message", 5);

      const recent = manager.getRecentMemories("conv-1", 2);

      expect(recent).toHaveLength(2);
      expect(recent[0].content).toBe("Message 2");
      expect(recent[1].content).toBe("Message 3");
    });

    test("should mark memory as processed", () => {
      const memory = manager.addMemory("conv-1", "Test", "user_message", 5);

      const result = manager.markAsProcessed("conv-1", memory.id);

      expect(result).toBe(true);
      const memories = manager.getMemories("conv-1");
      expect(memories[0].processed).toBe(true);
    });

    test("should update access stats", () => {
      const memory = manager.addMemory("conv-1", "Test", "user_message", 5);

      manager.touchMemory("conv-1", memory.id);
      manager.touchMemory("conv-1", memory.id);

      const memories = manager.getMemories("conv-1");
      expect(memories[0].accessCount).toBe(2);
      expect(memories[0].accessedAt).toBeDefined();
    });

    test("should clear memories for conversation", () => {
      manager.addMemory("conv-1", "Message 1", "user_message", 5);
      manager.clearMemories("conv-1");

      const memories = manager.getMemories("conv-1");
      expect(memories).toHaveLength(0);
    });

    test("should return window stats", () => {
      manager.addMemory("conv-1", "Message 1", "user_message", 5);
      manager.addMemory("conv-1", "Message 2", "assistant_message", 8);

      const stats = manager.getWindowStats("conv-1");

      expect(stats).toBeDefined();
      expect(stats?.messageCount).toBe(2);
      expect(stats?.totalTokens).toBe(13);
    });
  });

  describe("EmbeddingService", () => {
    let service: EmbeddingService;

    beforeEach(() => {
      service = new EmbeddingService({
        ...DEFAULT_EMBEDDING_CONFIG,
        provider: "local",
      });
    });

    test("should generate embedding", async () => {
      await service.initialize();
      const embedding = await service.generate("Test text");

      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(1536);
    });

    test("should calculate similarity", async () => {
      await service.initialize();
      const embedding1 = await service.generate("Hello world");
      const embedding2 = await service.generate("Hello world");

      const similarity = service.similarity(embedding1, embedding2);

      expect(similarity).toBeCloseTo(1, 5);
    });

    test("should generate batch embeddings", async () => {
      await service.initialize();
      const texts = ["Text 1", "Text 2", "Text 3"];
      const embeddings = await service.generateBatch(texts);

      expect(embeddings).toHaveLength(3);
      embeddings.forEach((emb) => {
        expect(emb).toBeInstanceOf(Float32Array);
        expect(emb.length).toBe(1536);
      });
    });
  });

  describe("MemoryIndexer", () => {
    let indexer: MemoryIndexer;

    beforeEach(() => {
      indexer = new MemoryIndexer();
    });

    test("should evaluate importance", () => {
      const memory = {
        id: "test-1",
        content: "This is very important! Remember this.",
        createdAt: new Date(),
        accessCount: 5,
      } as any;

      const score = indexer.evaluateImportance(memory);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test("should determine importance level", () => {
      expect(indexer.determineImportanceLevel(0.9)).toBe("critical");
      expect(indexer.determineImportanceLevel(0.7)).toBe("high");
      expect(indexer.determineImportanceLevel(0.5)).toBe("medium");
      expect(indexer.determineImportanceLevel(0.3)).toBe("low");
    });

    test("should generate summary", () => {
      const longText =
        "This is a very long text that needs to be summarized. It contains multiple sentences. This is the final sentence.";
      const summary = indexer.generateSummary(longText, 50);

      expect(summary.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(summary).toContain("...");
    });

    test("should return full text if short enough", () => {
      const shortText = "Short text.";
      const summary = indexer.generateSummary(shortText, 100);

      expect(summary).toBe(shortText);
    });

    test("should evaluate content importance", () => {
      const importantContent =
        "This is very important! You must remember this key information.";
      const score = indexer["evaluateContentImportance"](importantContent);

      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe("Types", () => {
    test("should have correct default context window config", () => {
      expect(DEFAULT_CONTEXT_WINDOW_CONFIG.maxTokens).toBe(4096);
      expect(DEFAULT_CONTEXT_WINDOW_CONFIG.maxMessages).toBe(50);
      expect(DEFAULT_CONTEXT_WINDOW_CONFIG.reserveSystemMessages).toBe(1);
      expect(DEFAULT_CONTEXT_WINDOW_CONFIG.reserveRecentMessages).toBe(10);
    });

    test("should have correct default embedding config", () => {
      expect(DEFAULT_EMBEDDING_CONFIG.provider).toBe("openai");
      expect(DEFAULT_EMBEDDING_CONFIG.model).toBe("text-embedding-3-small");
      expect(DEFAULT_EMBEDDING_CONFIG.dimension).toBe(1536);
    });
  });
});

