/**
 * 消息角色枚举
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

/**
 * 同步状态枚举
 */
export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed'
}

/**
 * 消息模型
 */
export class Message {
  id: string;
  content: string;
  role: MessageRole;
  conversationId: string;
  timestamp: number;
  isStreaming: boolean;
  syncStatus: SyncStatus;
  senderName?: string;
  senderAvatar?: string;
  attachments: Attachment[];
  replyTo?: string;
  metadata?: Record<string, any>;

  constructor(
    content: string,
    role: MessageRole,
    conversationId: string = 'default',
    id?: string
  ) {
    this.id = id ?? this.generateId();
    this.content = content;
    this.role = role;
    this.conversationId = conversationId;
    this.timestamp = Date.now();
    this.isStreaming = false;
    this.syncStatus = SyncStatus.PENDING;
    this.attachments = [];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 设置发送者信息
   */
  setSender(name: string, avatar?: string): void {
    this.senderName = name;
    if (avatar) {
      this.senderAvatar = avatar;
    }
  }

  /**
   * 添加附件
   */
  addAttachment(attachment: Attachment): void {
    this.attachments.push(attachment);
  }

  /**
   * 标记为已同步
   */
  markAsSynced(): void {
    this.syncStatus = SyncStatus.SYNCED;
  }

  /**
   * 标记为同步失败
   */
  markAsFailed(): void {
    this.syncStatus = SyncStatus.FAILED;
  }

  /**
   * 标记为同步中
   */
  markAsSyncing(): void {
    this.syncStatus = SyncStatus.SYNCING;
  }
}

/**
 * 附件模型
 */
export class Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  name: string;
  size: number;
  mimeType?: string;

  constructor(type: AttachmentType, url: string, name: string, size: number) {
    this.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.type = type;
    this.url = url;
    this.name = name;
    this.size = size;
  }
}

/**
 * 附件类型枚举
 */
export enum AttachmentType {
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  VIDEO = 'video'
}

/**
 * 发送消息状态
 */
export enum SendMessageState {
  IDLE = 'idle',
  SENDING = 'sending',
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * 消息查询过滤器
 */
export interface MessageFilter {
  role?: MessageRole;
  startTime?: number;
  endTime?: number;
  searchQuery?: string;
  hasAttachments?: boolean;
}

/**
 * 消息分页结果
 */
export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
  totalCount: number;
}
