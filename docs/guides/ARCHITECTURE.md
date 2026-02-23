# 架构指南

本文档介绍 SillyChat 的系统架构、设计原则和核心模块。

## 目录

1. [系统概览](#系统概览)
2. [架构原则](#架构原则)
3. [核心模块](#核心模块)
4. [数据流](#数据流)
5. [平台适配层](#平台适配层)
6. [扩展机制](#扩展机制)

---

## 系统概览

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         应用层 (Apps)                            │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│   Desktop   │   Mobile    │   Android   │      HarmonyOS        │
│  (Electron) │(React Native)│  (Kotlin)   │      (ArkTS)          │
└──────┬──────┴──────┬──────┴──────┬──────┴───────────┬───────────┘
       │             │             │                  │
       └─────────────┴──────┬──────┴──────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      核心引擎 (Core)                             │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│   Agents    │   Gateway   │   Storage   │       Memory          │
│  (AI代理)   │  (网关服务)  │  (存储管理)  │      (记忆系统)        │
└─────────────┴─────────────┴─────────────┴───────────────────────┘
       │             │             │                  │
       └─────────────┴──────┬──────┴──────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      基础设施 (Infrastructure)                   │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│  Protocol   │   Config    │    Utils    │        LLM            │
│  (通信协议)  │  (配置管理)  │  (工具函数)  │     (模型接口)         │
└─────────────┴─────────────┴─────────────┴───────────────────────┘
```

### 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 运行时 | Node.js 22+ | 服务端运行 |
| 语言 | TypeScript 5.7+ | 类型安全 |
| 数据库 | SQLite + sqlite-vec | 本地存储 + 向量检索 |
| 通信 | WebSocket + HTTP | 实时通信 |
| 验证 | Zod | 运行时类型验证 |
| 桌面 | Electron 28+ | 跨平台桌面 |
| 移动 | React Native 0.73+ | 跨平台移动 |

---

## 架构原则

### 1. 本地优先 (Local-First)

```typescript
// 数据首先写入本地，然后同步到云端
class StorageManager {
  async saveMessage(message: Message): Promise<void> {
    // 1. 写入本地数据库
    await this.localDB.insert('messages', message);

    // 2. 添加到同步队列
    await this.syncQueue.add({
      type: 'message',
      action: 'create',
      data: message,
    });

    // 3. 触发本地事件
    this.emit('message:saved', message);
  }
}
```

### 2. 模块化设计

```typescript
// 每个模块有清晰的接口
interface IAgentModule {
  createAgent(config: AgentConfig): Promise<Agent>;
  getAgent(id: string): Promise<Agent | null>;
  deleteAgent(id: string): Promise<void>;
}

interface IStorageModule {
  save(data: unknown): Promise<void>;
  load(id: string): Promise<unknown>;
  delete(id: string): Promise<void>;
}

// 模块间通过依赖注入解耦
class Application {
  constructor(
    private agents: IAgentModule,
    private storage: IStorageModule,
  ) {}
}
```

### 3. 事件驱动架构

```typescript
// 模块间通过事件通信，降低耦合
class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

// 使用示例
eventBus.on('agent:message', async ({ agentId, message }) => {
  await notificationManager.show(agentId, message);
});
```

### 4. 平台抽象

```typescript
// 抽象平台特定功能
interface IPlatformAPI {
  // 存储
  getDataPath(): string;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer): Promise<void>;

  // 网络
  createWebSocket(url: string): WebSocket;
  httpRequest(options: HttpOptions): Promise<HttpResponse>;

  // UI
  showNotification(title: string, body: string): void;
  setBadge(count: number): void;
}

// 平台特定实现
class DesktopPlatform implements IPlatformAPI { }
class MobilePlatform implements IPlatformAPI { }
```

---

## 核心模块

### Agents 模块

负责 AI 代理的生命周期管理。

```typescript
// 架构图
//
// ┌─────────────────────────────────────┐
// │           AgentManager              │
// │  ┌─────────┐ ┌─────────┐           │
// │  │ Agent 1 │ │ Agent 2 │  ...      │
// │  └────┬────┘ └────┬────┘           │
// └───────┼───────────┼─────────────────┘
//         │           │
//    ┌────┴────┐ ┌────┴────┐
//    │ConversationManager│
//    └─────────┘ └─────────┘
//         │
//    ┌────┴────┐
//    │ LLM Provider │
//    │ (OpenAI/Claude/Local) │
//    └─────────┘

class AgentManager {
  private agents = new Map<string, Agent>();

  async createAgent(config: AgentConfig): Promise<Agent> {
    const agent = new Agent(config);
    await agent.initialize();
    this.agents.set(config.id, agent);
    return agent;
  }
}

class Agent {
  private conversationManager: ConversationManager;
  private llmProvider: LLMProvider;

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    // 1. 保存用户消息
    await this.conversationManager.addMessage({
      conversationId,
      role: 'user',
      content,
    });

    // 2. 获取对话历史
    const history = await this.conversationManager.getHistory(conversationId);

    // 3. 调用 LLM
    const response = await this.llmProvider.complete({
      messages: history,
      model: this.config.modelConfig.model,
    });

    // 4. 保存 AI 回复
    return this.conversationManager.addMessage({
      conversationId,
      role: 'assistant',
      content: response.content,
    });
  }
}
```

### Gateway 模块

处理客户端连接和消息路由。

```typescript
// 架构图
//
// ┌─────────────────────────────────────────┐
// │           GatewayServer                 │
// │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
// │  │Client 1 │ │Client 2 │ │Client 3 │   │
// │  └────┬────┘ └────┬────┘ └────┬────┘   │
// └───────┼───────────┼───────────┼─────────┘
//         │           │           │
//    ┌────┴───────────┴───────────┴────┐
//    │        MessageHandler           │
//    │  ┌─────────┐    ┌─────────┐     │
//    │  │ Auth    │───▶│ Router  │     │
//    │  └─────────┘    └────┬────┘     │
//    └──────────────────────┼───────────┘
//                           │
//              ┌────────────┼────────────┐
//              ▼            ▼            ▼
//         ┌────────┐   ┌────────┐   ┌────────┐
//         │Agents  │   │Storage │   │System  │
//         └────────┘   └────────┘   └────────┘

class GatewayServer {
  private connections = new Map<string, WebSocket>();
  private messageHandler: MessageHandler;
  private authManager: AuthManager;

  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const clientId = this.generateClientId();

    // 1. 检查连接数限制
    if (this.connections.size >= this.config.maxConnections) {
      ws.close(1013, 'Max connections reached');
      return;
    }

    // 2. 存储连接
    this.connections.set(clientId, ws);

    // 3. 设置消息处理器
    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnect(clientId));

    // 4. 发送欢迎消息
    this.send(ws, { type: 'connection.accepted', clientId });
  }

  private async handleMessage(clientId: string, data: Buffer): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      // 1. 验证消息格式
      const validation = this.validator.validate(message);
      if (!validation.valid) {
        this.sendError(clientId, 'INVALID_MESSAGE', validation.errors);
        return;
      }

      // 2. 检查权限
      if (this.requiresAuth(message.type)) {
        const session = this.authManager.getSession(clientId);
        if (!session?.authenticated) {
          this.sendError(clientId, 'UNAUTHORIZED');
          return;
        }
      }

      // 3. 路由消息
      await this.messageHandler.handle(message, { clientId });
    } catch (error) {
      this.sendError(clientId, 'INTERNAL_ERROR', error.message);
    }
  }
}
```

### Storage 模块

管理数据持久化。

```typescript
// 架构图
//
// ┌─────────────────────────────────────────┐
// │           StorageManager                │
// └─────────────────────────────────────────┘
//                    │
//      ┌─────────────┼─────────────┐
//      ▼             ▼             ▼
// ┌─────────┐   ┌─────────┐   ┌─────────┐
// │Database │   │BlobPool │   │Organizer│
// │(SQLite) │   │(Files)  │   │(Logic)  │
// └────┬────┘   └────┬────┘   └─────────┘
//      │             │
//      ▼             ▼
// ┌─────────┐   ┌─────────┐
// │Messages │   │Files    │
// │Agents   │   │Images   │
// │Settings │   │Documents│
// └─────────┘   └─────────┘

