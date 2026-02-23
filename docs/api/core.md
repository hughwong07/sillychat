# Core API 文档

SillyChat 核心引擎 API 文档。

## 模块概览

```typescript
import {
  // Agents
  AgentManager,
  Agent,

  // Gateway
  GatewayServer,
  GatewayClient,

  // Storage
  DatabaseManager,
  BlobPool,
  FileOrganizer,

  // Protocol
  ProtocolValidator,
  MessageSerializer,

  // Memory
  ShortTermMemory,
  LongTermMemory,

  // Config
  loadAppConfig,

  // Utils
  Logger,
  CryptoUtils
} from '@sillychat/core';
```

## Agents 模块

### AgentManager

管理所有 AI 代理的创建、查询和删除。

```typescript
class AgentManager {
  // 创建代理
  async createAgent(config: AIAgentConfig): Promise<Agent>

  // 获取代理
  async getAgent(id: string): Promise<Agent | null>

  // 更新代理
  async updateAgent(id: string, updates: Partial<AIAgentConfig>): Promise<Agent>

  // 删除代理
  async deleteAgent(id: string): Promise<boolean>

  // 列出所有代理
  async listAgents(options?: { ownerId?: string; status?: AgentStatus }): Promise<Agent[]>

  // 获取默认代理
  async getDefaultAgent(): Promise<Agent | null>

  // 设置默认代理
  async setDefaultAgent(id: string): Promise<void>

  // 事件监听
  on(event: AgentEventType, listener: AgentEventListener): void
  off(event: AgentEventType, listener: AgentEventListener): void
}
```

#### 使用示例

```typescript
import { AgentManager, AgentStatus } from '@sillychat/core/agents';

const manager = new AgentManager();

// 创建代理
const agent = await manager.createAgent({
  id: 'assistant-1',
  identity: {
    name: 'AI助手',
    role: 'assistant',
    avatar: '/avatars/assistant.png',
    description: '一个有帮助的AI助手',
    welcomeMessage: '你好！我是你的AI助手。'
  },
  modelConfig: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.7,
    maxTokens: 4096
  },
  capabilities: {
    textGeneration: true,
    imageUnderstanding: true,
    codeExecution: false,
    toolUse: true,
    memory: true,
    streaming: true,
    maxContextTokens: 200000,
    supportedSkills: ['web_search', 'code_interpreter']
  }
});

// 监听事件
manager.on('status_changed', (event) => {
  console.log(`Agent ${event.agentId} status:`, event.data?.status);
});

// 列出所有代理
const agents = await manager.listAgents({ status: AgentStatus.READY });
console.log(`Found ${agents.length} ready agents`);
```

### Agent

单个 AI 代理实例，处理对话和消息生成。

```typescript
class Agent {
  readonly id: string;
  readonly identity: AgentIdentity;
  readonly config: AIAgentConfig;
  readonly state: AgentState;
  readonly stats: AgentStats;

  // 生命周期
  async initialize(): Promise<void>
  async shutdown(): Promise<void>

  // 对话管理
  async createConversation(title?: string): Promise<Conversation>
  async sendMessage(conversationId: string, content: string): Promise<AgentMessage>
  async streamMessage(
    conversationId: string,
    content: string,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<AgentMessage>

  // 工具管理
  registerTool(tool: ITool): void
  unregisterTool(toolId: string): void
  getRegisteredTools(): ToolDefinition[]

  // 事件
  on(event: AgentEventType, listener: AgentEventListener): void
  off(event: AgentEventType, listener: AgentEventListener): void
}
```

#### 使用示例

```typescript
// 初始化代理
await agent.initialize();

// 创建对话
const conversation = await agent.createConversation('新对话');

// 发送普通消息
const response = await agent.sendMessage(conversation.id, '你好！');
console.log(response.content);

// 流式消息
await agent.streamMessage(
  conversation.id,
  '写一段代码',
  (chunk) => {
    process.stdout.write(chunk.content);
  }
);

// 注册自定义工具
agent.registerTool({
  definition: {
    id: 'calculator',
    name: 'Calculator',
    description: '执行数学计算',
    parameters: [
      { name: 'expression', type: 'string', required: true }
    ]
  },
  async execute(args, context) {
    const result = eval(args.expression);
    return {
      success: true,
      data: result,
      executionTime: 0
    };
  }
});
```

### 类型定义

