# Android 移动端架构设计文档

## 概述

本文档描述 SillyChat Android 移动端的架构设计。

## 技术选型

### 方案一: React Native (跨平台)

**位置**: `apps/mobile/`

**技术栈**:
- React Native 0.73.2
- TypeScript 5.3.3
- React Navigation 6
- Zustand (状态管理)
- React Native Paper (UI 组件库)

**优势**:
- 一套代码同时支持 Android 和 iOS
- 热更新能力
- 开发效率高
- 与桌面端共享业务逻辑

**劣势**:
- 性能略低于原生
- 原生功能需桥接

### 方案二: Kotlin + Jetpack Compose (原生)

**位置**: `apps/android/`

**技术栈**:
- Kotlin 1.9
- Jetpack Compose
- Hilt (依赖注入)
- Room (本地数据库)
- Ktor (网络请求)

**优势**:
- 最佳性能
- 完整原生体验
- 直接访问 Android API

**劣势**:
- 仅支持 Android
- 开发成本较高

## 当前实现状态

### React Native 项目结构

```
apps/mobile/
├── src/
│   ├── components/          # UI 组件
│   │   ├── agent/          # 代理相关
│   │   ├── chat/           # 聊天组件
│   │   │   ├── MessageBubble.tsx    # 消息气泡
│   │   │   ├── MessageInput.tsx     # 消息输入
│   │   │   └── MessageList.tsx      # 消息列表
│   │   ├── common/         # 通用组件
│   │   └── layout/         # 布局组件
│   │       ├── Header.tsx           # 标题栏
│   │       ├── BottomTabBar.tsx     # 底部导航
│   │       └── DrawerMenu.tsx       # 抽屉菜单
│   ├── constants/          # 常量
│   │   ├── colors.ts       # 颜色配置 (Logo配色)
│   │   └── config.ts       # 应用配置
│   ├── hooks/              # 自定义 Hooks
│   ├── navigation/         # 导航
│   │   └── AppNavigator.tsx         # 导航配置
│   ├── screens/            # 页面
│   │   ├── ChatScreen.tsx           # 聊天页
│   │   ├── AgentScreen.tsx          # 代理页
│   │   └── SettingsScreen.tsx       # 设置页
│   ├── store/              # 状态管理
│   ├── types/              # TypeScript 类型
│   └── utils/              # 工具函数
├── App.tsx                 # 应用入口
└── package.json
```

### 原生 Android 项目结构

```
apps/android/
├── app/src/main/java/com/sillychat/app/
│   ├── MainActivity.kt              # 主Activity
│   ├── SillyChatApplication.kt        # 应用类
│   ├── ui/
│   │   ├── screens/                 # 屏幕
│   │   │   ├── ChatScreen.kt
│   │   │   ├── AgentScreen.kt
│   │   │   ├── SettingsScreen.kt
│   │   │   └── ProfileScreen.kt
│   │   ├── theme/                   # 主题
│   │   │   ├── Color.kt
│   │   │   └── Theme.kt
│   │   └── components/              # 组件
│   ├── viewmodel/                   # ViewModel
│   │   ├── ChatViewModel.kt
│   │   └── MainViewModel.kt
│   ├── data/                        # 数据层 (待实现)
│   │   ├── model/                   # 数据模型
│   │   ├── repository/              # 仓库
│   │   ├── local/                   # 本地数据源
│   │   └── remote/                  # 远程数据源
│   └── di/                          # 依赖注入模块
└── build.gradle.kts
```

## 数据流架构

### React Native 数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   UI 组件    │────▶│    Store    │────▶│    API      │
│  (屏幕/组件) │◀────│  (Zustand)  │◀────│ (WebSocket) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ AsyncStorage │
                    │  (本地缓存)  │
                    └─────────────┘
```

### 原生 Android 数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│     UI      │────▶│  ViewModel  │────▶│ Repository  │
│  (Compose)  │◀────│             │◀────│             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                     ┌─────────────┐            │
                     │    Room     │◀───────────┤
                     │  (本地数据库)│            │
                     └─────────────┘            │
                                                │
                     ┌─────────────┐            │
                     │    Ktor     │◀───────────┘
                     │  (网络请求)  │
                     └─────────────┘
```

## 核心功能实现

### 1. 聊天功能

**React Native**:
- `MessageList` - FlatList 渲染消息列表
- `MessageBubble` - 消息气泡组件
- `MessageInput` - 输入框组件
- 模拟数据 + WebSocket 连接

**原生 Android**:
- `LazyColumn` 渲染消息列表
- `ChatViewModel` 管理状态
- Material 3 组件

### 2. 代理系统

- `AgentCard` 组件展示代理信息
- 状态指示器 (在线/离线/忙碌)
- 技能标签展示
- 默认代理标识

### 3. 主题系统

**配色方案** (Logo 配色):
```typescript
// 主色 - 草绿
const PRIMARY = {
  main: '#A4D037',
  light: '#C5E47A',
  dark: '#7BA32A',
};

// 强调色 - 青蓝
const ACCENT = {
  main: '#2DB5C8',
  light: '#5CC9D8',
  dark: '#1E8A99',
};
```

- 浅色/深色主题切换
- 系统主题跟随
- 动态颜色适配

## 与核心模块集成

### 共享类型定义

目标: 与桌面端共享 `src/core/` 类型定义

**策略**:
1. 使用 Kotlin Multiplatform 创建共享模块
2. 或通过代码生成工具转换 TypeScript → Kotlin

### 通信协议

**React Native**:
- WebSocket 连接 Gateway
- REST API 调用

**原生 Android**:
- Ktor Client 进行网络请求
- WebSocket 实时通信

## 构建和发布

### React Native

```bash
# Android APK
cd apps/mobile
npx react-native run-android --variant=release

# 生成签名 APK
cd android
./gradlew assembleRelease
```

### 原生 Android

```bash
cd apps/android
./gradlew assembleRelease
```

## 待实现功能

### 高优先级
1. 推送通知 (FCM)
2. 本地存储加密
3. 生物识别认证

### 中优先级
1. 图片/文件发送
2. 语音消息
3. 离线模式

### 低优先级
1. 小部件支持
2. 快捷操作
3. 分享扩展

## 相关文档

- [Phase 4 测试报告](../testing/phase4-android-test.md)
- [Phase 4 代码审查](../testing/code-review-phase4.md)
- [桌面端架构](./desktop.md)
