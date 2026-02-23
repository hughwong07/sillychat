# SillyChat - 系统架构总览

## 概述

SillyChat 是一个多端协同的 AI 聊天系统，支持三种运行模式：
- **服务端模式**：集成 OpenClaw 能力，作为 AI 服务提供方
- **客户端模式**：仅作为聊天客户端，连接配对的服务端
- **混合模式**：既是 OpenClaw 服务提供方，又是聊天客户端

## 系统架构

### 核心连接流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      SillyChat 应用启动                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              向 sillymd.com 获取服务器信息                        │
│         GET https://www.sillymd.com/sillychat/server            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    解析服务器列表                                │
│  [{"id": "srv1", "host": "srv1.sillychat.io", "port": 8080}, ...] │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              选择最近的服务器建立 WebSocket 连接                  │
│              wss://{server.host}:{server.port}/ws                 │
└─────────────────────────────────────────────────────────────────┘
```

### 运行模式架构

#### 模式一：服务端模式 (Server Mode)

```
┌─────────────────────────────────────────────────────────────────┐
│                      SillyChat 服务端                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   OpenClaw   │  │   Gateway    │  │   Core API   │         │
│  │   集成模块    │──▶│   网关服务    │──▶│   核心接口    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                 │                 │                  │
│         ▼                 ▼                 ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  AI Agent    │  │  WebSocket   │  │   Storage    │         │
│  │  代理系统     │  │  实时通信    │  │   数据存储    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SillyChat 客户端                            │
│                   （可以是本机或其他设备）                        │
└─────────────────────────────────────────────────────────────────┘
```

**功能特点**：
- 完整 OpenClaw AI 能力集成
- 提供 WebSocket 服务供客户端连接
- 本地 AI 模型运行
- 数据持久化存储
- 支持多客户端同时连接

#### 模式二：客户端模式 (Client Mode)

```
┌─────────────────────────────────────────────────────────────────┐
│                      SillyChat 客户端                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │     UI       │  │   Message    │  │  Connection  │         │
│  │   界面层      │──▶│   消息管理    │──▶│   连接管理    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                              │                  │
│                                              │ WebSocket
│                                              ▼                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              配对的服务端 (另一台设备)                      │ │
│  │         （运行服务端模式的 SillyChat）                     │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**功能特点**：
- 轻量级客户端，无 OpenClaw 依赖
- 通过 WebSocket 连接远程服务端
- 发送/接收消息
- 本地配置和缓存
- 不支持本地 AI 运行

#### 模式三：混合模式 (Hybrid Mode)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SillyChat 混合模式                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     OpenClaw 服务层                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │  AI模型   │  │  网关服务 │  │  核心API │              │  │
│  │  └──────────┘  └──────────┘  └──────────┘              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                        │
│                       ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    WebSocket 服务                         │  │
│  │              （供其他客户端连接）                          │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                        │
│           ┌───────────┴───────────┐                           │
│           │                       │                           │
│           ▼                       ▼                           │
│  ┌──────────────┐      ┌──────────────────┐                  │
│  │   本地UI      │      │   远程客户端      │                  │
│  │  （本机用户）  │      │   （其他设备）    │                  │
│  └──────────────┘      └──────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**功能特点**：
- 同时具备服务端和客户端能力
- 本地可以使用 OpenClaw AI
- 其他设备可以连接到此设备
- 可以同时连接其他服务端
- 支持设备间互为服务端/客户端

## 平台架构

### 桌面端 (Desktop)

**技术栈**: Electron + TypeScript

**位置**: `apps/desktop/`

```
apps/desktop/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts            # 应用入口
│   │   ├── window-manager.ts   # 窗口管理
│   │   ├── core-integration.ts # OpenClaw 集成
│   │   └── macos/              # macOS 原生功能
│   ├── preload/        # 预加载脚本
│   ├── renderer/       # 渲染进程
│   │   ├── components/         # React 组件
│   │   ├── screens/            # 页面
│   │   └── App.tsx             # 应用组件
│   └── common/         # 共享常量
├── build/              # 构建配置
└── package.json
```