```typescript
interface AIAgentConfig {
  id: string;
  identity: AgentIdentity;
  modelConfig: AIModelConfig;
  capabilities?: Partial<AgentCapabilities>;
  ownerId?: string;
  metadata?: Record<string, unknown>;
}

interface AgentIdentity {
  id: string;
  name: string;
  avatar: string;
  role: 'master' | 'assistant' | 'expert' | 'guest';
  description?: string;
  personality?: string;
  welcomeMessage?: string;
  systemPrompt?: string;
}

interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'openclaw' | 'local' | 'custom';
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

interface AgentCapabilities {
  textGeneration: boolean;
  imageUnderstanding: boolean;
  codeExecution: boolean;
  toolUse: boolean;
  memory: boolean;
  streaming: boolean;
  maxContextTokens: number;
  supportedSkills: string[];
}

enum AgentStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  DISABLED = 'disabled'
}

interface AgentState {
  status: AgentStatus;
  currentConversationId?: string;
  activeTools: string[];
  errorMessage?: string;
  lastErrorAt?: Date;
}

interface AgentStats {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Gateway 模块

### GatewayServer

WebSocket 网关服务器，处理客户端连接和消息路由。

```typescript
class GatewayServer extends EventEmitter {
  constructor(options: GatewayServerOptions);

  // 生命周期
  async start(): Promise<void>
  async stop(): Promise<void>

  // 状态查询
  getState(): GatewayState
  getStats(): GatewayStats
  getConnections(): string[]

  // 连接管理
  kickClient(clientId: string, reason: string): boolean
  broadcast(message: unknown, excludeClientId?: string): void
}
```

#### 使用示例

```typescript
import { GatewayServer } from '@sillychat/core/gateway';
import { SessionManager } from '@sillychat/core/gateway/session';
import { AuthManager } from '@sillychat/core/gateway/auth';

const server = new GatewayServer({
  config: {
    port: 8080,
    host: '0.0.0.0',
    maxConnections: 100,
    maxMessageSize: 10 * 1024 * 1024, // 10MB
    heartbeatInterval: 30000,
    shutdownTimeout: 30000,
    discovery: {
      enabled: true,
      multicastAddress: '239.255.255.250',
      multicastPort: 1900,
      broadcastInterval: 5000
    }
  },
  sessionManager: new SessionManager(),
  authManager: new AuthManager(),
  messageHandler: {
    async handle(message, context) {
      console.log('Received:', message);
      // 处理消息
    }
  },
  validator: new ProtocolValidator(),
  logger: new Logger('Gateway')
});

// 事件监听
server.on('started', () => console.log('Server started'));
server.on('connection', (info) => console.log('New connection:', info.clientId));
server.on('disconnection', ({ clientId }) => console.log('Disconnected:', clientId));
server.on('error', ({ error }) => console.error('Server error:', error));

// 启动
await server.start();

// 获取统计
console.log(server.getStats());
```

### GatewayClient

WebSocket 客户端，连接网关服务器。

```typescript
class GatewayClient extends EventEmitter {
  constructor(options: GatewayClientOptions);

  // 连接管理
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  reconnect(): void

  // 消息发送
  send(message: unknown): void
  sendAndWait(message: unknown, timeout?: number): Promise<unknown>

  // 状态
  getState(): 'connected' | 'connecting' | 'disconnected'
  isConnected(): boolean
}
```

#### 使用示例

```typescript
import { GatewayClient } from '@sillychat/core/gateway';

const client = new GatewayClient({
  url: 'ws://localhost:8080/ws',
  autoReconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000
});

// 事件监听
client.on('connected', () => console.log('Connected'));
client.on('disconnected', () => console.log('Disconnected'));
client.on('message', (message) => console.log('Received:', message));
client.on('error', (error) => console.error('Error:', error));

// 连接
await client.connect();

// 发送消息
client.send({
  type: 'chat.message',
  content: 'Hello!',
  timestamp: Date.now()
});

// 发送并等待响应
const response = await client.sendAndWait({
  type: 'chat.message',
  content: 'Hello!'
}, 5000);
```

## Storage 模块

### DatabaseManager

SQLite 数据库管理器。

```typescript
class DatabaseManager implements IDatabaseManager {
  constructor(config: DatabaseConfig);

  // 连接管理
  async connect(): Promise<void>
  async close(): Promise<void>
  isConnected(): boolean

  // 事务
  async beginTransaction(): Promise<void>
  async commit(): Promise<void>
  async rollback(): Promise<void>

  // 查询
  async run(sql: string, params?: unknown[]): Promise<{ lastID: number; changes: number }>
  async get<T>(sql: string, params?: unknown[]): Promise<T | undefined>
  async all<T>(sql: string, params?: unknown[]): Promise<T[]>

  // 迁移
  async migrate(): Promise<void>
  async getVersion(): Promise<number>
}
```

#### 使用示例

```typescript
import { DatabaseManager } from '@sillychat/core/storage';

const db = new DatabaseManager({
  dbPath: './data/chat.db',
  enableWAL: true,
  busyTimeout: 5000
});

await db.connect();

// 创建表
await db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// 插入数据
const { lastID } = await db.run(
  'INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
  ['conv-1', '新对话', Date.now(), Date.now()]
);

// 查询单条
const conversation = await db.get<{ id: string; title: string }>(
  'SELECT * FROM conversations WHERE id = ?',
  ['conv-1']
);

// 查询多条
const conversations = await db.all<{ id: string; title: string }>(
  'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 10'
);

