# Android API 文档

SillyChat Android SDK API 文档。

## 快速开始

### 添加依赖

```kotlin
// build.gradle.kts
dependencies {
    implementation("com.sillychat:sdk:1.0.0")

    // 可选模块
    implementation("com.sillychat:sdk-biometric:1.0.0")
    implementation("com.sillychat:sdk-storage:1.0.0")
}
```

### 初始化 SDK

```kotlin
import com.sillychat.sdk.SillyChat
import com.sillychat.sdk.Config

class MyApplication : Application() {
    lateinit var sillyChat: SillyChat
        private set

    override fun onCreate() {
        super.onCreate()

        sillyChat = SillyChat.Builder(this)
            .setConfig(
                Config.Builder()
                    .setApiKey("your-api-key")
                    .setBaseUrl("https://api.sillychat.io")
                    .setDatabaseName("sillychat.db")
                    .setEnableEncryption(true)
                    .build()
            )
            .build()
    }
}

// 使用
val sillyChat = (application as MyApplication).sillyChat
```

## 核心 API

### SillyChat

主入口类，提供所有功能的访问。

```kotlin
class SillyChat {
    // 代理管理
    val agentManager: AgentManager

    // 对话管理
    val conversationManager: ConversationManager

    // 消息管理
    val messageManager: MessageManager

    // 存储管理
    val storageManager: StorageManager

    // 用户管理
    val userManager: UserManager

    // 认证
    val auth: Auth

    // 网关客户端
    val gatewayClient: GatewayClient

    // 生命周期
    fun initialize(): CompletableFuture<Void>
    fun shutdown(): CompletableFuture<Void>
}
```

### AgentManager

```kotlin
interface AgentManager {
    // 创建代理
    suspend fun createAgent(config: AgentConfig): Agent

    // 获取代理
    suspend fun getAgent(id: String): Agent?

    // 更新代理
    suspend fun updateAgent(id: String, config: AgentConfig): Agent

    // 删除代理
    suspend fun deleteAgent(id: String): Boolean

    // 列出代理
    suspend fun listAgents(filter: AgentFilter? = null): List<Agent>

    // 获取默认代理
    suspend fun getDefaultAgent(): Agent?

    // 设置默认代理
    suspend fun setDefaultAgent(id: String)

    // 监听变化
    fun observeAgents(): Flow<List<Agent>>
    fun observeAgent(id: String): Flow<Agent?>
}
```

#### 使用示例

```kotlin
// 创建代理
val agent = sillyChat.agentManager.createAgent(
    AgentConfig(
        id = "assistant-1",
        identity = AgentIdentity(
            name = "AI助手",
            role = AgentRole.ASSISTANT,
            avatar = "https://...",
            description = "一个有帮助的AI助手"
        ),
        modelConfig = ModelConfig(
            provider = ModelProvider.ANTHROPIC,
            model = "claude-3-5-sonnet",
            apiKey = BuildConfig.ANTHROPIC_API_KEY
        )
    )
)

// 观察代理列表
lifecycleScope.launch {
    sillyChat.agentManager.observeAgents()
        .collect { agents ->
            adapter.submitList(agents)
        }
}
```

### ConversationManager

```kotlin
interface ConversationManager {
    // 创建对话
    suspend fun createConversation(
        agentId: String,
        title: String? = null
    ): Conversation

    // 获取对话
    suspend fun getConversation(id: String): Conversation?

    // 删除对话
    suspend fun deleteConversation(id: String): Boolean

    // 列出对话
    suspend fun listConversations(
        agentId: String? = null,
        limit: Int = 20,
        offset: Int = 0
    ): List<Conversation>

    // 搜索对话
    suspend fun searchConversations(query: String): List<Conversation>

    // 监听变化
    fun observeConversations(agentId: String? = null): Flow<List<Conversation>>
}
```

### MessageManager

```kotlin
interface MessageManager {
    // 发送消息
    suspend fun sendMessage(
        conversationId: String,
        content: String,
        attachments: List<Attachment>? = null
    ): Message

    // 发送流式消息
    suspend fun sendMessageStream(
        conversationId: String,
        content: String
    ): Flow<StreamChunk>

    // 获取消息
    suspend fun getMessages(
        conversationId: String,
        before: Long? = null,
        limit: Int = 50
    ): List<Message>

    // 删除消息
    suspend fun deleteMessage(id: String): Boolean

    // 监听新消息
    fun observeMessages(conversationId: String): Flow<List<Message>>
}
```

#### 使用示例

```kotlin
// 发送普通消息
val message = sillyChat.messageManager.sendMessage(
    conversationId = "conv-1",
    content = "你好！"
)

// 发送流式消息
lifecycleScope.launch {
    sillyChat.messageManager.sendMessageStream("conv-1", "写一首诗")
        .collect { chunk ->
            when (chunk) {
                is StreamChunk.Content -> appendText(chunk.text)
                is StreamChunk.Done -> showComplete()
                is StreamChunk.Error -> showError(chunk.error)
            }
        }
}

// 监听消息
lifecycleScope.launch {
    sillyChat.messageManager.observeMessages("conv-1")
        .collect { messages ->
            messageAdapter.submitList(messages)
            recyclerView.scrollToPosition(messages.size - 1)
        }
}
```

## 数据模型

### Agent

