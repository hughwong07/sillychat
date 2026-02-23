import { Logger } from '../../utils/Logger';
import { ApiService } from '../remote/ApiService';
import { Agent, AgentCategory } from '../../model/Agent';
import { AppStorageV2 } from '@kit.ArkUI';
import { PrefKeys, PreferencesUtil } from '../local/PreferencesUtil';

const TAG = 'AgentRepository';

/**
 * 代理仓库类
 * 负责AI代理的本地存储和远程同步
 */
export class AgentRepository {
  private static instance: AgentRepository;
  private apiService: ApiService;
  private agents: Map<string, Agent> = new Map();
  private listeners: ((agents: Agent[]) => void)[] = [];

  private constructor() {
    this.apiService = ApiService.getInstance();
    this.loadAgentsFromStorage();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AgentRepository {
    if (!AgentRepository.instance) {
      AgentRepository.instance = new AgentRepository();
    }
    return AgentRepository.instance;
  }

  /**
   * 从持久化存储加载代理
   */
  private loadAgentsFromStorage(): void {
    try {
      const stored = AppStorageV2.get<Record<string, Agent>>('agents_cache');
      if (stored) {
        this.agents = new Map(Object.entries(stored));
        Logger.info(TAG, `Loaded ${this.agents.size} agents from storage`);
      } else {
        // 首次启动，初始化默认代理
        this.initDefaultAgents();
      }
    } catch (error) {
      Logger.error(TAG, `Failed to load agents: ${JSON.stringify(error)}`);
      this.initDefaultAgents();
    }
  }

  /**
   * 保存代理到持久化存储
   */
  private saveAgentsToStorage(): void {
    try {
      const obj = Object.fromEntries(this.agents);
      AppStorageV2.set('agents_cache', obj);
    } catch (error) {
      Logger.error(TAG, `Failed to save agents: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 初始化默认代理
   */
  private initDefaultAgents(): void {
    Logger.info(TAG, 'Initializing default agents');

    const defaultAgent = Agent.createDefault();
    const codeAssistant = new Agent(
      '',
      '代码助手',
      '编程专家',
      '专业的编程助手，擅长代码审查、bug修复和算法设计',
      '你是一个专业的编程助手。请提供清晰、高效的代码解决方案。',
      undefined,
      AgentCategory.CODING,
      'default',
      0.3,
      2048,
      true,
      false,
      1,
      Date.now(),
      Date.now()
    );
    const creativeWriter = new Agent(
      '',
      '创意写手',
      '写作专家',
      '擅长创意写作、文案撰写和故事创作',
      '你是一个富有创意的写作助手。请提供生动、有趣的文字内容。',
      undefined,
      AgentCategory.WRITING,
      'default',
      0.9,
      2048,
      true,
      false,
      2,
      Date.now(),
      Date.now()
    );

    this.agents.set(defaultAgent.id, defaultAgent);
    this.agents.set(codeAssistant.id, codeAssistant);
    this.agents.set(creativeWriter.id, creativeWriter);

    this.saveAgentsToStorage();
    this.notifyListeners();
  }

  /**
   * 获取所有代理
   */
  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * 获取激活的代理
   */
  public getActiveAgents(): Agent[] {
    return this.getAllAgents().filter(a => a.isActive);
  }

  /**
   * 根据ID获取代理
   */
  public getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 获取默认代理
   */
  public getDefaultAgent(): Agent {
    const defaultAgent = this.getAllAgents().find(a => a.isDefault);
    return defaultAgent || Agent.createDefault();
  }

  /**
   * 根据类别获取代理
   */
  public getAgentsByCategory(category: AgentCategory): Agent[] {
    return this.getAllAgents().filter(a => a.category === category);
  }

  /**
   * 搜索代理
   */
  public searchAgents(query: string): Agent[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllAgents().filter(a =>
      a.name.toLowerCase().includes(lowerQuery) ||
      a.role.toLowerCase().includes(lowerQuery) ||
      (a.description && a.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 创建代理
   */
  public async createAgent(agent: Agent): Promise<boolean> {
    try {
      // 先保存到本地
      agent.id = this.generateId();
      agent.createdAt = Date.now();
      agent.updatedAt = Date.now();
      this.agents.set(agent.id, agent);
      this.saveAgentsToStorage();
      this.notifyListeners();

      // 同步到服务器
      const response = await this.apiService.createAgent(agent);
      if (!response.success) {
        Logger.warn(TAG, `Failed to sync agent to server: ${response.error}`);
      }

      return true;
    } catch (error) {
      Logger.error(TAG, `Create agent error: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 更新代理
   */
  public async updateAgent(agent: Agent): Promise<boolean> {
    try {
      if (!this.agents.has(agent.id)) {
        Logger.error(TAG, `Agent not found: ${agent.id}`);
        return false;
      }

      agent.updatedAt = Date.now();
      this.agents.set(agent.id, agent);
      this.saveAgentsToStorage();
      this.notifyListeners();

      // 同步到服务器
      const response = await this.apiService.updateAgent(agent);
      if (!response.success) {
        Logger.warn(TAG, `Failed to sync agent update to server: ${response.error}`);
      }

      return true;
    } catch (error) {
      Logger.error(TAG, `Update agent error: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 删除代理
   */
  public async deleteAgent(agentId: string): Promise<boolean> {
    try {
      if (!this.agents.has(agentId)) {
        Logger.error(TAG, `Agent not found: ${agentId}`);
        return false;
      }

      this.agents.delete(agentId);
      this.saveAgentsToStorage();
      this.notifyListeners();

      // 同步到服务器
      const response = await this.apiService.deleteAgent(agentId);
      if (!response.success) {
        Logger.warn(TAG, `Failed to sync agent deletion to server: ${response.error}`);
      }

      return true;
    } catch (error) {
      Logger.error(TAG, `Delete agent error: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 设置默认代理
   */
  public async setDefaultAgent(agentId: string): Promise<boolean> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        Logger.error(TAG, `Agent not found: ${agentId}`);
        return false;
      }

      // 取消其他代理的默认状态
      this.agents.forEach(a => {
        if (a.isDefault) {
          a.isDefault = false;
          a.updatedAt = Date.now();
        }
      });

      // 设置新的默认代理
      agent.isDefault = true;
      agent.updatedAt = Date.now();
      this.saveAgentsToStorage();
      this.notifyListeners();

      return true;
    } catch (error) {
      Logger.error(TAG, `Set default agent error: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 切换代理激活状态
   */
  public async toggleAgentActive(agentId: string, isActive: boolean): Promise<boolean> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        Logger.error(TAG, `Agent not found: ${agentId}`);
        return false;
      }

      agent.isActive = isActive;
      agent.updatedAt = Date.now();
      this.saveAgentsToStorage();
      this.notifyListeners();

      return true;
    } catch (error) {
      Logger.error(TAG, `Toggle agent active error: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 更新代理排序
   */
  public async updateAgentOrder(agentOrders: Map<string, number>): Promise<boolean> {
    try {
      agentOrders.forEach((order, agentId) => {
        const agent = this.agents.get(agentId);
        if (agent) {
          agent.sortOrder = order;
          agent.updatedAt = Date.now();
        }
      });

      this.saveAgentsToStorage();
      this.notifyListeners();

      return true;
    } catch (error) {
      Logger.error(TAG, `Update agent order error: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 从服务器同步代理
   */
  public async syncAgentsFromServer(): Promise<boolean> {
    try {
      const response = await this.apiService.getAgents();

      if (response.success && response.data) {
        // 合并服务器数据
        response.data.agents.forEach(serverAgent => {
          const localAgent = this.agents.get(serverAgent.id);
          if (!localAgent || serverAgent.updatedAt > localAgent.updatedAt) {
            this.agents.set(serverAgent.id, serverAgent);
          }
        });

        this.saveAgentsToStorage();
        this.notifyListeners();

        // 记录同步时间
        const prefs = PreferencesUtil.getInstance(getContext());
        prefs.putNumber(PrefKeys.LAST_SYNC_TIME, Date.now());
        prefs.putBoolean(PrefKeys.AGENTS_SYNCED, true);

        Logger.info(TAG, `Synced ${response.data.agents.length} agents from server`);
        return true;
      }

      return false;
    } catch (error) {
      Logger.error(TAG, `Sync agents error: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 检查代理是否存在
   */
  public agentExists(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * 获取代理数量
   */
  public getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * 获取激活代理数量
   */
  public getActiveAgentCount(): number {
    return this.getActiveAgents().length;
  }

  /**
   * 添加代理变更监听器
   */
  public addListener(callback: (agents: Agent[]) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 移除代理变更监听器
   */
  public removeListener(callback: (agents: Agent[]) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    const agents = this.getAllAgents();
    this.listeners.forEach(callback => callback(agents));
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

/**
 * 代理操作结果
 */
export interface AgentOperationResult {
  success: boolean;
  message: string;
  agent?: Agent;
}
