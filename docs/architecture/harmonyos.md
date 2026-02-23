# SillyChat 鸿蒙端架构

## 概述

SillyChat 鸿蒙端是专为 HarmonyOS 生态开发的原生应用，采用 ArkTS 语言和 ArkUI 声明式 UI 框架，提供与系统深度集成的用户体验。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 编程语言 | ArkTS | TypeScript 超集，HarmonyOS 首选语言 |
| UI 框架 | ArkUI | 声明式 UI 框架 |
| 状态管理 | AppStorage / LocalStorage | 应用级/页面级状态管理 |
| 网络通信 | WebSocket / HTTP | 系统内置网络模块 |
| 本地存储 | @ohos.data.preferences | 轻量级键值存储 |
| 构建工具 | Hvigor | HarmonyOS 构建系统 |

## 目录结构

```
apps/harmonyos/
├── AppScope/
│   ├── app.json5                    # 应用级配置
│   └── resources/                   # 应用级资源
├── entry/                           # 主模块
│   ├── src/main/
│   │   ├── ets/
│   │   │   ├── entryability/        # Ability 入口
│   │   │   ├── pages/               # 页面
│   │   │   ├── components/          # 可复用组件
│   │   │   ├── services/            # 服务层
│   │   │   ├── models/              # 数据模型
│   │   │   └── utils/               # 工具函数
│   │   └── resources/               # 模块资源
│   └── build-profile.json5
├── build-profile.json5              # 项目构建配置
└── oh-package.json5                 # 依赖管理
```

## 架构分层

### 1. UI 层 (Presentation Layer)

```
pages/
├── Index.ets          # 首页 - 会话列表
├── Chat.ets           # 聊天页面
├── Contacts.ets       # 联系人页面
└── Settings.ets       # 设置页面

components/
├── ChatBubble.ets     # 聊天气泡组件
├── ChatInput.ets      # 输入框组件
├── MessageList.ets    # 消息列表组件
└── Avatar.ets         # 头像组件
```

**代码示例 - 聊天页面**:

```typescript
// entry/src/main/ets/pages/Chat.ets
import { WebSocketService } from '../services/WebSocketService'
import { MessageService } from '../services/MessageService'
import { ChatBubble } from '../components/ChatBubble'
import { ChatInput } from '../components/ChatInput'

@Entry
@Component
struct Chat {
  @State messageList: Message[] = []
  @State conversationId: string = ''
  private wsService: WebSocketService = WebSocketService.getInstance()
  private msgService: MessageService = new MessageService()

  aboutToAppear() {
    // 加载历史消息
    this.msgService.loadMessages(this.conversationId).then(messages => {
      this.messageList = messages
    })

    // 监听新消息
    this.wsService.onMessage((msg: Message) => {
      if (msg.conversationId === this.conversationId) {
        this.messageList.push(msg)
      }
    })
  }

  build() {
    Column() {
      // 消息列表
      List() {
        ForEach(this.messageList, (msg: Message) => {
          ListItem() {
            ChatBubble({ message: msg })
          }
        })
      }
      .layoutWeight(1)

      // 输入区域
      ChatInput({
        onSend: (content: string) => {
          this.sendMessage(content)
        }
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }

  private sendMessage(content: string) {
    const message = this.msgService.createMessage(content, this.conversationId)
    this.wsService.send(message)
    this.messageList.push(message)
  }
}
```

### 2. 服务层 (Service Layer)

```
services/
├── WebSocketService.ets      # WebSocket 连接管理
├── MessageService.ets        # 消息业务逻辑
├── StorageService.ets        # 本地存储
├── DiscoveryService.ets      # 服务发现
└── ConnectionManager.ets     # 连接管理器
```

**代码示例 - WebSocket 服务**:

```typescript
// entry/src/main/ets/services/WebSocketService.ets
import webSocket from '@ohos.net.webSocket'
import { Message } from '../models/Message'

export class WebSocketService {
  private static instance: WebSocketService
  private ws: webSocket.WebSocket | null = null
  private messageHandlers: Array<(msg: Message) => void> = []
  private reconnectAttempts: number = 0
  private readonly MAX_RECONNECT_ATTEMPTS = 5

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  async connect(url: string): Promise<void> {
    this.ws = webSocket.createWebSocket()

    this.ws.on('open', () => {
      console.info('WebSocket connected')
      this.reconnectAttempts = 0
    })

    this.ws.on('message', (data: string | ArrayBuffer) => {
      const message: Message = JSON.parse(data.toString())
      this.messageHandlers.forEach(handler => handler(message))
    })

    this.ws.on('close', () => {
      console.info('WebSocket closed')
      this.attemptReconnect(url)
    })

    this.ws.on('error', (err: Error) => {
      console.error('WebSocket error:', err)
    })

    await this.ws.connect(url)
  }

  send(message: Message): void {
    if (this.ws) {
      this.ws.send(JSON.stringify(message))
    }
  }

  onMessage(handler: (msg: Message) => void): void {
    this.messageHandlers.push(handler)
  }

  private attemptReconnect(url: string): void {
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.connect(url)
      }, 3000 * this.reconnectAttempts)
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
```

