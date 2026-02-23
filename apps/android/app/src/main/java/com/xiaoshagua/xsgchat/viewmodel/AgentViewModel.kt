package com.xiaoshagua.xsgchat.viewmodel

import androidx.compose.runtime.Stable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xiaoshagua.xsgchat.data.model.Agent
import com.xiaoshagua.xsgchat.data.model.AgentCategory
import com.xiaoshagua.xsgchat.data.repository.AgentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 代理界面状态
 */
@Stable
data class AgentUiState(
    /**
     * 代理列表
     */
    val agents: List<Agent> = emptyList(),

    /**
     * 当前选中的代理
     */
    val selectedAgent: Agent? = null,

    /**
     * 是否正在加载
     */
    val isLoading: Boolean = false,

    /**
     * 错误信息
     */
    val error: String? = null,

    /**
     * 搜索查询
     */
    val searchQuery: String = "",

    /**
     * 当前筛选类别
     */
    val selectedCategory: AgentCategory? = null,

    /**
     * 是否显示创建对话框
     */
    val showCreateDialog: Boolean = false,

    /**
     * 是否显示编辑对话框
     */
    val showEditDialog: Boolean = false,

    /**
     * 是否显示删除确认对话框
     */
    val showDeleteConfirmDialog: Boolean = false
)

/**
 * 代理操作结果
 */
sealed class AgentActionResult {
    data object Loading : AgentActionResult()
    data class Success(val message: String) : AgentActionResult()
    data class Error(val message: String) : AgentActionResult()
}

/**
 * 代理ViewModel
 * 管理AI代理的创建、编辑、删除等操作
 */
