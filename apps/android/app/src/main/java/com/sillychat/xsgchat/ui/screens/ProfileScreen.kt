package com.sillychat.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

/**
 * 个人资料界面
 * 显示和编辑用户信息
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    navController: NavController
) {
    var isEditing by remember { mutableStateOf(false) }
    var showLogoutConfirm by remember { mutableStateOf(false) }

    // 模拟用户数据
    var userName by remember { mutableStateOf("用户名") }
    var userEmail by remember { mutableStateOf("user@example.com") }
    var userBio by remember { mutableStateOf("这个人很懒，什么都没有写...") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("个人资料") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    if (isEditing) {
                        IconButton(
                            onClick = {
                                // 保存编辑
                                isEditing = false
                            }
                        ) {
                            Icon(Icons.Default.Check, contentDescription = "保存")
                        }
                    } else {
                        IconButton(onClick = { isEditing = true }) {
                            Icon(Icons.Default.Edit, contentDescription = "编辑")
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // 头像区域
            ProfileAvatarSection(
                isEditing = isEditing,
                onAvatarClick = {
                    // TODO: 打开头像选择
                }
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 用户信息
            if (isEditing) {
                // 编辑模式
                ProfileEditForm(
                    name = userName,
                    onNameChange = { userName = it },
                    email = userEmail,
                    onEmailChange = { userEmail = it },
                    bio = userBio,
                    onBioChange = { userBio = it }
                )
            } else {
                // 查看模式
                ProfileInfoSection(
                    name = userName,
                    email = userEmail,
                    bio = userBio
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            Spacer(modifier = Modifier.height(16.dp))

            // 统计数据
            ProfileStatsSection()

            Spacer(modifier = Modifier.height(24.dp))

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            Spacer(modifier = Modifier.height(16.dp))

            // 功能列表
            ProfileMenuSection(
                onAccountSettingsClick = { /* TODO */ },
                onPrivacySettingsClick = { /* TODO */ },
                onNotificationSettingsClick = { navController.navigate("settings") },
                onHelpClick = { /* TODO */ },
                onAboutClick = { /* TODO */ }
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 退出登录按钮
            OutlinedButton(
                onClick = { showLogoutConfirm = true },
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Icon(Icons.Default.Logout, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("退出登录")
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // 退出登录确认对话框
    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = { Text("确认退出") },
            text = { Text("确定要退出登录吗？") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutConfirm = false
                        // TODO: 执行退出登录
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("退出")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutConfirm = false }) {
                    Text("取消")
                }
            }
        )
    }
}

/**
 * 头像区域
 */
@Composable
private fun ProfileAvatarSection(
    isEditing: Boolean,
    onAvatarClick: () -> Unit
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.padding(top = 16.dp)
    ) {
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.primaryContainer,
            modifier = Modifier.size(120.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(60.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }

        // 编辑头像按钮
        if (isEditing) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .offset(x = (-8).dp, y = (-8).dp)
            ) {
                IconButton(
                    onClick = onAvatarClick,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = "更换头像",
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

/**
 * 资料编辑表单
 */
@Composable
private fun ProfileEditForm(
    name: String,
    onNameChange: (String) -> Unit,
    email: String,
    onEmailChange: (String) -> Unit,
    bio: String,
    onBioChange: (String) -> Unit
) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp)
    ) {
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text("昵称") },
            leadingIcon = {
                Icon(Icons.Default.Person, contentDescription = null)
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            label = { Text("邮箱") },
            leadingIcon = {
                Icon(Icons.Default.Email, contentDescription = null)
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = bio,
            onValueChange = onBioChange,
            label = { Text("简介") },
            leadingIcon = {
                Icon(Icons.Default.EditNote, contentDescription = null)
            },
            minLines = 3,
            maxLines = 5,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

/**
 * 资料信息展示
 */
@Composable
private fun ProfileInfoSection(
    name: String,
    email: String,
    bio: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(horizontal = 32.dp)
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = email,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = bio,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
            textAlign = TextAlign.Center
        )
    }
}

/**
 * 统计区域
 */
@Composable
private fun ProfileStatsSection() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        StatItem(count = "128", label = "消息")
        StatItem(count = "5", label = "代理")
        StatItem(count = "30", label = "天数")
    }
}

/**
 * 统计项
 */
@Composable
private fun StatItem(count: String, label: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = count,
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 菜单区域
 */
@Composable
private fun ProfileMenuSection(
    onAccountSettingsClick: () -> Unit,
    onPrivacySettingsClick: () -> Unit,
    onNotificationSettingsClick: () -> Unit,
    onHelpClick: () -> Unit,
    onAboutClick: () -> Unit
) {
    Card(
        modifier = Modifier.padding(horizontal = 16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            MenuItem(
                icon = Icons.Default.AccountCircle,
                title = "账号设置",
                onClick = onAccountSettingsClick
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            MenuItem(
                icon = Icons.Default.Security,
                title = "隐私设置",
                onClick = onPrivacySettingsClick
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            MenuItem(
                icon = Icons.Default.Notifications,
                title = "通知设置",
                onClick = onNotificationSettingsClick
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            MenuItem(
                icon = Icons.Default.Help,
                title = "帮助与反馈",
                onClick = onHelpClick
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            MenuItem(
                icon = Icons.Default.Info,
                title = "关于",
                onClick = onAboutClick
            )
        }
    }
}

/**
 * 菜单项
 */
@Composable
private fun MenuItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = { Text(title) },
        leadingContent = {
            Icon(icon, contentDescription = null)
        },
        trailingContent = {
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        modifier = Modifier.clickable(onClick = onClick)
    )
}