class StorageManager {
  private db: DatabaseManager;
  private blobPool: BlobPool;
  private organizer: FileOrganizer;

  async storeFile(sourcePath: string): Promise<FileMetadata> {
    // 1. 计算文件哈希
    const hash = await this.calculateHash(sourcePath);

    // 2. 检查是否已存在（去重）
    const existing = await this.blobPool.getPath(hash);
    if (existing) {
      await this.blobPool.incrementRef(hash);
      return this.getMetadata(hash);
    }

    // 3. 存储到 BlobPool
    const result = await this.blobPool.store(sourcePath);

    // 4. 分类整理
    const category = await this.organizer.classify(sourcePath);
    await this.organizer.createSymlink(hash, category, path.basename(sourcePath));

    // 5. 保存元数据
    const metadata: FileMetadata = {
      hash: result.hash,
      originalName: path.basename(sourcePath),
      mimeType: result.mimeType,
      size: result.size,
      category,
      createdAt: new Date(),
    };
    await this.db.run(
      'INSERT INTO files (hash, metadata) VALUES (?, ?)',
      [hash, JSON.stringify(metadata)]
    );

    return metadata;
  }
}
```

### Protocol 模块

定义通信协议和消息格式。

```typescript
// 消息类型层次结构
//
// XSGMessage (基础消息)
// ├── ChatMessage (聊天消息)
// ├── Command (命令)
// │   ├── AgentCommand (代理命令)
// │   └── SystemCommand (系统命令)
// ├── Event (事件)
// │   ├── UserEvent (用户事件)
// │   ├── AgentEvent (代理事件)
// │   └── SystemEvent (系统事件)
// └── FileTransfer (文件传输)

