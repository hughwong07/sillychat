# 教程 2: 聊天功能

本教程介绍如何实现完整的聊天功能，包括消息管理、文件上传、流式响应等。

## 目录

1. [消息管理](#消息管理)
2. [流式响应](#流式响应)
3. [文件处理](#文件处理)
4. [消息搜索](#消息搜索)
5. [UI 实现](#ui-实现)

---

## 消息管理

### 创建对话

```typescript
import { ConversationManager } from '@sillychat/core/agents';

const conversationManager = new ConversationManager();

// 创建对话
const conversation = await conversationManager.createConversation({
  agentId: 'assistant-1',
  title: '新项目讨论',
  ownerId: 'user-123'
});

console.log(`对话创建: ${conversation.id}`);
```

### 发送和接收消息

```typescript
// 发送消息
const message = await agent.sendMessage(
  conversation.id,
  '你好，请帮我分析这段代码'
);

console.log(`AI回复: ${message.content}`);

// 获取历史消息
const messages = await conversationManager.getMessages(conversation.id, {
  limit: 50,
  before: Date.now()
});

messages.forEach(msg => {
  console.log(`${msg.role}: ${msg.content}`);
});
```

### 消息状态管理

```typescript
enum MessageStatus {
  PENDING = 'pending',      // 发送中
  SENT = 'sent',            // 已发送
  DELIVERED = 'delivered',  // 已送达
  READ = 'read',            // 已读
  FAILED = 'failed'         // 发送失败
}

interface Message {
  id: string;
  content: string;
  status: MessageStatus;
  createdAt: number;
  updatedAt: number;
}

// 更新消息状态
async function updateMessageStatus(
  messageId: string,
  status: MessageStatus
): Promise<void> {
  await db.run(
    'UPDATE messages SET status = ?, updated_at = ? WHERE id = ?',
    [status, Date.now(), messageId]
  );
}
```

---

## 流式响应

### 基本实现

```typescript
// 流式发送消息
async function streamMessage(
  agent: Agent,
  conversationId: string,
  content: string,
  onChunk: (chunk: StreamChunk) => void
): Promise<void> {
  let fullContent = '';

  await agent.streamMessage(
    conversationId,
    content,
    (chunk) => {
      fullContent += chunk.content || '';
      onChunk(chunk);
    }
  );

  return fullContent;
}

// 使用示例
console.log('AI: ');
await streamMessage(
  agent,
  conversationId,
  '写一首关于春天的诗',
  (chunk) => {
    process.stdout.write(chunk.content);
  }
);
console.log('\n');
```

### WebSocket 流式传输

```typescript
import { GatewayClient } from '@sillychat/core/gateway';

const client = new GatewayClient({
  url: 'ws://localhost:8080/ws'
});

await client.connect();

// 发送流式消息请求
client.send({
  type: 'chat.stream',
  conversationId,
  content: '讲个故事'
});

// 接收流式响应
client.on('message', (message) => {
  if (message.type === 'stream.chunk') {
    displayChunk(message.content);
  } else if (message.type === 'stream.end') {
    displayComplete();
  }
});
```

### 打字机效果

```typescript
class TypewriterEffect {
  private currentText = '';
  private targetText = '';
  private index = 0;
  private intervalId: NodeJS.Timeout | null = null;

  start(
    fullText: string,
    onUpdate: (text: string) => void,
    speed = 30
  ): void {
    this.targetText = fullText;
    this.currentText = '';
    this.index = 0;

    this.intervalId = setInterval(() => {
      if (this.index < this.targetText.length) {
        this.currentText += this.targetText.charAt(this.index);
        this.index++;
        onUpdate(this.currentText);
      } else {
        this.stop();
      }
    }, speed);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  append(text: string): void {
    this.targetText += text;
  }
}

// 使用
const typewriter = new TypewriterEffect();

customAgent.on('stream.chunk', (chunk) => {
  typewriter.append(chunk.content);
});

typewriter.start('', (text) => {
  updateUI(text);
}, 20);
```

---

## 文件处理

### 文件上传

```typescript
import { BlobPool } from '@sillychat/core/storage';

const blobPool = new BlobPool({
  poolPath: './data/blobs'
});
await blobPool.initialize();

// 上传文件
async function uploadFile(filePath: string): Promise<FileMetadata> {
  // 1. 存储到 BlobPool
  const result = await blobPool.store(filePath);

  // 2. 获取文件信息
  const stats = await fs.promises.stat(filePath);
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';

  // 3. 创建元数据
  const metadata: FileMetadata = {
    hash: result.hash,
    originalName: path.basename(filePath),
    mimeType,
    size: stats.size,
    category: classifyFile(mimeType),
    createdAt: new Date()
  };

  // 4. 保存到数据库
  await db.run(
    'INSERT INTO files (hash, metadata) VALUES (?, ?)',
    [result.hash, JSON.stringify(metadata)]
  );

  return metadata;
}
```

### 图片处理

```typescript
import sharp from 'sharp';

async function processImage(
  filePath: string,
  options: ImageOptions
): Promise<ProcessedImage> {
  const image = sharp(filePath);
  const metadata = await image.metadata();

  // 生成缩略图
  const thumbnail = await image
    .resize(300, 300, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();

  // 生成预览图
  const preview = await image
    .resize(1200, 1200, { fit: 'inside' })
    .jpeg({ quality: 85 })
    .toBuffer();

  return {
    original: {
      width: metadata.width,
      height: metadata.height,
      size: metadata.size
    },
    thumbnail: {
      buffer: thumbnail,
      width: 300,
      height: 300
    },
    preview: {
      buffer: preview,
      width: Math.min(metadata.width!, 1200),
      height: Math.min(metadata.height!, 1200)
    }
  };
}
```

### 文件下载

```typescript
async function downloadFile(
  hash: string,
  destinationPath: string
): Promise<void> {
  const sourcePath = await blobPool.getPath(hash);
  if (!sourcePath) {
    throw new Error('File not found');
  }

  await fs.promises.copyFile(sourcePath, destinationPath);
}

// 流式下载
async function streamFile(
  hash: string,
  res: Response
): Promise<void> {
  const stream = await blobPool.getStream(hash);
  if (!stream) {
    res.status(404).send('File not found');
    return;
  }

  const metadata = await getFileMetadata(hash);
  res.setHeader('Content-Type', metadata.mimeType);
  res.setHeader('Content-Length', metadata.size);

  stream.pipe(res);
}
```

---

## 消息搜索

### 基础搜索

```typescript
async function searchMessages(
  query: string,
  options: SearchOptions = {}
): Promise<Message[]> {
  const { conversationId, limit = 20 } = options;

  let sql = `
    SELECT * FROM messages
    WHERE content LIKE ?
  `;
  const params: any[] = [`%${query}%`];

  if (conversationId) {
    sql += ' AND conversation_id = ?';
    params.push(conversationId);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  return db.all<Message>(sql, params);
}
```

### 向量搜索

```typescript
import { LongTermMemory } from '@sillychat/core/memory';

const memory = new LongTermMemory({
  dbPath: './data/memory.db',
  embeddingDimension: 1536
});

// 添加消息到记忆
await memory.add({
  id: 'msg-1',
  content: '今天讨论了项目架构设计',
  embedding: await generateEmbedding('今天讨论了项目架构设计')
});

// 语义搜索
const results = await memory.search('架构设计', {
  limit: 5,
  threshold: 0.7
});

results.forEach(result => {
  console.log(`相似度: ${result.score}, 内容: ${result.content}`);
});
```

### 高级搜索

```typescript
interface AdvancedSearchOptions {
  query: string;
  conversationId?: string;
  dateRange?: { start: Date; end: Date };
  sender?: string;
  hasAttachments?: boolean;
  sortBy: 'relevance' | 'date';
}

async function advancedSearch(
  options: AdvancedSearchOptions
): Promise<SearchResult[]> {
  // 1. 全文搜索
  const textResults = await searchMessages(options.query, {
    conversationId: options.conversationId
  });

  // 2. 向量搜索
  const vectorResults = await memory.search(options.query, {
    limit: 10
  });

  // 3. 合并结果
  const combined = mergeResults(textResults, vectorResults);

  // 4. 过滤和排序
  return combined
    .filter(r => filterByOptions(r, options))
    .sort((a, b) => sortResults(a, b, options.sortBy));
}
```

---

## UI 实现

### React 组件

```tsx
// components/ChatContainer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@sillychat/react';

export const ChatContainer: React.FC<{ conversationId: string }> = ({
  conversationId
}) => {
  const {
    messages,
    sendMessage,
    isLoading,
    streamingContent
  } = useConversation(conversationId);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText('');

    await sendMessage(text);
  };

  return (
    <div className="chat-container">
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
      />
      <div ref={messagesEndRef} />

      <div className="input-area">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入消息..."
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading}>
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
};
```

### 消息列表

```tsx
// components/MessageList.tsx
import React from 'react';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingContent
}) => {
  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isLast={index === messages.length - 1}
        />
      ))}

      {streamingContent && (
        <MessageBubble
          message={{
            id: 'streaming',
            role: 'assistant',
            content: streamingContent,
            createdAt: Date.now()
          }}
          isStreaming
        />
      )}
    </div>
  );
};
```

### 消息气泡

```tsx
// components/MessageBubble.tsx
import React from 'react';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLast,
  isStreaming
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'ai'}`}>
      <div className="avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="content">
        <div className="text">{message.content}</div>
        {isStreaming && <span className="cursor">▊</span>}
        <div className="meta">
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
```

### 文件上传 UI

```tsx
// components/FileUpload.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export const FileUpload: React.FC<{ onUpload: (files: File[]) => void }> = ({
  onUpload
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>拖放文件到这里...</p>
      ) : (
        <p>点击或拖放文件上传</p>
      )}
    </div>
  );
};
```

---

## 最佳实践

### 1. 消息队列

```typescript
class MessageQueue {
  private queue: PendingMessage[] = [];
  private processing = false;

