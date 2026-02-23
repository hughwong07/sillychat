/**
 * WebSocket 连接管理
 * 提供实时消息通信功能，支持自动重连和心跳检测
 */

import { EventEmitter } from 'events';
import { ConnectionStatus, GatewayConfig, Message } from '../types';

/**
 * WebSocket 事件类型
 */
export enum WebSocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  MESSAGE = 'message',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
  TYPING = 'typing',
  PRESENCE = 'presence',
}

/**
 * WebSocket 服务类
 * 管理 WebSocket 连接生命周期和消息处理
 */
export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: GatewayConfig;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: string[] = [];
  private isManualClose = false;

  // 默认配置
  private static readonly DEFAULT_CONFIG: GatewayConfig = {
    host: 'localhost',
    port: 8080,
    secure: false,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  };

  // 心跳间隔（毫秒）
  private static readonly HEARTBEAT_INTERVAL = 30000;

  constructor(config?: Partial<GatewayConfig>) {
    super();
    this.config = { ...WebSocketService.DEFAULT_CONFIG, ...config };
  }

  /**
   * 获取当前连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 建立 WebSocket 连接
   */
  connect(token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket 已经连接');
      return;
    }

    this.isManualClose = false;
    this.status = 'connecting';
    this.emit(WebSocketEvent.RECONNECTING, { attempt: this.reconnectAttempts });

    const protocol = this.config.secure ? 'wss' : 'ws';
    const url = `${protocol}://${this.config.host}:${this.config.port}/ws`;

    try {
      // 创建 WebSocket 连接
      this.ws = new WebSocket(url, token ? [`Bearer-${token}`] : []);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      this.handleError(error);
    }
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect(): void {
    this.isManualClose = true;
    this.clearTimers();

    if (this.ws) {
      this.ws.close(1000, '用户主动断开');
      this.ws = null;
    }

    this.status = 'disconnected';
    this.reconnectAttempts = 0;
    this.emit(WebSocketEvent.DISCONNECT, { reason: 'manual' });
  }

  /**
   * 发送消息
   */
  send(data: object | string): boolean {
    const message = typeof data === 'string' ? data : JSON.stringify(data);

    if (this.isConnected()) {
      this.ws!.send(message);
      return true;
    } else {
      // 离线时加入队列
      this.messageQueue.push(message);
      console.log('消息已加入队列，等待连接恢复');
      return false;
    }
  }

  /**
   * 发送聊天消息
   */
  sendMessage(message: Partial<Message>): boolean {
    return this.send({
      type: 'message',
      payload: message,
    });
  }

  /**
   * 发送正在输入状态
   */
  sendTyping(conversationId: string, isTyping: boolean): boolean {
    return this.send({
      type: 'typing',
      payload: {
        conversationId,
        isTyping,
      },
    });
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat(): void {
    if (this.isConnected()) {
      this.send({ type: 'ping', timestamp: Date.now() });
    }
  }

  /**
   * 处理连接打开
   */
  private handleOpen(): void {
    console.log('WebSocket 连接成功');
    this.status = 'connected';
    this.reconnectAttempts = 0;

    // 启动心跳
    this.startHeartbeat();

    // 发送队列中的消息
    this.flushMessageQueue();

    this.emit(WebSocketEvent.CONNECT, {});
  }

  /**
   * 处理接收消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'message':
          this.emit(WebSocketEvent.MESSAGE, data.payload);
          break;
        case 'typing':
          this.emit(WebSocketEvent.TYPING, data.payload);
          break;
        case 'presence':
          this.emit(WebSocketEvent.PRESENCE, data.payload);
          break;
        case 'pong':
          // 心跳响应，无需处理
          break;
        default:
          this.emit(data.type, data.payload);
      }
    } catch (error) {
      console.error('解析消息失败:', error);
      this.emit(WebSocketEvent.MESSAGE, event.data);
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: any): void {
    console.error('WebSocket 错误:', error);
    this.status = 'disconnected';
    this.emit(WebSocketEvent.ERROR, error);
  }

  /**
   * 处理连接关闭
   */
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket 连接关闭: ${event.code} - ${event.reason}`);
    this.status = 'disconnected';
    this.clearTimers();

    this.emit(WebSocketEvent.DISCONNECT, {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    // 非主动断开时尝试重连
    if (!this.isManualClose && event.code !== 1000) {
      this.attemptReconnect();
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连');
      this.emit(WebSocketEvent.ERROR, { message: '连接失败，请检查网络' });
      return;
    }

    this.reconnectAttempts++;
    this.status = 'reconnecting';

    console.log(`第 ${this.reconnectAttempts} 次重连...`);
    this.emit(WebSocketEvent.RECONNECTING, { attempt: this.reconnectAttempts });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, WebSocketService.HEARTBEAT_INTERVAL);
  }

  /**
   * 清除定时器
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 发送队列中的消息
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws!.send(message);
      }
    }
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}

// 导出单例实例
export const websocketService = new WebSocketService();

export default WebSocketService;
