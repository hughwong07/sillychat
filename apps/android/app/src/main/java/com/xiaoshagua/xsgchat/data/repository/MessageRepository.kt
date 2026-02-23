package com.xiaoshagua.xsgchat.data.repository

import com.xiaoshagua.xsgchat.data.local.MessageDao
import com.xiaoshagua.xsgchat.data.model.*
import com.xiaoshagua.xsgchat.data.remote.ApiService
import com.xiaoshagua.xsgchat.data.remote.SendMessageRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.withContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 消息仓库
 * 负责消息的本地存储和远程同步
 */
@Singleton
class MessageRepository @Inject constructor(
    private val messageDao: MessageDao,
    private val apiService: ApiService
) {
    /**
     * 获取会话消息流
     */
    fun getMessages(conversationId: String): Flow<List<Message>> {
        return messageDao.getByConversation(conversationId)
            .map { messages ->
                // 过滤掉已删除的消息并按时间排序
                messages.filter { !it.isDeleted }
            }
            .flowOn(Dispatchers.IO)
    }

    /**
     * 获取最近消息
     */
    suspend fun getRecentMessages(conversationId: String, limit: Int = 50): List<Message> {
        return withContext(Dispatchers.IO) {
            messageDao.getRecentMessages(conversationId, limit)
                .sortedBy { it.timestamp }
        }
    }

    /**
     * 发送消息
     */
    suspend fun sendMessage(
        content: String,
        conversationId: String = "default",
        agentId: String? = null,
        attachments: List<Attachment>? = null
    ): Result<Message> {
        return withContext(Dispatchers.IO) {
            try {
                // 创建用户消息
                val userMessage = Message.createUserMessage(
                    content = content,
                    conversationId = conversationId,
                    attachments = attachments
                )

                // 保存到本地
                messageDao.insert(userMessage)

                // 发送到服务器
                val request = SendMessageRequest(
                    content = content,
                    conversationId = conversationId,
                    agentId = agentId,
                    attachments = attachments?.map {
                        com.xiaoshagua.xsgchat.data.remote.AttachmentInfo(
                            fileName = it.fileName,
                            fileType = it.fileType,
                            fileSize = it.fileSize,
                            url = it.remoteUrl
                        )
                    }
                )

                val result = apiService.sendMessage(request)

                result.fold(
                    onSuccess = { response ->
                        // 创建助手消息
                        val assistantMessage = Message(
                            id = response.messageId,
                            conversationId = conversationId,
                            content = response.content,
                            role = MessageRole.ASSISTANT,
                            senderId = response.agentId,
                            timestamp = response.timestamp,
                            syncStatus = SyncStatus.SYNCED
                        )

                        // 更新用户消息同步状态
                        messageDao.updateSyncStatus(userMessage.id, SyncStatus.SYNCED)

                        // 保存助手消息
                        messageDao.insert(assistantMessage)

                        Result.success(assistantMessage)
                    },
                    onFailure = { error ->
                        // 标记用户消息同步失败
                        messageDao.updateSyncStatus(userMessage.id, SyncStatus.FAILED)
                        Result.failure(error)
                    }
                )
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * 流式发送消息
     */
    fun sendMessageStream(
        content: String,
        conversationId: String = "default",
        agentId: String? = null
    ): Flow<StreamState> = flow {
        emit(StreamState.Sending)

        try {
            // 创建并保存用户消息
            val userMessage = Message.createUserMessage(
                content = content,
                conversationId = conversationId
            )
            messageDao.insert(userMessage)

            emit(StreamState.UserMessageSent(userMessage))

            // 创建占位符助手消息
            val assistantMessageId = UUID.randomUUID().toString()
            var assistantContent = ""

            // 流式接收响应
            val request = SendMessageRequest(
                content = content,
                conversationId = conversationId,
                agentId = agentId
            )

            apiService.sendMessageStream(request).collect { chunk ->
                if (chunk.error != null) {
                    emit(StreamState.Error(chunk.error))
                    return@collect
                }

                assistantContent += chunk.content
                emit(StreamState.Chunk(chunk.content, assistantContent))

                if (chunk.isDone) {
                    // 保存完整的助手消息
                    val assistantMessage = Message(
                        id = assistantMessageId,
                        conversationId = conversationId,
                        content = assistantContent,
                        role = MessageRole.ASSISTANT,
                        senderId = agentId,
                        syncStatus = SyncStatus.SYNCED
                    )
                    messageDao.insert(assistantMessage)
                    messageDao.updateSyncStatus(userMessage.id, SyncStatus.SYNCED)

                    emit(StreamState.Completed(assistantMessage))
                }
            }
        } catch (e: Exception) {
            emit(StreamState.Error(e.message ?: "发送失败"))
        }
    }.flowOn(Dispatchers.IO)

    /**
     * 删除消息
     */
    suspend fun deleteMessage(messageId: String, softDelete: Boolean = true) {
        withContext(Dispatchers.IO) {
            if (softDelete) {
                messageDao.softDelete(messageId)
            } else {
                messageDao.deleteById(messageId)
            }
        }
    }

    /**
     * 搜索消息
     */
    fun searchMessages(query: String): Flow<List<Message>> {
        return messageDao.searchMessages(query)
            .map { it.filter { msg -> !msg.isDeleted } }
            .flowOn(Dispatchers.IO)
    }

    /**
     * 同步待同步的消息
     */
    suspend fun syncPendingMessages(): Result<SyncResult> {
        return withContext(Dispatchers.IO) {
            try {
                val pendingMessages = messageDao.getBySyncStatus(SyncStatus.PENDING)

                if (pendingMessages.isEmpty()) {
                    return@withContext Result.success(SyncResult(0, 0, emptyList()))
                }

                // 更新为同步中状态
                pendingMessages.forEach {
                    messageDao.updateSyncStatus(it.id, SyncStatus.SYNCING)
                }

                val result = apiService.syncMessages(pendingMessages)

                result.fold(
                    onSuccess = { response ->
                        // 更新已同步的消息
                        response.syncedIds.forEach { id ->
                            messageDao.updateSyncStatus(id, SyncStatus.SYNCED)
                        }

                        // 更新失败的消息
                        response.failedIds.forEach { id ->
                            messageDao.updateSyncStatus(id, SyncStatus.FAILED)
                        }

                        // 保存服务器返回的新消息
                        response.serverMessages.forEach { msg ->
                            messageDao.insert(msg)
                        }

                        Result.success(
                            SyncResult(
                                syncedCount = response.syncedIds.size,
                                failedCount = response.failedIds.size,
                                serverMessages = response.serverMessages
                            )
                        )
                    },
                    onFailure = { error ->
                        // 恢复为待同步状态
                        pendingMessages.forEach {
                            messageDao.updateSyncStatus(it.id, SyncStatus.PENDING)
                        }
                        Result.failure(error)
                    }
                )
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * 获取待同步消息数量
     */
    fun getPendingSyncMessages(): Flow<List<Message>> {
        return messageDao.getBySyncStatusFlow(SyncStatus.PENDING)
    }

    /**
     * 清空会话消息
     */
    suspend fun clearConversation(conversationId: String) {
        withContext(Dispatchers.IO) {
            messageDao.deleteByConversation(conversationId)
        }
    }

    /**
     * 获取消息数量
     */
    suspend fun getMessageCount(conversationId: String): Int {
        return withContext(Dispatchers.IO) {
            messageDao.getMessageCount(conversationId)
        }
    }
}

/**
 * 流式发送状态
 */
sealed class StreamState {
    data object Sending : StreamState()
    data class UserMessageSent(val message: Message) : StreamState()
    data class Chunk(val content: String, val fullContent: String) : StreamState()
    data class Completed(val message: Message) : StreamState()
    data class Error(val error: String) : StreamState()
}

/**
 * 同步结果
 */
data class SyncResult(
    val syncedCount: Int,
    val failedCount: Int,
    val serverMessages: List<Message>
)
