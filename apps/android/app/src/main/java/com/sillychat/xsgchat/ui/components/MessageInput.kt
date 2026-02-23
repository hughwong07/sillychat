package com.sillychat.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp

/**
 * 消息输入组件
 * 包含文本输入框、发送按钮和附件按钮
 */
@Composable
fun MessageInput(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    onAttachClick: (() -> Unit)? = null,
    onVoiceClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isSending: Boolean = false,
    placeholder: String = "输入消息...",
    maxLines: Int = 5
) {
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    Surface(
        tonalElevation = 3.dp,
        color = MaterialTheme.colorScheme.surface,
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            // 附件按钮
            if (onAttachClick != null) {
                IconButton(
                    onClick = onAttachClick,
                    enabled = enabled && !isSending
                ) {
                    Icon(
                        imageVector = Icons.Default.AttachFile,
                        contentDescription = "添加附件",
                        tint = if (enabled) {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.38f)
                        }
                    )
                }
            }

            // 语音按钮
            if (onVoiceClick != null && value.isEmpty()) {
                IconButton(
                    onClick = onVoiceClick,
                    enabled = enabled
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "语音输入",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // 输入框
            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier
                    .weight(1f)
                    .focusRequester(focusRequester)
                    .onKeyEvent { event ->
                        if (event.key == Key.Enter) {
                            if (value.isNotBlank() && enabled && !isSending) {
                                onSend()
                            }
                            true
                        } else {
                            false
                        }
                    },
                placeholder = { Text(placeholder) },
                enabled = enabled && !isSending,
                maxLines = maxLines,
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Sentences,
                    imeAction = ImeAction.Send
                ),
                keyboardActions = KeyboardActions(
                    onSend = {
                        if (value.isNotBlank()) {
                            onSend()
                        }
                    }
                ),
                shape = MaterialTheme.shapes.extraLarge,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    disabledContainerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.5f)
                )
            )

            Spacer(modifier = Modifier.width(8.dp))

            // 发送按钮
            SendButton(
                onClick = {
                    onSend()
                    keyboardController?.hide()
                },
                enabled = value.isNotBlank() && enabled && !isSending,
                isSending = isSending
            )
        }
    }
}

/**
 * 发送按钮
 */
@Composable
private fun SendButton(
    onClick: () -> Unit,
    enabled: Boolean,
    isSending: Boolean
) {
    FilledIconButton(
        onClick = onClick,
        enabled = enabled,
        colors = IconButtonDefaults.filledIconButtonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            disabledContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.38f),
            disabledContentColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.38f)
        ),
        modifier = Modifier.size(48.dp)
    ) {
        if (isSending) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary
            )
        } else {
            Icon(
                imageVector = Icons.Default.Send,
                contentDescription = "发送",
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

/**
 * 扩展输入栏
 * 包含更多功能按钮
 */
@Composable
fun ExtendedMessageInput(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    onImageClick: (() -> Unit)? = null,
    onCameraClick: (() -> Unit)? = null,
    onFileClick: (() -> Unit)? = null,
    onVoiceClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isSending: Boolean = false
) {
    var showAttachmentMenu by remember { mutableStateOf(false) }

    Column(modifier = modifier) {
        // 附件菜单
        if (showAttachmentMenu) {
            AttachmentMenu(
                onImageClick = {
                    onImageClick?.invoke()
                    showAttachmentMenu = false
                },
                onCameraClick = {
                    onCameraClick?.invoke()
                    showAttachmentMenu = false
                },
                onFileClick = {
                    onFileClick?.invoke()
                    showAttachmentMenu = false
                },
                modifier = Modifier.padding(bottom = 8.dp)
            )
        }

        // 输入栏
        MessageInput(
            value = value,
            onValueChange = onValueChange,
            onSend = onSend,
            onAttachClick = {
                showAttachmentMenu = !showAttachmentMenu
            },
            onVoiceClick = onVoiceClick,
            enabled = enabled,
            isSending = isSending
        )
    }
}

/**
 * 附件菜单
 */
@Composable
private fun AttachmentMenu(
    onImageClick: () -> Unit,
    onCameraClick: () -> Unit,
    onFileClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        tonalElevation = 2.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            AttachmentMenuItem(
                icon = Icons.Default.AttachFile,
                label = "图片",
                onClick = onImageClick
            )
            AttachmentMenuItem(
                icon = Icons.Default.AttachFile,
                label = "相机",
                onClick = onCameraClick
            )
            AttachmentMenuItem(
                icon = Icons.Default.AttachFile,
                label = "文件",
                onClick = onFileClick
            )
        }
    }
}

/**
 * 附件菜单项
 */
@Composable
private fun AttachmentMenuItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        FilledIconButton(
            onClick = onClick,
            modifier = Modifier.size(56.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                modifier = Modifier.size(28.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

/**
 * 语音输入面板
 */
@Composable
fun VoiceInputPanel(
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
    isRecording: Boolean,
    modifier: Modifier = Modifier
) {
    Surface(
        tonalElevation = 3.dp,
        color = MaterialTheme.colorScheme.surface,
        modifier = modifier
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // 录音按钮
                FilledIconButton(
                    onClick = {
                        if (isRecording) {
                            onStopRecording()
                        } else {
                            onStartRecording()
                        }
                    },
                    modifier = Modifier.size(72.dp),
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = if (isRecording) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.primary
                        }
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = if (isRecording) "停止录音" else "开始录音",
                        modifier = Modifier.size(36.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = if (isRecording) "录音中..." else "按住说话",
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (isRecording) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    }
                )

                if (isRecording) {
                    Spacer(modifier = Modifier.height(8.dp))
                    // 录音波形动画
                    RecordingWaveform()
                }
            }
        }
    }
}

/**
 * 录音波形动画
 */
@Composable
private fun RecordingWaveform() {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(5) { index ->
            val infiniteTransition = androidx.compose.animation.core.rememberInfiniteTransition(label = "")
            val height by infiniteTransition.animateFloat(
                initialValue = 8f,
                targetValue = 24f,
                animationSpec = androidx.compose.animation.core.infiniteRepeatable(
                    animation = androidx.compose.animation.core.tween(
                        durationMillis = 500,
                        delayMillis = index * 100
                    ),
                    repeatMode = androidx.compose.animation.core.RepeatMode.Reverse
                ),
                label = ""
            )

            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(height.dp)
                    .clip(MaterialTheme.shapes.small)
                    .background(MaterialTheme.colorScheme.error)
            )
        }
    }
}
