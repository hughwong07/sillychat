# SillyChat Android 示例

这是一个展示如何使用 SillyChat Android SDK 的示例项目。

## 功能演示

- 创建和管理 AI 代理
- 进行对话
- 文件上传
- 生物识别认证
- 离线支持

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-org/SillyChat.git
cd SillyChat/examples/android-sample
```

### 2. 配置

在 `local.properties` 中添加：

```properties
sdk.dir=/path/to/android/sdk
SILLYCHAT_API_KEY=your-api-key
```

### 3. 运行

```bash
./gradlew installDebug
```

## 代码示例

### 初始化 SDK

```kotlin
class MyApplication : Application() {
    lateinit var sillyChat: SillyChat

    override fun onCreate() {
        super.onCreate()
        sillyChat = SillyChat.Builder(this)
            .setApiKey(BuildConfig.SILLYCHAT_API_KEY)
            .build()
    }
}
```

### 创建代理

```kotlin
val agent = sillyChat.agentManager.createAgent(
    AgentConfig(
        id = "assistant-1",
        identity = AgentIdentity(
            name = "AI助手",
            role = AgentRole.ASSISTANT
        ),
        modelConfig = ModelConfig(
            provider = ModelProvider.ANTHROPIC,
            model = "claude-3-5-sonnet"
        )
    )
)
```

### 发送消息

```kotlin
viewModelScope.launch {
    val message = sillyChat.messageManager.sendMessage(
        conversationId = conversationId,
        content = "你好！"
    )
}
```

## 项目结构

```
app/src/main/java/com/example/sillychatsample/
├── MainActivity.kt
├── ui/
│   ├── chat/
│   ├── agents/
│   └── settings/
├── viewmodel/
└── data/
```

## 截图

![聊天界面](screenshots/chat.png)
![代理列表](screenshots/agents.png)

## 更多

- [Android API 文档](../../docs/api/android.md)
- [完整教程](../../docs/tutorials/01-first-app.md)
