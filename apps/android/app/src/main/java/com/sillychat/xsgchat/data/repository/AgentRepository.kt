package com.sillychat.app.data.repository

import com.sillychat.app.data.local.AgentDao
import com.sillychat.app.data.model.Agent
import com.sillychat.app.data.model.AgentCategory
import com.sillychat.app.data.remote.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 代理仓库
 * 负责代理的本地存储和远程同步
 */
@Singleton
class AgentRepository @Inject constructor(
    private val agentDao: AgentDao,
    private val apiService: ApiService
) {
    /**
     * 获取所有代理
     */
    fun getAllAgents(): Flow<List<Agent>> {
        return agentDao.getAll()
            .flowOn(Dispatchers.IO)
    }

    /**
     * 获取激活的代理
     */
    fun getActiveAgents(): Flow<List<Agent>> {
        return agentDao.getActiveAgents()
            .flowOn(Dispatchers.IO)
    }

    /**
     * 根据ID获取代理
     */
    suspend fun getAgent(agentId: String): Agent? {
        return withContext(Dispatchers.IO) {
            agentDao.getById(agentId)
        }
    }

    /**
     * 根据ID获取代理流
     */
    fun getAgentFlow(agentId: String): Flow<Agent?> {
        return agentDao.getByIdFlow(agentId)
            .flowOn(Dispatchers.IO)
    }

    /**
     * 获取默认代理
     */
    suspend fun getDefaultAgent(): Agent {
        return withContext(Dispatchers.IO) {
            agentDao.getDefaultAgent()
                ?: Agent.createDefault()
        }
    }

    /**
     * 根据类别获取代理
     */
    fun getAgentsByCategory(category: AgentCategory): Flow<List<Agent>> {
        return agentDao.getByCategory(category)
            .flowOn(Dispatchers.IO)
    }

    /**
     * 搜索代理
     */
    fun searchAgents(query: String): Flow<List<Agent>> {
        return agentDao.searchAgents(query)
            .flowOn(Dispatchers.IO)
    }

    /**
     * 创建代理
     */
    suspend fun createAgent(agent: Agent): Result<Agent> {
        return withContext(Dispatchers.IO) {
            try {
                agentDao.insert(agent)
                Result.success(agent)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * 更新代理
     */
    suspend fun updateAgent(agent: Agent): Result<Agent> {
        return withContext(Dispatchers.IO) {
            try {
                val updatedAgent = agent.copy(updatedAt = System.currentTimeMillis())
                agentDao.update(updatedAgent)
                Result.success(updatedAgent)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * 删除代理
     */
    suspend fun deleteAgent(agentId: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                agentDao.deleteById(agentId)
                Result.success(Unit)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * 设置默认代理
     */
    suspend fun setDefaultAgent(agentId: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                agentDao.setDefaultAgent(agentId)
                Result.success(Unit)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * 切换代理激活状态
     */
    suspend fun toggleAgentActive(agentId: String, isActive: Boolean): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                agentDao.updateActiveStatus(agentId, isActive)
                Result.success(Unit)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * 更新代理排序
     */
    suspend fun updateAgentOrder(agentOrders: Map<String, Int>): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                agentOrders.forEach { (agentId, order) ->
                    agentDao.updateSortOrder(agentId, order)
                }
                Result.success(Unit)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    /**
     * 从服务器同步代理
     */
    suspend fun syncAgentsFromServer(): Result<List<Agent>> {
        return withContext(Dispatchers.IO) {
            apiService.getAgents().fold(
                onSuccess = { agents ->
                    agentDao.insertAll(agents)
                    Result.success(agents)
                },
                onFailure = { error ->
                    Result.failure(error)
                }
            )
        }
    }

    /**
     * 初始化默认代理
     */
    suspend fun initDefaultAgents() {
        withContext(Dispatchers.IO) {
            val count = agentDao.getCount()
            if (count == 0) {
                // 插入默认代理
                val defaultAgents = listOf(
                    Agent.createDefault(),
                    Agent.createCodeAssistant(),
                    Agent.createCreativeWriter()
                )
                agentDao.insertAll(defaultAgents)
            }
        }
    }

    /**
     * 检查代理是否存在
     */
    suspend fun agentExists(agentId: String): Boolean {
        return withContext(Dispatchers.IO) {
            agentDao.exists(agentId)
        }
    }

    /**
     * 获取代理数量
     */
    suspend fun getAgentCount(): Int {
        return withContext(Dispatchers.IO) {
            agentDao.getCount()
        }
    }
}
