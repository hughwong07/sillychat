# 快速开始指南

本指南帮助您在5分钟内启动并运行 SillyChat。

## 目录

1. [环境准备](#环境准备)
2. [安装 SillyChat](#安装-sillychat)
3. [运行第一个示例](#运行第一个示例)
4. [下一步](#下一步)

---

## 环境准备

### 系统要求

| 平台 | 最低版本 | 内存 | 磁盘空间 |
|------|----------|------|----------|
| Windows | 10 | 4GB | 500MB |
| macOS | 11 (Big Sur) | 4GB | 500MB |
| Linux | Ubuntu 20.04 | 4GB | 500MB |

### 安装 Node.js

SillyChat 需要 Node.js >= 22.12.0

**Windows/macOS:**
1. 访问 https://nodejs.org
2. 下载 LTS 版本 (v22.x)
3. 运行安装程序

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22
```

**验证安装:**
```bash
node --version  # 应显示 v22.x.x
npm --version   # 应显示 10.x.x
```

### 安装 Git

**Windows:**
下载并安装: https://git-scm.com/download/win

**macOS:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt-get install git
```

---

## 安装 SillyChat

### 1. 克隆项目

```bash
git clone https://github.com/your-org/SillyChat.git
cd SillyChat
```

### 2. 安装依赖

```bash
# 安装核心依赖
npm install

# 安装桌面端依赖
cd apps/desktop && npm install
cd ../..

# 安装移动端依赖（可选）
cd apps/mobile && npm install
cd ../..
```

### 3. 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件，添加你的 API 密钥
nano .env
```

**.env 文件示例:**
```bash
# AI 模型 API 密钥
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# 网关配置
GATEWAY_PORT=8080
GATEWAY_HOST=localhost

# 存储路径
DATA_PATH=./data
```

---

## 运行第一个示例

### 运行核心网关服务

```bash
# 终端 1: 启动网关服务
npm run dev:gateway

# 你应该看到:
# [Gateway] Starting gateway server...
# [Gateway] Gateway server listening on localhost:8080
# [Gateway] Gateway server started successfully
```

### 运行桌面端应用

```bash
# 终端 2: 启动桌面端
cd apps/desktop
npm run dev

# 桌面应用窗口将自动打开
```

### 验证安装

1. **检查网关状态**
   ```bash
   curl http://localhost:8080/health
   ```
   预期响应:
   ```json
   {"status":"running","uptime":12345,"connections":0}
   ```

2. **创建第一个 AI 代理**
   ```bash
   curl -X POST http://localhost:8080/api/agents \
     -H "Content-Type: application/json" \
     -d '{
       "id": "assistant-1",
       "identity": {
         "name": "AI助手",
         "role": "assistant"
       },
       "modelConfig": {
         "provider": "anthropic",
         "model": "claude-3-5-sonnet"
       }
     }'
   ```

3. **发送测试消息**
   ```bash
   curl -X POST http://localhost:8080/api/conversations \
     -H "Content-Type: application/json" \
     -d '{"agentId": "assistant-1", "title": "测试对话"}'
   ```

---

## 基本使用

### 使用 JavaScript SDK

```javascript
// 安装 SDK
npm install @sillychat/sdk

// 使用示例
import { SillyChat } from '@sillychat/sdk';

const client = new SillyChat({
  baseURL: 'http://localhost:8080'
});

async function main() {
  // 创建代理
  const agent = await client.agents.create({
    id: 'my-assistant',
    identity: {
      name: '我的助手',
      role: 'assistant'
    }
  });

  // 创建对话
  const conversation = await client.conversations.create({
    agentId: agent.id
  });

  // 发送消息
  const message = await client.messages.send({
    conversationId: conversation.id,
    content: '你好！'
  });

  console.log('AI回复:', message.content);
}

main();
```

### 使用 CLI 工具

```bash
# 安装 CLI
npm install -g @sillychat/cli

# 登录
sillychat login

# 创建代理
sillychat agents create --name "AI助手" --model claude-3-5-sonnet

# 开始对话
sillychat chat --agent assistant-1
```

---

## 下一步

### 学习路径

1. **了解核心概念**
   - [架构指南](ARCHITECTURE.md)
   - [API 文档](../api/README.md)

2. **开发应用**
   - [开发指南](DEVELOPMENT.md)
   - [教程系列](../tutorials/01-first-app.md)

3. **部署生产环境**
   - [部署指南](DEPLOYMENT.md)

### 常见问题

**Q: 网关启动失败？**
```bash
# 检查端口占用
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# 更换端口
npm run dev:gateway -- --port 8081
```

**Q: 桌面端白屏？**
```bash
# 检查网关是否运行
curl http://localhost:8080/health

# 重新构建
cd apps/desktop && npm run build:dev
```

**Q: API 密钥无效？**
```bash
# 检查 .env 文件
cat .env

# 重启网关服务
npm run dev:gateway
```

### 获取帮助

- 📖 [完整文档](https://docs.sillychat.io)
- 💬 [Discord 社区](https://discord.gg/sillychat)
- 🐛 [提交 Issue](https://github.com/your-org/SillyChat/issues)
- 📧 [邮件支持](mailto:support@sillychat.io)

---

## 快速命令参考

```bash
# 开发
npm run dev:gateway      # 启动网关服务
cd apps/desktop && npm run dev    # 启动桌面端
cd apps/mobile && npx react-native run-android  # 启动 Android
cd apps/mobile && npx react-native run-ios      # 启动 iOS

# 构建
npm run build            # 构建核心
cd apps/desktop && npm run build  # 构建桌面端
cd apps/android && ./gradlew assembleRelease    # 构建 Android

# 测试
npm test                 # 运行所有测试
npm run test:unit        # 单元测试
npm run test:integration # 集成测试

# 代码质量
npm run lint             # 代码检查
npm run lint:fix         # 自动修复
npm run format           # 格式化代码
```

---

*恭喜！您已成功运行 SillyChat。开始构建您的 AI 应用吧！*
