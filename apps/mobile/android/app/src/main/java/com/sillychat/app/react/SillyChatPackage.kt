package com.sillychat.app.react

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * ReactPackage implementation that registers all SillyChat native modules.
 * This package provides:
 * - NotificationModule: Push notification handling
 * - StorageModule: Secure storage with encryption and biometric support
 * - BiometricModule: Biometric authentication
 */
class SillyChatPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            NotificationModule(reactContext),
            StorageModule(reactContext),
            BiometricModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
