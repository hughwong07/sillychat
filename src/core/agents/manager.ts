/**
 * 代理管理器
 * 管理所有AI代理的CRUD操作
 */

import {
  IAgentManager,
  AIAgent,
  AgentStatus,
  AgentEventType,
  AgentEventListener,
  AgentError,
  AgentErrorCode
} from './types';
import type { AIAgentConfig } from '@config/types';
import { Agent } from './agent';

/**
 * 代理管理器实现
 */
export class AgentManager implements IAgentManager {
  private agents = new Map<string, Agent>();
  private defaultAgentId?: string;
  private eventListeners = new Map<AgentEventType, Set<AgentEventListener>>();

  /**
   * 创建代理
   */
  async createAgent(config: AIAgentConfig): Promise<AIAgent> {
    // 验证配置
    if (!config.id || !config.identity?.name) {
      throw new AgentError(
        'Invalid agent configuration: id and name are required',
        AgentErrorCode.INVALID_CONFIG
      );
    }

    // 检查ID是否已存在
    if (this.agents.has(config.id)) {
      throw new AgentError(
        `Agent with id ${config.id} already exists`,
        AgentErrorCode.INVALID_CONFIG
      );
    }

    const agent = new Agent(config);
    await agent.initialize();

    this.agents.set(config.id, agent);

    // 如果没有默认代理，设置为默认
    if (!this.defaultAgentId) {
      this.defaultAgentId = config.id;
    }

    this.emit('status_changed', {
      agentId: config.id,
      status: AgentStatus.READY
    });

    return agent;
  }

  /**
   * 获取代理
   */
  async getAgent(id: string): Promise<AIAgent | null> {
    return this.agents.get(id) ?? null;
  }

  /**
   * 更新代理
   */
  async updateAgent(
    id: string,
    updates: Partial<AIAgentConfig>
  ): Promise<AIAgent> {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new AgentError(
        `Agent ${id} not found`,
        AgentErrorCode.INVALID_CONFIG
      );
    }

    agent.updateConfig(updates);
    return agent;
  }

  /**
   * 删除代理
   */
  async deleteAgent(id: string): Promise<boolean> {
    const agent = this.agents.get(id);
    if (!agent) return false;

    await agent.shutdown();
    this.agents.delete(id);

    // 如果删除的是默认代理，清除默认设置
    if (this.defaultAgentId === id) {
      this.defaultAgentId = undefined;
      // 设置新的默认代理
      const firstAgent = this.agents.keys().next().value;
      if (firstAgent) {
        this.defaultAgentId = firstAgent;
      }
    }

    return true;
  }

  /**
   * 列出所有代理
   */
  async listAgents(options?: {
    ownerId?: string;
    status?: AgentStatus;
  }): Promise<AIAgent[]> {
    let result = Array.from(this.agents.values());

    if (options?.status) {
      result = result.filter(a => a.state.status === options.status);
    }

    return result;
  }

  /**
   * 获取默认代理
   */
  async getDefaultAgent(): Promise<AIAgent | null> {
    if (!this.defaultAgentId) return null;
    return this.agents.get(this.defaultAgentId) ?? null;
  }

  /**
   * 设置默认代理
   */
  async setDefaultAgent(id: string): Promise<void> {
    if (!this.agents.has(id)) {
      throw new AgentError(
        `Agent ${id} not found`,
        AgentErrorCode.INVALID_CONFIG
      );
    }
    this.defaultAgentId = id;
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
   * 触发事件
   */
  private emit(type: AgentEventType, data: unknown): void {
    const event = {
      type,
      agentId: (data as { agentId?: string })?.agentId ?? '',
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
}

/**
 * 代理管理器单例
 */
let globalAgentManager: AgentManager | null = null;

export function getAgentManager(): AgentManager {
  if (!globalAgentManager) {
    globalAgentManager = new AgentManager();
  }
  return globalAgentManager;
}

export function resetAgentManager(): void {
  globalAgentManager = null;
}

