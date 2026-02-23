package com.sillychat.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SillyChatApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize app
    }
}
