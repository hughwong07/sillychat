package com.sillychat.app.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.sillychat.app.MainActivity
import com.sillychat.app.R
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

/**
 * Firebase Cloud Messaging 服务
 * 处理推送消息的接收和显示
 */
@AndroidEntryPoint
class FCMService : FirebaseMessagingService() {

    companion object {
        /**
         * 通知渠道ID
         */
        const val CHANNEL_ID_MESSAGES = "sillychat_messages"
        const val CHANNEL_ID_SYSTEM = "sillychat_system"

        /**
         * 通知ID
         */
        const val NOTIFICATION_ID_NEW_MESSAGE = 1001
        const val NOTIFICATION_ID_SYSTEM = 1002
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    /**
     * 创建通知渠道（Android 8.0+ 必需）
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // 消息通知渠道
            val messageChannel = NotificationChannel(
                CHANNEL_ID_MESSAGES,
                "消息通知",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "接收新消息的通知"
                setShowBadge(true)
                enableLights(true)
                lightColor = getColor(R.color.purple_500)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, audioAttributes)
            }

            // 系统通知渠道
            val systemChannel = NotificationChannel(
                CHANNEL_ID_SYSTEM,
                "系统通知",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "系统更新和重要通知"
                setShowBadge(true)
            }

            notificationManager.createNotificationChannels(listOf(messageChannel, systemChannel))
            Timber.d("通知渠道创建成功")
        }
    }

    /**
     * 收到新消息时调用
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        Timber.d("收到FCM消息: ${remoteMessage.messageId}")
        Timber.d("消息数据: ${remoteMessage.data}")

        // 处理数据消息
        when (remoteMessage.data["type"]) {
            "new_message" -> handleNewMessage(remoteMessage)
            "system" -> handleSystemNotification(remoteMessage)
            else -> handleDefaultNotification(remoteMessage)
        }
    }

    /**
     * 处理新消息通知
     */
    private fun handleNewMessage(remoteMessage: RemoteMessage) {
        val title = remoteMessage.data["title"] ?: "新消息"
        val body = remoteMessage.data["body"] ?: ""
        val conversationId = remoteMessage.data["conversationId"]
        val messageId = remoteMessage.data["messageId"]

        // 创建打开应用的Intent
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("conversationId", conversationId)
            putExtra("messageId", messageId)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 构建通知
        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID_MESSAGES)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(NotificationCompat.DEFAULT_ALL)

        // 如果是长消息，显示展开样式
        if (body.length > 30) {
            notificationBuilder.setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(body)
            )
        }

        // 显示通知
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID_NEW_MESSAGE, notificationBuilder.build())

        Timber.d("新消息通知已显示: $messageId")
    }

    /**
     * 处理系统通知
     */
    private fun handleSystemNotification(remoteMessage: RemoteMessage) {
        val title = remoteMessage.data["title"] ?: "系统通知"
        val body = remoteMessage.data["body"] ?: ""

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID_SYSTEM)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID_SYSTEM, notificationBuilder.build())
    }

    /**
     * 处理默认通知
     */
    private fun handleDefaultNotification(remoteMessage: RemoteMessage) {
        val title = remoteMessage.notification?.title ?: "通知"
        val body = remoteMessage.notification?.body ?: ""

        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID_SYSTEM)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
    }

    /**
     * Token更新时调用
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Timber.d("FCM Token更新: $token")

        // 将新Token发送到服务器
        sendTokenToServer(token)
    }

    /**
     * 发送Token到服务器
     */
    private fun sendTokenToServer(token: String) {
        // TODO: 实现Token上传逻辑
        // 这里应该调用API将Token与当前用户关联
        Timber.d("Token已准备发送到服务器")
    }

    /**
     * 订阅主题
     */
    fun subscribeToTopic(topic: String) {
        com.google.firebase.messaging.FirebaseMessaging.getInstance()
            .subscribeToTopic(topic)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    Timber.d("成功订阅主题: $topic")
                } else {
                    Timber.e("订阅主题失败: $topic")
                }
            }
    }

    /**
     * 取消订阅主题
     */
    fun unsubscribeFromTopic(topic: String) {
        com.google.firebase.messaging.FirebaseMessaging.getInstance()
            .unsubscribeFromTopic(topic)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    Timber.d("成功取消订阅主题: $topic")
                } else {
                    Timber.e("取消订阅主题失败: $topic")
                }
            }
    }
}

/**
 * 通知管理器
 * 用于在应用内管理通知设置
 */
class NotificationManagerHelper(private val context: Context) {

    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    /**
     * 检查通知权限
     */
    fun areNotificationsEnabled(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.areNotificationsEnabled()
        } else {
            true
        }
    }

    /**
     * 获取通知渠道设置
     */
    fun getChannelSettings(channelId: String): NotificationChannel? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.getNotificationChannel(channelId)
        } else {
            null
        }
    }

    /**
     * 清除所有通知
     */
    fun clearAllNotifications() {
        notificationManager.cancelAll()
    }

    /**
     * 清除指定ID的通知
     */
    fun clearNotification(notificationId: Int) {
        notificationManager.cancel(notificationId)
    }
}
