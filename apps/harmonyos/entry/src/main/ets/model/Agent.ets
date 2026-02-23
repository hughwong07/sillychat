/**
 * AI代理模型
 */
export class Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  isActive: boolean;
  config: AgentConfig;
  createdAt: number;
  updatedAt: number;

  constructor(
    name: string,
    description: string,
    avatar: string = '',
    id?: string
  ) {
    this.id = id ?? this.generateId();
    this.name = name;
    this.description = description;
    this.avatar = avatar;
    this.isActive = true;
    this.config = new AgentConfig();
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  private generateId(): string {
    return 'agent_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}

/**
 * 代理配置
 */
export class AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;

  constructor() {
    this.model = 'gpt-4';
    this.temperature = 0.7;
    this.maxTokens = 2000;
    this.systemPrompt = 'You are a helpful AI assistant.';
  }
}

/**
 * 默认代理列表
 */
export const DEFAULT_AGENTS: Agent[] = [
  new Agent(
    '通用助手',
    '一个通用的AI助手，可以帮助回答各种问题',
    ''
  ),
  new Agent(
    '代码助手',
    '专门帮助编程和代码相关的问题',
    ''
  ),
  new Agent(
    '翻译助手',
    '帮助翻译各种语言之间的文本',
    ''
  )
];
