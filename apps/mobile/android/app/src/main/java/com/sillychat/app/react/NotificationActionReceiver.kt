package com.sillychat.app.react

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val actionId = intent.getStringExtra("actionId")

        val params = Arguments.createMap().apply {
            putString("actionId", actionId)
        }

        // Send event to React Native
        val notificationModule = (context.applicationContext as? com.sillychat.app.MainApplication)
            ?.reactNativeHost
            ?.reactInstanceManager
            ?.currentReactContext
            ?.getNativeModule(NotificationModule::class.java)

        notificationModule?.sendEvent(NotificationModule.EVENT_NOTIFICATION_OPENED, params)
    }
}
