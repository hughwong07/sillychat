# SillyChat HarmonyOS 示例

这是一个展示如何使用 SillyChat HarmonyOS SDK 的示例项目。

## 功能演示

- ArkTS/ArkUI 开发
- 分布式能力
- AI 对话
- 文件管理
- 本地存储

## 快速开始

### 1. 环境要求

- DevEco Studio 4.0+
- HarmonyOS SDK 4.0+
- Node.js 16+

### 2. 配置

在 `entry/src/main/resources/rawfile/config.json` 中配置：

```json
{
  "apiKey": "your-api-key",
  "baseURL": "https://api.sillychat.io"
}
```

### 3. 运行

1. 使用 DevEco Studio 打开项目
2. 连接 HarmonyOS 设备或启动模拟器
3. 点击运行按钮

## 代码示例

### 初始化

```typescript
// EntryAbility.ets
import { SillyChat } from '@sillychat/sdk';

export default class EntryAbility extends UIAbility {
  sillyChat: SillyChat;

  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    this.sillyChat = new SillyChat({
      context: this.context,
      apiKey: 'your-api-key'
    });
  }
}
```

### 创建代理

```typescript
const agent = await this.sillyChat.agentManager.createAgent({
  id: 'assistant-1',
  identity: {
    name: 'AI助手',
    role: AgentRole.ASSISTANT
  },
  modelConfig: {
    provider: ModelProvider.ANTHROPIC,
    model: 'claude-3-5-sonnet'
  }
});
```

### 聊天页面

```typescript
@Entry
@Component
struct ChatPage {
  @State messages: Message[] = [];
  @State inputText: string = '';

  build() {
    Column() {
      MessageList({ messages: this.messages })
      MessageInput({
        text: this.inputText,
        onSend: (text) => this.sendMessage(text)
      })
    }
  }

  async sendMessage(text: string) {
    const message = await sillyChat.messageManager.sendMessage(
      this.conversationId,
      text
    );
    this.messages.push(message);
  }
}
```

## 项目结构

```
entry/src/main/
├── ets/
│   ├── entryability/
│   ├── pages/
│   ├── components/
│   └── viewmodel/
└── resources/
```

## 更多

- [HarmonyOS API 文档](../../docs/api/harmonyos.md)
- [完整教程](../../docs/tutorials/01-first-app.md)
