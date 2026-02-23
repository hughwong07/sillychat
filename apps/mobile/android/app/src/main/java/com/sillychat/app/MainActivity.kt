package com.sillychat.app

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.sillychat.app.react.NotificationModule
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * MainActivity for SillyChat React Native application.
 * Handles notification events and deep linking.
 */
class MainActivity : ReactActivity() {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String = "SillyChat"

    /**
     * Returns the instance of the [ReactActivityDelegate].
     * We use [DefaultReactActivityDelegate] which allows you to enable
     * New Architecture with a single boolean flag [fabricEnabled].
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleNotificationIntent(intent)
    }

    override fun onNewIntent(intent: android.content.Intent?) {
        super.onNewIntent(intent)
        handleNotificationIntent(intent)
    }

    private fun handleNotificationIntent(intent: android.content.Intent?) {
        intent?.extras?.let { extras ->
            // Check if this intent was triggered by a notification
            if (extras.containsKey("notificationData")) {
                val notificationData = extras.getString("notificationData")
                sendNotificationEvent(notificationData)
            }
        }
    }

    private fun sendNotificationEvent(data: String?) {
        val reactInstanceManager = (application as? MainApplication)?.reactNativeHost?.reactInstanceManager
        val reactContext = reactInstanceManager?.currentReactContext

        reactContext?.let { context ->
            val params = com.facebook.react.bridge.Arguments.createMap().apply {
                putString("data", data)
                putBoolean("fromBackground", true)
            }
            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(NotificationModule.EVENT_NOTIFICATION_OPENED, params)
        }
    }
}
