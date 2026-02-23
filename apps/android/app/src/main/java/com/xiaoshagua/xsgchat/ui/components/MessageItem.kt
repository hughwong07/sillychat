package com.xiaoshagua.xsgchat.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.xiaoshagua.xsgchat.data.model.Message
import com.xiaoshagua.xsgchat.data.model.MessageRole
import com.xiaoshagua.xsgchat.data.model.SyncStatus
import java.text.SimpleDateFormat
import java.util.*

/**
 * 消息项组件
 * 显示单条消息，支持用户消息和助手消息的不同样式
 */
@Composable
fun MessageItem(
    message: Message,
    modifier: Modifier = Modifier,
    onLongClick: (() -> Unit)? = null,
    onReplyClick: ((String) -> Unit)? = null
) {
    val isUser = message.isFromUser()
    val isSystem = message.isSystemMessage()

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
        contentAlignment = if (isUser) Alignment.CenterEnd else Alignment.CenterStart
    ) {
        when {
            isSystem -> SystemMessage(message = message)
            isUser -> UserMessage(
                message = message,
                onLongClick = onLongClick
            )
            else -> AssistantMessage(
                message = message,
                onLongClick = onLongClick,
                onReplyClick = onReplyClick
            )
        }
    }
}

/**
 * 用户消息组件
 */
@Composable
private fun UserMessage(
    message: Message,
    onLongClick: (() -> Unit)? = null
) {
    Column(
        horizontalAlignment = Alignment.End
    ) {
        // 消息气泡
        Surface(
            color = MaterialTheme.colorScheme.primary,
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 4.dp,
                bottomStart = 16.dp,
                bottomEnd = 16.dp
            ),
            tonalElevation = 0.dp,
            modifier = Modifier
                .widthIn(max = 280.dp)
        ) {
            Column(
                modifier = Modifier.padding(12.dp)
            ) {
                // 消息内容
                Text(
                    text = message.content,
                    color = MaterialTheme.colorScheme.onPrimary,
                    style = MaterialTheme.typography.bodyMedium
                )

                // 附件预览（如果有）
                message.attachments?.let { attachmentsJson ->
                    Spacer(modifier = Modifier.height(8.dp))
                    // 这里可以添加附件预览组件
                }
            }
        }

        // 时间和状态
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(top = 4.dp, end = 4.dp)
        ) {
            Text(
                text = formatTimestamp(message.timestamp),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )

            Spacer(modifier = Modifier.width(4.dp))

            // 同步状态图标
            SyncStatusIcon(status = message.syncStatus)
        }
    }
}

/**
 * 助手消息组件
 */
