# 更新日志

所有重要的更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- 初始项目架构搭建
- 核心引擎 (XSG Core) 基础实现
- AI代理管理系统
- 网关服务 (WebSocket + HTTP)
- 本地存储系统 (SQLite + Blob池)
- 通信协议 (XSG Protocol)
- 记忆系统 (短期记忆 + 向量检索)

### 平台支持
- Electron桌面端 (Windows/macOS)
- React Native移动端
- 原生Android应用
- HarmonyOS应用

## [1.0.0] - 2026-02-24

### 新增
- 首次公开发布
- 多平台AI聊天功能
- AI代理管理
- 本地优先存储架构
- 文件自动整理系统
- 端到端加密通信
- 多语言UI支持 (12种语言)
- 实时翻译功能

### 核心模块
- **Agents**: AI代理创建、管理、对话
- **Gateway**: WebSocket网关服务，支持设备发现
- **Storage**: SQLite数据库 + Blob去重存储
- **Protocol**: XSG通信协议，支持消息序列化/验证
- **Memory**: 短期记忆 + 长期向量记忆
- **Config**: 配置管理系统

### 平台特性

#### Desktop (Electron)
- 跨平台桌面应用
- macOS原生菜单集成
- TouchBar支持
- 深色/浅色主题
- 窗口管理

#### Mobile (React Native)
- iOS/Android双平台
- 原生模块集成 (生物识别、存储、通知)
- 离线支持
- 推送通知

#### Android (原生)
- Jetpack Compose UI
- 后台任务同步
- WorkManager集成
- Room数据库

#### HarmonyOS
- ArkTS/ArkUI开发
- 分布式能力支持
- 原生性能优化

### 文档
- 完整API文档
- 开发指南
- 教程系列
- 架构设计文档

### 测试
- 单元测试覆盖
- 集成测试
- E2E测试
- 性能测试

### 安全
- 端到端加密
- 本地数据加密
- 生物识别认证
- 安全存储

---

## 版本历史

### [0.9.0] - 2026-02-20
- Beta测试版本
- 核心功能完成
- 文档完善

### [0.8.0] - 2026-02-15
- Alpha测试版本
- 多平台集成
- 初步文档

### [0.5.0] - 2026-02-01
- 内部开发版本
- 核心引擎实现

### [0.1.0] - 2026-01-15
- 项目初始化
- 架构设计
- 技术选型

---

## 升级指南

### 从 0.9.x 升级到 1.0.0

```bash
# 1. 备份数据
cp -r ~/.sillychat/data ~/.sillychat/backup

# 2. 更新代码
git pull origin main

# 3. 更新依赖
npm install

# 4. 运行迁移
npm run migrate

# 5. 验证安装
npm test
```

### 数据库迁移

```bash
# 自动迁移
npm run db:migrate

# 手动迁移
npm run db:migrate:manual

# 回滚
npm run db:rollback
```

---

## 贡献者

感谢所有为 SillyChat 做出贡献的开发者！

[查看完整贡献者列表](https://github.com/your-org/SillyChat/graphs/contributors)

---

## 相关链接

- [完整文档](https://docs.sillychat.io)
- [API参考](https://api.sillychat.io)
- [示例代码](https://github.com/your-org/SillyChat/tree/main/examples)
- [问题反馈](https://github.com/your-org/SillyChat/issues)
