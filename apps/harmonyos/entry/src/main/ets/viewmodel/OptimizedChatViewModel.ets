import { Logger } from '../utils/Logger';
import { MessageRepository } from '../data/repository/MessageRepository';
import { Message, SendMessageState } from '../model/Message';
import { Agent } from '../model/Agent';
import { ListItemPool, VirtualListCalculator, throttle } from '../components/OptimizedList';

const TAG = 'OptimizedChatViewModel';

/**
 * 优化的聊天ViewModel
 * 使用状态管理和性能优化策略
 */
@Observed
export class OptimizedChatUiState {
  // 使用Map存储消息，提高查找效率
  messages: Map<string, Message> = new Map();
  messageIds: string[] = [];

  inputText: string = '';
  isLoading: boolean = false;
  isSending: boolean = false;
  error: string | null = null;
  selectedAgent: Agent | null = null;
  availableAgents: Agent[] = [];
  conversationId: string = 'default';
  hasMoreMessages: boolean = true;
  streamingContent: string = '';

  // 分页状态
  currentPage: number = 0;
  pageSize: number = 20;

  constructor(init?: Partial<OptimizedChatUiState>) {
    if (init) {
      Object.assign(this, init);
    }
  }

  /**
   * 获取消息列表（按时间排序）
   */
  get sortedMessages(): Message[] {
    return this.messageIds
      .map(id => this.messages.get(id))
      .filter((msg): msg is Message => msg !== undefined);
  }

  /**
   * 获取反转后的消息列表
   */
  get reversedMessages(): Message[] {
    return [...this.sortedMessages].reverse();
  }

  /**
   * 添加或更新消息
   */
  upsertMessage(message: Message): void {
    this.messages.set(message.id, message);
    if (!this.messageIds.includes(message.id)) {
      this.messageIds.push(message.id);
    }
  }

  /**
   * 删除消息
   */
  removeMessage(messageId: string): void {
    this.messages.delete(messageId);
    const index = this.messageIds.indexOf(messageId);
    if (index > -1) {
      this.messageIds.splice(index, 1);
    }
  }

  /**
   * 批量添加消息
   */
  addMessages(newMessages: Message[]): void {
    newMessages.forEach(msg => {
      this.messages.set(msg.id, msg);
      if (!this.messageIds.includes(msg.id)) {
        this.messageIds.unshift(msg.id);
      }
    });
  }

  /**
   * 清空消息
   */
  clearMessages(): void {
    this.messages.clear();
    this.messageIds = [];
  }
}

/**
 * 优化的聊天ViewModel
 */
export class OptimizedChatViewModel {
  private static instance: OptimizedChatViewModel;

