/**
 * 消息角色枚举
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
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
  attachments: Attachment[];

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
    this.attachments = [];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
