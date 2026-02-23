import { Logger } from '../utils/Logger';
import { AgentRepository, AgentOperationResult } from '../data/repository/AgentRepository';
import { Agent, AgentCategory } from '../model/Agent';
import { emitter } from '@kit.BasicServicesKit';

const TAG = 'AgentViewModel';

/**
 * 代理界面状态
 */
@Observed
export class AgentUiState {
  /**
   * 代理列表
   */
  agents: Agent[] = [];

  /**
   * 当前选中的代理
   */
  selectedAgent: Agent | null = null;

  /**
   * 是否正在加载
   */
  isLoading: boolean = false;

  /**
   * 错误信息
   */
  error: string | null = null;

  /**
   * 搜索查询
   */
  searchQuery: string = '';

  /**
   * 当前筛选类别
   */
  selectedCategory: AgentCategory | null = null;

  /**
   * 是否显示创建对话框
   */
  showCreateDialog: boolean = false;

  /**
   * 是否显示编辑对话框
   */
  showEditDialog: boolean = false;

  /**
   * 是否显示删除确认对话框
   */
  showDeleteConfirmDialog: boolean = false;

  constructor(init?: Partial<AgentUiState>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}

/**
 * 代理操作结果类型
 */
export enum AgentActionResultType {
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  IDLE = 'idle'
}

/**
 * 代理操作结果
 */
export interface AgentActionResult {
  type: AgentActionResultType;
  message?: string;
}

/**
 * 代理ViewModel
 * 管理AI代理的创建、编辑、删除等操作
 */
export class AgentViewModel {
  private static instance: AgentViewModel;

  private agentRepository: AgentRepository;

  // UI状态
  @Track
  uiState: AgentUiState = new AgentUiState();

  // 操作结果回调
  private actionResultCallback: ((result: AgentActionResult) => void) | null = null;

  // 代理变更监听器
  private agentListener: (agents: Agent[]) => void;