@Composable
private fun AssistantMessage(
    message: Message,
    onLongClick: (() -> Unit)? = null,
    onReplyClick: ((String) -> Unit)? = null
) {
    Column(
        horizontalAlignment = Alignment.Start
    ) {
        // 发送者名称
        if (message.senderName != null) {
            Text(
                text = message.senderName,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(start = 12.dp, bottom = 2.dp)
            )
        }

        Row(
            verticalAlignment = Alignment.Bottom
        ) {
            // 头像占位
            Surface(
                shape = RoundedCornerShape(50),
                color = MaterialTheme.colorScheme.secondaryContainer,
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = message.senderName?.firstOrNull()?.toString() ?: "AI",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // 消息气泡
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(
                    topStart = 4.dp,
                    topEnd = 16.dp,
                    bottomStart = 16.dp,
                    bottomEnd = 16.dp
                ),
                tonalElevation = 2.dp,
                modifier = Modifier.widthIn(max = 260.dp)
            ) {
                Column(
                    modifier = Modifier.padding(12.dp)
                ) {
                    // 消息内容
                    Text(
                        text = message.content,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

        // 时间
        Text(
            text = formatTimestamp(message.timestamp),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
            modifier = Modifier.padding(start = 52.dp, top = 4.dp)
        )
    }
}

/**
 * 系统消息组件
 */
@Composable
private fun SystemMessage(message: Message) {
    Box(
        modifier = Modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(
                text = message.content,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )
        }
    }
}

/**
 * 同步状态图标
 */
@Composable
private fun SyncStatusIcon(status: SyncStatus) {
    val icon = when (status) {
        SyncStatus.SYNCED -> Icons.Default.DoneAll
        SyncStatus.PENDING -> Icons.Default.AccessTime
        SyncStatus.SYNCING -> Icons.Default.Check
        SyncStatus.FAILED -> Icons.Default.Error
    }

    val color = when (status) {
        SyncStatus.SYNCED -> MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)
        SyncStatus.PENDING -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
        SyncStatus.SYNCING -> MaterialTheme.colorScheme.primary
        SyncStatus.FAILED -> MaterialTheme.colorScheme.error
    }

    Icon(
        imageVector = icon,
        contentDescription = when (status) {
            SyncStatus.SYNCED -> "已同步"
            SyncStatus.PENDING -> "待同步"
            SyncStatus.SYNCING -> "同步中"
            SyncStatus.FAILED -> "同步失败"
        },
        tint = color,
        modifier = Modifier.size(14.dp)
    )
}

/**
 * 格式化时间戳
 */
private fun formatTimestamp(timestamp: Long): String {
    val date = Date(timestamp)
    val now = Calendar.getInstance()
    val messageTime = Calendar.getInstance().apply { time = date }

    return when {
        // 今天
        now.get(Calendar.YEAR) == messageTime.get(Calendar.YEAR) &&
        now.get(Calendar.DAY_OF_YEAR) == messageTime.get(Calendar.DAY_OF_YEAR) -> {
            SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
        }
        // 昨天
        now.get(Calendar.YEAR) == messageTime.get(Calendar.YEAR) &&
        now.get(Calendar.DAY_OF_YEAR) - messageTime.get(Calendar.DAY_OF_YEAR) == 1 -> {
            "昨天 " + SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
        }
        // 今年
        now.get(Calendar.YEAR) == messageTime.get(Calendar.YEAR) -> {
            SimpleDateFormat("MM-dd HH:mm", Locale.getDefault()).format(date)
        }
        // 其他
        else -> {
            SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(date)
        }
    }
}

/**
 * 正在输入指示器
 */
@Composable
fun TypingIndicator(
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .padding(horizontal = 12.dp, vertical = 4.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        // 头像
        Surface(
            shape = RoundedCornerShape(50),
            color = MaterialTheme.colorScheme.secondaryContainer,
            modifier = Modifier.size(36.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = "AI",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        // 输入动画
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = RoundedCornerShape(16.dp),
            tonalElevation = 2.dp
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                repeat(3) { index ->
                    TypingDot(delayMillis = index * 200)
                }
            }
        }
    }
}

/**
 * 输入动画点
 */
@Composable
private fun TypingDot(delayMillis: Int) {
    val infiniteTransition = androidx.compose.animation.core.rememberInfiniteTransition(label = "")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 1.0f,
        animationSpec = androidx.compose.animation.core.infiniteRepeatable(
            animation = androidx.compose.animation.core.tween(
                durationMillis = 600,
                delayMillis = delayMillis
            ),
            repeatMode = androidx.compose.animation.core.RepeatMode.Reverse
        ),
        label = ""
    )

    Box(
        modifier = Modifier
            .size(8.dp)
            .clip(RoundedCornerShape(50))
            .background(
                MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
    )
}

/**
 * 流式消息组件（用于打字机效果）
 */
@Composable
fun StreamingMessageItem(
    content: String,
    agentName: String?,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Column(
            horizontalAlignment = Alignment.Start
        ) {
            // 发送者名称
            if (agentName != null) {
                Text(
                    text = agentName,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(start = 12.dp, bottom = 2.dp)
                )
            }

            Row(
                verticalAlignment = Alignment.Bottom
            ) {
                // 头像
                Surface(
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = agentName?.firstOrNull()?.toString() ?: "AI",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                // 消息气泡
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(
                        topStart = 4.dp,
                        topEnd = 16.dp,
                        bottomStart = 16.dp,
                        bottomEnd = 16.dp
                    ),
                    tonalElevation = 2.dp,
                    modifier = Modifier.widthIn(max = 260.dp)
                ) {
                    Text(
                        text = content,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // 输入中指示器
            Text(
                text = "输入中...",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(start = 52.dp, top = 4.dp)
            )
        }
    }
}
