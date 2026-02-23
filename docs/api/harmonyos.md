# HarmonyOS API 文档

SillyChat HarmonyOS SDK API 文档。

## 快速开始

### 添加依赖

```json
// oh-package.json5
{
  "dependencies": {
    "@sillychat/sdk": "^1.0.0",
    "@sillychat/sdk-ui": "^1.0.0"
  }
}
```

### 初始化 SDK

```typescript
// EntryAbility.ets
import { SillyChat } from '@sillychat/sdk';
import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';

export default class EntryAbility extends UIAbility {
  sillyChat: SillyChat;

  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    // 初始化 SDK
    this.sillyChat = new SillyChat({
      context: this.context,
      apiKey: 'your-api-key',
      baseUrl: 'https://api.sillychat.io',
      databaseName: 'sillychat.db',
      enableEncryption: true
    });

    this.sillyChat.initialize().then(() => {
      console.info('SillyChat initialized');
    });
  }

  onDestroy(): void {
    this.sillyChat.shutdown();
  }
}
```

## 核心 API

### SillyChat

主入口类。

```typescript
class SillyChat {
  // 管理器
  readonly agentManager: AgentManager;
  readonly conversationManager: ConversationManager;
  readonly messageManager: MessageManager;
  readonly storageManager: StorageManager;
  readonly userManager: UserManager;
  readonly gatewayClient: GatewayClient;

  // 生命周期
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
}
```

### AgentManager

```typescript
interface AgentManager {
  // 创建代理
  createAgent(config: AgentConfig): Promise<Agent>;

  // 获取代理
  getAgent(id: string): Promise<Agent | null>;

  // 更新代理
  updateAgent(id: string, config: Partial<AgentConfig>): Promise<Agent>;

  // 删除代理
  deleteAgent(id: string): Promise<boolean>;

  // 列出代理
  listAgents(filter?: AgentFilter): Promise<Agent[]>;

  // 默认代理
  getDefaultAgent(): Promise<Agent | null>;
  setDefaultAgent(id: string): Promise<void>;
}
```

#### 使用示例

```typescript
// 创建代理
const agent = await this.sillyChat.agentManager.createAgent({
  id: 'assistant-1',
  identity: {
    name: 'AI助手',
    role: AgentRole.ASSISTANT,
    avatar: $r('app.media.ic_assistant'),
    description: '一个有帮助的AI助手',
    welcomeMessage: '你好！我是你的AI助手。'
  },
  modelConfig: {
    provider: ModelProvider.ANTHROPIC,
    model: 'claude-3-5-sonnet',
    apiKey: 'your-api-key'
  }
});

// 监听代理变化
this.sillyChat.agentManager.onAgentChanged((agent) => {
  this.selectedAgent = agent;
});
```

### ConversationManager

```typescript
interface ConversationManager {
  createConversation(agentId: string, title?: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  deleteConversation(id: string): Promise<boolean>;
  listConversations(agentId?: string): Promise<Conversation[]>;
  searchConversations(query: string): Promise<Conversation[]>;
}
```

### MessageManager

```typescript
interface MessageManager {
  // 发送消息
  sendMessage(
    conversationId: string,
    content: string,
    attachments?: Attachment[]
  ): Promise<Message>;

  // 流式发送
  sendMessageStream(
    conversationId: string,
    content: string,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<Message>;

  // 获取消息
  getMessages(
    conversationId: string,
    options?: { before?: number; limit?: number }
  ): Promise<Message[]>;

  // 删除消息
  deleteMessage(id: string): Promise<boolean>;
}
```

#### 使用示例

```typescript
// 发送消息
const message = await this.sillyChat.messageManager.sendMessage(
  'conv-1',
  '你好！'
);

// 流式发送
await this.sillyChat.messageManager.sendMessageStream(
  'conv-1',
  '写一首诗',
  (chunk) => {
    if (chunk.type === 'content') {
      this.streamingText += chunk.content;
    } else if (chunk.type === 'done') {
      this.isStreaming = false;
    }
  }
);
```

## 数据模型

### Agent

```typescript
interface Agent {
  id: string;
  identity: AgentIdentity;
  modelConfig: ModelConfig;
  capabilities: AgentCapabilities;
  status: AgentStatus;
  createdAt: number;
  updatedAt: number;
}

interface AgentIdentity {
  name: string;
  role: AgentRole;
  avatar: Resource | string;
  description?: string;
  welcomeMessage?: string;
}

enum AgentRole {
  MASTER = 'master',
  ASSISTANT = 'assistant',
  EXPERT = 'expert',
  GUEST = 'guest'
}

enum AgentStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  DISABLED = 'disabled'
}
```

### Conversation

```typescript
interface Conversation {
  id: string;
  title: string;
  agentId: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Message

```typescript
interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  senderId: string;
  attachments?: Attachment[];
  createdAt: number;
}

enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

interface Attachment {
  id: string;
  type: AttachmentType;
  uri: string;
  name: string;
  size: number;
}
```

## UI 组件

### ChatView

```typescript
// ChatPage.ets
import { ChatView } from '@sillychat/sdk-ui';

@Entry
@Component
struct ChatPage {
  @State conversationId: string = '';
  @State agentId: string = '';

  build() {
    Column() {
      ChatView({
        conversationId: this.conversationId,
        agentId: this.agentId,
        onSendMessage: (content: string) => this.onSend(content),
        onAttachClick: () => this.onAttach()
      })
    }
    .width('100%')
    .height('100%')
  }

  private async onSend(content: string): Promise<void> {
    await sillyChat.messageManager.sendMessage(this.conversationId, content);
  }

  private onAttach(): void {
    // 处理附件
  }
}
```

### MessageItem

```typescript
import { MessageItem } from '@sillychat/sdk-ui';

