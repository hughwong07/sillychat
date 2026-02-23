package com.sillychat.app.viewmodel

import androidx.compose.runtime.Stable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sillychat.app.data.model.Agent
import com.sillychat.app.data.model.AgentCategory
import com.sillychat.app.data.repository.AgentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
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
        Timber.d("AgentViewModel 初始化")
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
                    Timber.e(e, "加载代理列表失败")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "加载代理失败: ${e.message}"
                        )
                    }
                }
                .collect { agents ->
                    Timber.d("加载了 ${agents.size} 个代理")
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
        Timber.d("选择代理: ${agent.id} - ${agent.name}")
        _uiState.update { it.copy(selectedAgent = agent) }
    }

    /**
     * 清除选中
     */
    fun clearSelection() {
        Timber.d("清除代理选择")
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
        Timber.d("搜索代理: $query")
        viewModelScope.launch {
            agentRepository.searchAgents(query)
                .catch { e ->
                    Timber.e(e, "搜索代理失败: $query")
                    _uiState.update { it.copy(error = "搜索失败: ${e.message}") }
                }
                .collect { agents ->
                    Timber.d("搜索到 ${agents.size} 个代理")
                    _uiState.update { it.copy(agents = agents) }
                }
        }
    }

    /**
     * 按类别筛选
     */
    fun filterByCategory(category: AgentCategory?) {
        Timber.d("按类别筛选代理: ${category?.name ?: "全部"}")
        _uiState.update { it.copy(selectedCategory = category) }

        if (category == null) {
            loadAgents()
        } else {
            viewModelScope.launch {
                agentRepository.getAgentsByCategory(category)
                    .catch { e ->
                        Timber.e(e, "按类别筛选代理失败: ${category.name}")
                        _uiState.update { it.copy(error = "筛选失败: ${e.message}") }
                    }
                    .collect { agents ->
                        Timber.d("类别 ${category.name} 筛选到 ${agents.size} 个代理")
                        _uiState.update { it.copy(agents = agents) }
                    }
            }
        }
    }

    /**
     * 创建代理
     */
    fun createAgent(agent: Agent) {
        Timber.d("开始创建代理: ${agent.name}")
        viewModelScope.launch {
            _actionResult.emit(AgentActionResult.Loading)

            try {
                agentRepository.createAgent(agent)
                    .fold(
                        onSuccess = {
                            Timber.d("代理创建成功: ${agent.id}")
                            _actionResult.emit(AgentActionResult.Success("代理创建成功"))
                            _uiState.update { it.copy(showCreateDialog = false) }
                        },
                        onFailure = { error ->
                            Timber.e(error, "创建代理失败: ${agent.name}")
                            _actionResult.emit(
                                AgentActionResult.Error("创建失败: ${error.message}")
                            )
                        }
                    )
            } catch (e: Exception) {
                Timber.e(e, "创建代理时发生异常: ${agent.name}")
                _actionResult.emit(AgentActionResult.Error("创建失败: ${e.message}"))
            }
        }
    }

    /**
     * 更新代理
     */
    fun updateAgent(agent: Agent) {
        Timber.d("开始更新代理: ${agent.id} - ${agent.name}")
        viewModelScope.launch {
            _actionResult.emit(AgentActionResult.Loading)

            try {
                agentRepository.updateAgent(agent)
                    .fold(
                        onSuccess = {
                            Timber.d("代理更新成功: ${agent.id}")
                            _actionResult.emit(AgentActionResult.Success("代理更新成功"))
                            _uiState.update {
                                it.copy(
                                    showEditDialog = false,
                                    selectedAgent = null
                                )
                            }
                        },
                        onFailure = { error ->
                            Timber.e(error, "更新代理失败: ${agent.id}")
                            _actionResult.emit(
                                AgentActionResult.Error("更新失败: ${error.message}")
                            )
                        }
                    )
            } catch (e: Exception) {
                Timber.e(e, "更新代理时发生异常: ${agent.id}")
                _actionResult.emit(AgentActionResult.Error("更新失败: ${e.message}"))
            }
        }
    }

    /**
     * 删除代理
     */
    fun deleteAgent(agentId: String) {
        Timber.d("开始删除代理: $agentId")
        viewModelScope.launch {
            _actionResult.emit(AgentActionResult.Loading)

            try {
                agentRepository.deleteAgent(agentId)
                    .fold(
                        onSuccess = {
                            Timber.d("代理删除成功: $agentId")
                            _actionResult.emit(AgentActionResult.Success("代理删除成功"))
                            _uiState.update {
                                it.copy(
                                    showDeleteConfirmDialog = false,
                                    selectedAgent = null
                                )
                            }
                        },
                        onFailure = { error ->
                            Timber.e(error, "删除代理失败: $agentId")
                            _actionResult.emit(
                                AgentActionResult.Error("删除失败: ${error.message}")
                            )
                        }
                    )
            } catch (e: Exception) {
                Timber.e(e, "删除代理时发生异常: $agentId")
                _actionResult.emit(AgentActionResult.Error("删除失败: ${e.message}"))
            }
        }
    }

    /**
     * 设置默认代理
     */
    fun setDefaultAgent(agentId: String) {
        Timber.d("设置默认代理: $agentId")
        viewModelScope.launch {
            try {
                agentRepository.setDefaultAgent(agentId)
                    .fold(
                        onSuccess = {
                            Timber.d("默认代理设置成功: $agentId")
                            _actionResult.emit(AgentActionResult.Success("默认代理设置成功"))
                        },
                        onFailure = { error ->
                            Timber.e(error, "设置默认代理失败: $agentId")
                            _actionResult.emit(
                                AgentActionResult.Error("设置失败: ${error.message}")
                            )
                        }
                    )
            } catch (e: Exception) {
                Timber.e(e, "设置默认代理时发生异常: $agentId")
                _actionResult.emit(AgentActionResult.Error("设置失败: ${e.message}"))
            }
        }
    }

    /**
     * 切换代理激活状态
     */
    fun toggleAgentActive(agentId: String, isActive: Boolean) {
        Timber.d("切换代理激活状态: $agentId -> $isActive")
        viewModelScope.launch {
            try {
                agentRepository.toggleAgentActive(agentId, isActive)
                    .fold(
                        onSuccess = {
                            val status = if (isActive) "激活" else "停用"
                            Timber.d("代理已$status: $agentId")
                            _actionResult.emit(AgentActionResult.Success("代理已$status"))
                        },
                        onFailure = { error ->
                            Timber.e(error, "切换代理状态失败: $agentId")
                            _actionResult.emit(
                                AgentActionResult.Error("操作失败: ${error.message}")
                            )
                        }
                    )
            } catch (e: Exception) {
                Timber.e(e, "切换代理状态时发生异常: $agentId")
                _actionResult.emit(AgentActionResult.Error("操作失败: ${e.message}"))
            }
        }
    }

    /**
     * 从服务器同步代理
     */
    fun syncAgentsFromServer() {
        Timber.d("开始从服务器同步代理")
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            _actionResult.emit(AgentActionResult.Loading)

            try {
                agentRepository.syncAgentsFromServer()
                    .fold(
                        onSuccess = { agents ->
                            Timber.d("同步成功，共 ${agents.size} 个代理")
                            _actionResult.emit(
                                AgentActionResult.Success("同步成功，共 ${agents.size} 个代理")
                            )
                            _uiState.update { it.copy(isLoading = false) }
                        },
                        onFailure = { error ->
                            Timber.e(error, "从服务器同步代理失败")
                            _actionResult.emit(
                                AgentActionResult.Error("同步失败: ${error.message}")
                            )
                            _uiState.update { it.copy(isLoading = false) }
                        }
                    )
            } catch (e: Exception) {
                Timber.e(e, "同步代理时发生异常")
                _actionResult.emit(AgentActionResult.Error("同步失败: ${e.message}"))
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    /**
     * 显示创建对话框
     */
    fun showCreateDialog() {
        Timber.d("显示创建代理对话框")
        _uiState.update { it.copy(showCreateDialog = true) }
    }

    /**
     * 隐藏创建对话框
     */
    fun hideCreateDialog() {
        Timber.d("隐藏创建代理对话框")
        _uiState.update { it.copy(showCreateDialog = false) }
    }

    /**
     * 显示编辑对话框
     */
    fun showEditDialog() {
        Timber.d("显示编辑代理对话框")
        _uiState.update { it.copy(showEditDialog = true) }
    }

    /**
     * 隐藏编辑对话框
     */
    fun hideEditDialog() {
        Timber.d("隐藏编辑代理对话框")
        _uiState.update { it.copy(showEditDialog = false) }
    }

    /**
     * 显示删除确认对话框
     */
    fun showDeleteConfirmDialog() {
        Timber.d("显示删除代理确认对话框")
        _uiState.update { it.copy(showDeleteConfirmDialog = true) }
    }

    /**
     * 隐藏删除确认对话框
     */
    fun hideDeleteConfirmDialog() {
        Timber.d("隐藏删除代理确认对话框")
        _uiState.update { it.copy(showDeleteConfirmDialog = false) }
    }

    /**
     * 清除错误
     */
    fun clearError() {
        Timber.d("清除错误状态")
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 获取所有类别
     */
    fun getAllCategories(): List<AgentCategory> {
        return AgentCategory.values().toList()
    }
}
