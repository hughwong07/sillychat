import { Logger } from '../utils/Logger';
import { MessageRepository, SyncResult } from '../data/repository/MessageRepository';
import { AgentRepository } from '../data/repository/AgentRepository';
import { Message, SendMessageState } from '../model/Message';
import { Agent } from '../model/Agent';
import { emitter } from '@kit.BasicServicesKit';

const TAG = 'ChatViewModel';

/**
 * 聊天界面状态
 */
@Observed
export class ChatUiState {
  /**
   * 消息列表
   */
  messages: Message[] = [];

  /**
   * 输入文本
   */
  inputText: string = '';

  /**
   * 是否正在加载
   */
  isLoading: boolean = false;

  /**
   * 是否正在发送消息
   */
  isSending: boolean = false;

  /**
   * 错误信息
   */
  error: string | null = null;

  /**
   * 当前选中的代理
   */
  selectedAgent: Agent | null = null;

  /**
   * 可用代理列表
   */
  availableAgents: Agent[] = [];

  /**
   * 当前会话ID
   */
  conversationId: string = 'default';

  /**
   * 是否还有更多历史消息
   */
  hasMoreMessages: boolean = true;

  /**
   * 流式响应的当前内容
   */
  streamingContent: string = '';

  constructor(init?: Partial<ChatUiState>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}

/**
 * 聊天ViewModel
 * 管理聊天界面的状态和逻辑
 */
export class ChatViewModel {
  private static instance: ChatViewModel;

