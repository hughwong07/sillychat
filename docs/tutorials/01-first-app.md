# 教程 1: 创建第一个 SillyChat 应用

本教程将引导您创建第一个基于 SillyChat 的 AI 聊天应用。

## 目标

完成本教程后，您将：
- 了解 SillyChat 的基本架构
- 创建一个简单的 AI 聊天应用
- 学会使用核心 API

## 前提条件

- Node.js >= 22.12.0
- 基础的 TypeScript/JavaScript 知识
- 一个 AI API 密钥 (Anthropic 或 OpenAI)

## 步骤 1: 项目初始化

```bash
# 创建项目目录
mkdir my-sillychat-app
cd my-sillychat-app

# 初始化项目
npm init -y

# 安装 SillyChat 核心
npm install @sillychat/core

# 安装开发依赖
npm install -D typescript tsx @types/node

# 初始化 TypeScript
npx tsc --init
```

## 步骤 2: 配置 TypeScript

编辑 `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

## 步骤 3: 创建应用

创建 `src/index.ts`:

```typescript
import { AgentManager } from '@sillychat/core/agents';
import { GatewayServer } from '@sillychat/core/gateway';
import { DatabaseManager } from '@sillychat/core/storage';
import { Logger } from '@sillychat/core/utils';

const logger = new Logger('MyApp');

async function main() {
  logger.info('Starting my first SillyChat app...');

  // 1. 初始化数据库
  const db = new DatabaseManager({
    dbPath: './data/app.db',
    enableWAL: true
  });
  await db.connect();
  logger.info('Database connected');

  // 2. 创建代理管理器
  const agentManager = new AgentManager();

  // 3. 创建 AI 代理
  const agent = await agentManager.createAgent({
    id: 'my-first-agent',
    identity: {
      name: 'AI助手',
      role: 'assistant',
      avatar: '🤖',
      welcomeMessage: '你好！我是你的AI助手。有什么可以帮助你的吗？'
    },
    modelConfig: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    }
  });

  logger.info(`Agent created: ${agent.identity.name}`);

  // 4. 创建对话
  const conversation = await agent.createConversation('初次见面');
  logger.info(`Conversation created: ${conversation.title}`);

  // 5. 发送消息
  console.log('\n🤖 AI: ' + agent.identity.welcomeMessage);
  console.log('👤 You: 你好！请介绍一下自己');

  const response = await agent.sendMessage(
    conversation.id,
    '你好！请介绍一下自己'
  );

  console.log(`🤖 AI: ${response.content}\n`);

  // 6. 交互式对话
  await interactiveChat(agent, conversation.id);

  // 7. 清理
  await agent.shutdown();
  await db.close();
  logger.info('App shutdown complete');
}

async function interactiveChat(agent: any, conversationId: string) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    rl.question('👤 You: ', async (input: string) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      console.log('🤖 AI: ', end='');

      // 流式响应
      await agent.streamMessage(
        conversationId,
        input,
        (chunk: any) => {
          process.stdout.write(chunk.content || '');
        }
      );

      console.log('\n');
      askQuestion();
    });
  };

  console.log('输入消息与 AI 对话 (输入 exit 退出):\n');
  askQuestion();

  return new Promise((resolve) => {
    rl.on('close', resolve);
  });
}

// 运行
main().catch(error => {
  logger.error('App failed', error);
  process.exit(1);
});
```

## 步骤 4: 配置环境变量

创建 `.env` 文件:

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

安装 dotenv:

```bash
npm install dotenv
```

在 `src/index.ts` 顶部添加:

```typescript
import 'dotenv/config';
```

## 步骤 5: 运行应用

```bash
# 开发模式
npx tsx src/index.ts

# 或构建后运行
npm run build
node dist/index.js
```

## 完整代码

项目结构:

```
my-sillychat-app/
├── src/
│   └── index.ts
├── data/
│   └── .gitkeep
├── .env
├── .gitignore
├── package.json
└── tsconfig.json
```

`.gitignore`:

```
node_modules/
dist/
data/
.env
*.log
```

## 扩展功能

### 添加多个代理

```typescript
// 创建专业代理
const codeAgent = await agentManager.createAgent({
  id: 'code-assistant',
  identity: {
    name: '代码助手',
    role: 'expert',
    welcomeMessage: '我是代码专家，可以帮助你解决编程问题。'
  },
  modelConfig: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY || ''
  }
});
```

### 保存对话历史

```typescript
import { StorageManager } from '@sillychat/core/storage';

const storage = new StorageManager({
  dataDir: './data'
});
await storage.initialize();

// 保存消息
await storage.addMessage({
  conversationId,
  role: 'user',
  content: message
});
```

### 添加自定义工具

```typescript
agent.registerTool({
  definition: {
    id: 'calculator',
    name: 'Calculator',
    description: '执行数学计算',
    parameters: [
      { name: 'expression', type: 'string', required: true }
    ]
  },
  async execute(args) {
    try {
      const result = eval(args.expression);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'Invalid expression' };
    }
  }
});
```

## 下一步

- 学习 [聊天功能](02-chat-features.md)
- 了解 [AI 代理](03-ai-agents.md)
- 阅读 [API 文档](../api/core.md)

## 常见问题

**Q: API 密钥无效？**
确保 `.env` 文件正确加载，且 `ANTHROPIC_API_KEY` 格式正确。

**Q: 数据库连接失败？**
确保 `data/` 目录存在且有写入权限。

**Q: 流式响应不工作？**
检查网络连接，并确保使用的模型支持流式输出。

---

*恭喜！您已创建第一个 SillyChat 应用！*