interface XSGMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  sender: Sender;
  target: Target;
  content: MessageContent;
  auth: AuthContext;
}

class ProtocolValidator {
  private schemas = new Map<string, ZodSchema>();

  registerSchema(type: string, schema: ZodSchema): void {
    this.schemas.set(type, schema);
  }

  validate(message: unknown): ValidationResult {
    const msg = message as XSGMessage;
    const schema = this.schemas.get(msg.type);

    if (!schema) {
      return { valid: false, errors: [`Unknown message type: ${msg.type}`] };
    }

    const result = schema.safeParse(message);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }

    return { valid: true, data: result.data };
  }
}
```

---

## 数据流

### 发送消息流程

```
用户输入
    │
    ▼
┌─────────────┐
│   UI Layer  │  1. 用户点击发送
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  App Layer  │  2. 调用 SDK API
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Core Layer │  3. Agent 处理
│   (Agent)   │     - 保存用户消息
└──────┬──────┘     - 调用 LLM
       │
       ▼
┌─────────────┐
│  LLM Provider│ 4. 获取 AI 回复
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Core Layer │  5. 保存 AI 消息
│   (Storage) │  6. 触发事件
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  App Layer  │  7. 更新 UI
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   UI Layer  │  8. 显示消息
└─────────────┘
```

### 同步流程

```
本地操作                          云端
    │                              │
    ▼                              │
┌─────────┐                       │
│ 本地数据库│                       │
└────┬────┘                       │
     │                            │
     ▼                            │
┌─────────┐                       │
│ 同步队列 │                       │
└────┬────┘                       │
     │                            │
     │  1. 检测网络可用             │
     │◄───────────────────────────┤
     │                            │
     ▼                            │
┌─────────┐    2. 上传变更         │
│ 变更上传 │ ─────────────────────▶│
└────┬────