  private static readonly MAX_MESSAGE_LENGTH = 4000;
  private static readonly DANGEROUS_CHARS_REGEX = /[<>"'&\x00-\x1F]/g;
  private static readonly MAX_CACHED_MESSAGES = 100;
  private static readonly THROTTLE_INTERVAL = 16; // 约60fps

  private messageRepository: MessageRepository;

  @Track
  uiState: OptimizedChatUiState = new OptimizedChatUiState();

  sendMessageState: SendMessageState = SendMessageState.IDLE;

  // 使用节流优化频繁的状态更新
  private throttledUpdate: (callback: () => void) => void;

  private constructor() {
    this.messageRepository = MessageRepository.getInstance();
    this.throttledUpdate = throttle((callback: () => void) => {
      callback();
    }, OptimizedChatViewModel.THROTTLE_INTERVAL);

    this.init();
  }

  static getInstance(): OptimizedChatViewModel {
    if (!OptimizedChatViewModel.instance) {
      OptimizedChatViewModel.instance = new OptimizedChatViewModel();
    }
    return OptimizedChatViewModel.instance;
  }

  private init(): void {
    Logger.info(TAG, 'OptimizedChatViewModel initializing');
    this.loadMessages();
  }

  /**
   * 加载消息（分页）
   */
  private loadMessages(): void {
    this.uiState.isLoading = true;

    try {
      const messages = this.messageRepository.getMessages(
        this.uiState.conversationId,
        this.uiState.pageSize
      );

      // 使用批量添加优化性能
      this.uiState.addMessages(messages);

      Logger.info(TAG, `Loaded ${messages.length} messages`);
    } catch (error) {
      Logger.error(TAG, `Load messages error: ${JSON.stringify(error)}`);
      this.uiState.error = '加载消息失败';
    } finally {
      this.uiState.isLoading = false;
    }
  }

  /**
   * 加载更多历史消息
   */
  loadMoreMessages(): void {
    if (this.uiState.isLoading || !this.uiState.hasMoreMessages) {
      return;
    }

    this.uiState.isLoading = true;
    this.uiState.currentPage++;

    try {
      const oldestMessage = this.uiState.sortedMessages[0];
      const before = oldestMessage?.timestamp;

      const messages = this.messageRepository.getMessagesBefore(
        this.uiState.conversationId,
        before,
        this.uiState.pageSize
      );

      if (messages.length < this.uiState.pageSize) {
        this.uiState.hasMoreMessages = false;
      }

      // 批量添加消息
      this.uiState.addMessages(messages);

      Logger.info(TAG, `Loaded ${messages.length} more messages`);
    } catch (error) {
      Logger.error(TAG, `Load more messages error: ${JSON.stringify(error)}`);
    } finally {
      this.uiState.isLoading = false;
    }
  }

  /**
   * 输入文本变化（节流）
   */
  onInputChange(text: string): void {
    // 限制长度
    let truncated = text;
    if (text.length > OptimizedChatViewModel.MAX_MESSAGE_LENGTH) {
      truncated = text.substring(0, OptimizedChatViewModel.MAX_MESSAGE_LENGTH);
    }

    // 过滤危险字符
    const sanitized = truncated.replace(OptimizedChatViewModel.DANGEROUS_CHARS_REGEX, '');

    this.throttledUpdate(() => {
      this.uiState.inputText = sanitized;
    });
  }

  /**
   * 发送消息
   */
  async sendMessage(): Promise<void> {
    const text = this.uiState.inputText.trim();
    if (text.length === 0 || this.uiState.isSending) {
      return;
    }

    Logger.info(TAG, `Sending message to conversation: ${this.uiState.conversationId}`);

    this.uiState.isSending = true;
    this.uiState.error = null;
    this.sendMessageState = SendMessageState.SENDING;

    try {
      const result = await this.messageRepository.sendMessage(
        text,
        this.uiState.conversationId,
        this.uiState.selectedAgent?.id
      );

      if (result) {
        // 使用upsert优化消息添加
        this.uiState.upsertMessage(result);
        this.uiState.inputText = '';
        this.uiState.isSending = false;
        this.sendMessageState = SendMessageState.SUCCESS;

        // 限制缓存消息数量
        this.trimCachedMessages();
      } else {
        this.uiState.error = '发送失败，请重试';
        this.uiState.isSending = false;
        this.sendMessageState = SendMessageState.ERROR;
      }
    } catch (error) {
      Logger.error(TAG, `Send message error: ${JSON.stringify(error)}`);
      this.uiState.error = '发送失败';
      this.uiState.isSending = false;
      this.sendMessageState = SendMessageState.ERROR;
    }

    setTimeout(() => {
      this.sendMessageState = SendMessageState.IDLE;
    }, 100);
  }

  /**
   * 限制缓存消息数量
   */
  private trimCachedMessages(): void {
    const messageCount = this.uiState.messageIds.length;
    if (messageCount > OptimizedChatViewModel.MAX_CACHED_MESSAGES) {
      const excessCount = messageCount - OptimizedChatViewModel.MAX_CACHED_MESSAGES;
      const idsToRemove = this.uiState.messageIds.slice(0, excessCount);

      idsToRemove.forEach(id => {
        this.uiState.messages.delete(id);
      });
      this.uiState.messageIds = this.uiState.messageIds.slice(excessCount);

      Logger.info(TAG, `Trimmed ${excessCount} old messages from cache`);
    }
  }

  /**
   * 删除消息
   */
  deleteMessage(messageId: string, softDelete: boolean = true): void {
    try {
      this.messageRepository.deleteMessage(
        this.uiState.conversationId,
        messageId,
        softDelete
      );
      this.uiState.removeMessage(messageId);
      Logger.info(TAG, `Message deleted: ${messageId}`);
    } catch (error) {
      Logger.error(TAG, `Delete message error: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 搜索消息
   */
  searchMessages(query: string): Message[] {
    if (!query || query.length === 0) {
      return [];
    }

    const results: Message[] = [];
    const lowerQuery = query.toLowerCase();

    this.uiState.messages.forEach(message => {
      if (message.content.toLowerCase().includes(lowerQuery)) {
        results.push(message);
      }
    });

    return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  }

  /**
   * 清除错误
   */
  clearError(): void {
    this.uiState.error = null;
  }

  /**
   * 释放资源
   */
  destroy(): void {
    this.uiState.clearMessages();
    Logger.info(TAG, 'ViewModel destroyed');
  }
}
