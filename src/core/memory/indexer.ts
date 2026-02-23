/**
 * Memory Indexer Module
 * SillyChat - 记忆索引器模块
 * 
 * 负责记忆的重要性评估和自动归档
 */

import {
  LongTermMemory,
  ShortTermMemory,
  ImportanceLevel,
  ImportanceConfig,
  DEFAULT_IMPORTANCE_CONFIG,
  ArchivalConfig,
  DEFAULT_ARCHIVAL_CONFIG,
} from "./types";

export class MemoryIndexer {
  private importanceConfig: ImportanceConfig;
  private archivalConfig: ArchivalConfig;
  private archivalTimer: NodeJS.Timeout | null = null;

  constructor(
    importanceConfig: Partial<ImportanceConfig> = {},
    archivalConfig: Partial<ArchivalConfig> = {}
  ) {
    this.importanceConfig = { ...DEFAULT_IMPORTANCE_CONFIG, ...importanceConfig };
    this.archivalConfig = { ...DEFAULT_ARCHIVAL_CONFIG, ...archivalConfig };
  }

  /**
   * 评估记忆重要性
   */
  evaluateImportance(memory: LongTermMemory | ShortTermMemory): number {
    const contentScore = this.evaluateContentImportance(memory.content);
    const accessScore = Math.min(memory.accessCount / 10, 1);
    const recencyScore = this.calculateRecencyScore(memory.createdAt);

    return (
      contentScore * this.importanceConfig.contentWeight +
      accessScore * this.importanceConfig.accessWeight +
      recencyScore * this.importanceConfig.recencyWeight
    );
  }

  /**
   * 评估内容重要性
   */
  private evaluateContentImportance(content: string): number {
    let score = 0.5;

    // 关键词权重
    const importantKeywords = [
      "重要",
      "关键",
      "必须",
      "记住",
      "不要忘记",
      "提醒",
      "截止日期",
      "紧急",
    ];
    const keywordMatches = importantKeywords.filter(kw =>
      content.toLowerCase().includes(kw)
    ).length;
    score += keywordMatches * 0.05;

    // 长度因子（适中长度更重要）
    const lengthScore = Math.min(content.length / 200, 1) * 0.1;
    score += lengthScore;

    // 情感强度（基于标点符号）
    const emotionalMarkers = (content.match(/[!！?？]/g) || []).length;
    score += Math.min(emotionalMarkers * 0.02, 0.1);

    return Math.min(score, 1);
  }

  /**
   * 计算时效性分数
   */
  private calculateRecencyScore(createdAt: Date): number {
    const ageMs = Date.now() - createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // 指数衰减
    return Math.exp(-ageDays / 30);
  }

  /**
   * 确定重要性等级
   */
  determineImportanceLevel(score: number): ImportanceLevel {
    if (score >= 0.8) return "critical";
    if (score >= 0.6) return "high";
    if (score >= 0.4) return "medium";
    return "low";
  }

  /**
   * 启动自动归档
   */
  startAutoArchival(archiveCallback: () => Promise<number>): void {
    if (!this.archivalConfig.enabled || this.archivalTimer) return;

    this.archivalTimer = setInterval(async () => {
      await archiveCallback();
    }, this.archivalConfig.checkInterval);
  }

  /**
   * 停止自动归档
   */
  stopAutoArchival(): void {
    if (this.archivalTimer) {
      clearInterval(this.archivalTimer);
      this.archivalTimer = null;
    }
  }

  /**
   * 检查是否应该归档
   */
  shouldArchive(memory: LongTermMemory): boolean {
    const ageMs = Date.now() - memory.createdAt.getTime();
    const importanceOrder = ["low", "medium", "high", "critical"];
    const memoryImportanceIndex = importanceOrder.indexOf(memory.importance);
    const thresholdIndex = importanceOrder.indexOf(
      this.archivalConfig.importanceThreshold
    );

    // 低重要性且过期的记忆
    if (
      memoryImportanceIndex < thresholdIndex &&
      ageMs > this.archivalConfig.shortTermRetention
    ) {
      return true;
    }

    return false;
  }

  /**
   * 生成记忆摘要
   */
  generateSummary(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) return content;

    // 简单的摘要生成：取前maxLength个字符，尝试在句子边界截断
    let summary = content.slice(0, maxLength);
    const lastPeriod = summary.lastIndexOf("。");
    const lastExclamation = summary.lastIndexOf("!");
    const lastQuestion = summary.lastIndexOf("?");

    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

    if (lastSentenceEnd > maxLength * 0.7) {
      summary = summary.slice(0, lastSentenceEnd + 1);
    } else {
      summary = summary + "...";
    }

    return summary;
  }

  /**
   * 批量评估记忆重要性
   */
  evaluateBatch(memories: LongTermMemory[]): Map<string, number> {
    const scores = new Map<string, number>();

    for (const memory of memories) {
      const score = this.evaluateImportance(memory);
      scores.set(memory.id, score);
    }

    return scores;
  }
}

