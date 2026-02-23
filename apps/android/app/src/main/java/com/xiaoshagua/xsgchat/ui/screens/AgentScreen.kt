package com.xiaoshagua.xsgchat.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.xiaoshagua.xsgchat.data.model.Agent
import com.xiaoshagua.xsgchat.data.model.AgentCategory
import com.xiaoshagua.xsgchat.ui.components.*
import com.xiaoshagua.xsgchat.viewmodel.AgentActionResult
import com.xiaoshagua.xsgchat.viewmodel.AgentViewModel
import kotlinx.coroutines.flow.collectLatest

/**
 * 代理管理界面
 * 显示、创建、编辑和删除AI代理
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentScreen(
    navController: NavController,
    viewModel: AgentViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // 监听操作结果
    LaunchedEffect(Unit) {
        viewModel.actionResult.collectLatest { result ->
            when (result) {
                is AgentActionResult.Success -> {
                    snackbarHostState.showSnackbar(result.message)
                }
                is AgentActionResult.Error -> {
                    snackbarHostState.showSnackbar(result.message)
                }
                else -> {}
            }
        }
    }

    // 错误处理
    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI代理管理") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    // 搜索按钮
                    IconButton(onClick = { /* TODO: 展开搜索 */ }) {
                        Icon(Icons.Default.Search, contentDescription = "搜索")
                    }
                    // 同步按钮
                    IconButton(onClick = { viewModel.syncAgentsFromServer() }) {
                        Icon(Icons.Default.Sync, contentDescription = "同步")
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { viewModel.showCreateDialog() },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("新建代理") }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // 类别筛选
            CategoryFilterBar(
                selectedCategory = uiState.selectedCategory,
                onCategorySelect = { viewModel.filterByCategory(it) }
            )

            // 搜索栏（可展开）
            if (uiState.searchQuery.isNotEmpty()) {
                SearchBar(
                    query = uiState.searchQuery,
                    onQueryChange = { viewModel.updateSearchQuery(it) },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }

            // 代理列表
            when {
                uiState.isLoading && uiState.agents.isEmpty() -> {
                    FullScreenLoading(message = "加载代理中...")
                }
                uiState.agents.isEmpty() -> {
                    EmptyStateView(
                        title = "暂无代理",
                        description = "点击右下角按钮创建你的第一个AI代理",
                        icon = {
                            Icon(
                                imageVector = Icons.Default.SmartToy,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                            )
                        },
                        action = {
                            Button(onClick = { viewModel.showCreateDialog() }) {
                                Icon(Icons.Default.Add, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("创建代理")
                            }
                        }
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(
                            items = uiState.agents,
                            key = { it.id }
                        ) { agent ->
                            AgentCard(
                                agent = agent,
                                onClick = {
                                    viewModel.selectAgent(agent)
                                    viewModel.showEditDialog()
                                },
                                onToggleActive = { isActive ->
                                    viewModel.toggleAgentActive(agent.id, isActive)
                                },
                                isSelected = uiState.selectedAgent?.id == agent.id
                            )
                        }
                    }
                }
            }
        }
    }

    // 创建代理对话框
    if (uiState.showCreateDialog) {
        CreateAgentDialog(
            onDismiss = { viewModel.hideCreateDialog() },
            onConfirm = { agent ->
                viewModel.createAgent(agent)
            }
        )
    }

    // 编辑代理对话框
    if (uiState.showEditDialog && uiState.selectedAgent != null) {
        EditAgentDialog(
            agent = uiState.selectedAgent!!,
            onDismiss = {
                viewModel.hideEditDialog()
                viewModel.clearSelection()
            },
            onConfirm = { agent ->
                viewModel.updateAgent(agent)
            },
            onDelete = {
                viewModel.hideEditDialog()
                viewModel.showDeleteConfirmDialog()
            },
            onSetDefault = {
                viewModel.setDefaultAgent(uiState.selectedAgent!!.id)
            }
        )
    }

    // 删除确认对话框
    if (uiState.showDeleteConfirmDialog && uiState.selectedAgent != null) {
        DeleteConfirmDialog(
            agentName = uiState.selectedAgent!!.name,
            onDismiss = {
                viewModel.hideDeleteConfirmDialog()
                viewModel.clearSelection()
            },
            onConfirm = {
                viewModel.deleteAgent(uiState.selectedAgent!!.id)
            }
        )
    }
}

/**
 * 类别筛选栏
 */