**支持平台**:
- Windows (win32/x64/ARM64)
- macOS (x64/ARM64/Universal)
- Linux (可选)

### 移动端 (Mobile)

**技术栈**: React Native + TypeScript

**位置**: `apps/mobile/`

```
apps/mobile/
├── src/
│   ├── components/     # UI 组件
│   ├── screens/        # 页面
│   ├── navigation/     # 导航配置
│   ├── services/       # 服务层
│   ├── store/          # 状态管理
│   └── utils/          # 工具函数
├── android/            # Android 原生配置
├── ios/                # iOS 原生配置
└── package.json
```

**支持平台**:
- Android (API 26+)
- iOS (13+)

### 原生 Android (Native Android)

**技术栈**: Kotlin + Jetpack Compose

**位置**: `apps/android/`

```
apps/android/
├── app/src/main/java/com/sillychat/app/
│   ├── data/           # 数据层
│   │   ├── model/      # 数据模型
│   │   ├── local/      # 本地数据库
│   │   ├── remote/     # 远程API
│   │   └── repository/ # 仓库
│   ├── ui/             # UI 层
│   │   ├── screens/    # 页面
│   │   ├── components/ # 组件
│   │   └── theme/      # 主题
│   ├── viewmodel/      # ViewModel
│   └── service/        # 服务
└── build.gradle.kts
```

**说明**: 原生 Android 是完整的独立实现，使用 Kotlin 语言和 Jetpack Compose UI 框架。

### 原生 macOS (Native macOS)

**技术栈**: Swift + SwiftUI

**位置**: `apps/macos/`

**说明**: 原生 macOS 应用，使用 Swift 语言和 SwiftUI 框架开发。

**注意**: 与 desktop (Electron) 不同，这是完全原生的 macOS 实现。

### 鸿蒙端 (HarmonyOS)

**技术栈**: ArkTS + ArkUI

**位置**: `apps/harmonyos/`

```
apps/harmonyos/
├── entry/src/main/
│   ├── ets/
│   │   ├── entryability/   # Ability 入口
│   │   ├── pages/          # 页面
│   │   │   ├── Index.ets   # 主页面
│   │   │   ├── Chat.ets    # 聊天页面
│   │   │   └── Settings.ets # 设置页面
│   │   ├── components/     # 自定义组件
│   │   ├── services/       # 服务层
│   │   │   ├── WebSocketService.ets  # WebSocket 连接
│   │   │   ├── MessageService.ets    # 消息管理
│   │   │   └── StorageService.ets    # 本地存储
│   │   ├── models/         # 数据模型
│   │   └── utils/          # 工具函数
│   ├── resources/          # 资源文件
│   └── module.json5        # 模块配置
├── AppScope/
│   └── app.json5           # 应用配置
└── build-profile.json5     # 构建配置
```

**支持设备**:
- 手机 (Phone)
- 平板 (Tablet)

**说明**: 鸿蒙端是独立的原生实现，使用 ArkTS 语言和 ArkUI 声明式 UI 框架，专为 HarmonyOS 生态优化。

## 目录结构说明

### 当前目录布局

```
apps/
├── desktop/           # Electron 跨平台桌面应用
│                     # 支持 Windows + macOS + Linux
├── macos/            # 原生 Swift macOS 应用
│                     # 独立的原生实现
├── mobile/           # React Native 跨平台移动应用
│                     # 支持 Android + iOS
├── android/          # 原生 Kotlin Android 应用
│                     # 独立的原生实现
└── harmonyos/        # 原生 ArkTS HarmonyOS 应用
                      # 支持手机 + 平板
```

### 平台选择建议

| 场景 | 推荐平台 | 说明 |
|------|----------|------|
| 桌面端（通用） | desktop (Electron) | 一套代码，跨平台 |
| 桌面端（Mac 原生体验） | macos (Swift) | 最佳 macOS 体验 |
| 移动端（通用） | mobile (React Native) | 一套代码，跨平台 |
| 移动端（Android 原生） | android (Kotlin) | 最佳 Android 体验 |
| 移动端（鸿蒙原生） | harmonyos (ArkTS) | 最佳 HarmonyOS 体验 |

