import { http } from '@kit.NetworkKit';
import { Logger } from '../../utils/Logger';
import { Config } from '../../constants/Config';
import { Message, MessageRole, MessageType, SyncStatus } from '../../model/Message';
import { Agent, AgentCategory } from '../../model/Agent';

const TAG = 'ApiService';

/**
 * API服务类
 * 负责与后端服务器进行HTTP通信
 */
export class ApiService {
  private static instance: ApiService;
  private httpClient: http.HttpClient | null = null;

  private constructor() {
    this.initHttpClient();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * 初始化HTTP客户端
   */
  private initHttpClient(): void {
    try {
      this.httpClient = http.createHttp();
      Logger.info(TAG, 'HTTP client initialized');
    } catch (error) {
      Logger.error(TAG, `Failed to initialize HTTP client: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 构建完整URL
   */
  private buildUrl(path: string): string {
    return `${Config.API_BASE_URL}${path}`;
  }

  /**
   * 发送HTTP请求
   */
  private async request<T>(
    method: http.RequestMethod,
    path: string,
    data?: object,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    if (!this.httpClient) {
      return { success: false, error: 'HTTP client not initialized' };
    }

    const url = this.buildUrl(path);
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Version': Config.APP_VERSION,
      'X-Platform': 'harmonyos',
      ...headers
    };

    // 添加认证token（如果有）
    const token = AppStorage.get<string>('user_token');
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const options: http.HttpRequestOptions = {
      method: method,
      header: requestHeaders,
      readTimeout: Config.API_TIMEOUT,
      connectTimeout: Config.API_CONNECT_TIMEOUT
    };

    if (data && (method === http.RequestMethod.POST || method === http.RequestMethod.PUT)) {
      options.extraData = JSON.stringify(data);
    }

    try {
      Logger.debug(TAG, `${method} ${url}`);
      const response = await this.httpClient.request(url, options);

      if (response.responseCode === 200 || response.responseCode === 201) {
        const result = response.result as string;
        const parsed = JSON.parse(result);
        return { success: true, data: parsed as T };
      } else {
        Logger.error(TAG, `HTTP error: ${response.responseCode}`);
        return { success: false, error: `HTTP ${response.responseCode}` };
      }
    } catch (error) {
      Logger.error(TAG, `Request failed: ${JSON.stringify(error)}`);
      return { success: false, error: JSON.stringify(error) };
    }
  }

  /**
   * 发送消息并获取回复
   */
  public async sendMessage(request: SendMessageRequest): Promise<ApiResponse<SendMessageResponse>> {
    return this.request<SendMessageResponse>(
      http.RequestMethod.POST,
      '/chat/send',
      request
    );
  }

  /**
   * 获取消息历史
   */
  public async getMessageHistory(
    conversationId: string,
    before?: number,
    limit: number = 20
  ): Promise<ApiResponse<MessageHistoryResponse>> {
    let path = `/chat/history?conversationId=${encodeURIComponent(conversationId)}&limit=${limit}`;
    if (before) {
      path += `&before=${before}`;
    }
    return this.request<MessageHistoryResponse>(http.RequestMethod.GET, path);
  }

  /**
   * 同步消息
   */
  public async syncMessages(messages: Message[]): Promise<ApiResponse<SyncResponse>> {
    return this.request<SyncResponse>(
      http.RequestMethod.POST,
      '/chat/sync',
      { messages }
    );
  }

  /**
   * 获取代理列表
   */
  public async getAgents(): Promise<ApiResponse<AgentListResponse>> {
    return this.request<AgentListResponse>(http.RequestMethod.GET, '/agents');
  }

  /**
   * 获取代理详情
   */
  public async getAgent(agentId: string): Promise<ApiResponse<AgentResponse>> {
    return this.request<AgentResponse>(http.RequestMethod.GET, `/agents/${agentId}`);
  }

  /**
   * 创建代理
   */
  public async createAgent(agent: Agent): Promise<ApiResponse<AgentResponse>> {
    return this.request<AgentResponse>(
      http.RequestMethod.POST,
      '/agents',
      agent
    );
  }

  /**
   * 更新代理
   */
  public async updateAgent(agent: Agent): Promise<ApiResponse<AgentResponse>> {
    return this.request<AgentResponse>(
      http.RequestMethod.PUT,
      `/agents/${agent.id}`,
      agent
    );
  }

  /**
   * 删除代理
   */
  public async deleteAgent(agentId: string): Promise<ApiResponse<void>> {
    return this.request<void>(
      http.RequestMethod.DELETE,
      `/agents/${agentId}`
    );
  }

  /**
   * 检查服务器健康状态
   */
  public async checkHealth(): Promise<ApiResponse<HealthResponse>> {
    return this.request<HealthResponse>(http.RequestMethod.GET, '/health');
  }

  /**
   * 用户登录
   */
  public async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>(
      http.RequestMethod.POST,
      '/auth/login',
      { email, password }
    );
  }

  /**
   * 用户注册
   */
  public async register(email: string, password: string, name: string): Promise<ApiResponse<RegisterResponse>> {
    return this.request<RegisterResponse>(
      http.RequestMethod.POST,
      '/auth/register',
      { email, password, name }
    );
  }

  /**
   * 释放资源
   */
  public destroy(): void {
    if (this.httpClient) {
      this.httpClient.destroy();
      this.httpClient = null;
    }
  }
}

/**
 * API响应包装
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 发送消息请求
 */
export interface SendMessageRequest {
  content: string;
  conversationId: string;
  agentId?: string;
  parentMessageId?: string;
  attachments?: AttachmentInfo[];
}

/**
 * 附件信息
 */
export interface AttachmentInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
  url?: string;
}

/**
 * 发送消息响应
 */
export interface SendMessageResponse {
  messageId: string;
  content: string;
  role: string;
  timestamp: number;
  agentId?: string;
  usage?: TokenUsage;
}

/**
 * Token使用量
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 消息历史响应
 */
export interface MessageHistoryResponse {
  messages: Message[];
  hasMore: boolean;
  total: number;
}

/**
 * 同步请求
 */
export interface SyncRequest {
  messages: Message[];
}

/**
 * 同步响应
 */
export interface SyncResponse {
  syncedIds: string[];
  failedIds: string[];
  serverMessages: Message[];
}

/**
 * 代理列表响应
 */
export interface AgentListResponse {
  agents: Agent[];
}

/**
 * 代理响应
 */
export interface AgentResponse {
  agent: Agent;
}

/**
 * 健康检查响应
 */
export interface HealthResponse {
  status: string;
  version: string;
  timestamp: number;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string;
  user: UserInfo;
}

/**
 * 注册响应
 */
export interface RegisterResponse {
  token: string;
  user: UserInfo;
}

/**
 * 用户信息
 */
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

/**
 * 流式响应块（用于WebSocket流式传输）
 */
export interface StreamChunk {
  content: string;
  isDone: boolean;
  error?: string;
  usage?: TokenUsage;
}
