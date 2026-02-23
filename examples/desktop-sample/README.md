# SillyChat Desktop 示例

这是一个展示如何使用 SillyChat Desktop SDK 的示例项目。

## 功能演示

- Electron 应用开发
- 多窗口管理
- 系统托盘
- 本地存储
- 自动更新

## 快速开始

### 1. 安装

```bash
git clone https://github.com/your-org/SillyChat.git
cd SillyChat/examples/desktop-sample
npm install
```

### 2. 配置

创建 `.env` 文件：

```bash
SILLYCHAT_API_KEY=your-api-key
```

### 3. 运行

```bash
# 开发模式
npm run dev

# 构建
npm run build
```

## 代码示例

### 主进程

```typescript
// src/main/index.ts
import { SillyChatDesktop } from '@sillychat/desktop';

const app = new SillyChatDesktop({
  config: {
    apiKey: process.env.SILLYCHAT_API_KEY,
  },
  window: {
    width: 1200,
    height: 800,
  }
});

app.start();
```

### 渲染进程

```typescript
// src/renderer/App.tsx
import { useAgents } from '@sillychat/desktop/renderer';

function App() {
  const { agents, createAgent } = useAgents();

  return (
    <div>
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
```

### 创建代理

```typescript
const agent = await window.electron.createAgent({
  id: 'assistant-1',
  identity: {
    name: 'AI助手',
    role: 'assistant'
  }
});
```

## 项目结构

```
src/
├── main/           # 主进程
│   ├── index.ts
│   └── window.ts
├── preload/        # 预加载脚本
│   └── index.ts
└── renderer/       # 渲染进程
    ├── App.tsx
    └── components/
```

## 更多

- [Desktop API 文档](../../docs/api/desktop.md)
- [完整教程](../../docs/tutorials/01-first-app.md)
