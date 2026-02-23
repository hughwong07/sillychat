# 开发指南

本指南涵盖 SillyChat 的开发流程、代码规范和最佳实践。

## 目录

1. [开发环境设置](#开发环境设置)
2. [项目结构](#项目结构)
3. [开发工作流](#开发工作流)
4. [代码规范](#代码规范)
5. [测试](#测试)
6. [调试](#调试)
7. [提交代码](#提交代码)

---

## 开发环境设置

### 必备工具

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | >= 22.12.0 | 运行时 |
| npm | >= 10 | 包管理 |
| Git | >= 2.30 | 版本控制 |
| VS Code | 最新 | 推荐 IDE |

### 推荐 VS Code 扩展

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

### 安装开发依赖

```bash
# 克隆项目
git clone https://github.com/your-org/SillyChat.git
cd SillyChat

# 安装所有依赖
npm run setup:dev

# 或手动安装
npm install
cd apps/desktop && npm install
cd ../mobile && npm install
cd ../..
```

---

## 项目结构

```
SillyChat/
├── src/                        # 核心源码
│   ├── core/                   # XSG Core 引擎
│   │   ├── agents/            # AI 代理模块
│   │   │   ├── types.ts       # 类型定义
│   │   │   ├── agent.ts       # 代理实现
│   │   │   ├── manager.ts     # 代理管理器
│   │   │   └── index.ts       # 模块导出
│   │   ├── gateway/           # 网关服务
│   │   ├── storage/           # 存储模块
│   │   ├── protocol/          # 通信协议
│   │   ├── memory/            # 记忆系统
│   │   ├── config/            # 配置管理
│   │   └── utils/             # 工具函数
│   └── index.ts               # 主入口
├── apps/                       # 应用层
│   ├── desktop/               # Electron 桌面端
│   │   ├── src/
│   │   │   ├── main/         # 主进程
│   │   │   ├── renderer/     # 渲染进程
│   │   │   └── preload/      # 预加载脚本
│   │   └── package.json
│   ├── mobile/                # React Native 移动端
│   ├── android/               # 原生 Android
│   └── harmonyos/             # HarmonyOS
├── docs/                       # 文档
├── examples/                   # 示例项目
├── tests/                      # 测试用例
└── package.json               # 根配置
```

### 模块组织原则

1. **单一职责**: 每个模块只负责一个功能领域
2. **依赖注入**: 使用构造函数注入依赖
3. **接口隔离**: 定义清晰的接口，隐藏实现细节
4. **事件驱动**: 使用 EventEmitter 进行模块间通信

---

## 开发工作流

### 分支策略

```
main                    # 生产分支
├── develop             # 开发分支
├── feature/*           # 功能分支
├── bugfix/*            # 修复分支
└── hotfix/*            # 紧急修复分支
```

### 开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/my-feature

# 2. 开发代码
# ... 编写代码 ...

# 3. 运行测试
npm test

# 4. 提交代码
git add .
git commit -m "feat: add new feature"

# 5. 推送到远程
git push origin feature/my-feature

# 6. 创建 Pull Request
# 在 GitHub 上创建 PR，等待 Code Review

# 7. 合并后清理
git checkout develop
git pull origin develop
git branch -d feature/my-feature
```

### 开发模式运行

```bash
# 终端 1: 启动网关（带热重载）
npm run dev:gateway

# 终端 2: 启动桌面端（带热重载）
cd apps/desktop && npm run dev

# 终端 3: 运行测试（监视模式）
npm run test:watch
```

---

## 代码规范

### TypeScript 规范

#### 命名规范

```typescript
// 类名: PascalCase
class AgentManager { }
class MessageService { }

// 接口名: PascalCase，前缀 I（可选）
interface IAgent { }
interface AgentConfig { }

// 类型别名: PascalCase
type AgentStatus = 'idle' | 'busy';
type MessageHandler = (msg: Message) => void;

// 枚举: PascalCase，成员 UPPER_SNAKE_CASE
enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
}

// 变量: camelCase
const agentManager = new AgentManager();
let currentAgent: Agent | null = null;

// 常量: UPPER_SNAKE_CASE
const MAX_CONNECTIONS = 100;
const DEFAULT_TIMEOUT = 30000;

// 函数: camelCase
function createAgent(config: AgentConfig): Agent { }
async function sendMessage(content: string): Promise<Message> { }
```

#### 类型定义

```typescript
// 使用严格类型
// ✅ 好的
interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  createdAt: Date;
}

// ❌ 避免
interface Agent {
  id: any;
  name: string;
  [key: string]: any;  // 避免索引签名
}

// 使用联合类型
 type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

// 使用可选属性
interface Config {
  required: string;
  optional?: string;
  withDefault?: string;
}

// 使用 readonly
interface Message {
  readonly id: string;
  readonly createdAt: Date;
  content: string;  // 可修改
}
```

#### 函数规范

```typescript
// 使用 async/await
// ✅ 好的
async function fetchAgent(id: string): Promise<Agent> {
  const response = await api.get(`/agents/${id}`);
  return response.data;
}

// ❌ 避免
function fetchAgent(id: string): Promise<Agent> {
  return api.get(`/agents/${id}`).then(r => r.data);
}

// 明确返回类型
// ✅ 好的
function calculateTokens(text: string): number {
  return text.length / 4;
}

// ❌ 避免
function calculateTokens(text) {
  return text.length / 4;
}

// 使用对象参数（参数较多时）
// ✅ 好的
interface SendMessageOptions {
  conversationId: string;
  content: string;
  attachments?: Attachment[];
  replyTo?: string;
}

async function sendMessage(options: SendMessageOptions): Promise<Message> {
  // ...
}

// 调用
await sendMessage({
  conversationId: 'conv-1',
  content: 'Hello',
  attachments: [],
});
```

### 错误处理

```typescript
// 使用自定义错误类
class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

// 错误处理模式
async function riskyOperation(): Promise<Result> {
  try {
    const data = await fetchData();
    return { success: true, data };
  } catch (error) {
    if (error instanceof NetworkError) {
      logger.error('Network failed', error);
      return {
        success: false,
        error: new AgentError('Network failed', 'NETWORK_ERROR', error)
      };
    }
    throw error;  // 未知错误，向上抛出
  }
}

// 使用结果类型
const result = await riskyOperation();
if (!result.success) {
  handleError(result.error);
  return;
}
useData(result.data);
```

### 日志规范

```typescript
import { Logger } from '@sillychat/core/utils';

const logger = new Logger('AgentManager');

// 日志级别使用
logger.debug('Detailed info for debugging', { detail: 'value' });
logger.info('General information');
logger.warn('Warning message', { context: 'data' });
logger.error('Error occurred', { error: err.message });

// 结构化日志
logger.info('Agent created', {
  agentId: agent.id,
  model: agent.modelConfig.model,
  timestamp: Date.now(),
});
```

---

## 测试

### 测试结构

```
tests/
├── unit/                      # 单元测试
│   ├── agents.test.ts
│   ├── storage.test.ts
│   └── utils.test.ts
├── integration/               # 集成测试
│   ├── gateway.test.ts
│   └── protocol.test.ts
├── e2e/                       # E2E 测试
│   ├── chat.flow.test.ts
│   └── auth.flow.test.ts
└── fixtures/                  # 测试数据
    └── agents.json
```

### 单元测试

```typescript
// src/core/agents/agent.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Agent } from './agent';
import { AgentStatus } from './types';

describe('Agent', () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({
      id: 'test-agent',
      identity: { name: 'Test', role: 'assistant' },
      modelConfig: { provider: 'openai', model: 'gpt-4' },
    });
  });

  it('should initialize with correct status', async () => {
    await agent.initialize();
    expect(agent.state.status).toBe(AgentStatus.READY);
  });

  it('should create conversation', async () => {
    const conversation = await agent.createConversation('Test Chat');
    expect(conversation.title).toBe('Test Chat');
    expect(conversation.agentId).toBe('test-agent');
  });

  it('should handle send message error', async () => {
    // Mock 依赖
    vi.spyOn(agent, 'generateResponse').mockRejectedValue(new Error('API Error'));

    await expect(
      agent.sendMessage('conv-1', 'Hello')
    ).rejects.toThrow('API Error');
  });
});
```

### 集成测试

```typescript
// tests/integration/gateway.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GatewayServer } from '../../src/core/gateway';
import { GatewayClient } from '../../src/core/gateway/client';

describe('Gateway Integration', () => {
  let server: GatewayServer;
  let client: GatewayClient;

  beforeAll(async () => {
    server = createTestServer();
    await server.start();

    client = new GatewayClient({ url: 'ws://localhost:8080/ws' });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
    await server.stop();
  });

  it('should establish WebSocket connection', () => {
    expect(client.isConnected()).toBe(true);
  });

  it('should send and receive message', async () => {
    const response = await client.sendAndWait({
      type: 'ping',
      timestamp: Date.now(),
    });

    expect(response.type).toBe('pong');
  });
});
```

### E2E 测试

```typescript
// tests/e2e/chat.flow.test.ts
import { test, expect } from '@playwright/test';

test('complete chat flow', async ({ page }) => {
  // 1. 打开应用
  await page.goto('http://localhost:5173');

  // 2. 创建代理
  await page.click('[data-testid="create-agent-btn"]');
  await page.fill('[data-testid="agent-name"]', 'Test Agent');
  await page.click('[data-testid="save-agent-btn"]');

  // 3. 发送消息
  await page.fill('[data-testid="message-input"]', 'Hello!');
  await page.click('[data-testid="send-btn"]');

  // 4. 验证回复
  const response = await page.waitForSelector('[data-testid="ai-message"]');
  expect(await response.textContent()).toContain('AI');
});
```

### 运行测试

```bash
# 所有测试
npm test

# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# E2E 测试
npm run test:e2e

# 覆盖率
npm run test:coverage

# 监视模式
npm run test:watch
```

---

## 调试

### VS Code 调试配置

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Gateway",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "tsx",
      "args": ["src/core/gateway/server.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Desktop Main",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/apps/desktop/node_modules/.bin/electron",
      "args": ["."],
      "cwd": "${workspaceFolder}/apps/desktop"
    },
    {
      "name": "Debug Desktop Renderer",
      "type": "chrome",
      "request": "attach",
      "port": 9223,
      "webRoot": "${workspaceFolder}/apps/desktop",
      "timeout": 30000
    }
  ]
}
```

### 日志调试

```bash
# 启用详细日志
DEBUG=sillychat:* npm run dev:gateway

# 仅查看特定模块
DEBUG=sillychat:gateway,sillychat:agents npm run dev:gateway

# 查看 WebSocket 消息
DEBUG=sillychat:protocol npm run dev:gateway
```

### 性能分析

```bash
# Node.js 性能分析
node --prof dist/index.js
node --prof-process isolate-0x*-v8.log > profile.txt

# 内存分析
node --inspect-brk dist/index.js
# 使用 Chrome DevTools 连接
```

---

## 提交代码

### Commit Message 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型:**
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式（不影响代码运行）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

**示例:**
```bash
# 功能提交
git commit -m "feat(agents): add streaming message support

- Implement streamMessage method in Agent class
- Add StreamChunk type definition
- Update tests for streaming

Closes #123"

# 修复提交
git commit -m "fix(gateway): handle WebSocket reconnection

- Add exponential backoff for reconnection
- Fix memory leak in connection manager

Fixes #456"

# 文档提交
git commit -m "docs(api): update Android API documentation

- Add examples for AgentManager
- Document error handling"
```

### Code Review 检查清单

- [ ] 代码符合 TypeScript 规范
- [ ] 添加了必要的测试
- [ ] 所有测试通过
- [ ] 更新了相关文档
- [ ] 没有引入新的 lint 错误
- [ ] 提交信息符合规范

---

## 性能优化

### 代码优化

```typescript
// 使用懒加载
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// 使用缓存
const memoizedCalculate = memoize(calculateExpensiveValue);

// 避免不必要的重渲染
const MemoizedComponent = memo(Component, (prev, next) => {
  return prev.id === next.id;
});
```

### 数据库优化

```typescript
// 使用索引
await db.run(`
  CREATE INDEX IF NOT EXISTS idx_messages_conv_time
  ON messages(conversation_id, created_at DESC)
`);

// 批量操作
await db.run('BEGIN TRANSACTION');
for (const message of messages) {
  await db.run('INSERT INTO messages ...', [message]);
}
await db.run('COMMIT');
```

---

*更多开发技巧请参考 [架构指南](ARCHITECTURE.md)*