  async add(message: PendingMessage): Promise<void> {
    this.queue.push(message);
    if (!this.processing) {
      await this.process();
    }
  }

  private async process(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const message = this.queue.shift()!;
      try {
        await this.sendMessage(message);
      } catch (error) {
        message.retryCount = (message.retryCount || 0) + 1;
        if (message.retryCount < 3) {
          this.queue.unshift(message);
        }
      }
    }

    this.processing = false;
  }
}
```

### 2. 乐观更新

```typescript
const sendMessageOptimistic = async (content: string) => {
  // 1. 立即显示消息（乐观更新）
  const tempId = `temp-${Date.now()}`;
  addMessage({
    id: tempId,
    content,
    role: 'user',
    status: 'sending'
  });

  try {
    // 2. 实际发送
    const message = await api.sendMessage(content);

    // 3. 替换临时消息
    replaceMessage(tempId, message);
  } catch (error) {
    // 4. 标记失败
    updateMessage(tempId, { status: 'failed' });
  }
};
```

### 3. 错误重试

```typescript
const sendWithRetry = async (
  content: string,
  maxRetries = 3
): Promise<Message> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendMessage(content);
    } catch (error) {
      lastError = error as Error;
      await delay(1000 * Math.pow(2, i)); // 指数退避
    }
  }

  throw lastError;
};
```

---

## 下一步

- 学习 [AI 代理](03-ai-agents.md)
- 了解 [安全设置](04-security.md)
- 阅读 [完整 API 文档](../api/core.md)

---

*您现在已掌握 SillyChat 的聊天功能！*
