package com.sillychat.app.data.local.dao

import androidx.paging.PagingSource
import androidx.room.*
import com.sillychat.app.data.model.Message
import com.sillychat.app.data.model.SyncStatus
import kotlinx.coroutines.flow.Flow

/**
 * 消息数据访问对象
 * 提供优化的数据库查询方法，支持分页和流式数据
 */
@Dao
interface MessageDao {

    /**
     * 根据会话ID获取消息（分页）
     * 使用PagingSource实现高效分页加载
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
        ORDER BY timestamp DESC
    """)
    fun getMessagesByConversationPaged(conversationId: String): PagingSource<Int, Message>

    /**
     * 根据会话ID获取消息（Flow）
     * 实时监听消息变化
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
        ORDER BY timestamp ASC
    """)
    fun getMessagesByConversationFlow(conversationId: String): Flow<List<Message>>

    /**
     * 根据会话ID获取消息（一次性）
     * 限制返回数量，避免内存溢出
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
        ORDER BY timestamp DESC
        LIMIT :limit
    """)
    suspend fun getMessagesByConversation(
        conversationId: String,
        limit: Int = 100
    ): List<Message>

    /**
     * 分页加载历史消息
     * 使用索引优化查询性能
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
        AND timestamp < :before
        ORDER BY timestamp DESC
        LIMIT :limit
    """)
    suspend fun getMessagesBefore(
        conversationId: String,
        before: Long,
        limit: Int = 20
    ): List<Message>

    /**
     * 获取单条消息
     */
    @Query("SELECT * FROM messages WHERE id = :messageId LIMIT 1")
    suspend fun getMessageById(messageId: String): Message?

    /**
     * 插入消息
     * 使用REPLACE策略处理冲突
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: Message)

    /**
     * 批量插入消息
     * 使用事务确保原子性
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<Message>)

    /**
     * 更新消息
     */
    @Update
    suspend fun updateMessage(message: Message)

    /**
     * 软删除消息
     */
    @Query("UPDATE messages SET isDeleted = 1 WHERE id = :messageId")
    suspend fun softDeleteMessage(messageId: String)

    /**
     * 硬删除消息
     */
    @Query("DELETE FROM messages WHERE id = :messageId")
    suspend fun deleteMessage(messageId: String)

    /**
     * 删除会话的所有消息
     */
    @Query("DELETE FROM messages WHERE conversationId = :conversationId")
    suspend fun deleteMessagesByConversation(conversationId: String)

    /**
     * 获取待同步的消息
     * 使用索引优化查询
     */
    @Query("""
        SELECT * FROM messages
        WHERE syncStatus = :status
        ORDER BY timestamp ASC
        LIMIT :limit
    """)
    suspend fun getMessagesBySyncStatus(
        status: SyncStatus,
        limit: Int = 50
    ): List<Message>

    /**
     * 更新消息同步状态
     */
    @Query("UPDATE messages SET syncStatus = :status WHERE id = :messageId")
    suspend fun updateSyncStatus(messageId: String, status: SyncStatus)

    /**
     * 搜索消息
     * 使用FTS或LIKE查询，限制返回数量
     */
    @Query("""
        SELECT * FROM messages
        WHERE content LIKE '%' || :query || '%'
        AND isDeleted = 0
        ORDER BY timestamp DESC
        LIMIT :limit
    """)
    suspend fun searchMessages(query: String, limit: Int = 50): List<Message>

    /**
     * 获取会话消息数量
     */
    @Query("""
        SELECT COUNT(*) FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
    """)
    suspend fun getMessageCount(conversationId: String): Int

    /**
     * 获取最新消息
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
        ORDER BY timestamp DESC
        LIMIT 1
    """)
    suspend fun getLatestMessage(conversationId: String): Message?

    /**
     * 清理旧消息
     * 保留最近N条，用于性能优化
     */
    @Query("""
        DELETE FROM messages
        WHERE conversationId = :conversationId
        AND id NOT IN (
            SELECT id FROM messages
            WHERE conversationId = :conversationId
            ORDER BY timestamp DESC
            LIMIT :keepCount
        )
    """)
    suspend fun cleanupOldMessages(conversationId: String, keepCount: Int = 1000)

    /**
     * 批量更新消息状态
     * 使用事务确保原子性
     */
    @Transaction
    suspend fun updateMessagesStatus(messageIds: List<String>, status: SyncStatus) {
        messageIds.forEach { id ->
            updateSyncStatus(id, status)
        }
    }

    /**
     * 获取所有会话的最新消息
     * 用于会话列表展示
     */
    @Query("""
        SELECT m.* FROM messages m
        INNER JOIN (
            SELECT conversationId, MAX(timestamp) as maxTime
            FROM messages
            WHERE isDeleted = 0
            GROUP BY conversationId
        ) latest ON m.conversationId = latest.conversationId
        AND m.timestamp = latest.maxTime
        ORDER BY m.timestamp DESC
    """)
    fun getLatestMessagesForConversations(): Flow<List<Message>>
}
