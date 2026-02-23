package com.xiaoshagua.xsgchat.data.local

import androidx.room.*
import com.xiaoshagua.xsgchat.data.model.Agent
import com.xiaoshagua.xsgchat.data.model.AgentCategory
import kotlinx.coroutines.flow.Flow

/**
 * 代理数据访问对象
 */
@Dao
interface AgentDao {

    /**
     * 插入代理
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(agent: Agent)

    /**
     * 插入多个代理
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(agents: List<Agent>)

    /**
     * 更新代理
     */
    @Update
    suspend fun update(agent: Agent)

    /**
     * 删除代理
     */
    @Delete
    suspend fun delete(agent: Agent)

    /**
     * 根据ID删除代理
     */
    @Query("DELETE FROM agents WHERE id = :agentId")
    suspend fun deleteById(agentId: String)

    /**
     * 根据ID获取代理
     */
    @Query("SELECT * FROM agents WHERE id = :agentId LIMIT 1")
    suspend fun getById(agentId: String): Agent?

    /**
     * 根据ID获取代理流
     */
    @Query("SELECT * FROM agents WHERE id = :agentId LIMIT 1")
    fun getByIdFlow(agentId: String): Flow<Agent?>

    /**
     * 获取所有代理（按排序顺序）
     */
    @Query("SELECT * FROM agents ORDER BY sortOrder ASC, createdAt DESC")
    fun getAll(): Flow<List<Agent>>

    /**
     * 获取所有激活的代理
     */
    @Query("SELECT * FROM agents WHERE isActive = 1 ORDER BY sortOrder ASC")
    fun getActiveAgents(): Flow<List<Agent>>

    /**
     * 获取默认代理
     */
    @Query("SELECT * FROM agents WHERE isDefault = 1 LIMIT 1")
    suspend fun getDefaultAgent(): Agent?

    /**
     * 根据类别获取代理
     */
    @Query("SELECT * FROM agents WHERE category = :category ORDER BY sortOrder ASC")
    fun getByCategory(category: AgentCategory): Flow<List<Agent>>

    /**
     * 搜索代理
     */
    @Query("""
        SELECT * FROM agents
        WHERE name LIKE '%' || :query || '%'
        OR role LIKE '%' || :query || '%'
        OR description LIKE '%' || :query || '%'
        ORDER BY sortOrder ASC
    """)
    fun searchAgents(query: String): Flow<List<Agent>>

    /**
     * 更新代理激活状态
     */
    @Query("UPDATE agents SET isActive = :isActive WHERE id = :agentId")
    suspend fun updateActiveStatus(agentId: String, isActive: Boolean)

    /**
     * 设置默认代理
     */
    @Query("UPDATE agents SET isDefault = CASE WHEN id = :agentId THEN 1 ELSE 0 END")
    suspend fun setDefaultAgent(agentId: String)

    /**
     * 更新排序顺序
     */
    @Query("UPDATE agents SET sortOrder = :sortOrder WHERE id = :agentId")
    suspend fun updateSortOrder(agentId: String, sortOrder: Int)

    /**
     * 获取代理数量
     */
    @Query("SELECT COUNT(*) FROM agents")
    suspend fun getCount(): Int

    /**
     * 检查代理是否存在
     */
    @Query("SELECT EXISTS(SELECT 1 FROM agents WHERE id = :agentId)")
    suspend fun exists(agentId: String): Boolean

    /**
     * 删除所有代理
     */
    @Query("DELETE FROM agents")
    suspend fun deleteAll()
}