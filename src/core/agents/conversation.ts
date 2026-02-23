/**
 * 对话管理模块
 * 管理AI代理的对话历史和消息
 */

import {
  Conversation,
  ConversationStatus,
  AgentMessage,
  MessageRole,
  RoleType
} from './types';

/**
 * 对话管理器
 */
export class ConversationManager {
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, AgentMessage[]>();

  /**
   * 创建新对话
   */
  async createConversation(config: {
    agentId: string;
    title?: string;
    ownerId: string;
  }): Promise<Conversation> {
    const id = this.generateId();
    const now = new Date();

    const conversation: Conversation = {
      id,
      title: config.title ?? 'New Conversation',
      agentId: config.agentId,
      ownerId: config.ownerId,
      status: ConversationStatus.ACTIVE,
      messageCount: 0,
      totalTokens: 0,
      createdAt: now,
      updatedAt: now
    };

    this.conversations.set(id, conversation);
    this.messages.set(id, []);

    return conversation;
  }

  /**
   * 获取对话
   */
  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) ?? null;
  }

  /**
   * 更新对话
   */
  async updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<boolean> {
    const conversation = this.conversations.get(id);
    if (!conversation) return false;

    Object.assign(conversation, updates, { updatedAt: new Date() });
    return true;
  }

  /**
   * 删除对话
   */
  async deleteConversation(id: string): Promise<boolean> {
    const conversation = this.conversations.get(id);
    if (!conversation) return false;

    conversation.status = ConversationStatus.DELETED;
    conversation.updatedAt = new Date();
    return true;
  }

  /**
   * 列出对话
   */
  async listConversations(options?: {
    agentId?: string;
    ownerId?: string;
    status?: ConversationStatus;
  }): Promise<Conversation[]> {
    let result = Array.from(this.conversations.values());

    if (options?.agentId) {
      result = result.filter(c => c.agentId === options.agentId);
    }
    if (options?.ownerId) {
      result = result.filter(c => c.ownerId === options.ownerId);
    }
    if (options?.status) {
      result = result.filter(c => c.status === options.status);
    }

    return result.sort((a, b) =>
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * 添加消息
   */
  async addMessage(
    message: Omit<AgentMessage, 'id' | 'timestamp'>
  ): Promise<AgentMessage> {
    const id = this.generateId();
    const timestamp = new Date();

    const fullMessage: AgentMessage = {
      ...message,
      id,
      timestamp
    };

    const conversationMessages = this.messages.get(message.conversationId);
    if (conversationMessages) {
      conversationMessages.push(fullMessage);
    } else {
      this.messages.set(message.conversationId, [fullMessage]);
    }

    // 更新对话统计
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      conversation.messageCount++;
      conversation.totalTokens += message.tokensUsed ?? 0;
      conversation.updatedAt = timestamp;
    }

    return fullMessage;
  }

  /**
   * 获取消息列表
   */
  async getMessages(conversationId: string): Promise<AgentMessage[]> {
    return this.messages.get(conversationId) ?? [];
  }

  /**
   * 获取最近的消息
   */
  async getRecentMessages(
    conversationId: string,
    limit = 10
  ): Promise<AgentMessage[]> {
    const messages = this.messages.get(conversationId) ?? [];
    return messages.slice(-limit);
  }

  /**
   * 清空对话消息
   */
  async clearConversation(conversationId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;

    this.messages.set(conversationId, []);
    conversation.messageCount = 0;
    conversation.totalTokens = 0;
    conversation.updatedAt = new Date();

    return true;
  }

  /**
   * 归档对话
   */
  async archiveConversation(id: string): Promise<boolean> {
    return this.updateConversation(id, {
      status: ConversationStatus.ARCHIVED
    });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

