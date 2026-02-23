# 常见问题 (FAQ)

## 一般问题

### Q: SillyChat 是什么？
**A:** SillyChat 是一个多平台AI原生聊天应用，支持Windows、macOS、Android和HarmonyOS。它提供本地化存储、多AI代理管理、AI分身等功能。

### Q: SillyChat 是免费的吗？
**A:** SillyChat 核心功能完全免费开源。部分高级功能（如云同步、额外存储空间）可能需要订阅。

### Q: 支持哪些AI模型？
**A:** 支持多种AI模型：
- OpenClaw (Clawd) - 内置
- Anthropic Claude 3.5/4
- OpenAI GPT-4/GPT-4o
- Ollama 本地模型
- 自定义API端点

### Q: 数据存储在哪里？
**A:** 采用本地优先架构：
- 聊天记录：本地SQLite数据库
- 文件：本地Blob池存储
- 可选：用户自有云端存储

---

## 安装问题

### Q: 安装失败怎么办？
**A:** 请检查以下几点：
1. Node.js版本 >= 22.12.0
2. npm版本 >= 10
3. 系统满足最低配置要求
4. 磁盘空间充足（至少1GB）

```bash
# 检查版本
node --version
npm --version

# 清理缓存后重试
npm clean-install
```

### Q: 如何在Windows上安装？
**A:**
```bash
# 1. 安装Node.js (从官网下载)
# 2. 克隆项目
git clone https://github.com/your-org/SillyChat.git
cd SillyChat

# 3. 安装依赖
npm install

# 4. 构建
cd apps/desktop && npm install && npm run build
```

### Q: 如何在macOS上安装？
**A:**
```bash
# 1. 使用Homebrew安装Node
brew install node@22

# 2. 克隆并安装
git clone https://github.com/your-org/SillyChat.git
cd SillyChat && npm install

# 3. 构建桌面端
cd apps/desktop && npm install && npm run build:mac
```

### Q: 如何在Linux上安装？
**A:**
```bash
# Ubuntu/Debian
sudo apt-get install nodejs npm
git clone https://github.com/your-org/SillyChat.git
cd SillyChat && npm install
```

---

## 使用问题

### Q: 如何创建AI代理？
**A:**
```typescript
import { AgentManager } from '@sillychat/core/agents';

const manager = new AgentManager();
const agent = await manager.createAgent({
  id: 'my-agent',
  identity: {
    name: '我的助手',
    role: 'assistant'
  },
  modelConfig: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    apiKey: 'your-api-key'
  }
});
```

### Q: 如何切换AI模型？
**A:** 在代理配置中修改 `modelConfig`：
```typescript
agent.updateConfig({
  modelConfig: {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'new-api-key'
  }
});
```

### Q: 如何导出聊天记录？
**A:**
```bash
# 使用CLI工具
npx sillychat export --format json --output ./backup.json

# 或程序化导出
import { StorageManager } from '@sillychat/core/storage';
const storage = new StorageManager();
await storage.exportConversations('./backup.json');
```

### Q: 如何导入聊天记录？
**A:**
```bash
npx sillychat import --file ./backup.json
```

### Q: 支持哪些文件格式？
**A:** 支持多种文件类型：
- **图片**: jpg, png, gif, webp, svg
- **文档**: pdf, doc, docx, txt, md
- **代码文件**: js, ts, py, java, cpp, etc.
- **其他**: 任意文件类型

---

## 开发问题

### Q: 如何开始开发？
**A:**
```bash
# 1. Fork项目
# 2. 克隆你的fork
git clone https://github.com/YOUR_USERNAME/SillyChat.git

# 3. 安装依赖
cd SillyChat && npm install

# 4. 启动开发服务器
npm run dev:gateway

# 5. 运行桌面端（新终端）
cd apps/desktop && npm run dev
```

### Q: 如何运行测试？
**A:**
```bash
# 所有测试
npm test

# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# E2E测试
npm run test:e2e

# 覆盖率
npm run test:coverage
```

