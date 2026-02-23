/**
 * AI代理类
 * 核心AI代理实现
 */

import {
  AIAgent,
  AgentIdentity,
  AgentState,
  AgentStats,
  AgentStatus,
  AgentEvent,
  AgentEventType,
  AgentEventListener,
  AgentMessage,
  MessageRole,
  RoleType,
  StreamChunk,
  Conversation,
  ITool,
  ToolDefinition,
  AgentError,
  AgentErrorCode
} from './types';
import type { AIAgentConfig } from '@config/types';
import { ToolRegistry, ToolExecutor } from './tools';
import { ConversationManager } from './conversation';
import { IdentityManager } from './identity';

/**
 * AI代理实现类
 */
export class Agent implements AIAgent {
  readonly id: string;
  readonly identity: AgentIdentity;
  readonly config: AIAgentConfig;
  
  private _state: AgentState;
  private _stats: AgentStats;
  private eventListeners = new Map<AgentEventType, Set<AgentEventListener>>();
  
  private toolRegistry: ToolRegistry;
  private toolExecutor: ToolExecutor;
  private conversationManager: ConversationManager;
  private identityManager: IdentityManager;

  constructor(config: AIAgentConfig) {
    this.id = config.id;
    this.config = config;
    
    this.identityManager = new IdentityManager();
    this.identity = this.identityManager.createIdentity(
      config.id,
      config.identity.name,
      config.identity.role,
      {
        avatar: config.identity.avatar,
        description: config.identity.description,
        personality: config.identity.personality,
        welcomeMessage: config.identity.welcomeMessage
      }
    );

    this._state = {
      status: AgentStatus.IDLE,
      activeTools: []
    };

    this._stats = {
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.toolRegistry = new ToolRegistry();
    this.toolExecutor = new ToolExecutor(this.toolRegistry);
    this.conversationManager = new ConversationManager();
  }

  get state(): AgentState {
    return { ...this._state };
  }

  get stats(): AgentStats {
    return { ...this._stats };
  }

  /**
   * 初始化代理
   */
  async initialize(): Promise<void> {
    this.setState(AgentStatus.CONNECTING);
    
    try {
      // 初始化逻辑
      this.setState(AgentStatus.READY);
      this.emit('status_changed' as AgentEventType, { status: AgentStatus.READY });
    } catch (error) {
      this.setState(AgentStatus.ERROR);
      throw new AgentError(
        'Failed to initialize agent',
        AgentErrorCode.INVALID_CONFIG,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 关闭代理
   */
  async shutdown(): Promise<void> {
    this.setState(AgentStatus.IDLE);
    this.emit('status_changed' as AgentEventType, { status: AgentStatus.IDLE });
  }

  /**
   * 创建对话
   */
  async createConversation(title?: string): Promise<Conversation> {
    const conversation = await this.conversationManager.createConversation({
      agentId: this.id,
      title,
      ownerId: this.id
    });

    this.emit('conversation_created' as AgentEventType, { conversation });
    return conversation;
  }

  /**
   * 发送消息
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<AgentMessage> {
    this.setState(AgentStatus.BUSY);

    try {
      // 添加用户消息
      await this.conversationManager.addMessage({
        conversationId,
        role: 'user' as MessageRole,
        content,
        senderId: 'user',
        senderType: RoleType.HUMAN
      });

      // 生成AI响应
      const response = await this.generateResponse(conversationId, content);

      // 添加AI消息
      const message = await this.conversationManager.addMessage({
        conversationId,
        role: 'assistant' as MessageRole,
        content: response,
        senderId: this.id,
        senderType: RoleType.AI_AVATAR,
        tokensUsed: 100 // 模拟token使用
      });

      this.updateStats(1, 100);
      this.emit('message_sent' as AgentEventType, { message });

      return message;
    } finally {
      this.setState(AgentStatus.READY);
    }
  }

  /**
   * 流式发送消息
   */
  async streamMessage(
    conversationId: string,
    content: string,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<AgentMessage> {
    this.setState(AgentStatus.BUSY);

    try {
      // 模拟流式响应
      const chunks = ['Hello', ' from', ' AI'];
      let fullContent = '';

      for (const chunk of chunks) {
        fullContent += chunk;
        onChunk({
          id: this.generateId(),
          content: chunk,
          role: 'assistant'
        });
        await this.delay(100);
      }

      const message = await this.conversationManager.addMessage({
        conversationId,
        role: 'assistant' as MessageRole,
        content: fullContent,
        senderId: this.id,
        senderType: RoleType.AI_AVATAR,
        tokensUsed: 50
      });

      this.updateStats(1, 50);
      return message;
    } finally {
      this.setState(AgentStatus.READY);
    }
  }

  /**
   * 注册工具
   */
  registerTool(tool: ITool): void {
    this.toolRegistry.register(tool);
    this._state.activeTools = this.toolRegistry.getAllDefinitions().map(d => d.id);
  }

  /**
   * 注销工具
   */
  unregisterTool(toolId: string): void {
    this.toolRegistry.unregister(toolId);
    this._state.activeTools = this.toolRegistry.getAllDefinitions().map(d => d.id);
  }

  /**
   * 获取已注册工具
   */
  getRegisteredTools(): ToolDefinition[] {
    return this.toolRegistry.getAllDefinitions();
  }

  /**
   * 更新运行时配置
   */
  updateConfig(config: Partial<AIAgentConfig>): void {
    Object.assign(this.config, config);
    this.emit('config_updated' as AgentEventType, { config });
  }

  /**
   * 获取运行时配置
   */
  getRuntimeConfig(): AIAgentConfig {
    return { ...this.config };
  }

  /**
   * 订阅事件
   */
  on(event: AgentEventType, listener: AgentEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * 取消订阅事件
   */
  off(event: AgentEventType, listener: AgentEventListener): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  /**
   * 生成响应
   */
  private async generateResponse(
    conversationId: string,
    content: string
  ): Promise<string> {
    // 模拟AI响应生成
    return `AI response to: ${content}`;
  }

  /**
   * 设置状态
   */
  private setState(status: AgentStatus): void {
    this._state.status = status;
  }

  /**
   * 更新统计
   */
  private updateStats(messages: number, tokens: number): void {
    this._stats.totalMessages += messages;
    this._stats.totalTokens += tokens;
    this._stats.updatedAt = new Date();
  }

  /**
   * 触发事件
   */
  private emit(type: AgentEventType, data?: unknown): void {
    const event: AgentEvent = {
      type,
      agentId: this.id,
      timestamp: new Date(),
      data
    };

    this.eventListeners.get(type)?.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

