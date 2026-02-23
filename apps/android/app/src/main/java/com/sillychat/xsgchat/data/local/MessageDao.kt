package com.sillychat.app.data.local

import androidx.room.*
import com.sillychat.app.data.model.Message
import com.sillychat.app.data.model.SyncStatus
import kotlinx.coroutines.flow.Flow

/**
 * 消息数据访问对象
 */
@Dao
interface MessageDao {

    /**
     * 插入单条消息
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: Message)

    /**
     * 插入多条消息
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(messages: List<Message>)

    /**
     * 更新消息
     */
    @Update
    suspend fun update(message: Message)

    /**
     * 删除消息
     */
    @Delete
    suspend fun delete(message: Message)

    /**
     * 根据ID删除消息
     */
    @Query("DELETE FROM messages WHERE id = :messageId")
    suspend fun deleteById(messageId: String)

    /**
     * 根据会话ID删除所有消息
     */
    @Query("DELETE FROM messages WHERE conversationId = :conversationId")
    suspend fun deleteByConversation(conversationId: String)

    /**
     * 软删除消息
     */
    @Query("UPDATE messages SET isDeleted = 1 WHERE id = :messageId")
    suspend fun softDelete(messageId: String)

    /**
     * 根据ID获取消息
     */
    @Query("SELECT * FROM messages WHERE id = :messageId LIMIT 1")
    suspend fun getById(messageId: String): Message?

    /**
     * 获取会话中的所有消息（按时间升序）
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
        ORDER BY timestamp ASC
    """)
    fun getByConversation(conversationId: String): Flow<List<Message>>

    /**
     * 获取会话中的消息（分页，按时间降序）
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
        ORDER BY timestamp DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getByConversationPaged(
        conversationId: String,
        limit: Int,
        offset: Int
    ): List<Message>

    /**
     * 获取最近的消息（按时间降序）
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
        ORDER BY timestamp DESC
        LIMIT :limit
    """)
    suspend fun getRecentMessages(conversationId: String, limit: Int): List<Message>

    /**
     * 搜索消息内容
     */
    @Query("""
        SELECT * FROM messages
        WHERE content LIKE '%' || :query || '%'
        AND isDeleted = 0
        ORDER BY timestamp DESC
    """)
    fun searchMessages(query: String): Flow<List<Message>>

    /**
     * 获取待同步的消息
     */
    @Query("""
        SELECT * FROM messages
        WHERE syncStatus = :status
        ORDER BY timestamp ASC
    """)
    suspend fun getBySyncStatus(status: SyncStatus): List<Message>

    /**
     * 获取待同步的消息流
     */
    @Query("""
        SELECT * FROM messages
        WHERE syncStatus = :status
        ORDER BY timestamp ASC
    """)
    fun getBySyncStatusFlow(status: SyncStatus): Flow<List<Message>>

    /**
     * 更新同步状态
     */
    @Query("UPDATE messages SET syncStatus = :status WHERE id = :messageId")
    suspend fun updateSyncStatus(messageId: String, status: SyncStatus)

    /**
     * 批量更新同步状态
     */
    @Query("UPDATE messages SET syncStatus = :status WHERE id IN (:messageIds)")
    suspend fun updateSyncStatusBatch(messageIds: List<String>, status: SyncStatus)

    /**
     * 获取会话中的消息数量
     */
    @Query("""
        SELECT COUNT(*) FROM messages
        WHERE conversationId = :conversationId
        AND isDeleted = 0
    """)
    suspend fun getMessageCount(conversationId: String): Int

    /**
     * 获取所有会话的最新消息
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
    fun getLatestMessagesByConversation(): Flow<List<Message>>

    /**
     * 删除所有消息（清空数据库）
     */
    @Query("DELETE FROM messages")
    suspend fun deleteAll()

    /**
     * 清理已删除的消息（物理删除）
     */
    @Query("DELETE FROM messages WHERE isDeleted = 1")
    suspend fun cleanupDeletedMessages()

    /**
     * 获取消息总数
     */
    @Query("SELECT COUNT(*) FROM messages WHERE isDeleted = 0")
    suspend fun getTotalCount(): Int
}