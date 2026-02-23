package com.sillychat.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.sillychat.app.data.model.Agent
import com.sillychat.app.ui.components.*
import com.sillychat.app.viewmodel.ChatViewModel
import kotlinx.coroutines.launch

/**
 * 聊天主界面
 * 显示消息列表和输入框
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    navController: NavController,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val reversedMessages by viewModel.reversedMessages.collectAsState()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // 当有新消息时滚动到底部
    LaunchedEffect(reversedMessages.size) {
        if (reversedMessages.isNotEmpty()) {
            scope.launch {
                listState.animateScrollToItem(0)
            }
        }
    }

    // 错误提示
    uiState.error?.let { error ->
        LaunchedEffect(error) {
            // 显示错误提示，稍后自动清除
            kotlinx.coroutines.delay(3000)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            ChatTopBar(
                title = uiState.selectedAgent?.name ?: "SillyChat",
                onAgentsClick = { navController.navigate("agents") },
                onSettingsClick = { navController.navigate("settings") },
                onProfileClick = { navController.navigate("profile") },
                selectedAgent = uiState.selectedAgent,
                availableAgents = uiState.availableAgents,
                onAgentSelect = { viewModel.selectAgent(it) }
            )
        },
        bottomBar = {
            MessageInput(
                value = uiState.inputText,
                onValueChange = viewModel::onInputChange,
                onSend = { viewModel.sendMessageStream() },
                onAttachClick = { /* TODO: 打开附件选择 */ },
                enabled = !uiState.isLoading,
                isSending = uiState.isSending
            )
        },
        snackbarHost = {
            SnackbarHost(hostState = remember { SnackbarHostState() })
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                // 加载中
                uiState.isLoading && reversedMessages.isEmpty() -> {
                    FullScreenLoading(message = "加载消息中...")
                }

                // 空状态
                reversedMessages.isEmpty() && !uiState.isLoading -> {
                    EmptyStateView(
                        title = "开始聊天",
                        description = "发送消息开始与AI助手对话",
                        icon = {
                            Icon(
                                imageVector = Icons.Default.Chat,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                            )
                        }
                    )
                }

                // 消息列表
                else -> {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        reverseLayout = true,
                        contentPadding = PaddingValues(vertical = 8.dp)
                    ) {
                        items(
                            items = reversedMessages,
                            key = { it.id }
                        ) { message ->
                            MessageItem(
                                message = message,
                                onLongClick = {
                                    // TODO: 显示消息操作菜单
                                }
                            )
                        }

                        // 流式响应显示
                        if (uiState.isSending && uiState.streamingContent.isNotEmpty()) {
                            item {
                                StreamingMessageItem(
                                    content = uiState.streamingContent,
                                    agentName = uiState.selectedAgent?.name
                                )
                            }
                        }

                        // 加载更多指示器
                        if (uiState.hasMoreMessages) {
                            item {
                                LoadMoreIndicator()
                            }
                        }
                    }
                }
            }

            // 错误提示
            uiState.error?.let { error ->
                Snackbar(
                    modifier = Modifier.align(Alignment.BottomCenter),
                    action = {
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("确定")
                        }
                    }
                ) {
                    Text(error)
                }
            }

            // 滚动到底部按钮
            val showScrollToBottom by remember {
                derivedStateOf {
                    listState.firstVisibleItemIndex > 2
                }
            }

            if (showScrollToBottom) {
                FloatingActionButton(
                    onClick = {
                        scope.launch {
                            listState.animateScrollToItem(0)
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(16.dp)
                        .padding(bottom = 80.dp),
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.primary
                ) {
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowDown,
                        contentDescription = "滚动到底部"
                    )
                }
            }
        }
    }
}

/**
 * 聊天顶部栏
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3Api::class)
@Composable
private fun ChatTopBar(
    title: String,
    onAgentsClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onProfileClick: () -> Unit,
    selectedAgent: Agent?,
    availableAgents: List<Agent>,
    onAgentSelect: (Agent) -> Unit
) {
    var showAgentMenu by remember { mutableStateOf(false) }

    TopAppBar(
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { showAgentMenu = true }
            ) {
                Text(title)

                if (availableAgents.size > 1) {
                    Icon(
                        imageVector = Icons.Default.ArrowDropDown,
                        contentDescription = "切换代理",
                        modifier = Modifier.size(24.dp)
                    )
                }

                // 代理选择下拉菜单
                DropdownMenu(
                    expanded = showAgentMenu,
                    onDismissRequest = { showAgentMenu = false }
                ) {
                    availableAgents.forEach { agent ->
                        DropdownMenuItem(
                            text = {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(agent.name)
                                    if (agent.id == selectedAgent?.id) {
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = null,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            },
                            onClick = {
                                onAgentSelect(agent)
                                showAgentMenu = false
                            }
                        )
                    }
                }
            }
        },
        navigationIcon = {
            IconButton(onClick = onProfileClick) {
                Icon(
                    imageVector = Icons.Default.AccountCircle,
                    contentDescription = "个人资料"
                )
            }
        },
        actions = {
            IconButton(onClick = onAgentsClick) {
                Icon(
                    imageVector = Icons.Default.SmartToy,
                    contentDescription = "AI代理"
                )
            }
            IconButton(onClick = onSettingsClick) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "设置"
                )
            }
        }
    )
}
