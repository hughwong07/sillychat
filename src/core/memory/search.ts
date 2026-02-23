/**
 * Memory Search Module
 * SillyChat - 语义搜索模块
 */

import {
  SemanticSearchOptions,
  MemorySearchResult,
  LongTermMemory,
  ImportanceLevel
} from "./types";

export class MemorySearch {
  constructor() {}

  async search(options: SemanticSearchOptions): Promise<MemorySearchResult[]> {
    return [];
  }

  async searchByConversation(
    conversationId: string,
    limit?: number
  ): Promise<LongTermMemory[]> {
    return [];
  }

  filterByImportance(
    memories: LongTermMemory[],
    minImportance: ImportanceLevel
  ): LongTermMemory[] {
    const importanceOrder = ["low", "medium", "high", "critical"];
    const minIndex = importanceOrder.indexOf(minImportance);
    return memories.filter(
      (m) => importanceOrder.indexOf(m.importance) >= minIndex
    );
  }

  filterByTimeRange(
    memories: LongTermMemory[],
    start?: Date,
    end?: Date
  ): LongTermMemory[] {
    return memories.filter((m) => {
      if (start && m.createdAt < start) return false;
      if (end && m.createdAt > end) return false;
      return true;
    });
  }
}
