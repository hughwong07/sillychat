package com.sillychat.app.react

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.sillychat.app.MainActivity

class NotificationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val CHANNEL_ID = "sillychat_default_channel"
        private const val CHANNEL_NAME = "SillyChat Notifications"
        private const val NOTIFICATION_ID_BASE = 1000

        private var notificationIdCounter = NOTIFICATION_ID_BASE

        const val EVENT_NOTIFICATION_RECEIVED = "onNotificationReceived"
        const val EVENT_NOTIFICATION_OPENED = "onNotificationOpened"
        const val EVENT_TOKEN_RECEIVED = "onTokenReceived"
    }

    private val notificationManager: NotificationManager by lazy {
        reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }

    init {
        createNotificationChannel()
    }

    override fun getName(): String = "NotificationModule"

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "SillyChat app notifications"
                enableLights(true)
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        try {
            // Android 13+ requires POST_NOTIFICATIONS permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val permission = android.Manifest.permission.POST_NOTIFICATIONS
                val granted = reactApplicationContext.checkSelfPermission(permission) ==
                        android.content.pm.PackageManager.PERMISSION_GRANTED

                if (granted) {
                    promise.resolve(createPermissionResult(true, true))
                } else {
                    // Permission not granted, return false but don't reject
                    promise.resolve(createPermissionResult(false, false))
                }
            } else {
                // Below Android 13, notifications are granted by default
                promise.resolve(createPermissionResult(true, true))
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Failed to request notification permissions", e)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactApplicationContext.checkSelfPermission(
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            } else {
                true
            }
            promise.resolve(createPermissionResult(granted, granted))
        } catch (e: Exception) {
            promise.reject("PERMISSION_CHECK_ERROR", "Failed to check notification permissions", e)
        }
    }

    private fun createPermissionResult(alert: Boolean, badge: Boolean): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("alert", alert)
            putBoolean("badge", badge)
            putBoolean("sound", true)
        }
    }

    @ReactMethod
    fun getToken(promise: Promise) {
        try {
            // In a real app, this would get the FCM token
            // For now, return a mock token
            val mockToken = "mock_fcm_token_${System.currentTimeMillis()}"
            promise.resolve(mockToken)
        } catch (e: Exception) {
            promise.reject("TOKEN_ERROR", "Failed to get notification token", e)
        }
    }

    @ReactMethod
    fun displayNotification(options: ReadableMap, promise: Promise) {
        try {
            val title = options.getString("title") ?: "SillyChat"
            val body = options.getString("body") ?: ""
            val data = options.getMap("data")

            val intent = Intent(reactApplicationContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                data?.toHashMap()?.forEach { (key, value) ->
                    putExtra(key, value.toString())
                }
            }

            val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val pendingIntent = PendingIntent.getActivity(
                reactApplicationContext,
                0,
                intent,
                pendingIntentFlags
            )

            val notificationBuilder = NotificationCompat.Builder(reactApplicationContext, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)

            // Add actions if provided
            val actions = options.getArray("actions")
            actions?.let { addActionsToNotification(notificationBuilder, it) }

            val notificationId = notificationIdCounter++
            notificationManager.notify(notificationId, notificationBuilder.build())

            val result = Arguments.createMap().apply {
                putInt("notificationId", notificationId)
                putBoolean("success", true)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("DISPLAY_ERROR", "Failed to display notification", e)
        }
    }

    private fun addActionsToNotification(
        builder: NotificationCompat.Builder,
        actions: ReadableArray
    ) {
        for (i in 0 until actions.size()) {
            val action = actions.getMap(i)
            val actionTitle = action?.getString("title") ?: continue
            val actionId = action.getString("id") ?: continue

            val actionIntent = Intent(reactApplicationContext, NotificationActionReceiver::class.java).apply {
                putExtra("actionId", actionId)
            }

            val actionPendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                i,
                actionIntent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            )

            builder.addAction(android.R.drawable.ic_menu_send, actionTitle, actionPendingIntent)
        }
    }

    @ReactMethod
    fun cancelNotification(notificationId: Int, promise: Promise) {
        try {
            notificationManager.cancel(notificationId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", "Failed to cancel notification", e)
        }
    }

    @ReactMethod
    fun cancelAllNotifications(promise: Promise) {
        try {
            notificationManager.cancelAll()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ALL_ERROR", "Failed to cancel all notifications", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in Event Emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in Event Emitter
    }

    fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }
}
