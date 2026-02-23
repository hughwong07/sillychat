# SillyChat 示例项目

本目录包含 SillyChat 的各种示例项目，帮助您快速上手开发。

## 可用示例

| 示例 | 平台 | 技术栈 | 说明 |
|------|------|--------|------|
| [android-sample](./android-sample/) | Android | Kotlin + Jetpack Compose | 原生 Android 应用 |
| [harmonyos-sample](./harmonyos-sample/) | HarmonyOS | ArkTS + ArkUI | HarmonyOS 应用 |
| [desktop-sample](./desktop-sample/) | Desktop | Electron + TypeScript | 跨平台桌面应用 |

## 快速开始

每个示例都有独立的 README 文件，包含详细的运行说明。

### 通用步骤

1. 克隆项目
   ```bash
   git clone https://github.com/your-org/SillyChat.git
   cd SillyChat/examples
   ```

2. 选择示例并进入目录
   ```bash
   cd android-sample  # 或其他示例
   ```

3. 按照该示例的 README 进行配置和运行

## 示例功能对比

| 功能 | Android | HarmonyOS | Desktop |
|------|---------|-----------|---------|
| AI 对话 | ✅ | ✅ | ✅ |
| 代理管理 | ✅ | ✅ | ✅ |
| 文件上传 | ✅ | ✅ | ✅ |
| 生物识别 | ✅ | ✅ | ❌ |
| 推送通知 | ✅ | ✅ | ❌ |
| 离线支持 | ✅ | ✅ | ✅ |
| 系统托盘 | ❌ | ❌ | ✅ |
| 全局快捷键 | ❌ | ❌ | ✅ |

## 贡献示例

欢迎提交新的示例项目！请遵循以下规范：

1. 创建新的示例目录
2. 包含完整的 README.md
3. 提供截图（如适用）
4. 确保代码有适当注释

## 更多资源

- [API 文档](../docs/api/)
- [开发指南](../docs/guides/DEVELOPMENT.md)
- [教程](../docs/tutorials/)