  private constructor() {
    this.agentRepository = AgentRepository.getInstance();

    // 绑定代理监听器
    this.agentListener = (agents: Agent[]) => {
      this.refreshAgentsList();
    };

    this.init();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AgentViewModel {
    if (!AgentViewModel.instance) {
      AgentViewModel.instance = new AgentViewModel();
    }
    return AgentViewModel.instance;
  }

  /**
   * 初始化
   */
  private init(): void {
    Logger.info(TAG, 'AgentViewModel initializing');
    this.loadAgents();
    this.agentRepository.addListener(this.agentListener);
  }

  /**
   * 加载代理列表
   */
  private loadAgents(): void {
    this.uiState.isLoading = true;

    const agents = this.agentRepository.getAllAgents();
    this.uiState.agents = agents;
    this.uiState.isLoading = false;

    Logger.info(TAG, `Loaded ${agents.length} agents`);
  }

  /**
   * 刷新代理列表
   */
  private refreshAgentsList(): void {
    let agents: Agent[];

    if (this.uiState.searchQuery.length > 0) {
      agents = this.agentRepository.searchAgents(this.uiState.searchQuery);
    } else if (this.uiState.selectedCategory !== null) {
      agents = this.agentRepository.getAgentsByCategory(this.uiState.selectedCategory);
    } else {
      agents = this.agentRepository.getAllAgents();
    }

    this.uiState.agents = agents;
  }

  /**
   * 选择代理
   */
  public selectAgent(agent: Agent): void {
    Logger.info(TAG, `Selected agent: ${agent.id} - ${agent.name}`);
    this.uiState.selectedAgent = agent;
  }

  /**
   * 清除选中
   */
  public clearSelection(): void {
    Logger.info(TAG, 'Clearing agent selection');
    this.uiState.selectedAgent = null;
  }

  /**
   * 更新搜索查询
   */
  public updateSearchQuery(query: string): void {
    this.uiState.searchQuery = query;

    if (query.length === 0) {
      this.loadAgents();
    } else {
      const agents = this.agentRepository.searchAgents(query);
      this.uiState.agents = agents;
    }
  }

  /**
   * 按类别筛选
   */
  public filterByCategory(category: AgentCategory | null): void {
    Logger.info(TAG, `Filtering by category: ${category}`);
    this.uiState.selectedCategory = category;

    if (category === null) {
      this.loadAgents();
    } else {
      const agents = this.agentRepository.getAgentsByCategory(category);
      this.uiState.agents = agents;
    }
  }

  /**
   * 创建代理
   */
  public async createAgent(agent: Agent): Promise<void> {
    Logger.info(TAG, `Creating agent: ${agent.name}`);

    this.notifyActionResult({
      type: AgentActionResultType.LOADING
    });

    try {
      const success = await this.agentRepository.createAgent(agent);

      if (success) {
        Logger.info(TAG, `Agent created successfully: ${agent.id}`);
        this.notifyActionResult({
          type: AgentActionResultType.SUCCESS,
          message: '代理创建成功'
        });
        this.hideCreateDialog();

        // 发送事件
        emitter.emit({ eventId: 2 }, { data: { agent } });
      } else {
        Logger.error(TAG, 'Agent creation failed');
        this.notifyActionResult({
          type: AgentActionResultType.ERROR,
          message: '创建代理失败'
        });
      }
    } catch (error) {
      Logger.error(TAG, `Create agent error: ${JSON.stringify(error)}`);
      this.notifyActionResult({
        type: AgentActionResultType.ERROR,
        message: `创建失败: ${JSON.stringify(error)}`
      });
    }
  }

  /**
   * 更新代理
   */
  public async updateAgent(agent: Agent): Promise<void> {
    Logger.info(TAG, `Updating agent: ${agent.id} - ${agent.name}`);

    this.notifyActionResult({
      type: AgentActionResultType.LOADING
    });

    try {
      const success = await this.agentRepository.updateAgent(agent);

      if (success) {
        Logger.info(TAG, `Agent updated successfully: ${agent.id}`);
        this.notifyActionResult({
          type: AgentActionResultType.SUCCESS,
          message: '代理更新成功'
        });
        this.hideEditDialog();
        this.clearSelection();
      } else {
        Logger.error(TAG, 'Agent update failed');
        this.notifyActionResult({
          type: AgentActionResultType.ERROR,
          message: '更新代理失败'
        });
      }
    } catch (error) {
      Logger.error(TAG, `Update agent error: ${JSON.stringify(error)}`);
      this.notifyActionResult({
        type: AgentActionResultType.ERROR,
        message: `更新失败: ${JSON.stringify(error)}`
      });
    }
  }

  /**
   * 删除代理
   */
  public async deleteAgent(agentId: string): Promise<void> {
    Logger.info(TAG, `Deleting agent: ${agentId}`);

    this.notifyActionResult({
      type: AgentActionResultType.LOADING
    });

    try {
      const success = await this.agentRepository.deleteAgent(agentId);

      if (success) {
        Logger.info(TAG, `Agent deleted successfully: ${agentId}`);
        this.notifyActionResult({
          type: AgentActionResultType.SUCCESS,
          message: '代理删除成功'
        });
        this.hideDeleteConfirmDialog();
        this.clearSelection();
      } else {
        Logger.error(TAG, 'Agent deletion failed');
        this.notifyActionResult({
          type: AgentActionResultType.ERROR,
          message: '删除代理失败'
        });
      }
    } catch (error) {
      Logger.error(TAG, `Delete agent error: ${JSON.stringify(error)}`);
      this.notifyActionResult({
        type: AgentActionResultType.ERROR,
        message: `删除失败: ${JSON.stringify(error)}`
      });
    }
  }

  /**
   * 设置默认代理
   */
  public async setDefaultAgent(agentId: string): Promise<void> {
    Logger.info(TAG, `Setting default agent: ${agentId}`);

    try {
      const success = await this.agentRepository.setDefaultAgent(agentId);

      if (success) {
        Logger.info(TAG, `Default agent set successfully: ${agentId}`);
        this.notifyActionResult({
          type: AgentActionResultType.SUCCESS,
          message: '默认代理设置成功'
        });
      } else {
        Logger.error(TAG, 'Set default agent failed');
        this.notifyActionResult({
          type: AgentActionResultType.ERROR,
          message: '设置默认代理失败'
        });
      }
    } catch (error) {
      Logger.error(TAG, `Set default agent error: ${JSON.stringify(error)}`);
      this.notifyActionResult({
        type: AgentActionResultType.ERROR,
        message: `设置失败: ${JSON.stringify(error)}`
      });
    }
  }

  /**
   * 切换代理激活状态
   */
  public async toggleAgentActive(agentId: string, isActive: boolean): Promise<void> {
    Logger.info(TAG, `Toggling agent active state: ${agentId} -> ${isActive}`);

    try {
      const success = await this.agentRepository.toggleAgentActive(agentId, isActive);

      if (success) {
        const status = isActive ? '激活' : '停用';
        Logger.info(TAG, `Agent ${status}: ${agentId}`);
        this.notifyActionResult({
          type: AgentActionResultType.SUCCESS,
          message: `代理已${status}`
        });
      } else {
        Logger.error(TAG, 'Toggle agent active state failed');
        this.notifyActionResult({
          type: AgentActionResultType.ERROR,
          message: '操作失败'
        });
      }
    } catch (error) {
      Logger.error(TAG, `Toggle agent active error: ${JSON.stringify(error)}`);
      this.notifyActionResult({
        type: AgentActionResultType.ERROR,
        message: `操作失败: ${JSON.stringify(error)}`
      });
    }
  }

  /**
   * 从服务器同步代理
   */
  public async syncAgentsFromServer(): Promise<void> {
    Logger.info(TAG, 'Syncing agents from server');

    this.uiState.isLoading = true;
    this.notifyActionResult({
      type: AgentActionResultType.LOADING
    });

    try {
      const success = await this.agentRepository.syncAgentsFromServer();

      if (success) {
        Logger.info(TAG, 'Agents synced successfully');
        this.notifyActionResult({
          type: AgentActionResultType.SUCCESS,
          message: '同步成功'
        });
      } else {
        Logger.error(TAG, 'Agents sync failed');
        this.notifyActionResult({
          type: AgentActionResultType.ERROR,
          message: '同步失败'
        });
      }
    } catch (error) {
      Logger.error(TAG, `Sync agents error: ${JSON.stringify(error)}`);
      this.notifyActionResult({
        type: AgentActionResultType.ERROR,
        message: `同步失败: ${JSON.stringify(error)}`
      });
    } finally {
      this.uiState.isLoading = false;
    }
  }

  /**
   * 显示创建对话框
   */
  public showCreateDialog(): void {
    Logger.info(TAG, 'Showing create agent dialog');
    this.uiState.showCreateDialog = true;
  }

  /**
   * 隐藏创建对话框
   */
  public hideCreateDialog(): void {
    Logger.info(TAG, 'Hiding create agent dialog');
    this.uiState.showCreateDialog = false;
  }

  /**
   * 显示编辑对话框
   */
  public showEditDialog(): void {
    Logger.info(TAG, 'Showing edit agent dialog');
    this.uiState.showEditDialog = true;
  }

  /**
   * 隐藏编辑对话框
   */
  public hideEditDialog(): void {
    Logger.info(TAG, 'Hiding edit agent dialog');
    this.uiState.showEditDialog = false;
  }

  /**
   * 显示删除确认对话框
   */
  public showDeleteConfirmDialog(): void {
    Logger.info(TAG, 'Showing delete confirm dialog');
    this.uiState.showDeleteConfirmDialog = true;
  }

  /**
   * 隐藏删除确认对话框
   */
  public hideDeleteConfirmDialog(): void {
    Logger.info(TAG, 'Hiding delete confirm dialog');
    this.uiState.showDeleteConfirmDialog = false;
  }

  /**
   * 清除错误
   */
  public clearError(): void {
    this.uiState.error = null;
  }

  /**
   * 获取所有类别
   */
  public getAllCategories(): AgentCategory[] {
    return [
      AgentCategory.GENERAL,
      AgentCategory.CODING,
      AgentCategory.WRITING,
      AgentCategory.TRANSLATION,
      AgentCategory.ANALYSIS,
      AgentCategory.CUSTOM
    ];
  }

  /**
   * 设置操作结果回调
   */
  public setActionResultCallback(callback: (result: AgentActionResult) => void): void {
    this.actionResultCallback = callback;
  }

  /**
   * 通知操作结果
   */
  private notifyActionResult(result: AgentActionResult): void {
    if (this.actionResultCallback) {
      this.actionResultCallback(result);
    }
  }

  /**
   * 释放资源
   */
  public destroy(): void {
    this.agentRepository.removeListener(this.agentListener);
  }
}
