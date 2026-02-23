package com.xiaoshagua.xsgchat.viewmodel

import androidx.compose.runtime.Stable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xiaoshagua.xsgchat.data.model.Agent
import com.xiaoshagua.xsgchat.data.model.Message
import com.xiaoshagua.xsgchat.data.model.SendMessageState
import com.xiaoshagua.xsgchat.data.repository.AgentRepository
import com.xiaoshagua.xsgchat.data.repository.MessageRepository
import com.xiaoshagua.xsgchat.data.repository.StreamState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 聊天界面状态
 */
@Stable
data class ChatUiState(
    /**
     * 消息列表
     */
    val messages: List<Message> = emptyList(),

    /**
     * 输入文本
     */
    val inputText: String = "",

    /**
     * 是否正在加载
     */
    val isLoading: Boolean = false,

    /**
     * 是否正在发送消息
     */
    val isSending: Boolean = false,

    /**
     * 错误信息
     */
    val error: String? = null,

    /**
     * 当前选中的代理
     */
    val selectedAgent: Agent? = null,

    /**
     * 可用代理列表
     */
    val availableAgents: List<Agent> = emptyList(),

    /**
     * 当前会话ID
     */
    val conversationId: String = "default",

    /**
     * 是否还有更多历史消息
     */
    val hasMoreMessages: Boolean = true,

    /**
     * 流式响应的当前内容（用于打字机效果）
     */
    val streamingContent: String = ""
)

/**
 * 聊天ViewModel
 * 管理聊天界面的状态和逻辑
 */
@HiltViewModel
class ChatViewModel @Inject constructor(
    private val messageRepository: MessageRepository,
    private val agentRepository: AgentRepository
) : ViewModel() {

    /**
     * UI状态
     */
    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    /**
     * 发送消息状态
     */
    private val _sendMessageState = MutableStateFlow<SendMessageState>(SendMessageState.Idle)
    val sendMessageState: StateFlow<SendMessageState> = _sendMessageState.asStateFlow()

    /**
     * 使用derivedStateOf优化消息列表反转性能
     */
    val reversedMessages: StateFlow<List<Message>> = _uiState
        .map { it.messages.reversed() }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    init {
        // 初始化默认代理
        initDefaultAgents()
        // 加载可用代理
        loadAvailableAgents()
        // 加载消息
        loadMessages()
    }

    /**
     * 初始化默认代理
     */
    private fun initDefaultAgents() {
        viewModelScope.launch {
            agentRepository.initDefaultAgents()
        }
    }

    /**
     * 加载可用代理列表
     */
    private fun loadAvailableAgents() {
        viewModelScope.launch {
            agentRepository.getActiveAgents()
                .catch { e ->
                    _uiState.update { it.copy(error = "加载代理失败: ${e.message}") }
                }
                .collect { agents ->
                    _uiState.update { state ->
                        state.copy(
                            availableAgents = agents,
                            selectedAgent = state.selectedAgent ?: agents.firstOrNull()
                        )
                    }
                }
        }
    }

    /**
     * 加载消息
     */
    private fun loadMessages() {
        viewModelScope.launch {
            val conversationId = _uiState.value.conversationId

            messageRepository.getMessages(conversationId)
                .onStart {
                    _uiState.update { it.copy(isLoading = true, error = null) }
                }
                .catch { e ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "加载消息失败: ${e.message}"
                        )
                    }
                }
                .collect { messages ->
                    _uiState.update {
                        it.copy(
                            messages = messages,
                            isLoading = false,
                            error = null
                        )
                    }
                }
        }
    }

    /**
     * 输入文本变化
     */
    fun onInputChange(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    /**
     * 发送消息（普通方式）
     */
    fun sendMessage() {
        val text = _uiState.value.inputText.trim()
        if (text.isEmpty() || _uiState.value.isSending) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, error = null) }
            _sendMessageState.value = SendMessageState.Sending

            val result = messageRepository.sendMessage(
                content = text,
                conversationId = _uiState.value.conversationId,
                agentId = _uiState.value.selectedAgent?.id
            )

            result.fold(
                onSuccess = { message ->
                    _uiState.update {
                        it.copy(
                            inputText = "",
                            isSending = false,
                            error = null
                        )
                    }
                    _sendMessageState.value = SendMessageState.Success(message)
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isSending = false,
                            error = "发送失败: ${error.message}"
                        )
                    }
                    _sendMessageState.value = SendMessageState.Error(error.message ?: "发送失败")
                }
            )

            // 重置发送状态
            kotlinx.coroutines.delay(100)
            _sendMessageState.value = SendMessageState.Idle
        }
    }

    /**
     * 流式发送消息（打字机效果）
     */
    fun sendMessageStream() {
        val text = _uiState.value.inputText.trim()
        if (text.isEmpty() || _uiState.value.isSending) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, error = null, streamingContent = "") }

            messageRepository.sendMessageStream(
                content = text,
                conversationId = _uiState.value.conversationId,
                agentId = _uiState.value.selectedAgent?.id
            ).collect { state ->
                when (state) {
                    is StreamState.Sending -> {
                        _uiState.update { it.copy(isSending = true) }
                    }
                    is StreamState.UserMessageSent -> {
                        _uiState.update { it.copy(inputText = "") }
                    }
                    is StreamState.Chunk -> {
                        _uiState.update { it.copy(streamingContent = state.fullContent) }
                    }
                    is StreamState.Completed -> {
                        _uiState.update {
                            it.copy(
                                isSending = false,
                                streamingContent = ""
                            )
                        }
                    }
                    is StreamState.Error -> {
                        _uiState.update {
                            it.copy(
                                isSending = false,
                                error = state.error,
                                streamingContent = ""
                            )
                        }
                    }
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
     * 切换会话
     */
    fun switchConversation(conversationId: String) {
        if (conversationId == _uiState.value.conversationId) return

        _uiState.update {
            it.copy(
                conversationId = conversationId,
                messages = emptyList(),
                isLoading = true
            )
        }
        loadMessages()
    }

    /**
     * 删除消息
     */
    fun deleteMessage(messageId: String, softDelete: Boolean = true) {
        viewModelScope.launch {
            messageRepository.deleteMessage(messageId, softDelete)
        }
    }

    /**
     * 清除当前会话
     */
    fun clearConversation() {
        viewModelScope.launch {
            messageRepository.clearConversation(_uiState.value.conversationId)
        }
    }

    /**
     * 清除错误
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 重试发送失败的消息
     */
    fun retryFailedMessages() {
        viewModelScope.launch {
            messageRepository.syncPendingMessages()
        }
    }

    /**
     * 加载更多历史消息
     */
    fun loadMoreMessages() {
        // 实现分页加载逻辑
        // 目前使用Flow自动更新，后续可以添加分页逻辑
    }

    /**
     * 搜索消息
     */
    fun searchMessages(query: String): Flow<List<Message>> {
        return messageRepository.searchMessages(query)
    }
}
