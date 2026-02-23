# SillyChat API 文档

欢迎使用 SillyChat API 文档。本文档涵盖了 SillyChat 所有平台的 API 接口。

## 文档结构

| 文档 | 描述 | 适用平台 |
|------|------|----------|
| [Core API](core.md) | 核心引擎 API | 所有平台 |
| [Android API](android.md) | 原生 Android API | Android |
| [HarmonyOS API](harmonyos.md) | HarmonyOS API | HarmonyOS |
| [Mobile API](mobile.md) | React Native API | iOS/Android |
| [Desktop API](desktop.md) | Electron API | Windows/macOS/Linux |

## 快速导航

### 核心模块

- **Agents** - AI代理管理
- **Gateway** - 网关服务
- **Storage** - 存储管理
- **Protocol** - 通信协议
- **Memory** - 记忆系统
- **Config** - 配置管理

### 平台 SDK

- **Android SDK** - Kotlin API
- **HarmonyOS SDK** - ArkTS API
- **Mobile SDK** - TypeScript/React Native API
- **Desktop SDK** - TypeScript/Electron API

## 通用概念

### 消息格式

所有平台使用统一的消息格式：

```typescript
interface XSGMessage {
  id: string;
  type: 'chat' | 'command' | 'event' | 'system';
  timestamp: number;
  sender: {
    userId: string;
    agentId?: string;
    role: 'human' | 'ai' | 'system';
  };
  target: {
    channelId: string;
    channelType: 'direct' | 'group' | 'project';
  };
  content: {
    type: 'text' | 'image' | 'file' | 'skill';
    data: unknown;
  };
}
```

### 错误处理

统一的错误格式：

```typescript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// HTTP状态码
// 200 - 成功
// 400 - 请求参数错误
// 401 - 未认证
// 403 - 权限不足
// 404 - 资源不存在
// 500 - 服务器错误
```

### 认证

```typescript
// 1. 获取Token
const { token } = await auth.login({
  username: 'user',
  password: 'pass'
});

// 2. 使用Token
api.setAuthToken(token);

// 3. 刷新Token
const { token: newToken } = await auth.refresh();
```

## 核心 API 概览

### Agent API

```typescript
import { AgentManager } from '@sillychat/core/agents';

// 创建管理器
const manager = new AgentManager();

// 创建代理
const agent = await manager.createAgent(config);

// 发送消息
const message = await agent.sendMessage(conversationId, content);

// 流式响应
await agent.streamMessage(conversationId, content, (chunk) => {
  console.log(chunk.content);
});
```

### Gateway API

```typescript
import { GatewayServer, GatewayClient } from '@sillychat/core/gateway';

// 服务端
const server = new GatewayServer(options);
await server.start();

// 客户端
const client = new GatewayClient({ url: 'ws://localhost:8080/ws' });
await client.connect();
```

### Storage API

```typescript
import { DatabaseManager, BlobPool } from '@sillychat/core/storage';

// 数据库
const db = new DatabaseManager(config);
await db.connect();

// Blob存储
const pool = new BlobPool(config);
await pool.initialize();
const result = await pool.store(filePath);
```

## 平台特定 API

### Android (Kotlin)

```kotlin
// 初始化SDK
val sillyChat = SillyChat.Builder(context)
    .setApiKey("your-api-key")
    .build()

// 创建代理
val agent = sillyChat.agentManager.createAgent(config)

// 发送消息
agent.sendMessage(conversationId, content)
```

### HarmonyOS (ArkTS)

```typescript
// 初始化
const sillyChat = new SillyChat(context);

// 创建代理
const agent = await sillyChat.agentManager.createAgent(config);

// 发送消息
const message = await agent.sendMessage(conversationId, content);
```

### Mobile (React Native)

```typescript
// 初始化
import { SillyChat } from '@sillychat/mobile';

const client = new SillyChat({
  baseURL: 'http://localhost:8080'
});

// 发送消息
await client.sendMessage({
  conversationId,
  content
});
```

### Desktop (Electron)

```typescript
// 主进程
import { setupCoreIPC } from '@sillychat/desktop/main';

setupCoreIPC();

// 渲染进程
import { ipcRenderer } from 'electron';

const result = await ipcRenderer.invoke('xsg-send-message', message);
```

## 版本信息

当前文档版本：**v1.0.0**

| 模块 | 版本 | 状态 |
|------|------|------|
| Core API | 1.0.0 | 稳定 |
| Android API | 1.0.0 | 稳定 |
| HarmonyOS API | 1.0.0 | 稳定 |
| Mobile API | 1.0.0 | 稳定 |
| Desktop API | 1.0.0 | 稳定 |

## 更新日志

### v1.0.0 (2026-02-24)
- 初始版本发布
- 所有核心API稳定
- 完整平台支持

## 反馈

发现文档问题？请提交 [Issue](https://github.com/your-org/SillyChat/issues)。

---

*本文档使用 Markdown 编写，遵循 OpenAPI 3.0 规范。*