**代码示例 - 服务发现**:

```typescript
// entry/src/main/ets/services/DiscoveryService.ets
import http from '@ohos.net.http'
import { ServerInfo } from '../models/ServerInfo'

export class DiscoveryService {
  private readonly DISCOVERY_URL = 'https://www.sillymd.com/sillychat/server'

  async discoverServers(): Promise<ServerInfo[]> {
    const httpRequest = http.createHttp()

    try {
      const response = await httpRequest.request(this.DISCOVERY_URL, {
        method: http.RequestMethod.GET,
        header: { 'Content-Type': 'application/json' }
      })

      if (response.responseCode === 200) {
        const servers: ServerInfo[] = JSON.parse(response.result.toString())
        return this.measureLatency(servers)
      }
      throw new Error(`Discovery failed: ${response.responseCode}`)
    } finally {
      httpRequest.destroy()
    }
  }

  private async measureLatency(servers: ServerInfo[]): Promise<ServerInfo[]> {
    const results = await Promise.all(
      servers.map(async (server) => {
        const start = Date.now()
        try {
          const httpRequest = http.createHttp()
          await httpRequest.request(`https://${server.host}:${server.port}/ping`, {
            method: http.RequestMethod.GET
          })
          httpRequest.destroy()
          return { ...server, latency: Date.now() - start }
        } catch {
          return { ...server, latency: Infinity }
        }
      })
    )

    return results.sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity))
  }
}
```

### 3. 数据层 (Data Layer)

```
models/
├── Message.ets           # 消息模型
├── Conversation.ets      # 会话模型
├── ServerInfo.ets        # 服务器信息
└── User.ets              # 用户模型
```

**代码示例 - 数据模型**:

```typescript
// entry/src/main/ets/models/Message.ets
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export class Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: MessageType
  status: MessageStatus
  timestamp: number
  metadata?: Record<string, string>

  constructor(init?: Partial<Message>) {
    this.id = init?.id || this.generateId()
    this.conversationId = init?.conversationId || ''
    this.senderId = init?.senderId || ''
    this.content = init?.content || ''
    this.type = init?.type || MessageType.TEXT
    this.status = init?.status || MessageStatus.PENDING
    this.timestamp = init?.timestamp || Date.now()
    this.metadata = init?.metadata
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}
```

**代码示例 - 本地存储服务**:

```typescript
// entry/src/main/ets/services/StorageService.ets
import preferences from '@ohos.data.preferences'

export class StorageService {
  private static instance: StorageService
  private pref: preferences.Preferences | null = null
  private readonly STORE_NAME = 'sillychat_storage'

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  async initialize(context: Context): Promise<void> {
    this.pref = await preferences.getPreferences(context, this.STORE_NAME)
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.pref) throw new Error('Storage not initialized')
    await this.pref.put(key, value)
    await this.pref.flush()
  }

  async get(key: string): Promise<string | null> {
    if (!this.pref) throw new Error('Storage not initialized')
    return await this.pref.get(key, null)
  }

  async setObject(key: string, value: object): Promise<void> {
    await this.set(key, JSON.stringify(value))
  }

  async getObject<T>(key: string): Promise<T | null> {
    const data = await this.get(key)
    return data ? JSON.parse(data) as T : null
  }

  async remove(key: string): Promise<void> {
    if (!this.pref) throw new Error('Storage not initialized')
    await this.pref.delete(key)
    await this.pref.flush()
  }
}
```

## 数据流

### 发送消息流程

```
用户输入
    │
    ▼
ChatInput 组件
    │
    ▼
Chat 页面
    │
    ▼
MessageService.createMessage()
    │
    ▼
WebSocketService.send()
    │
    ▼
WebSocket 连接
    │
    ▼
远程服务端
```

### 接收消息流程

```
WebSocket 连接
    │
    ▼
WebSocketService.onMessage
    │
    ▼
消息处理器回调
    │
    ▼
Chat 页面更新 messageList
    │
    ▼
UI 自动刷新 (ArkUI 响应式)
    │
    ▼
ChatBubble 组件渲染
```

### 服务发现与连接流程

```
应用启动
    │
    ▼
