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
import timber.log.Timber
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

    companion object {
        /** 最大消息长度 */
        const val MAX_MESSAGE_LENGTH = 4000
        /** 最大附件数量 */
        const val MAX_ATTACHMENTS = 10
        /** 危险字符过滤正则 */
        private val DANGEROUS_CHARS_REGEX = Regex("[<>\"'&\\x00-\\x1F]")
    }

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
        Timber.d("ChatViewModel 初始化")
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
            try {
                agentRepository.initDefaultAgents()
                Timber.d("默认代理初始化成功")
            } catch (e: Exception) {
                Timber.e(e, "初始化默认代理失败")
                _uiState.update { it.copy(error = "初始化代理失败: ${e.message}") }
            }
        }
    }

    /**
     * 加载可用代理列表
     */
    private fun loadAvailableAgents() {
        viewModelScope.launch {
            agentRepository.getActiveAgents()
                .catch { e ->
                    Timber.e(e, "加载代理列表失败")
                    _uiState.update { it.copy(error = "加载代理失败: ${e.message}") }
                }
                .collect { agents ->
                    Timber.d("加载了 ${agents.size} 个可用代理")
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
            Timber.d("开始加载消息，会话ID: $conversationId")

            messageRepository.getMessages(conversationId)
                .onStart {
                    _uiState.update { it.copy(isLoading = true, error = null) }
                }
                .catch { e ->
                    Timber.e(e, "加载消息失败，会话ID: $conversationId")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "加载消息失败: ${e.message}"
                        )
                    }
                }
                .collect { messages ->
                    Timber.d("加载了 ${messages.size} 条消息")
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
     * 包含长度限制和危险字符过滤
     */
    fun onInputChange(text: String) {
        // 限制长度
        val truncated = text.take(MAX_MESSAGE_LENGTH)
        // 过滤危险字符
        val sanitized = truncated.replace(DANGEROUS_CHARS_REGEX, "")

        if (truncated.length != text.length) {
            Timber.w("输入文本超过最大长度限制: ${text.length} > $MAX_MESSAGE_LENGTH")
        }

        _uiState.update { it.copy(inputText = sanitized) }
    }

    /**
     * 发送消息（普通方式）
     */
    fun sendMessage() {
        val text = _uiState.value.inputText.trim()
        if (text.isEmpty() || _uiState.value.isSending) {
            Timber.w("发送消息被取消: 文本为空或正在发送中")
            return
        }

        val agentId = _uiState.value.selectedAgent?.id
        val conversationId = _uiState.value.conversationId
        Timber.d("开始发送消息，会话ID: $conversationId, 代理ID: $agentId")

        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, error = null) }
            _sendMessageState.value = SendMessageState.Sending

            try {
                val result = messageRepository.sendMessage(
                    content = text,
                    conversationId = conversationId,
                    agentId = agentId
                )

                result.fold(
                    onSuccess = { message ->
                        Timber.d("消息发送成功: ${message.id}")
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
                        Timber.e(error, "消息发送失败")
                        _uiState.update {
                            it.copy(
                                isSending = false,
                                error = "发送失败: ${error.message}"
                            )
                        }
                        _sendMessageState.value = SendMessageState.Error(error.message ?: "发送失败")
                    }
                )
            } catch (e: Exception) {
                Timber.e(e, "发送消息时发生异常")
                _uiState.update {
                    it.copy(
                        isSending = false,
                        error = "发送失败: ${e.message}"
                    )
                }
                _sendMessageState.value = SendMessageState.Error(e.message ?: "发送失败")
            }

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
        if (text.isEmpty() || _uiState.value.isSending) {
            Timber.w("流式发送消息被取消: 文本为空或正在发送中")
            return
        }

        val agentId = _uiState.value.selectedAgent?.id
        val conversationId = _uiState.value.conversationId
        Timber.d("开始流式发送消息，会话ID: $conversationId, 代理ID: $agentId")

        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, error = null, streamingContent = "") }

            try {
                messageRepository.sendMessageStream(
                    content = text,
                    conversationId = conversationId,
                    agentId = agentId
                ).collect { state ->
                    when (state) {
                        is StreamState.Sending -> {
                            _uiState.update { it.copy(isSending = true) }
                        }
                        is StreamState.UserMessageSent -> {
                            _uiState.update { it.copy(inputText = "") }
                            Timber.d("用户消息已发送")
                        }
                        is StreamState.Chunk -> {
                            _uiState.update { it.copy(streamingContent = state.fullContent) }
                        }
                        is StreamState.Completed -> {
                            Timber.d("流式响应完成")
                            _uiState.update {
                                it.copy(
                                    isSending = false,
                                    streamingContent = ""
                                )
                            }
                        }
                        is StreamState.Error -> {
                            Timber.e("流式响应错误: ${state.error}")
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
            } catch (e: Exception) {
                Timber.e(e, "流式发送消息时发生异常")
                _uiState.update {
                    it.copy(
                        isSending = false,
                        error = "发送失败: ${e.message}",
                        streamingContent = ""
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
     * 切换会话
     */
    fun switchConversation(conversationId: String) {
        if (conversationId == _uiState.value.conversationId) {
            Timber.w("切换会话被取消: 目标会话与当前会话相同")
            return
        }

        Timber.d("切换会话: $conversationId")
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
            try {
                messageRepository.deleteMessage(messageId, softDelete)
                Timber.d("消息删除成功: $messageId")
            } catch (e: Exception) {
                Timber.e(e, "删除消息失败: $messageId")
                _uiState.update { it.copy(error = "删除消息失败: ${e.message}") }
            }
        }
    }

    /**
     * 清除当前会话
     */
    fun clearConversation() {
        viewModelScope.launch {
            try {
                messageRepository.clearConversation(_uiState.value.conversationId)
                Timber.d("会话清除成功: ${_uiState.value.conversationId}")
            } catch (e: Exception) {
                Timber.e(e, "清除会话失败: ${_uiState.value.conversationId}")
                _uiState.update { it.copy(error = "清除会话失败: ${e.message}") }
            }
        }
    }

    /**
     * 清除错误
     */
    fun clearError() {
        Timber.d("清除错误状态")
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 重试发送失败的消息
     */
    fun retryFailedMessages() {
        viewModelScope.launch {
            try {
                messageRepository.syncPendingMessages()
                Timber.d("同步待发送消息成功")
            } catch (e: Exception) {
                Timber.e(e, "同步待发送消息失败")
                _uiState.update { it.copy(error = "重试失败: ${e.message}") }
            }
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
