# 教程 3: AI 代理

本教程介绍如何创建、配置和管理 AI 代理，包括自定义工具、记忆系统和多代理协作。

## 目录

1. [创建代理](#创建代理)
2. [配置模型](#配置模型)
3. [自定义工具](#自定义工具)
4. [记忆系统](#记忆系统)
5. [多代理协作](#多代理协作)

---

## 创建代理

### 基础代理

```typescript
import { AgentManager } from '@sillychat/core/agents';

const manager = new AgentManager();

// 创建基础代理
const assistant = await manager.createAgent({
  id: 'general-assistant',
  identity: {
    name: '通用助手',
    role: 'assistant',
    avatar: '🤖',
    description: '一个通用的AI助手',
    welcomeMessage: '你好！我是你的AI助手。'
  },
  modelConfig: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.7,
    maxTokens: 4096
  }
});
```

### 专家代理

```typescript
// 代码专家
const codeExpert = await manager.createAgent({
  id: 'code-expert',
  identity: {
    name: '代码专家',
    role: 'expert',
    avatar: '👨‍💻',
    description: '专注于编程和软件开发的AI专家',
    welcomeMessage: '我是代码专家，可以帮助你解决编程问题。',
    systemPrompt: `你是一个经验丰富的软件工程师，擅长：
- 代码审查和优化
- 算法设计
- 架构设计
- 调试和故障排除

请提供清晰、可维护的代码，并解释关键概念。`
  },
  modelConfig: {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.3  // 更低的温度，更确定的回答
  },
  capabilities: {
    textGeneration: true,
    codeExecution: true,
    toolUse: true,
    memory: true,
    streaming: true,
    maxContextTokens: 8000,
    supportedSkills: ['code_review', 'debug', 'refactor']
  }
});

// 写作专家
const writingExpert = await manager.createAgent({
  id: 'writing-expert',
  identity: {
    name: '写作助手',
    role: 'expert',
    avatar: '✍️',
    description: '帮助你提升写作质量',
    systemPrompt: '你是一位专业的写作教练，擅长改进文章结构、语法和风格。'
  },
  modelConfig: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.8  // 更高的温度，更有创意的回答
  }
});
```

### 代理生命周期

```typescript
// 初始化
await assistant.initialize();

// 检查状态
console.log(assistant.state.status);  // 'ready'

// 更新配置
assistant.updateConfig({
  modelConfig: {
    temperature: 0.5  // 调整创造性
  }
});

// 关闭代理
await assistant.shutdown();
```

---

## 配置模型

### 支持的提供商

```typescript
// Anthropic Claude
const claudeConfig: AIModelConfig = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0.7,
  maxTokens: 4096
};

// OpenAI GPT
const gptConfig: AIModelConfig = {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  maxTokens: 4096
};

// 本地模型 (Ollama)
const localConfig: AIModelConfig = {
  provider: 'local',
  model: 'llama2',
  baseURL: 'http://localhost:11434',
  temperature: 0.7
};

// 自定义 API
const customConfig: AIModelConfig = {
  provider: 'custom',
  model: 'custom-model',
  baseURL: 'https://api.custom-ai.com/v1',
  apiKey: 'your-key'
};
```

### 模型参数

```typescript
interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  model: string;
  apiKey?: string;
  baseURL?: string;

  // 生成参数
  temperature?: number;        // 0-2，越高越随机
  maxTokens?: number;          // 最大生成token数
  topP?: number;              // 0-1，核采样
  frequencyPenalty?: number;  // -2-2，频率惩罚
  presencePenalty?: number;   // -2-2，存在惩罚

  // 其他参数
  stopSequences?: string[];   // 停止序列
  timeout?: number;           // 请求超时
  retries?: number;           // 重试次数
}

// 参数调优示例
const creativeConfig: AIModelConfig = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.9,    // 高创造性
  topP: 0.95,
  frequencyPenalty: 0.5  // 减少重复
};

const preciseConfig: AIModelConfig = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.1,    // 低随机性
  topP: 0.1,
  presencePenalty: 0  // 无惩罚
};
```

### 动态切换模型

```typescript
class AdaptiveAgent {
  async processTask(task: Task): Promise<string> {
    // 根据任务类型选择模型
    const config = this.selectModelForTask(task);
    this.agent.updateConfig({ modelConfig: config });

    return this.agent.sendMessage(task.conversationId, task.content);
  }

  private selectModelForTask(task: Task): AIModelConfig {
    switch (task.type) {
      case 'code':
        return { provider: 'openai', model: 'gpt-4', temperature: 0.3 };
      case 'creative':
        return { provider: 'anthropic', model: 'claude-3-5-sonnet', temperature: 0.9 };
      case 'analysis':
        return { provider: 'openai', model: 'gpt-4', temperature: 0.5 };
      default:
        return { provider: 'anthropic', model: 'claude-3-5-sonnet', temperature: 0.7 };
    }
  }
}
```

---

## 自定义工具

### 工具定义

```typescript
import { ITool, ToolDefinition } from '@sillychat/core/agents';

// 计算器工具
const calculatorTool: ITool = {
  definition: {
    id: 'calculator',
    name: 'Calculator',
    description: '执行数学计算',
    parameters: [
      {
        name: 'expression',
        type: 'string',
        description: '数学表达式，如 "2 + 2" 或 "sqrt(16)"',
        required: true
      }
    ],
    returns: {
      type: 'number',
      description: '计算结果'
    }
  },

  async execute(args, context) {
    try {
      const result = Function(`"use strict"; return (${args.expression})`)();
      return {
        success: true,
        data: result,
        executionTime: 0
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid expression',
        executionTime: 0
      };
    }
  }
};

// 天气查询工具
const weatherTool: ITool = {
  definition: {
    id: 'weather',
    name: 'Weather',
    description: '查询指定城市的天气',
    parameters: [
      {
        name: 'city',
        type: 'string',
        description: '城市名称',
        required: true
      },
      {
        name: 'days',
        type: 'number',
        description: '预报天数',
        required: false
      }
    ]
  },

  async execute(args, context) {
    const response = await fetch(
      `https://api.weather.com/v1/current?city=${encodeURIComponent(args.city)}`
    );
    const data = await response.json();

    return {
      success: true,
      data: {
        city: args.city,
        temperature: data.temp,
        condition: data.condition,
        humidity: data.humidity
      }
    };
  }
};

// 注册工具
agent.registerTool(calculatorTool);
agent.registerTool(weatherTool);
```

### 文件操作工具

```typescript
const fileTool: ITool = {
  definition: {
    id: 'file_operations',
    name: 'File Operations',
    description: '读取和写入文件',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        enum: ['read', 'write', 'list'],
        required: true
      },
      {
        name: 'path',
        type: 'string',
        required: true
      },
      {
        name: 'content',
        type: 'string',
        required: false
      }
    ],
    requiresPermission: true,
    minPermissionLevel: 60
  },

  async execute(args, context) {
    // 检查权限
    if (context.permissionLevel < 60) {
      return {
        success: false,
        error: 'Permission denied'
      };
    }

    switch (args.operation) {
      case 'read':
        const content = await fs.readFile(args.path, 'utf-8');
        return { success: true, data: content };

      case 'write':
        await fs.writeFile(args.path, args.content);
        return { success: true };

      case 'list':
        const files = await fs.readdir(args.path);
        return { success: true, data: files };
    }
  }
};
```

### 数据库查询工具

```typescript
const databaseTool: ITool = {
  definition: {
    id: 'database_query',
    name: 'Database Query',
    description: '执行SQL查询',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'SELECT SQL语句',
        required: true
      }
    ],
    requiresPermission: true
  },

  async execute(args, context) {
    // 只允许 SELECT
    if (!args.query.trim().toLowerCase().startsWith('select')) {
      return {
        success: false,
        error: 'Only SELECT queries are allowed'
      };
    }

    try {
      const results = await db.all(args.query);
      return {
        success: true,
        data: results,
        rowCount: results.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};
```

---

## 记忆系统

### 短期记忆

```typescript
import { ShortTermMemory } from '@sillychat/core/memory';

const shortTermMemory = new ShortTermMemory({
  capacity: 10,  // 保留最近10条消息
  ttl: 3600000   // 1小时过期
});

// 添加消息
shortTermMemory.add({
  id: 'msg-1',
  role: 'user',
  content: '我喜欢Python编程',
  timestamp: Date.now()
});

// 获取上下文
const context = shortTermMemory.getContext(5);
// 返回最近5条消息，用于构建对话上下文
```

### 长期记忆

```typescript
import { LongTermMemory } from '@sillychat/core/memory';

const longTermMemory = new LongTermMemory({
  dbPath: './data/memory.db',
  embeddingDimension: 1536,
  embeddingProvider: 'openai'
});

await longTermMemory.initialize();

// 存储重要信息
await longTermMemory.add({
  id: 'fact-1',
  content: '用户喜欢使用Python进行数据分析',
  type: 'preference',
  timestamp: Date.now()
});

// 语义搜索
const relevant = await longTermMemory.search('编程语言偏好', {
  limit: 3,
  threshold: 0.7
});

// 在对话中使用记忆
async function sendWithMemory(
  agent: Agent,
  conversationId: string,
  content: string
) {
  // 1. 搜索相关记忆
  const memories = await longTermMemory.search(content, { limit: 3 });

  // 2. 构建增强提示
  const memoryContext = memories
    .map(m => `- ${m.content}`)
    .join('\n');

  const enhancedPrompt = `基于以下背景信息：
${memoryContext}

用户问题：${content}`;

  // 3. 发送增强后的消息
  return agent.sendMessage(conversationId, enhancedPrompt);
}
```

### 记忆管理

```typescript
class MemoryManager {
  constructor(
    private shortTerm: ShortTermMemory,
    private longTerm: LongTermMemory
  ) {}

  async processMessage(message: Message): Promise<void> {
    // 1. 添加到短期记忆
    this.shortTerm.add(message);

    // 2. 分析是否需要长期存储
    if (this.shouldRemember(message)) {
      await this.longTerm.add({
        id: message.id,
        content: this.extractKeyInfo(message),
        type: 'conversation',
        timestamp: message.timestamp
      });
    }
  }

  private shouldRemember(message: Message): boolean {
    // 判断消息是否包含重要信息
    const importantKeywords = ['喜欢', '讨厌', '总是', '从不', '计划', '目标'];
    return importantKeywords.some(kw => message.content.includes(kw));
  }

  async getRelevantContext(query: string): Promise<string> {
    // 从两种记忆中获取相关信息
    const shortTerm = this.shortTerm.getRecent(5);
    const longTerm = await this.longTerm.search(query, { limit: 3 });

    return `
近期对话：
${shortTerm.map(m => `${m.role}: ${m.content}`).join('\n')}

相关记忆：
${longTerm.map(m => `- ${m.content}`).join('\n')}
`;
  }
}
```

---

## 多代理协作

### 代理团队

```typescript
class AgentTeam {
  private agents = new Map<string, Agent>();
  private coordinator: Agent;

  constructor() {
    // 创建协调者代理
    this.coordinator = await this.createCoordinator();
  }

  async addAgent(agent: Agent, expertise: string[]): Promise<void> {
    this.agents.set(agent.id, { agent, expertise });
  }

  async processComplexTask(task: string): Promise<string> {
    // 1. 分析任务并分配
    const assignments = await this.coordinator.sendMessage(
      'system',
      `分析以下任务并分配给合适的专家：${task}
可用专家：${Array.from(this.agents.entries())
  .map(([id, { expertise }]) => `${id}: ${expertise.join(', ')}`)
  .join('\n')}`
    );

    // 2. 并行执行子任务
    const subtasks = this.parseAssignments(assignments.content);
    const results = await Promise.all(
      subtasks.map(async ({ agentId, subtask }) => {
        const { agent } = this.agents.get(agentId)!;
        const result = await agent.sendMessage('task', subtask);
        return { agentId, result: result.content };
      })
    );

    // 3. 整合结果
    return this.coordinator.sendMessage(
      'system',
      `整合以下结果：\n${results.map(r => `${r.agentId}: ${r.result}`).join('\n')}`
    );
  }
}

// 使用
const team = new AgentTeam();

await team.addAgent(codeExpert, ['programming', 'debugging', 'architecture']);
await team.addAgent(writingExpert, ['writing', 'editing', 'translation']);
await team.addAgent(dataExpert, ['data analysis', 'visualization', 'statistics']);

const result = await team.processComplexTask(`
分析我们的销售数据，找出趋势，
然后写一篇报告总结发现，
并提供Python代码用于自动化这个分析过程。
`);
```

### 代理对话

```typescript
class AgentConversation {
  private agents: Agent[];
  private conversationId: string;

  constructor(agents: Agent[]) {
    this.agents = agents;
    this.conversationId = `multi-${Date.now()}`;
  }

  async start(topic: string, rounds = 3): Promise<Message[]> {
    const messages: Message[] = [];
    let currentMessage = topic;

    for (let i = 0; i < rounds; i++) {
      for (const agent of this.agents) {
        const response = await agent.sendMessage(
          this.conversationId,
          currentMessage
        );

        messages.push(response);
        currentMessage = response.content;

        // 添加延迟，模拟真实对话
        await delay(1000);
      }
    }

    return messages;
  }
}

// 使用：模拟辩论
const debater1 = await manager.createAgent({
  id: 'debater-pro',
  identity: { name: '支持者', role: 'expert' },
  modelConfig: { provider: 'anthropic', model: 'claude-3-5-sonnet' }
});

const debater2 = await manager.createAgent({
  id: 'debater-con',
  identity: { name: '反对者', role: 'expert' },
  modelConfig: { provider: 'openai', model: 'gpt-4' }
});

const debate = new AgentConversation([debater1, debater2]);
const debateTranscript = await debate.start(
  '人工智能是否会取代人类工作？',
  5
);
```

### 代理路由

```typescript
class AgentRouter {
  private agents: Map<string, Agent> = new Map();
  private classifier: Agent;

  constructor() {
    this.classifier = await this.createClassifier();
  }

  registerAgent(name: string, agent: Agent, description: string): void {
    this.agents.set(name, { agent, description });
  }

  async route(query: string): Promise<AgentResponse> {
    // 1. 分类查询
    const classification = await this.classifier.sendMessage(
      'system',
      `将以下查询分类到最合适的专家：
查询：${query}
可用专家：
${Array.from(this.agents.entries())
  .map(([name, { description }]) => `- ${name}: ${description}`)
  .join('\n')}

只返回专家名称。`
    );

    // 2. 路由到对应代理
    const targetAgent = this.agents.get(classification.content.trim());
    if (!targetAgent) {
      throw new Error('No suitable agent found');
    }

    // 3. 处理查询
    return targetAgent.agent.sendMessage('user', query);
  }
}

// 使用
const router = new AgentRouter();

router.registerAgent('coder', codeExpert, '编程和软件开发');
router.registerAgent('writer', writingExpert, '写作和编辑');
router.registerAgent('analyst', dataExpert, '数据分析和统计');

const response = await router.route('帮我优化这段Python代码');
// 自动路由到 codeExpert
```

---

## 最佳实践

### 1. 代理配置模板

```typescript
const agentTemplates = {
  creative: {
    modelConfig: { temperature: 0.9, maxTokens: 2000 },
    capabilities: { streaming: true }
  },
  analytical: {
    modelConfig: { temperature: 0.2, maxTokens: 4000 },
    capabilities: { toolUse: true }
  },
  conversational: {
    modelConfig: { temperature: 0.7, maxTokens: 1000 },
    capabilities: { memory: true, streaming: true }
  }
};

async function createAgentFromTemplate(
  type: keyof typeof agentTemplates,
  identity: AgentIdentity
): Promise<Agent> {
  const template = agentTemplates[type];
  return manager.createAgent({
    id: `${type}-${Date.now()}`,
    identity,
    ...template
  });
}
```

### 2. 工具权限管理

```typescript
class ToolPermissionManager {
  private permissions = new Map<string, number>();

  setPermission(toolId: string, minLevel: number): void {
    this.permissions.set(toolId, minLevel);
  }

  canUse(toolId: string, userLevel: number): boolean {
    const minLevel = this.permissions.get(toolId) || 0;
    return userLevel >= minLevel;
  }
}

// 配置权限
const permManager = new ToolPermissionManager();
permManager.setPermission('file_operations', 60);
permManager.setPermission('database_query', 80);
permManager.setPermission('calculator', 0);
```

---

## 下一步

- 学习 [安全设置](04-security.md)
- 阅读 [Core API 文档](../api/core.md)
- 探索 [示例项目](../../examples/)

---

*您现在已掌握 SillyChat 的 AI 代理系统！*
