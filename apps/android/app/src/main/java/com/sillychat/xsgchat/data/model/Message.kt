package com.sillychat.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Index
import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * 消息数据模型
 * 与桌面端兼容的数据结构
 */
@Entity(
    tableName = "messages",
    indices = [
        Index(value = ["conversationId"]),
        Index(value = ["timestamp"]),
        Index(value = ["syncStatus"])
    ]
)
@Serializable
data class Message(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),

    /**
     * 会话ID，用于区分不同对话
     */
    val conversationId: String = "default",

    /**
     * 消息内容
     */
    val content: String,

    /**
     * 消息角色：user(用户) / assistant(助手) / system(系统)
     */
    val role: MessageRole,

    /**
     * 发送者ID（如果是代理消息）
     */
    val senderId: String? = null,

    /**
     * 发送者名称
     */
    val senderName: String? = null,

    /**
     * 时间戳（毫秒）
     */
    val timestamp: Long = System.currentTimeMillis(),

    /**
     * 消息类型：text(文本) / image(图片) / file(文件) / audio(音频)
     */
    val messageType: MessageType = MessageType.TEXT,

    /**
     * 附件列表（JSON字符串）
     */
    val attachments: String? = null,

    /**
     * 引用消息ID
     */
    val replyTo: String? = null,

    /**
     * 同步状态：pending(待同步) / synced(已同步) / failed(失败)
     */
    val syncStatus: SyncStatus = SyncStatus.PENDING,

    /**
     * 是否已删除（软删除）
     */
    val isDeleted: Boolean = false,

    /**
     * 额外元数据（JSON字符串）
     */
    val metadata: String? = null
) {
    /**
     * 检查消息是否来自用户
     */
    fun isFromUser(): Boolean = role == MessageRole.USER

    /**
     * 检查消息是否来自助手
     */
    fun isFromAssistant(): Boolean = role == MessageRole.ASSISTANT

    /**
     * 检查消息是否为系统消息
     */
    fun isSystemMessage(): Boolean = role == MessageRole.SYSTEM

    companion object {
        /**
         * 创建用户消息
         */
        fun createUserMessage(
            content: String,
            conversationId: String = "default",
            attachments: List<Attachment>? = null
        ): Message = Message(
            id = UUID.randomUUID().toString(),
            conversationId = conversationId,
            content = content,
            role = MessageRole.USER,
            messageType = MessageType.TEXT,
            attachments = attachments?.let { Attachment.toJson(it) }
        )

        /**
         * 创建助手消息
         */
        fun createAssistantMessage(
            content: String,
            agentId: String,
            agentName: String,
            conversationId: String = "default"
        ): Message = Message(
            id = UUID.randomUUID().toString(),
            conversationId = conversationId,
            content = content,
            role = MessageRole.ASSISTANT,
            senderId = agentId,
            senderName = agentName,
            messageType = MessageType.TEXT
        )

        /**
         * 创建系统消息
         */
        fun createSystemMessage(
            content: String,
            conversationId: String = "default"
        ): Message = Message(
            id = UUID.randomUUID().toString(),
            conversationId = conversationId,
            content = content,
            role = MessageRole.SYSTEM,
            messageType = MessageType.TEXT
        )
    }
}

/**
 * 消息角色枚举
 */
enum class MessageRole {
    USER,       // 用户
    ASSISTANT,  // 助手
    SYSTEM      // 系统
}

/**
 * 消息类型枚举
 */
enum class MessageType {
    TEXT,   // 文本
    IMAGE,  // 图片
    FILE,   // 文件
    AUDIO,  // 音频
    VIDEO   // 视频
}

/**
 * 同步状态枚举
 */
enum class SyncStatus {
    PENDING,    // 待同步
    SYNCED,     // 已同步
    FAILED,     // 同步失败
    SYNCING     // 同步中
}

/**
 * 附件数据类
 */
@Serializable
data class Attachment(
    val id: String = UUID.randomUUID().toString(),
    val fileName: String,
    val fileType: String,
    val fileSize: Long,
    val localPath: String? = null,
    val remoteUrl: String? = null,
    val uploadStatus: UploadStatus = UploadStatus.PENDING
) {
    companion object {
        fun toJson(attachments: List<Attachment>): String {
            return kotlinx.serialization.json.Json.encodeToString(
                kotlinx.serialization.builtins.ListSerializer(serializer()),
                attachments
            )
        }

        fun fromJson(json: String): List<Attachment> {
            return kotlinx.serialization.json.Json.decodeFromString(
                kotlinx.serialization.builtins.ListSerializer(serializer()),
                json
            )
        }
    }
}

/**
 * 上传状态枚举
 */
enum class UploadStatus {
    PENDING,    // 待上传
    UPLOADING,  // 上传中
    COMPLETED,  // 上传完成
    FAILED      // 上传失败
}

/**
 * 消息列表状态封装
 * 用于UI层状态管理
 */
data class MessageListState(
    val messages: List<Message> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val hasMore: Boolean = true,
    val lastSyncTime: Long? = null
)

/**
 * 消息发送状态
 */
sealed class SendMessageState {
    data object Idle : SendMessageState()
    data object Sending : SendMessageState()
    data class Success(val message: Message) : SendMessageState()
    data class Error(val error: String) : SendMessageState()
}