DiscoveryService.discoverServers()
    │
    ▼
获取服务器列表 + 测速
    │
    ▼
选择最优服务器
    │
    ▼
WebSocketService.connect()
    │
    ▼
建立 WebSocket 连接
```

## 与其他平台对比

### 技术栈对比

| 特性 | HarmonyOS (ArkTS) | Android (Kotlin) | iOS (Swift) | React Native |
|------|-------------------|------------------|-------------|--------------|
| 语言 | ArkTS (TS 超集) | Kotlin | Swift | TypeScript |
| UI 框架 | ArkUI | Jetpack Compose | SwiftUI | React Native |
| 声明式 UI | 是 | 是 | 是 | 是 |
| 状态管理 | AppStorage | ViewModel | @State | Redux/MobX |
| 包体积 | 小 | 中 | 小 | 大 |
| 启动速度 | 快 | 快 | 快 | 较慢 |
| 原生能力 | 完整 | 完整 | 完整 | 需桥接 |

### 代码风格对比

**HarmonyOS (ArkTS)**:
```typescript
@Entry
@Component
struct Index {
  @State message: string = 'Hello'

  build() {
    Column() {
      Text(this.message)
        .fontSize(20)
      Button('Send')
        .onClick(() => this.send())
    }
  }
}
```

**Android (Kotlin + Compose)**:
```kotlin
@Composable
fun Index() {
  var message by remember { mutableStateOf("Hello") }

  Column {
    Text(text = message, fontSize = 20.sp)
    Button(onClick = { send() }) {
      Text("Send")
    }
  }
}
```

**iOS (Swift + SwiftUI)**:
```swift
struct Index: View {
  @State private var message = "Hello"

  var body: some View {
    VStack {
      Text(message)
        .font(.system(size: 20))
      Button("Send") {
        send()
      }
    }
  }
}
```

### 项目结构对比

| 项目文件 | HarmonyOS | Android | iOS |
|----------|-----------|---------|-----|
| 配置文件 | `app.json5` | `AndroidManifest.xml` | `Info.plist` |
| 构建配置 | `build-profile.json5` | `build.gradle.kts` | `project.pbxproj` |
| 依赖管理 | `oh-package.json5` | `build.gradle.kts` | `Package.swift` |
| 入口 | `EntryAbility.ets` | `MainActivity.kt` | `App.swift` |
| 资源目录 | `resources/` | `res/` | `Assets.xcassets/` |

## 开发环境要求

### 系统要求
- **操作系统**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **内存**: 8GB+ (推荐 16GB)
- **磁盘空间**: 10GB+

### 工具安装

1. **安装 DevEco Studio** (鸿蒙官方 IDE)
   - 下载地址: https://developer.harmonyos.com/cn/develop/deveco-studio

2. **配置 SDK**
   ```
   Settings -> SDK Manager -> 安装 HarmonyOS SDK
   ```

3. **配置模拟器或真机**
   - 模拟器: Tools -> Device Manager -> 创建本地模拟器
   - 真机: 开启开发者模式，启用 USB 调试

## 构建与运行

### 命令行构建

```bash
# 进入项目目录
cd apps/harmonyos

# 安装依赖
ohpm install

# 编译项目
hvigor assemble

# 运行到模拟器/真机
hvigor install
```

### DevEco Studio 构建

1. 打开项目: `File -> Open -> apps/harmonyos/`
2. 同步项目: 点击 `Sync` 按钮
3. 运行: 点击 `Run` 按钮或按 `Shift+F10`

## 调试

### 日志查看
```typescript
// 使用 hilog
import hilog from '@ohos.hilog'

hilog.info(0x0000, 'SillyChat', 'Message sent: %{public}s', messageId)
hilog.error(0x0000, 'SillyChat', 'Connection failed: %{public}s', error.message)
```

### DevEco Studio 调试功能
- 断点调试
- 变量查看
- 性能分析 (CPU/内存)
- 网络抓包

## 发布

### 打包 HAP

```bash
# 构建发布版本
hvigor assembleRelease

# 输出位置
entry/build/default/outputs/default/entry-default-signed.hap
```

### 应用上架
1. 注册华为开发者账号
2. 申请应用发布证书
3. 在 AppGallery Connect 创建应用
4. 上传 HAP 包
5. 提交审核

## 相关文档

- [系统架构总览](./overview.md)
- [目录结构说明](./directory-structure.md)
- [HarmonyOS 官方文档](https://developer.harmonyos.com/cn/documentation)
- [ArkTS 语言指南](https://developer.harmonyos.com/cn/docs/documentation/doc-guides-V3/arkts-get-started-0000001504769321-V3)
