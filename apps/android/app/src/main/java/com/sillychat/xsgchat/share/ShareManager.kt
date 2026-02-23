package com.sillychat.app.share

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.sillychat.app.data.model.Message
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 分享管理器
 * 处理文件分享、文本复制等功能
 */
@Singleton
class ShareManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    companion object {
        /**
         * FileProvider授权
         */
        const val FILE_PROVIDER_AUTHORITY = "com.sillychat.app.fileprovider"
    }

    /**
     * 分享文本
     */
    fun shareText(text: String, title: String = "分享"): Boolean {
        return try {
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
            }

            val chooser = Intent.createChooser(shareIntent, title)
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)

            Timber.d("文本分享已启动")
            true
        } catch (e: Exception) {
            Timber.e(e, "文本分享失败")
            false
        }
    }

    /**
     * 分享消息内容
     */
    fun shareMessage(message: Message): Boolean {
        val shareText = buildString {
            appendLine(message.content)
            message.senderName?.let {
                appendLine("— $it")
            }
        }
        return shareText(shareText, "分享消息")
    }

    /**
     * 分享多个消息
     */
    fun shareMessages(messages: List<Message>>, title: String = "分享聊天记录"): Boolean {
        return try {
            val shareText = buildString {
                appendLine(title)
                appendLine()
                messages.forEach { message ->
                    val sender = when (message.role) {
                        com.sillychat.app.data.model.MessageRole.USER -> "我"
                        com.sillychat.app.data.model.MessageRole.ASSISTANT -> message.senderName ?: "AI"
                        com.sillychat.app.data.model.MessageRole.SYSTEM -> "系统"
                    }
                    appendLine("$sender: ${message.content}")
                }
            }

            shareText(shareText, title)
        } catch (e: Exception) {
            Timber.e(e, "分享消息失败")
            false
        }
    }

    /**
     * 分享文件
     */
    fun shareFile(file: File, mimeType: String = "*/*", title: String = "分享文件"): Boolean {
        return try {
            val uri = FileProvider.getUriForFile(
                context,
                FILE_PROVIDER_AUTHORITY,
                file
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = mimeType
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, title)
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)

            Timber.d("文件分享已启动: ${file.name}")
            true
        } catch (e: Exception) {
            Timber.e(e, "文件分享失败: ${file.name}")
            false
        }
    }

    /**
     * 分享多个文件
     */
    fun shareFiles(files: List<File>>, mimeType: String = "*/*", title: String = "分享文件"): Boolean {
        return try {
            val uris = files.map { file ->
                FileProvider.getUriForFile(context, FILE_PROVIDER_AUTHORITY, file)
            }

            val shareIntent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                type = mimeType
                putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, title)
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)

            Timber.d("多文件分享已启动，共 ${files.size} 个文件")
            true
        } catch (e: Exception) {
            Timber.e(e, "多文件分享失败")
            false
        }
    }

    /**
     * 分享图片
     */
    fun shareImage(imageFile: File, title: String = "分享图片"): Boolean {
        return shareFile(imageFile, "image/*", title)
    }

    /**
     * 分享图片（通过URI）
     */
    fun shareImageUri(uri: Uri, title: String = "分享图片"): Boolean {
        return try {
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "image/*"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, title)
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)

            Timber.d("图片URI分享已启动")
            true
        } catch (e: Exception) {
            Timber.e(e, "图片URI分享失败")
            false
        }
    }

    /**
     * 复制文本到剪贴板
     */
    fun copyToClipboard(text: String, label: String = "文本"): Boolean {
        return try {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText(label, text)
            clipboard.setPrimaryClip(clip)

            Timber.d("文本已复制到剪贴板")
            true
        } catch (e: Exception) {
            Timber.e(e, "复制到剪贴板失败")
            false
        }
    }

    /**
     * 复制消息内容到剪贴板
     */
    fun copyMessage(message: Message): Boolean {
        return copyToClipboard(message.content, "消息内容")
    }

    /**
     * 从剪贴板获取文本
     */
    fun getTextFromClipboard(): String? {
        return try {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.primaryClip?.getItemAt(0)?.text?.toString()
        } catch (e: Exception) {
            Timber.e(e, "从剪贴板读取失败")
            null
        }
    }

    /**
     * 导出聊天记录为文件并分享
     */
    fun exportAndShareChat(
        messages: List<Message>>,
        conversationName: String = "聊天记录"
    ): Boolean {
        return try {
            // 创建导出内容
            val exportContent = buildString {
                appendLine("$conversationName 导出")
                appendLine("导出时间: ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())}")
                appendLine()

                messages.forEach { message ->
                    val time = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault())
                        .format(java.util.Date(message.timestamp))
                    val sender = when (message.role) {
                        com.sillychat.app.data.model.MessageRole.USER -> "我"
                        com.sillychat.app.data.model.MessageRole.ASSISTANT -> message.senderName ?: "AI"
                        com.sillychat.app.data.model.MessageRole.SYSTEM -> "系统"
                    }
                    appendLine("[$time] $sender:")
                    appendLine(message.content)
                    appendLine()
                }
            }

            // 保存到临时文件
            val fileName = "chat_export_${System.currentTimeMillis()}.txt"
            val file = File(context.cacheDir, fileName)
            file.writeText(exportContent)

            // 分享文件
            shareFile(file, "text/plain", "导出聊天记录")
        } catch (e: Exception) {
            Timber.e(e, "导出聊天记录失败")
            false
        }
    }

    /**
     * 打开其他应用分享到此应用
     */
    fun receiveSharedContent(intent: Intent): ReceivedShareData? {
        return when (intent.action) {
            Intent.ACTION_SEND -> handleSendIntent(intent)
            Intent.ACTION_SEND_MULTIPLE -> handleSendMultipleIntent(intent)
            else -> null
        }
    }

    /**
     * 处理单条分享Intent
     */
    private fun handleSendIntent(intent: Intent): ReceivedShareData? {
        return when {
            intent.type?.startsWith("text/") == true -> {
                intent.getStringExtra(Intent.EXTRA_TEXT)?.let {
                    ReceivedShareData.Text(it)
                }
            }
            intent.type?.startsWith("image/") == true -> {
                (intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))?.let {
                    ReceivedShareData.Image(it)
                }
            }
            else -> {
                (intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))?.let {
                    ReceivedShareData.File(it, intent.type ?: "*/*")
                }
            }
        }
    }

    /**
     * 处理多条分享Intent
     */
    private fun handleSendMultipleIntent(intent: Intent): ReceivedShareData? {
        return if (intent.type?.startsWith("image/") == true) {
            intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)?.let {
                ReceivedShareData.MultipleImages(it)
            }
        } else {
            null
        }
    }
}

/**
 * 接收的分享数据
 */
sealed class ReceivedShareData {
    data class Text(val content: String) : ReceivedShareData()
    data class Image(val uri: Uri) : ReceivedShareData()
    data class File(val uri: Uri, val mimeType: String) : ReceivedShareData()
    data class MultipleImages(val uris: List<Uri>) : ReceivedShareData()
}