@Composable
private fun CategoryFilterBar(
    selectedCategory: AgentCategory?,
    onCategorySelect: (AgentCategory?) -> Unit,
    modifier: Modifier = Modifier
) {
    ScrollableTabRow(
        selectedTabIndex = selectedCategory?.ordinal?.plus(1) ?: 0,
        modifier = modifier,
        edgePadding = 16.dp
    ) {
        Tab(
            selected = selectedCategory == null,
            onClick = { onCategorySelect(null) },
            text = { Text("全部") }
        )

        AgentCategory.values().forEach { category ->
            Tab(
                selected = selectedCategory == category,
                onClick = { onCategorySelect(category) },
                text = {
                    Text(
                        when (category) {
                            AgentCategory.GENERAL -> "通用"
                            AgentCategory.CODING -> "编程"
                            AgentCategory.WRITING -> "写作"
                            AgentCategory.TRANSLATION -> "翻译"
                            AgentCategory.ANALYSIS -> "分析"
                            AgentCategory.CUSTOM -> "自定义"
                        }
                    )
                }
            )
        }
    }
}

/**
 * 搜索栏
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier.fillMaxWidth(),
        placeholder = { Text("搜索代理...") },
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = null)
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(Icons.Default.Clear, contentDescription = "清除")
                }
            }
        },
        singleLine = true,
        shape = MaterialTheme.shapes.extraLarge
    )
}

/**
 * 创建代理对话框
 */
@Composable
private fun CreateAgentDialog(
    onDismiss: () -> Unit,
    onConfirm: (Agent) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var systemPrompt by remember { mutableStateOf("") }
    var category by remember { mutableStateOf(AgentCategory.GENERAL) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("创建新代理") },
        text = {
            CreateAgentForm(
                name = name,
                onNameChange = { name = it },
                role = role,
                onRoleChange = { role = it },
                description = description,
                onDescriptionChange = { description = it },
                systemPrompt = systemPrompt,
                onSystemPromptChange = { systemPrompt = it },
                category = category,
                onCategoryChange = { category = it }
            )
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (name.isNotBlank() && role.isNotBlank()) {
                        onConfirm(
                            Agent(
                                name = name,
                                role = role,
                                description = description.takeIf { it.isNotBlank() },
                                systemPrompt = systemPrompt.takeIf { it.isNotBlank() },
                                category = category
                            )
                        )
                    }
                },
                enabled = name.isNotBlank() && role.isNotBlank()
            ) {
                Text("创建")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

/**
 * 编辑代理对话框
 */
@Composable
private fun EditAgentDialog(
    agent: Agent,
    onDismiss: () -> Unit,
    onConfirm: (Agent) -> Unit,
    onDelete: () -> Unit,
    onSetDefault: () -> Unit
) {
    var name by remember { mutableStateOf(agent.name) }
    var role by remember { mutableStateOf(agent.role) }
    var description by remember { mutableStateOf(agent.description ?: "") }
    var systemPrompt by remember { mutableStateOf(agent.systemPrompt ?: "") }
    var category by remember { mutableStateOf(agent.category) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("编辑代理") },
        text = {
            Column {
                // 设为默认按钮
                if (!agent.isDefault) {
                    OutlinedButton(
                        onClick = onSetDefault,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Star, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("设为默认代理")
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                CreateAgentForm(
                    name = name,
                    onNameChange = { name = it },
                    role = role,
                    onRoleChange = { role = it },
                    description = description,
                    onDescriptionChange = { description = it },
                    systemPrompt = systemPrompt,
                    onSystemPromptChange = { systemPrompt = it },
                    category = category,
                    onCategoryChange = { category = it }
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onConfirm(
                        agent.copy(
                            name = name,
                            role = role,
                            description = description.takeIf { it.isNotBlank() },
                            systemPrompt = systemPrompt.takeIf { it.isNotBlank() },
                            category = category
                        )
                    )
                },
                enabled = name.isNotBlank() && role.isNotBlank()
            ) {
                Text("保存")
            }
        },
        dismissButton = {
            Row {
                TextButton(
                    onClick = onDelete,
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("删除")
                }
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(onClick = onDismiss) {
                    Text("取消")
                }
            }
        }
    )
}

/**
 * 删除确认对话框
 */
@Composable
private fun DeleteConfirmDialog(
    agentName: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("确认删除") },
        text = {
            Text("确定要删除代理 \"$agentName\" 吗？此操作不可撤销。")
        },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("删除")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}
