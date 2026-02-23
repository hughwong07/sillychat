# 目录结构调整说明

## 调整日期
2026-02-23

## 调整内容

### 1. 删除空目录

**删除**: `apps/windows/`
- 原因：空目录，无实质内容
- desktop (Electron) 已包含 Windows 支持

### 2. 目录结构说明

调整后结构：

```
apps/
├── desktop/          # Electron 跨平台桌面应用
│                     # 支持 Windows + macOS + Linux
├── macos/            # 原生 Swift macOS 应用（保留）
│                     # 与 desktop 并行存在，提供原生体验
├── mobile/           # React Native 跨平台移动应用
│                     # 支持 Android + iOS
├── android/          # 原生 Kotlin Android 应用（保留）
│                     # 与 mobile 并行存在，提供原生体验
└── harmonyos/        # 原生 ArkTS HarmonyOS 应用
                      # 支持手机 + 平板
```

### 3. 平台关系说明

| 目录 | 技术栈 | 支持平台 | 定位 |
|------|--------|----------|------|
| desktop | Electron + TypeScript | Windows/macOS/Linux | 跨平台桌面方案 |
| macos | Swift + SwiftUI | macOS only | 原生 macOS 方案 |
| mobile | React Native + TypeScript | Android/iOS | 跨平台移动方案 |
| android | Kotlin + Jetpack Compose | Android only | 原生 Android 方案 |
| harmonyos | ArkTS + ArkUI | HarmonyOS (手机/平板) | 原生鸿蒙方案 |

### 4. 不合并的原因

**desktop vs macos**:
- desktop 是 Electron 跨平台方案
- macos 是原生 Swift 方案
- 两者技术栈完全不同，目标不同
- desktop 追求跨平台一致性
- macos 追求原生体验和性能

**mobile vs android**:
- mobile 是 React Native 跨平台方案
- android 是原生 Kotlin 方案
- 两者技术栈完全不同
- mobile 追求一套代码多端运行
- android 追求最佳 Android 体验

### 5. 使用建议

**桌面端选择**:
- 需要同时支持 Windows 和 macOS → 使用 desktop
- 只需要 macOS 且追求原生体验 → 使用 macos

**移动端选择**:
- 需要同时支持 Android 和 iOS → 使用 mobile
- 只需要 Android 且追求原生体验 → 使用 android
- 需要 HarmonyOS 支持 → 使用 harmonyos

## 后续规划

可能考虑添加：
- `apps/ios/` - 原生 Swift iOS 应用
- `apps/web/` - Web 网页版
- `apps/server/` - 纯服务端版本

## 鸿蒙端目录结构详解

### 完整目录树

```
apps/harmonyos/
├── AppScope/
│   ├── app.json5                    # 应用级配置
│   └── resources/                   # 应用级资源
│       ├── base/
│       │   ├── element/             # 公共元素
│       │   ├── media/               # 公共媒体资源
│       │   └── theme.json           # 主题配置
│       └── rawfile/                 # 原始文件
├── entry/                           # 主模块 (Entry Module)
│   ├── src/main/
│   │   ├── ets/                     # ArkTS 源码
│   │   │   ├── entryability/        # Ability 生命周期管理
│   │   │   │   └── EntryAbility.ets
│   │   │   ├── pages/               # 页面
│   │   │   │   ├── Index.ets        # 首页/会话列表
│   │   │   │   ├── Chat.ets         # 聊天页面
│   │   │   │   ├── Contacts.ets     # 联系人页面
│   │   │   │   └── Settings.ets     # 设置页面
│   │   │   ├── components/          # 可复用组件
│   │   │   │   ├── ChatBubble.ets   # 聊天气泡
│   │   │   │   ├── ChatInput.ets    # 输入框组件
│   │   │   │   ├── MessageList.ets  # 消息列表
│   │   │   │   └── Avatar.ets       # 头像组件
│   │   │   ├── services/            # 服务层
│   │   │   │   ├── WebSocketService.ets   # WebSocket 连接管理
│   │   │   │   ├── MessageService.ets     # 消息业务逻辑
│   │   │   │   ├── StorageService.ets     # 本地存储 (Preferences)
│   │   │   │   ├── DiscoveryService.ets   # 服务发现
│   │   │   │   └── ConnectionManager.ets  # 连接管理器
│   │   │   ├── models/              # 数据模型
│   │   │   │   ├── Message.ets      # 消息模型
│   │   │   │   ├── Conversation.ets # 会话模型
│   │   │   │   ├── ServerInfo.ets   # 服务器信息
│   │   │   │   └── User.ets         # 用户模型
│   │   │   └── utils/               # 工具函数
│   │   │       ├── Logger.ets       # 日志工具
│   │   │       ├── DateUtil.ets     # 日期工具
│   │   │       └── NetworkUtil.ets  # 网络工具
│   │   ├── resources/               # 模块级资源
│   │   │   ├── base/
│   │   │   │   ├── element/         # 颜色、字符串等
│   │   │   │   ├── media/           # 图片、图标
│   │   │   │   └── profile/         # 配置文件
│   │   │   └── rawfile/             # 原始资源文件
│   │   └── module.json5             # 模块配置
│   ├── build-profile.json5          # 构建配置
│   └── hvigorfile.ts                # 构建脚本
├── build-profile.json5              # 项目级构建配置
├── hvigorfile.ts                    # 项目级构建脚本
├── oh-package.json5                 # 依赖管理
└── local.properties                 # 本地环境配置
```

### 关键文件说明

| 文件路径 | 说明 |
|----------|------|
| `AppScope/app.json5` | 应用级配置，包含 bundleName、版本号、图标等 |
| `entry/src/main/module.json5` | 模块配置，声明 Ability、权限等 |
| `entry/src/main/ets/entryability/EntryAbility.ets` | 应用入口 Ability |
| `oh-package.json5` | 依赖管理，类似 npm package.json |
| `build-profile.json5` | 构建配置，包含编译选项、签名等 |

### 与其他平台对比

| 目录/文件 | HarmonyOS | Android | iOS |
|-----------|-----------|---------|-----|
| 项目配置 | `app.json5` | `build.gradle` | `Info.plist` |
| 依赖管理 | `oh-package.json5` | `build.gradle` | `Podfile` |
| 入口文件 | `EntryAbility.ets` | `MainActivity.kt` | `App.swift` |
| UI 声明 | ArkUI (声明式) | Jetpack Compose | SwiftUI |
| 本地存储 | `preferences` | `DataStore` | `UserDefaults` |
| 网络请求 | `http` 模块 | `Retrofit` | `URLSession` |