  // 最大消息长度
  private static readonly MAX_MESSAGE_LENGTH = 4000;
  // 危险字符过滤正则
  private static readonly DANGEROUS_CHARS_REGEX = /[<>"'&\x00-\x1F]/g;

  private messageRepository: MessageRepository;
  private agentRepository: AgentRepository;

  // UI状态
  @Track
  uiState: ChatUiState = new ChatUiState();

  // 发送消息状态
  sendMessageState: SendMessageState = SendMessageState.IDLE;

  // 消息变更监听器
  private messageListener: (messages: Message[]) => void;

  private constructor() {
    this.messageRepository = MessageRepository.getInstance();
    this.agentRepository = AgentRepository.getInstance();

    // 绑定消息监听器
    this.messageListener = (messages: Message[]) => {
      this.uiState.messages = messages;
    };

    this.init();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ChatViewModel {
    if (!ChatViewModel.instance) {
      ChatViewModel.instance = new ChatViewModel();
    }
    return ChatViewModel.instance;
  }

  /**
   * 初始化
   */
  private init(): void {
    Logger.info(TAG, 'ChatViewModel initializing');

    // 加载可用代理
    this.loadAvailableAgents();

    // 加载当前会话消息
    this.loadMessages();

    // 添加消息监听器
    this.messageRepository.addListener(this.uiState.conversationId, this.messageListener);
  }

  /**
   * 加载可用代理列表
   */
  private loadAvailableAgents(): void {
    const agents = this.agentRepository.getActiveAgents();
    this.uiState.availableAgents = agents;

    // 如果没有选中代理，选择默认代理
    if (!this.uiState.selectedAgent && agents.length > 0) {
      const defaultAgent = agents.find(a => a.isDefault) || agents[0];
      this.uiState.selectedAgent = defaultAgent;
    }

    Logger.info(TAG, `Loaded ${agents.length} available agents`);
  }

  /**
   * 加载消息
   */
  private loadMessages(): void {
    this.uiState.isLoading = true;

    const messages = this.messageRepository.getMessages(this.uiState.conversationId);
    this.uiState.messages = messages;
    this.uiState.isLoading = false;

    Logger.info(TAG, `Loaded ${messages.length} messages`);
  }

  /**
   * 输入文本变化
   */
  public onInputChange(text: string): void {
    // 限制长度
    let truncated = text;
    if (text.length > ChatViewModel.MAX_MESSAGE_LENGTH) {
      truncated = text.substring(0, ChatViewModel.MAX_MESSAGE_LENGTH);
      Logger.warn(TAG, `Input text truncated to ${ChatViewModel.MAX_MESSAGE_LENGTH}`);
    }

    // 过滤危险字符
    const sanitized = truncated.replace(ChatViewModel.DANGEROUS_CHARS_REGEX, '');

    this.uiState.inputText = sanitized;
  }

  /**
   * 发送消息
   */
  public async sendMessage(): Promise<void> {
    const text = this.uiState.inputText.trim();
    if (text.length === 0 || this.uiState.isSending) {
      Logger.warn(TAG, 'Send message cancelled: empty text or already sending');
      return;
    }

    const agentId = this.uiState.selectedAgent?.id;
    const conversationId = this.uiState.conversationId;

    Logger.info(TAG, `Sending message to conversation: ${conversationId}, agent: ${agentId}`);

    this.uiState.isSending = true;
    this.uiState.error = null;
    this.sendMessageState = SendMessageState.SENDING;

    try {
      const result = await this.messageRepository.sendMessage(
        text,
        conversationId,
        agentId
      );

      if (result) {
        Logger.info(TAG, `Message sent successfully: ${result.id}`);
        this.uiState.inputText = '';
        this.uiState.isSending = false;
        this.sendMessageState = SendMessageState.SUCCESS;

        // 发送成功事件
        emitter.emit({ eventId: 1 }, { data: { message: result } });
      } else {
        Logger.error(TAG, 'Message send failed');
        this.uiState.isSending = false;
        this.uiState.error = '发送失败，请重试';
        this.sendMessageState = SendMessageState.ERROR;
      }
    } catch (error) {
      Logger.error(TAG, `Send message error: ${JSON.stringify(error)}`);
      this.uiState.isSending = false;
      this.uiState.error = `发送失败: ${JSON.stringify(error)}`;
      this.sendMessageState = SendMessageState.ERROR;
    }

    // 重置发送状态
    setTimeout(() => {
      this.sendMessageState = SendMessageState.IDLE;
    }, 100);
  }

  /**
   * 选择代理
   */
  public selectAgent(agent: Agent): void {
    Logger.info(TAG, `Selected agent: ${agent.id} - ${agent.name}`);
    this.uiState.selectedAgent = agent;
  }

  /**
   * 切换会话
   */
  public switchConversation(conversationId: string): void {
    if (conversationId === this.uiState.conversationId) {
      Logger.warn(TAG, 'Switch conversation cancelled: same conversation');
      return;
    }

    Logger.info(TAG, `Switching conversation to: ${conversationId}`);

    // 移除旧会话的监听器
    this.messageRepository.removeListener(this.uiState.conversationId, this.messageListener);

    this.uiState.conversationId = conversationId;
    this.uiState.messages = [];
    this.uiState.isLoading = true;

    // 添加新会话的监听器
    this.messageRepository.addListener(conversationId, this.messageListener);

    // 加载新会话的消息
    this.loadMessages();
  }

  /**
   * 删除消息
   */
  public deleteMessage(messageId: string, softDelete: boolean = true): void {
    try {
      this.messageRepository.deleteMessage(
        this.uiState.conversationId,
        messageId,
        softDelete
      );
      Logger.info(TAG, `Message deleted: ${messageId}`);
    } catch (error) {
      Logger.error(TAG, `Delete message error: ${JSON.stringify(error)}`);
      this.uiState.error = `删除消息失败: ${JSON.stringify(error)}`;
    }
  }

  /**
   * 清除当前会话
   */
  public clearConversation(): void {
    try {
      this.messageRepository.clearConversation(this.uiState.conversationId);
      Logger.info(TAG, `Conversation cleared: ${this.uiState.conversationId}`);
    } catch (error) {
      Logger.error(TAG, `Clear conversation error: ${JSON.stringify(error)}`);
      this.uiState.error = `清除会话失败: ${JSON.stringify(error)}`;
    }
  }

  /**
   * 清除错误
   */
  public clearError(): void {
    this.uiState.error = null;
  }

  /**
   * 重试发送失败的消息
   */
  public async retryFailedMessages(): Promise<void> {
    try {
      const result: SyncResult = await this.messageRepository.syncPendingMessages();
      Logger.info(TAG, `Synced ${result.syncedCount} messages, ${result.failedCount} failed`);
    } catch (error) {
      Logger.error(TAG, `Retry failed messages error: ${JSON.stringify(error)}`);
      this.uiState.error = `重试失败: ${JSON.stringify(error)}`;
    }
  }

  /**
   * 加载更多历史消息
   */
  public async loadMoreMessages(): Promise<void> {
    const oldestMessage = this.uiState.messages[0];
    const before = oldestMessage?.timestamp;

    this.uiState.isLoading = true;

    try {
      const hasMore = await this.messageRepository.loadHistoryFromServer(
        this.uiState.conversationId,
        before,
        20
      );

      this.uiState.hasMoreMessages = hasMore;
      Logger.info(TAG, `Loaded more messages, hasMore: ${hasMore}`);
    } catch (error) {
      Logger.error(TAG, `Load more messages error: ${JSON.stringify(error)}`);
    } finally {
      this.uiState.isLoading = false;
    }
  }

  /**
   * 搜索消息
   */
  public searchMessages(query: string): Message[] {
    return this.messageRepository.searchMessages(query);
  }

  /**
   * 刷新代理列表
   */
  public refreshAgents(): void {
    this.loadAvailableAgents();
  }

  /**
   * 获取反转后的消息列表（用于显示）
   */
  public getReversedMessages(): Message[] {
    return [...this.uiState.messages].reverse();
  }

  /**
   * 释放资源
   */
  public destroy(): void {
    this.messageRepository.removeListener(this.uiState.conversationId, this.messageListener);
  }
}
