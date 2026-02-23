# SillyChat

SillyChat - 多平台AI原生聊天应用

## 项目概述

SillyChat是一个基于OpenClaw深度定制的AI原生聊天工具，支持Windows、macOS、Android和HarmonyOS平台。它提供本地化存储、多AI代理管理、AI分身、场景化聊天等核心功能。

## 核心特性

- **AI优先架构** - 从底层为AI交互设计优化
- **本地化存储** - 聊天记录本地存储，隐私可控
- **文件自动整理** - 图片、视频、文档自动分类，去重存储
- **多AI管理** - 每个账号可配置多个AI代理，自由切换角色
- **真人+AI分身** - 双重身份，可在群组中邀请AI分身
- **场景化聊天** - 项目、闲聊、会议等多场景支持
- **端到端加密** - 安全的通信保障
- **云端同步** - 支持用户自有云端存储
- **多语言UI** - 12种语言界面支持
- **多语言实时翻译** - 三种显示模式，支持语言学习

## 技术栈

### 后端核心
- **Node.js** >= 22.12.0
- **TypeScript** >= 5.7.3
- **SQLite** + sqlite-vec
- **Zod** 数据验证
- **Express** + WebSocket

### 前端界面
- **Windows**: Electron + React + TypeScript
- **macOS**: Electron + macOS原生集成
- **Android**: Jetpack Compose + Kotlin
- **HarmonyOS**: ArkTS + ArkUI
- **Mobile (React Native)**: React Native + TypeScript

### AI模型支持
- OpenClaw (Clawd) - 内置
- Anthropic Claude 3.5/4
- OpenAI GPT-4/GPT-4o
- Ollama 本地模型

## 快速开始

### 环境要求

```bash
# Node.js >= 22.12.0
node --version

# npm >= 10
npm --version

# Git
git --version
```

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-org/SillyChat.git
cd SillyChat

# 安装核心依赖
npm install

# 安装桌面端依赖
cd apps/desktop && npm install
cd ../..

# 安装移动端依赖
cd apps/mobile && npm install
cd ../..
```

### 开发模式运行

```bash
# 运行核心服务
npm run dev:gateway

# 运行桌面端（新终端）
cd apps/desktop && npm run dev

# 运行移动端（新终端）
cd apps/mobile && npx react-native run-android
# 或
cd apps/mobile && npx react-native run-ios
```

### 构建生产版本

```bash
# 构建核心
npm run build

# 构建桌面端
cd apps/desktop && npm run build

# Android构建
cd apps/android && ./gradlew assembleRelease

# HarmonyOS构建
cd apps/harmonyos && hvigorw assembleRelease
```

## 项目结构

```
SillyChat/
├── src/                        # 核心源码
│   ├── core/                   # XSG Core引擎
│   │   ├── agents/            # AI代理管理
│   │   ├── gateway/           # 网关服务
│   │   ├── storage/           # 存储管理
│   │   ├── protocol/          # 通信协议
│   │   ├── memory/            # 记忆系统
│   │   ├── config/            # 配置管理
│   │   └── utils/             # 工具函数
│   └── index.ts               # 主入口
├── apps/                       # 应用层
│   ├── desktop/               # Electron桌面端
│   ├── mobile/                # React Native移动端
│   ├── android/               # 原生Android
│   └── harmonyos/             # HarmonyOS应用
├── docs/                       # 文档
│   ├── api/                   # API文档
│   ├── guides/                # 开发指南
│   ├── tutorials/             # 教程
│   └── architecture/          # 架构文档
├── examples/                   # 示例项目
│   ├── android-sample/
│   ├── harmonyos-sample/
│   └── desktop-sample/
├── tests/                      # 测试用例
└── package.json               # 项目配置
```

## 文档索引

### 快速开始
- [快速开始指南](docs/guides/QUICK_START.md)
- [开发指南](docs/guides/DEVELOPMENT.md)
- [架构指南](docs/guides/ARCHITECTURE.md)

### API文档
- [API总览](docs/api/README.md)
- [Android API](docs/api/android.md)
- [HarmonyOS API](docs/api/harmonyos.md)
- [Mobile API](docs/api/mobile.md)
- [Desktop API](docs/api/desktop.md)
- [Core API](docs/api/core.md)

### 教程
- [第一个应用](docs/tutorials/01-first-app.md)
- [聊天功能](docs/tutorials/02-chat-features.md)
- [AI代理](docs/tutorials/03-ai-agents.md)
- [安全设置](docs/tutorials/04-security.md)

### 其他
- [更新日志](CHANGELOG.md)
- [常见问题](FAQ.md)
- [故障排除](TROUBLESHOOTING.md)
- [贡献指南](docs/guides/CONTRIBUTING.md)

## 核心模块

### AI代理 (Agents)
```typescript
import { AgentManager, Agent } from '@sillychat/core/agents';

// 创建代理管理器
const manager = new AgentManager();

// 创建AI代理
const agent = await manager.createAgent({
  id: 'assistant-1',
  identity: {
    name: 'AI助手',
    role: 'assistant',
    avatar: '/avatars/assistant.png'
  },
  modelConfig: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet'
  }
});

// 发送消息
const response = await agent.sendMessage('conversation-1', '你好！');
```

### 网关服务 (Gateway)
```typescript
import { GatewayServer } from '@sillychat/core/gateway';

const gateway = new GatewayServer({
  config: {
    port: 8080,
    host: 'localhost',
    maxConnections: 100
  },
  // ...其他配置
});

await gateway.start();
```

### 存储管理 (Storage)
```typescript
import { DatabaseManager, BlobPool } from '@sillychat/core/storage';

const db = new DatabaseManager({ dbPath: './data/chat.db' });
await db.connect();

// 存储文件
const blobPool = new BlobPool({ poolPath: './data/blobs' });
await blobPool.initialize();
const result = await blobPool.store('./file.txt');
```

## 测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行E2E测试
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage
```

## 代码质量

```bash
# 运行ESLint
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format

# 检查格式
npm run format:check
```

## 贡献

欢迎贡献代码！请阅读[贡献指南](docs/guides/CONTRIBUTING.md)了解详细信息。

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- 项目主页: https://github.com/your-org/SillyChat
- 问题反馈: https://github.com/your-org/SillyChat/issues
- 文档: https://docs.sillychat.io

---

*SillyChat - 让AI对话更自然*
