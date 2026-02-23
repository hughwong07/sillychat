import { Logger } from '../../utils/Logger';
import { ApiService, SendMessageRequest } from '../remote/ApiService';
import { Message, MessageRole, MessageType, SyncStatus } from '../../model/Message';
import { AppStorageV2 } from '@kit.ArkUI';

const TAG = 'MessageRepository';

/**
 * 消息仓库类
 * 负责消息的本地存储和远程同步
 */
export class MessageRepository {
  private static instance: MessageRepository;
  private apiService: ApiService;
  private messages: Map<string, Message[]> = new Map();
  private listeners: Map<string, ((messages: Message[]) => void)[]> = new Map();

  private constructor() {
    this.apiService = ApiService.getInstance();
    this.loadMessagesFromStorage();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MessageRepository {
    if (!MessageRepository.instance) {
      MessageRepository.instance = new MessageRepository();
    }
    return MessageRepository.instance;
  }

  /**
   * 从持久化存储加载消息
   */
  private loadMessagesFromStorage(): void {
    try {
      const stored = AppStorageV2.get<Map<string, Message[]>>('messages_cache');
      if (stored) {
        this.messages = new Map(Object.entries(stored));
        Logger.info(TAG, `Loaded ${this.messages.size} conversations from storage`);
      }
    } catch (error) {
      Logger.error(TAG, `Failed to load messages: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 保存消息到持久化存储
   */
  private saveMessagesToStorage(): void {
    try {
      const obj = Object.fromEntries(this.messages);
      AppStorageV2.set('messages_cache', obj);
    } catch (error) {
      Logger.error(TAG, `Failed to save messages: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 获取会话消息
   */
  public getMessages(conversationId: string): Message[] {
    const msgs = this.messages.get(conversationId) || [];
    return msgs.filter(m => !m.isDeleted).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取最近消息
   */
  public getRecentMessages(conversationId: string, limit: number = 50): Message[] {
    const msgs = this.getMessages(conversationId);
    return msgs.slice(-limit);
  }

  /**
   * 发送消息
   */
  public async sendMessage(
    content: string,
    conversationId: string = 'default',
    agentId?: string
  ): Promise<Message | null> {
    try {
      // 创建用户消息
      const userMessage = Message.createUserMessage(content, conversationId);
      this.addMessage(conversationId, userMessage);

      // 发送到服务器
      const request: SendMessageRequest = {
        content: content,
        conversationId: conversationId,
        agentId: agentId
      };

      const response = await this.apiService.sendMessage(request);

      if (response.success && response.data) {
        // 更新用户消息同步状态
        userMessage.syncStatus = SyncStatus.SYNCED;
        this.updateMessage(conversationId, userMessage);

        // 创建助手消息
        const assistantMessage = new Message(
          response.data.messageId,
          conversationId,
          response.data.content,
          MessageRole.ASSISTANT,
          undefined,
          response.data.agentId,
          undefined,
          response.data.timestamp,
          MessageType.TEXT,
          undefined,
          undefined,
          SyncStatus.SYNCED
        );
        this.addMessage(conversationId, assistantMessage);

        return assistantMessage;
      } else {
        userMessage.syncStatus = SyncStatus.FAILED;
        this.updateMessage(conversationId, userMessage);
        Logger.error(TAG, `Send message failed: ${response.error}`);
        return null;
      }
    } catch (error) {
      Logger.error(TAG, `Send message error: ${JSON.stringify(error)}`);
      return null;
    }
  }

  /**
   * 添加消息到本地存储
   */
  public addMessage(conversationId: string, message: Message): void {
    if (!this.messages.has(conversationId)) {
      this.messages.set(conversationId, []);
    }
    const msgs = this.messages.get(conversationId)!;
    msgs.push(message);
    this.messages.set(conversationId, msgs);
    this.saveMessagesToStorage();
    this.notifyListeners(conversationId);
  }

  /**
   * 更新消息
   */
  public updateMessage(conversationId: string, message: Message): void {
    const msgs = this.messages.get(conversationId);
    if (msgs) {
      const index = msgs.findIndex(m => m.id === message.id);
      if (index !== -1) {
        msgs[index] = message;
        this.messages.set(conversationId, msgs);
        this.saveMessagesToStorage();
        this.notifyListeners(conversationId);
      }
    }
  }

  /**
   * 删除消息（软删除）
   */
  public deleteMessage(conversationId: string, messageId: string, softDelete: boolean = true): void {
    const msgs = this.messages.get(conversationId);
    if (msgs) {
      const index = msgs.findIndex(m => m.id === messageId);
      if (index !== -1) {
        if (softDelete) {
          msgs[index].isDeleted = true;
        } else {
          msgs.splice(index, 1);
        }
        this.messages.set(conversationId, msgs);
        this.saveMessagesToStorage();
        this.notifyListeners(conversationId);
      }
    }
  }

  /**
   * 搜索消息
   */
  public searchMessages(query: string): Message[] {
    const results: Message[] = [];
    const lowerQuery = query.toLowerCase();

    this.messages.forEach((msgs, conversationId) => {
      const found = msgs.filter(m =>
        !m.isDeleted &&
        m.content.toLowerCase().includes(lowerQuery)
      );
      results.push(...found);
    });

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 同步待同步的消息
   */
  public async syncPendingMessages(): Promise<SyncResult> {
    const pendingMessages: Message[] = [];

    this.messages.forEach(msgs => {
      const pending = msgs.filter(m => m.syncStatus === SyncStatus.PENDING);
      pendingMessages.push(...pending);
    });

    if (pendingMessages.length === 0) {
      return { syncedCount: 0, failedCount: 0, serverMessages: [] };
    }

    // 更新为同步中状态
    pendingMessages.forEach(msg => {
      msg.syncStatus = SyncStatus.SYNCING;
      this.updateMessage(msg.conversationId, msg);
    });

    const response = await this.apiService.syncMessages(pendingMessages);

    if (response.success && response.data) {
      // 更新已同步的消息
      response.data.syncedIds.forEach(id => {
        this.messages.forEach((msgs, convId) => {
          const msg = msgs.find(m => m.id === id);
          if (msg) {
            msg.syncStatus = SyncStatus.SYNCED;
            this.updateMessage(convId, msg);
          }
        });
      });

      // 更新失败的消息
      response.data.failedIds.forEach(id => {
        this.messages.forEach((msgs, convId) => {
          const msg = msgs.find(m => m.id === id);
          if (msg) {
            msg.syncStatus = SyncStatus.FAILED;
            this.updateMessage(convId, msg);
          }
        });
      });

      // 保存服务器返回的新消息
      response.data.serverMessages.forEach(msg => {
        this.addMessage(msg.conversationId, msg);
      });

      return {
        syncedCount: response.data.syncedIds.length,
        failedCount: response.data.failedIds.length,
        serverMessages: response.data.serverMessages
      };
    } else {
      // 恢复为待同步状态
      pendingMessages.forEach(msg => {
        msg.syncStatus = SyncStatus.PENDING;
        this.updateMessage(msg.conversationId, msg);
      });

      return { syncedCount: 0, failedCount: pendingMessages.length, serverMessages: [] };
    }
  }

  /**
   * 获取待同步消息数量
   */
  public getPendingSyncCount(): number {
    let count = 0;
    this.messages.forEach(msgs => {
      count += msgs.filter(m => m.syncStatus === SyncStatus.PENDING).length;
    });
    return count;
  }

  /**
   * 清空会话消息
   */
  public clearConversation(conversationId: string): void {
    this.messages.delete(conversationId);
    this.saveMessagesToStorage();
    this.notifyListeners(conversationId);
  }

  /**
   * 获取消息数量
   */
  public getMessageCount(conversationId: string): number {
    const msgs = this.messages.get(conversationId);
    return msgs ? msgs.filter(m => !m.isDeleted).length : 0;
  }

  /**
   * 从服务器加载历史消息
   */
  public async loadHistoryFromServer(
    conversationId: string,
    before?: number,
    limit: number = 20
  ): Promise<boolean> {
    const response = await this.apiService.getMessageHistory(conversationId, before, limit);

    if (response.success && response.data) {
      response.data.messages.forEach(msg => {
        if (!this.messageExists(conversationId, msg.id)) {
          this.addMessage(conversationId, msg);
        }
      });
      return response.data.hasMore;
    }

    return false;
  }

  /**
   * 检查消息是否存在
   */
  private messageExists(conversationId: string, messageId: string): boolean {
    const msgs = this.messages.get(conversationId);
    return msgs ? msgs.some(m => m.id === messageId) : false;
  }

  /**
   * 添加消息变更监听器
   */
  public addListener(conversationId: string, callback: (messages: Message[]) => void): void {
    if (!this.listeners.has(conversationId)) {
      this.listeners.set(conversationId, []);
    }
    this.listeners.get(conversationId)!.push(callback);
  }

  /**
   * 移除消息变更监听器
   */
  public removeListener(conversationId: string, callback: (messages: Message[]) => void): void {
    const callbacks = this.listeners.get(conversationId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(conversationId: string): void {
    const callbacks = this.listeners.get(conversationId);
    if (callbacks) {
      const msgs = this.getMessages(conversationId);
      callbacks.forEach(callback => callback(msgs));
    }
  }
}

/**
 * 同步结果
 */
export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  serverMessages: Message[];
}

/**
 * 流式发送状态
 */
export enum StreamState {
  SENDING = 'sending',
  USER_MESSAGE_SENT = 'user_message_sent',
  CHUNK = 'chunk',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * 流式响应回调
 */
export interface StreamCallback {
  onStateChange: (state: StreamState, data?: string | Message) => void;
}
