# SillyChat Android 开发文档

> SillyChat Android 端开发文档中心，包含完整的开发、测试和发布指南。

---

## 文档清单

### 核心文档

| 文档 | 说明 | 路径 |
|------|------|------|
| [开发指南](./dev-guide.md) | 环境搭建、项目结构、开发规范、调试技巧 | `dev-guide.md` |
| [架构文档](./architecture.md) | 整体架构、模块划分、数据流、核心层集成 | `architecture.md` |
| [API 文档](./api-reference.md) | 组件 API、Hooks API、工具函数、类型定义 | `api-reference.md` |
| [原生模块文档](./native-modules.md) | 原生模块列表、桥接层说明、使用方法 | `native-modules.md` |
| [测试指南](./testing-guide.md) | 测试策略、单元测试、E2E 测试、性能测试 | `testing-guide.md` |
| [发布指南](./deployment.md) | 打包 APK/AAB、签名配置、应用市场发布 | `deployment.md` |
| [功能对比表](./feature-comparison.md) | 桌面端 vs Android 端功能对比、版本计划 | `feature-comparison.md` |

---

## 快速开始

### 1. 环境搭建

```bash
# 克隆仓库
git clone https://github.com/your-org/SillyChat.git
cd SillyChat/apps/mobile

# 安装依赖
npm install

# 启动开发服务器
npm start

# 运行 Android (新终端)
npm run android
```

详细步骤请参考 [开发指南](./dev-guide.md)。

### 2. 项目结构

```
apps/mobile/
├── android/              # Android 原生代码
├── ios/                  # iOS 原生代码
├── src/                  # React Native 源码
│   ├── components/       # 可复用组件
│   ├── screens/          # 页面组件
│   ├── hooks/            # 自定义 Hooks
│   ├── services/         # 业务服务
│   ├── store/            # 状态管理
│   ├── utils/            # 工具函数
│   ├── theme/            # 主题配置
│   └── types/            # 类型定义
├── __tests__/            # 测试文件
├── docs/                 # 文档
└── ...
```

### 3. 常用命令

```bash
# 开发
npm start                 # 启动 Metro 服务器
npm run android           # 运行 Android 应用
npm run android:release   # 运行 Release 版本

# 测试
npm test                  # 运行单元测试
npm run test:coverage     # 生成测试覆盖率报告
npm run test:e2e          # 运行 E2E 测试

# 构建
cd android
./gradlew assembleDebug   # 构建 Debug APK
./gradlew assembleRelease # 构建 Release APK
./gradlew bundleRelease   # 构建 Release AAB
```

---

## 技术栈

| 层级 | 技术选型 | 版本 |
|------|----------|------|
| 前端框架 | React Native | 0.73+ |
| 语言 | TypeScript | 5.x |
| 状态管理 | Zustand | 4.x |
| 导航 | React Navigation | 6.x |
| 网络 | Axios + WebSocket | - |
| 存储 | MMKV + SQLite | - |
| 原生语言 | Kotlin | 1.9+ |
| 核心层 | Rust/C++ | - |

---

## 贡献指南

### 提交 Issue

- 使用清晰的标题描述问题
- 提供复现步骤和环境信息
- 附上相关日志和截图

### 提交代码

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 遵循 TypeScript 严格模式
- 组件使用函数式编程
- 添加必要的单元测试
- 保持代码注释清晰

---

## 版本信息

- **当前版本**: 1.0.0
- **最低 Android 版本**: Android 8.0 (API 26)
- **目标 Android 版本**: Android 14 (API 34)

---

## 获取帮助

- **文档问题**: 提交 Issue 到文档仓库
- **技术问题**: 查看 [开发指南](./dev-guide.md) 的常见问题部分
- **功能建议**: 参与 GitHub Discussions

---

## 许可证

MIT License - 详见项目根目录 LICENSE 文件