### Q: 如何提交PR？
**A:**
1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### Q: 代码规范是什么？
**A:** 使用ESLint + Prettier：
```bash
# 检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化
npm run format
```

---

## 性能问题

### Q: 应用运行缓慢怎么办？
**A:** 尝试以下优化：
1. 清理缓存：`npm run clean`
2. 减少同时运行的代理数量
3. 关闭不必要的日志输出
4. 增加Node.js内存限制：
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Q: 如何优化内存使用？
**A:**
```typescript
// 限制并发连接数
const gateway = new GatewayServer({
  config: {
    maxConnections: 50
  }
});

// 定期清理内存
setInterval(() => {
  if (global.gc) global.gc();
}, 60000);
```

### Q: 数据库性能如何优化？
**A:**
```typescript
const db = new DatabaseManager({
  enableWAL: true,  // 启用WAL模式
  busyTimeout: 5000
});

// 定期VACUUM
await db.run('VACUUM');
```

---

## 安全问题

### Q: 数据是如何加密的？
**A:** 多层加密保护：
- **传输加密**: WebSocket over TLS (WSS)
- **存储加密**: AES-256-GCM
- **端到端加密**: 可选的E2EE

### Q: 如何启用端到端加密？
**A:**
```typescript
import { E2EEncryption } from '@sillychat/core/crypto';

const encryption = new E2EEncryption();
await encryption.initialize();

// 加密消息
const encrypted = await encryption.encrypt(message, recipientPublicKey);
```

### Q: API密钥如何安全存储？
**A:** 使用系统密钥库：
```typescript
import { SecureStorage } from '@sillychat/core/storage';

const secure = new SecureStorage();
await secure.set('api-key', 'your-key');
const key = await secure.get('api-key');
```

### Q: 如何报告安全漏洞？
**A:** 请发送邮件至 security@sillychat.io，不要公开披露。

---

## 平台特定问题

### Q: Android应用无法安装？
**A:**
1. 启用"未知来源"安装
2. 检查Android版本 >= 8.0
3. 清理存储空间
4. 尝试ADB安装：
```bash
adb install app-release.apk
```

### Q: macOS提示"无法验证开发者"？
**A:**
1. 系统设置 -> 隐私与安全性
2. 点击"仍要打开"
3. 或使用命令行：
```bash
xattr -cr /Applications/SillyChat.app
```

### Q: Windows Defender报毒？
**A:** 这是误报，请将应用添加到排除项：
1. Windows安全中心 -> 病毒防护
2. 排除项 -> 添加文件夹
3. 选择SillyChat安装目录

### Q: HarmonyOS如何安装？
**A:**
1. 使用DevEco Studio打开项目
2. 连接HarmonyOS设备
3. 点击运行或构建HAP

---

## 故障排除

### Q: 网关服务无法启动？
**A:**
```bash
# 检查端口占用
lsof -i :8080

# 更换端口
npm run dev:gateway -- --port 8081
```

### Q: 数据库连接失败？
**A:**
```bash
# 检查数据库文件权限
ls -la data/

# 修复数据库
npm run db:repair
```

### Q: WebSocket连接断开？
**A:**
1. 检查防火墙设置
2. 确认网关服务运行中
3. 查看日志：`tail -f logs/gateway.log`

---

## 其他问题

### Q: 如何获取帮助？
**A:**
- 查看文档：https://docs.sillychat.io
- 提交Issue：https://github.com/your-org/SillyChat/issues
- 加入社区：https://discord.gg/sillychat
- 邮件支持：support@sillychat.io

### Q: 如何贡献翻译？
**A:**
1. Fork项目
2. 在 `locales/` 目录添加语言文件
3. 提交PR

### Q: 有商业支持吗？
**A:** 有，联系 enterprise@sillychat.io 获取企业版支持。

### Q: 路线图是什么？
**A:** 查看 [ROADMAP.md](ROADMAP.md) 了解未来计划。

---

*还有问题？提交 [Issue](https://github.com/your-org/SillyChat/issues) 或查看 [故障排除指南](TROUBLESHOOTING.md)*