@HiltViewModel
class AgentViewModel @Inject constructor(
    private val agentRepository: AgentRepository
) : ViewModel() {

    /**
     * UI状态
     */
    private val _uiState = MutableStateFlow(AgentUiState())
    val uiState: StateFlow<AgentUiState> = _uiState.asStateFlow()

    /**
     * 操作结果
     */
    private val _actionResult = MutableSharedFlow<AgentActionResult>()
    val actionResult: SharedFlow<AgentActionResult> = _actionResult.asSharedFlow()

    init {
        loadAgents()
    }

    /**
     * 加载代理列表
     */
    private fun loadAgents() {
        viewModelScope.launch {
            agentRepository.getAllAgents()
                .onStart {
                    _uiState.update { it.copy(isLoading = true, error = null) }
                }
                .catch { e ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "加载代理失败: ${e.message}"
                        )
                    }
                }
                .collect { agents ->
                    _uiState.update {
                        it.copy(
                            agents = agents,
                            isLoading = false,
                            error = null
                        )
                    }
                }
        }
    }

    /**
     * 选择代理
     */
    fun selectAgent(agent: Agent) {
        _uiState.update { it.copy(selectedAgent = agent) }
    }

    /**
     * 清除选中
     */
    fun clearSelection() {
        _uiState.update { it.copy(selectedAgent = null) }
    }

    /**
     * 更新搜索查询
     */
    fun updateSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }

        if (query.isBlank()) {
            loadAgents()
        } else {
            searchAgents(query)
        }
    }

    /**
     * 搜索代理
     */
    private fun searchAgents(query: String) {
        viewModelScope.launch {
            agentRepository.searchAgents(query)
                .catch { e ->
                    _uiState.update { it.copy(error = "搜索失败: ${e.message}") }
                }
                .collect { agents ->
                    _uiState.update { it.copy(agents = agents) }
                }
        }
    }

    /**
     * 按类别筛选
     */
    fun filterByCategory(category: AgentCategory?) {
        _uiState.update { it.copy(selectedCategory = category) }

        if (category == null) {
            loadAgents()
        } else {
            viewModelScope.launch {
                agentRepository.getAgentsByCategory(category)
                    .catch { e ->
                        _uiState.update { it.copy(error = "筛选失败: ${e.message}") }
                    }
                    .collect { agents ->
                        _uiState.update { it.copy(agents = agents) }
                    }
            }
        }
    }

    /**
     * 创建代理
     */
    fun createAgent(agent: Agent) {
        viewModelScope.launch {
            _actionResult.emit(AgentActionResult.Loading)

            agentRepository.createAgent(agent)
                .fold(
                    onSuccess = {
                        _actionResult.emit(AgentActionResult.Success("代理创建成功"))
                        _uiState.update { it.copy(showCreateDialog = false) }
                    },
                    onFailure = { error ->
                        _actionResult.emit(
                            AgentActionResult.Error("创建失败: ${error.message}")
                        )
                    }
                )
        }
    }

    /**
     * 更新代理
     */
    fun updateAgent(agent: Agent) {
        viewModelScope.launch {
            _actionResult.emit(AgentActionResult.Loading)

            agentRepository.updateAgent(agent)
                .fold(
                    onSuccess = {
                        _actionResult.emit(AgentActionResult.Success("代理更新成功"))
                        _uiState.update {
                            it.copy(
                                showEditDialog = false,
                                selectedAgent = null
                            )
                        }
                    },
                    onFailure = { error ->
                        _actionResult.emit(
                            AgentActionResult.Error("更新失败: ${error.message}")
                        )
                    }
                )
        }
    }

    /**
     * 删除代理
     */
    fun deleteAgent(agentId: String) {
        viewModelScope.launch {
            _actionResult.emit(AgentActionResult.Loading)

            agentRepository.deleteAgent(agentId)
                .fold(
                    onSuccess = {
                        _actionResult.emit(AgentActionResult.Success("代理删除成功"))
                        _uiState.update {
                            it.copy(
                                showDeleteConfirmDialog = false,
                                selectedAgent = null
                            )
                        }
                    },
                    onFailure = { error ->
                        _actionResult.emit(
                            AgentActionResult.Error("删除失败: ${error.message}")
                        )
                    }
                )
        }
    }

    /**
     * 设置默认代理
     */
    fun setDefaultAgent(agentId: String) {
        viewModelScope.launch {
            agentRepository.setDefaultAgent(agentId)
                .fold(
                    onSuccess = {
                        _actionResult.emit(AgentActionResult.Success("默认代理设置成功"))
                    },
                    onFailure = { error ->
                        _actionResult.emit(
                            AgentActionResult.Error("设置失败: ${error.message}")
                        )
                    }
                )
        }
    }

    /**
     * 切换代理激活状态
     */
    fun toggleAgentActive(agentId: String, isActive: Boolean) {
        viewModelScope.launch {
            agentRepository.toggleAgentActive(agentId, isActive)
                .fold(
                    onSuccess = {
                        val status = if (isActive) "激活" else "停用"
                        _actionResult.emit(AgentActionResult.Success("代理已$status"))
                    },
                    onFailure = { error ->
                        _actionResult.emit(
                            AgentActionResult.Error("操作失败: ${error.message}")
                        )
                    }
                )
        }
    }

    /**
     * 从服务器同步代理
     */
    fun syncAgentsFromServer() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            _actionResult.emit(AgentActionResult.Loading)

            agentRepository.syncAgentsFromServer()
                .fold(
                    onSuccess = { agents ->
                        _actionResult.emit(
                            AgentActionResult.Success("同步成功，共 ${agents.size} 个代理")
                        )
                        _uiState.update { it.copy(isLoading = false) }
                    },
                    onFailure = { error ->
                        _actionResult.emit(
                            AgentActionResult.Error("同步失败: ${error.message}")
                        )
                        _uiState.update { it.copy(isLoading = false) }
                    }
                )
        }
    }

    /**
     * 显示创建对话框
     */
    fun showCreateDialog() {
        _uiState.update { it.copy(showCreateDialog = true) }
    }

    /**
     * 隐藏创建对话框
     */
    fun hideCreateDialog() {
        _uiState.update { it.copy(showCreateDialog = false) }
    }

    /**
     * 显示编辑对话框
     */
    fun showEditDialog() {
        _uiState.update { it.copy(showEditDialog = true) }
    }

    /**
     * 隐藏编辑对话框
     */
    fun hideEditDialog() {
        _uiState.update { it.copy(showEditDialog = false) }
    }

    /**
     * 显示删除确认对话框
     */
    fun showDeleteConfirmDialog() {
        _uiState.update { it.copy(showDeleteConfirmDialog = true) }
    }

    /**
     * 隐藏删除确认对话框
     */
    fun hideDeleteConfirmDialog() {
        _uiState.update { it.copy(showDeleteConfirmDialog = false) }
    }

    /**
     * 清除错误
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 获取所有类别
     */
    fun getAllCategories(): List<AgentCategory> {
        return AgentCategory.values().toList()
    }
}