@Builder
MessageListBuilder() {
  List() {
    ForEach(this.messages, (message: Message) => {
      ListItem() {
        MessageItem({
          message: message,
          isLast: message.id === this.messages[0]?.id,
          onLongPress: () => this.showActions(message)
        })
      }
    })
  }
}
```

### AgentCard

```typescript
import { AgentCard } from '@sillychat/sdk-ui';

@Builder
AgentListBuilder() {
  List() {
    ForEach(this.agents, (agent: Agent) => {
      ListItem() {
        AgentCard({
          agent: agent,
          isSelected: agent.id === this.selectedAgent?.id,
          onClick: () => this.selectAgent(agent)
        })
      }
    })
  }
}
```

## 存储

### PreferencesUtil

```typescript
import { PreferencesUtil } from '@sillychat/sdk';

// 初始化
const prefs = new PreferencesUtil(this.context, 'sillychat_prefs');

// 存储数据
await prefs.putString('user_id', 'user-123');
await prefs.putBoolean('dark_mode', true);
await prefs.putNumber('font_size', 16);

// 读取数据
const userId = await prefs.getString('user_id');
const darkMode = await prefs.getBoolean('dark_mode', false);

// 删除数据
await prefs.delete('key');
await prefs.clear();
```

### 数据库

```typescript
import { Database } from '@sillychat/sdk';

const db = new Database({
  context: this.context,
  name: 'sillychat.db',
  encrypt: true
});

await db.open();

// 执行SQL
await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at INTEGER
  )
`);

// 查询
const messages = await db.query<Message>(
  'SELECT * FROM messages WHERE conversation_id = ?',
  ['conv-1']
);
```

## 网络请求

### HttpUtil

```typescript
import { HttpUtil } from '@sillychat/sdk';

const http = new HttpUtil({
  baseURL: 'https://api.sillychat.io',
  timeout: 30000,
  headers: {
    'Authorization': 'Bearer token'
  }
});

// GET
const response = await http.get<Agent[]>('/agents');

// POST
const agent = await http.post<Agent>('/agents', {
  name: 'New Agent',
  role: 'assistant'
});

// 上传文件
const result = await http.upload('/upload', fileUri, {
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
});
```

## 权限管理

```typescript
import { PermissionUtil } from '@sillychat/sdk';

// 检查权限
const hasPermission = await PermissionUtil.check(
  this.context,
  'ohos.permission.INTERNET'
);

// 申请权限
const granted = await PermissionUtil.request(
  this.context,
  [
    'ohos.permission.INTERNET',
    'ohos.permission.WRITE_MEDIA'
  ]
);
```

## 文件操作

```typescript
import { FileUtil } from '@sillychat/sdk';

// 读取文件
const content = await FileUtil.readText(fileUri);
const buffer = await FileUtil.readBuffer(fileUri);

// 写入文件
await FileUtil.writeText(fileUri, 'Hello World');

// 复制文件
await FileUtil.copy(srcUri, destUri);

// 删除文件
await FileUtil.delete(fileUri);

// 获取文件信息
const info = await FileUtil.getInfo(fileUri);
console.log(info.size, info.lastModified);
```

## 日志

```typescript
import { Logger } from '@sillychat/sdk';

const logger = new Logger('ChatPage');

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');

// 带上下文
logger.info('User action', { userId: '123', action: 'send_message' });
```

## 事件总线

```typescript
import { EventBus } from '@sillychat/sdk';

// 订阅事件
EventBus.on('message.received', (message: Message) => {
  console.log('New message:', message);
});

// 发送事件
EventBus.emit('message.received', message);

// 取消订阅
EventBus.off('message.received', handler);
```

## 最佳实践

### 1. 页面生命周期

```typescript
@Entry
@Component
struct ChatPage {
  @State private viewModel: ChatViewModel = ChatViewModel.getInstance();

  aboutToAppear() {
    // 页面即将显示
    this.viewModel.loadMessages();
  }

  aboutToDisappear() {
    // 页面即将销毁
    this.viewModel.destroy();
  }

  onPageShow() {
    // 页面显示
  }

  onPageHide() {
    // 页面隐藏
  }
}
```

### 2. 状态管理

```typescript
// 使用AppStorage全局状态
AppStorage.setOrCreate('currentUser', user);
const currentUser = AppStorage.get<User>('currentUser');

// 使用LocalStorage页面状态
const storage = new LocalStorage({
  'messages': [],
  'isLoading': false
});

@Entry(storage)
@Component
struct ChatPage {
  @LocalStorageProp('messages') messages: Message[] = [];
  @LocalStorageProp('isLoading') isLoading: boolean = false;
}
```

### 3. 性能优化

```typescript
// 使用LazyForEach长列表
LazyForEach(this.dataSource, (item: Message) => {
  ListItem() {
    MessageItem({ message: item })
  }
}, (item: Message) => item.id)

// 组件复用
@Reusable
@Component
struct ReusableMessageItem {
  @State message: Message = {} as Message;

  aboutToReuse(params: Record<string, Object>) {
    this.message = params.message as Message;
  }
}
```

### 4. 错误处理

```typescript
try {
  const agent = await sillyChat.agentManager.createAgent(config);
} catch (error) {
  if (error instanceof NetworkError) {
    promptAction.showToast({ message: '网络连接失败' });
  } else if (error instanceof ValidationError) {
    promptAction.showToast({ message: '配置无效' });
  } else {
    promptAction.showToast({ message: '操作失败' });
    logger.error('Create agent failed', error);
  }
}
```

---

*更多示例请参考 [HarmonyOS 示例项目](../../examples/harmonyos-sample/)*
