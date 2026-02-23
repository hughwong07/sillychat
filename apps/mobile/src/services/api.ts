/**
 * API 调用封装
 * 提供统一的 HTTP 请求处理和错误管理
 */

import { ApiResponse } from '../types';

/**
 * API 配置
 */
interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

/**
 * 请求方法类型
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * 请求选项
 */
interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: object | FormData;
  timeout?: number;
  retries?: number;
}

/**
 * API 服务类
 * 封装所有 HTTP 请求逻辑
 */
export class ApiService {
  private static config: ApiConfig = {
    baseURL: 'http://localhost:8080/api/v1',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  private static authToken: string | null = null;

  /**
   * 配置 API 服务
   */
  static configure(config: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置认证令牌
   */
  static setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * 获取认证令牌
   */
  static getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * 构建请求 URL
   */
  private static buildURL(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    const baseURL = this.config.baseURL.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseURL}${path}`;
  }

  /**
   * 构建请求头
   */
  private static buildHeaders(
    customHeaders?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.config.headers,
      ...customHeaders,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * 发送 HTTP 请求
   */
  private static async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers: customHeaders,
      body,
      timeout = this.config.timeout,
      retries = 0,
    } = options;

    const url = this.buildURL(endpoint);
    const headers = this.buildHeaders(customHeaders);

    // 构建请求配置
    const requestInit: RequestInit = {
      method,
      headers,
    };

    // 处理请求体
    if (body) {
      if (body instanceof FormData) {
        requestInit.body = body;
        // 删除 Content-Type，让浏览器自动设置
        delete headers['Content-Type'];
      } else {
        requestInit.body = JSON.stringify(body);
      }
    }

    try {
      // 创建超时控制器
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      requestInit.signal = controller.signal;

      const response = await fetch(url, requestInit);
      clearTimeout(timeoutId);

      // 解析响应
      const data = await this.parseResponse<T>(response);

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
          code: response.status,
        };
      }

      return {
        success: true,
        data,
        code: response.status,
      };
    } catch (error) {
      // 处理重试
      if (retries > 0) {
        console.log(`请求失败，${retries} 秒后重试...`);
        await this.delay(1000);
        return this.request<T>(endpoint, { ...options, retries: retries - 1 });
      }

      return this.handleError(error);
    }
  }

  /**
   * 解析响应数据
   */
  private static async parseResponse<T>(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  /**
   * 处理错误
   */
  private static handleError(error: any): ApiResponse<never> {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: '请求超时，请检查网络连接',
        code: 408,
      };
    }

    if (error.message?.includes('Network request failed')) {
      return {
        success: false,
        error: '网络连接失败，请检查网络设置',
        code: 0,
      };
    }

    return {
      success: false,
      error: error.message || '未知错误',
      code: 500,
    };
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== HTTP 方法封装 ====================

  /**
   * GET 请求
   */
  static async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    let url = endpoint;

    if (params) {
      const queryString = Object.entries(params)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
        )
        .join('&');
      url = `${endpoint}?${queryString}`;
    }

    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  static async post<T>(
    endpoint: string,
    body?: object,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  static async put<T>(
    endpoint: string,
    body?: object,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH 请求
   */
  static async patch<T>(
    endpoint: string,
    body?: object,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE 请求
   */
  static async delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // ==================== 业务 API 方法 ====================

  /**
   * 用户登录
   */
  static async login(credentials: {
    username: string;
    password: string;
  }): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.post('/auth/login', credentials);
  }

  /**
   * 用户注册
   */
  static async register(data: {
    username: string;
    password: string;
    email: string;
  }): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.post('/auth/register', data);
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser<T>(): Promise<ApiResponse<T>> {
    return this.get('/users/me');
  }

  /**
   * 更新用户信息
   */
  static async updateUser<T>(
    userId: string,
    data: Partial<T>
  ): Promise<ApiResponse<T>> {
    return this.patch(`/users/${userId}`, data);
  }

  /**
   * 获取对话列表
   */
  static async getConversations<T>(
    page = 1,
    limit = 20
  ): Promise<ApiResponse<T[]>> {
    return this.get('/conversations', { page, limit });
  }

  /**
   * 获取对话消息
   */
  static async getMessages<T>(
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<ApiResponse<T[]>> {
    return this.get(`/conversations/${conversationId}/messages`, {
      page,
      limit,
    });
  }

  /**
   * 发送消息
   */
  static async sendMessage<T>(
    conversationId: string,
    content: string
  ): Promise<ApiResponse<T>> {
    return this.post(`/conversations/${conversationId}/messages`, {
      content,
    });
  }

  /**
   * 获取代理列表
   */
  static async getAgents<T>(): Promise<ApiResponse<T[]>> {
    return this.get('/agents');
  }

  /**
   * 获取代理详情
   */
  static async getAgentDetail<T>(agentId: string): Promise<ApiResponse<T>> {
    return this.get(`/agents/${agentId}`);
  }

  /**
   * 上传文件
   */
  static async uploadFile<T>(
    file: { uri: string; name: string; type: string },
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    return this.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

export default ApiService;