## 核心模块连接流程

### 1. 服务发现

```typescript
// 获取服务器列表
async function discoverServers(): Promise<ServerInfo[]> {
  const response = await fetch('https://www.sillymd.com/sillychat/server');
  const servers: ServerInfo[] = await response.json();
  return servers;
}

interface ServerInfo {
  id: string;
  host: string;
  port: number;
  region: string;
  latency?: number;
}
```

### 2. 连接建立

```typescript
// 建立 WebSocket 连接
class ConnectionManager {
  private ws: WebSocket | null = null;

  async connect(server: ServerInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `wss://${server.host}:${server.port}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to server:', server.id);
        resolve();
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
    });
  }

  private handleMessage(message: Message): void {
    // 处理收到的消息
  }
}
```

### 3. 模式切换

```typescript
// 应用模式枚举
enum AppMode {
  SERVER = 'server',     // 服务端模式
  CLIENT = 'client',     // 客户端模式
  HYBRID = 'hybrid'      // 混合模式
}

// 模式配置
interface ModeConfig {
  mode: AppMode;
  enableOpenClaw: boolean;      // 是否启用 OpenClaw
  enableGateway: boolean;       // 是否启动网关服务
  upstreamServer?: string;      // 上游服务器（客户端模式）
}

// 初始化应用
async function initializeApp(config: ModeConfig): Promise<void> {
  if (config.enableOpenClaw) {
    await initializeOpenClaw();
  }

  if (config.enableGateway) {
    await startGatewayService();
  }

  if (config.mode === 'client' || config.mode === 'hybrid') {
    const servers = await discoverServers();
    const nearest = selectNearestServer(servers);
    await connectionManager.connect(nearest);
  }
}
```

## 数据流

### 服务端模式数据流

```
用户输入 ──▶ UI层 ──▶ OpenClaw ──▶ AI处理 ──▶ 响应 ──▶ UI显示
                              │
                              ▼
                         其他客户端
                         (通过WebSocket)
```

### 客户端模式数据流

```
用户输入 ──▶ UI层 ──▶ WebSocket ──▶ 远程服务端 ──▶ OpenClaw
                                            │
                                            ▼
UI显示 ◀── 响应 ◀── WebSocket ◀── AI处理结果
```

## 安全考虑

1. **WebSocket 连接**: 使用 WSS (WebSocket Secure)
2. **服务发现**: HTTPS 获取服务器列表
3. **认证**: Token-based 认证
4. **数据加密**: 端到端加密 (E2EE)

## 部署架构

### 单机部署

```
┌─────────────────────────────────────┐
│           用户设备                   │
│  ┌───────────────────────────────┐  │
│  │    SillyChat (混合模式)        │  │
│  │  ┌─────────┐  ┌────────────┐ │  │
│  │  │OpenClaw │  │ WebSocket  │ │  │
│  │  │ 服务    │  │  服务      │ │  │
│  │  └─────────┘  └────────────┘ │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 多设备部署

```
┌──────────────┐      WebSocket       ┌──────────────┐
│   设备 A      │◀───────────────────▶│   设备 B      │
│  (服务端模式) │                      │  (客户端模式) │
│              │◀───────────────────▶│              │
│  ┌─────────┐ │      WebSocket       │  ┌─────────┐ │
│  │OpenClaw │ │                      │  │   UI    │ │
│  └─────────┘ │                      │  └─────────┘ │
└──────────────┘                      └──────────────┘
        │                                    │
        │         ┌──────────────┐          │
        │         │   设备 C      │          │
        └────────▶│  (客户端模式) │◀─────────┘
                  └──────────────┘
```

## 相关文档

- [桌面端架构](./desktop.md)
- [Android 架构](./android.md)
- [鸿蒙端架构](./harmonyos.md)
- [OpenClaw 集成](../integration/openclaw.md)
- [API 文档](../api/README.md)