// 事务
await db.beginTransaction();
try {
  await db.run('INSERT INTO ...');
  await db.run('UPDATE ...');
  await db.commit();
} catch (error) {
  await db.rollback();
  throw error;
}
```

### BlobPool

去重文件存储系统。

```typescript
class BlobPool implements IBlobPool {
  constructor(config: BlobPoolConfig);

  async initialize(): Promise<void>

  // 存储
  async store(sourcePath: string): Promise<BlobStoreResult>
  async storeBuffer(buffer: Buffer, mimeType: string): Promise<BlobStoreResult>

  // 读取
  async getPath(hash: string): Promise<string | null>
  async getBuffer(hash: string): Promise<Buffer | null>
  async getStream(hash: string): Promise<NodeJS.ReadableStream | null>

  // 引用计数
  async incrementRef(hash: string): Promise<void>
  async decrementRef(hash: string): Promise<void>
  async getRefCount(hash: string): Promise<number>

  // 管理
  async exists(hash: string): Promise<boolean>
  async delete(hash: string): Promise<boolean>
  async cleanup(): Promise<number>
  async getStats(): Promise<{ totalSize: number; count: number }>
}
```

#### 使用示例

```typescript
import { BlobPool } from '@sillychat/core/storage';

const pool = new BlobPool({
  poolPath: './data/blobs',
  hashAlgorithm: 'sha256',
  prefixLength: 2
});

await pool.initialize();

// 存储文件
const result = await pool.store('./photo.jpg');
console.log('Stored:', result.hash, 'Size:', result.size);

// 存储Buffer
const buffer = Buffer.from('Hello World');
const result2 = await pool.storeBuffer(buffer, 'text/plain');

// 获取文件路径
const path = await pool.getPath(result.hash);
if (path) {
  console.log('File located at:', path);
}

// 增加引用计数
await pool.incrementRef(result.hash);

// 获取统计
const stats = await pool.getStats();
console.log(`Pool contains ${stats.count} blobs, total size: ${stats.totalSize}`);

// 清理未引用文件
const cleaned = await pool.cleanup();
console.log(`Cleaned ${cleaned} unused blobs`);
```

## Protocol 模块

### ProtocolValidator

消息验证器。

```typescript
class ProtocolValidator {
  constructor(options?: ValidationOptions);

  validateMessage(message: unknown): ValidationResult
  validateCommand(command: unknown): ValidationResult
  validateEvent(event: unknown): ValidationResult
}
```

#### 使用示例

```typescript
import { ProtocolValidator } from '@sillychat/core/protocol';

const validator = new ProtocolValidator({
  strict: true,
  maxMessageSize: 10 * 1024 * 1024,
  validatePermissions: true
});

const message = {
  id: 'msg-1',
  type: 'chat',
  timestamp: Date.now(),
  sender: { userId: 'user-1', role: 'human' },
  target: { channelId: 'channel-1', channelType: 'direct' },
  content: { type: 'text', data: { text: 'Hello!' } }
};

const result = validator.validateMessage(message);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Memory 模块

### ShortTermMemory

短期记忆管理。

```typescript
class ShortTermMemory {
  constructor(capacity?: number);

  add(message: MemoryMessage): void
  getRecent(count?: number): MemoryMessage[]
  getContext(windowSize?: number): MemoryMessage[]
  clear(): void
  getStats(): MemoryStats
}
```

### LongTermMemory

长期向量记忆。

```typescript
class LongTermMemory {
  constructor(config: VectorDBConfig);

  async initialize(): Promise<void>
  async add(message: MemoryMessage): Promise<void>
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]>
  async delete(messageId: string): Promise<void>
}
```

## Utils 模块

### Logger

日志记录器。

```typescript
class Logger {
  constructor(name: string, options?: LoggerOptions);

  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void

  createChild(name: string): Logger
}
```

#### 使用示例

```typescript
import { Logger } from '@sillychat/core/utils';

const logger = new Logger('MyModule', {
  level: 'debug',
  enableConsole: true,
  enableFile: true,
  filePath: './logs/app.log'
});

const childLogger = logger.createChild('SubModule');

logger.info('Application started');
logger.debug('Debug info', { userId: '123' });
logger.error('Something went wrong', { error: err.message });
```

## 错误处理

所有 API 都使用统一的错误类型：

```typescript
// Agent错误
class AgentError extends Error {
  code: AgentErrorCode;
  cause?: Error;
  context?: Record<string, unknown>;
}

// Storage错误
class StorageError extends Error {
  code: string;
  cause?: Error;
}

// 错误代码
enum AgentErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  MODEL_ERROR = 'MODEL_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TOOL_ERROR = 'TOOL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  TOKEN_EXCEEDED = 'TOKEN_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

## 配置

### 加载配置

```typescript
import { loadAppConfig } from '@sillychat/core/config';

const config = await loadAppConfig({
  configPath: './config.yaml',
  envPrefix: 'SILLYCHAT_'
});
```

---

*更多详情请参考各模块的详细文档。*