```kotlin
data class Agent(
    val id: String,
    val identity: AgentIdentity,
    val modelConfig: ModelConfig,
    val capabilities: AgentCapabilities,
    val status: AgentStatus,
    val createdAt: Long,
    val updatedAt: Long
)

data class AgentIdentity(
    val name: String,
    val role: AgentRole,
    val avatar: String?,
    val description: String?,
    val welcomeMessage: String?
)

enum class AgentRole {
    MASTER,
    ASSISTANT,
    EXPERT,
    GUEST
}

enum class AgentStatus {
    IDLE,
    CONNECTING,
    READY,
    BUSY,
    ERROR,
    DISABLED
}
```

### Conversation

```kotlin
data class Conversation(
    val id: String,
    val title: String,
    val agentId: String,
    val messageCount: Int,
    val createdAt: Long,
    val updatedAt: Long
)
```

### Message

```kotlin
data class Message(
    val id: String,
    val conversationId: String,
    val role: MessageRole,
    val content: String,
    val senderId: String,
    val attachments: List<Attachment>?,
    val createdAt: Long
)

enum class MessageRole {
    USER,
    ASSISTANT,
    SYSTEM
}

data class Attachment(
    val id: String,
    val type: AttachmentType,
    val url: String,
    val name: String,
    val size: Long
)
```

## UI 组件

### ChatView

```kotlin
<com.sillychat.sdk.ui.ChatView
    android:id="@+id/chatView"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:agentId="assistant-1"
    app:showInput="true"
    app:enableAttachments="true" />
```

```kotlin
// 代码中使用
val chatView = findViewById<ChatView>(R.id.chatView)

chatView.setup(
    agentId = "assistant-1",
    conversationId = "conv-1"
)

chatView.setOnMessageSendListener { content, attachments ->
    viewModel.sendMessage(content, attachments)
}
```

### AgentSelector

```kotlin
val agentSelector = AgentSelector(context)
agentSelector.setAgents(agents)
agentSelector.setOnAgentSelectedListener { agent ->
    // 切换代理
}
```

## 生物识别认证

```kotlin
import com.sillychat.sdk.biometric.BiometricManager

val biometricManager = BiometricManager(context)

// 检查可用性
when (biometricManager.canAuthenticate()) {
    BiometricStatus.AVAILABLE -> {
        // 启用生物识别
        biometricManager.authenticate(
            title = "验证身份",
            subtitle = "使用生物识别解锁应用",
            onSuccess = { /* 验证成功 */ },
            onError = { error -> /* 处理错误 */ }
        )
    }
    BiometricStatus.NO_HARDWARE -> {
        // 设备不支持
    }
    BiometricStatus.NONE_ENROLLED -> {
        // 未录入生物识别数据
    }
}
```

## 安全存储

```kotlin
import com.sillychat.sdk.storage.SecureStorage

val secureStorage = SecureStorage(context)

// 存储敏感数据
secureStorage.setString("api_key", "secret-key")
secureStorage.setBoolean("biometric_enabled", true)

// 读取
val apiKey = secureStorage.getString("api_key")
```

## 后台同步

```kotlin
import com.sillychat.sdk.sync.SyncManager

val syncManager = SyncManager(context)

// 配置同步
syncManager.configure(
    SyncConfig(
        intervalMinutes = 15,
        requireWifi = true,
        requireCharging = false
    )
)

// 手动触发同步
syncManager.syncNow()

// 监听同步状态
syncManager.observeSyncState()
    .collect { state ->
        when (state) {
            is SyncState.Syncing -> showSyncIndicator()
            is SyncState.Completed -> hideSyncIndicator()
            is SyncState.Error -> showError(state.error)
        }
    }
```

## 推送通知

```kotlin
import com.sillychat.sdk.push.PushManager

val pushManager = PushManager(context)

// 注册设备
pushManager.register()

// 处理消息通知
pushManager.setMessageHandler { message ->
    notificationManager.showMessageNotification(message)
}

// 取消注册
pushManager.unregister()
```

## 错误处理

```kotlin
try {
    val agent = sillyChat.agentManager.createAgent(config)
} catch (e: AgentException) {
    when (e.code) {
        AgentErrorCode.INVALID_CONFIG -> showError("配置无效")
        AgentErrorCode.MODEL_ERROR -> showError("模型错误")
        AgentErrorCode.NETWORK_ERROR -> showError("网络错误")
        else -> showError("未知错误")
    }
} catch (e: NetworkException) {
    showError("网络连接失败")
} catch (e: StorageException) {
    showError("存储错误")
}
```

## 最佳实践

### 1. 生命周期管理

```kotlin
class ChatActivity : AppCompatActivity() {
    private lateinit var sillyChat: SillyChat

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sillyChat = (application as MyApplication).sillyChat
    }

    override fun onDestroy() {
        super.onDestroy()
        // 清理资源
        sillyChat.messageManager.cancelPending()
    }
}
```

### 2. 协程使用

```kotlin
class ChatViewModel : ViewModel() {
    private val scope = CoroutineScope(Dispatchers.Main + Job())

    fun sendMessage(content: String) {
        scope.launch {
            try {
                _uiState.value = UiState.Loading
                val message = sillyChat.messageManager.sendMessage(convId, content)
                _uiState.value = UiState.Success(message)
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        scope.cancel()
    }
}
```

### 3. 数据观察

```kotlin
// 使用 Flow 观察数据变化
viewModelScope.launch {
    sillyChat.messageManager.observeMessages(conversationId)
        .flowOn(Dispatchers.IO)
        .catch { e -> handleError(e) }
        .collect { messages ->
            _messages.value = messages
        }
}
```

---

*更多示例请参考 [Android 示例项目](../../examples/android-sample/)*
