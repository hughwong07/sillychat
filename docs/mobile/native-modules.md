# 原生模块文档

> 本文档详细介绍 SillyChat Android 应用的原生模块，包括模块列表、桥接层说明和使用方法。

---

## 1. 原生模块列表

### 1.1 模块概览

| 模块名称 | 功能描述 | 技术方案 | 优先级 |
|----------|----------|----------|--------|
| NotificationModule | 本地通知和推送 | Firebase Cloud Messaging + 本地通知 | 高 |
| BackgroundTaskModule | 后台任务管理 | WorkManager + 前台服务 | 高 |
| StorageModule | 加密存储 | MMKV + SQLCipher | 高 |
| CryptoModule | 加密运算 | Android Keystore + JSI | 高 |
| FileModule | 文件管理 | 原生文件 API | 中 |
| DeviceModule | 设备信息 | Android 系统 API | 中 |
| BiometricModule | 生物识别 | BiometricPrompt | 中 |
| NetworkModule | 网络状态 | ConnectivityManager | 低 |

### 1.2 模块架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     JavaScript 层 (React Native)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   JS API     │  │   Hooks      │  │   Services   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     Bridge 层 (TurboModules/JSI)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Native Bridge / JSI                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     Native 层 (Kotlin/Java)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Module A    │  │  Module B    │  │  Module C    │          │
│  │  (Kotlin)    │  │  (Kotlin)    │  │  (Kotlin)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────▼─────────────────▼─────────────────▼───────┐          │
│  │              Core Library (Rust/C++)              │          │
│  └───────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 通知模块 (NotificationModule)

### 2.1 功能说明

- 接收 Firebase 云消息推送
- 显示本地通知
- 处理通知点击事件
- 管理通知渠道 (Android 8.0+)

### 2.2 原生实现

```kotlin
// android/app/src/main/java/com/sillychat/notification/NotificationModule.kt

package com.sillychat.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.google.firebase.messaging.FirebaseMessaging
import com.sillychat.MainActivity

class NotificationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val notificationManager = reactContext.getSystemService(
        Context.NOTIFICATION_SERVICE
    ) as NotificationManager

    override fun getName() = "NotificationModule"

    init {
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channels = listOf(
                NotificationChannel(
                    CHANNEL_MESSAGES,
                    "消息通知",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "新消息提醒"
                    enableVibration(true)
                    enableLights(true)
                },
                NotificationChannel(
                    CHANNEL_SYSTEM,
                    "系统通知",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "系统消息和公告"
                }
            )
            notificationManager.createNotificationChannels(channels)
        }
    }

    @ReactMethod
    fun getFCMToken(promise: Promise) {
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token ->
                promise.resolve(token)
            }
            .addOnFailureListener { e ->
                promise.reject("FCM_ERROR", e.message)
            }
    }

    @ReactMethod
    fun showLocalNotification(title: String, body: String, data: ReadableMap?) {
        val intent = Intent(reactApplicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            data?.let {
                for (key in it.keySetIterator()) {
                    putExtra(key, it.getString(key))
                }
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            reactApplicationContext,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(
            reactApplicationContext,
            CHANNEL_MESSAGES
        )
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    @ReactMethod
    fun cancelNotification(notificationId: Int) {
        notificationManager.cancel(notificationId)
    }

    @ReactMethod
    fun cancelAllNotifications() {
        notificationManager.cancelAll()
    }

    @ReactMethod
    fun getInitialNotification(promise: Promise) {
        val activity = currentActivity
        if (activity != null && activity.intent != null) {
            val extras = activity.intent.extras
            if (extras != null) {
                val map = Arguments.createMap()
                for (key in extras.keySet()) {
                    map.putString(key, extras.getString(key))
                }
                promise.resolve(map)
            } else {
                promise.resolve(null)
            }
        } else {
            promise.resolve(null)
        }
    }

    companion object {
        const val CHANNEL_MESSAGES = "messages"
        const val CHANNEL_SYSTEM = "system"
    }
}
```

### 2.3 Firebase 消息服务

```kotlin
// android/app/src/main/java/com/sillychat/notification/SillyChatFirebaseService.kt

package com.sillychat.notification

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.sillychat.core.CoreLibrary

class SillyChatFirebaseService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        // 解密消息内容
        val encryptedData = message.data["encrypted_payload"]
        val decryptedData = CoreLibrary.decrypt(encryptedData)

        // 显示通知
        val notificationModule = NotificationModule(applicationContext as ReactApplicationContext)
        notificationModule.showLocalNotification(
            message.notification?.title ?: "新消息",
            message.notification?.body ?: "",
            Arguments.makeNativeMap(decryptedData)
        )

        // 发送到 JS 层
        sendEventToJS("onNotificationReceived", decryptedData)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // 上传新 Token 到服务器
        sendEventToJS("onFCMTokenRefresh", mapOf("token" to token))
    }

    private fun sendEventToJS(eventName: String, data: Map<String, Any?>) {
        // 通过 RCTDeviceEventEmitter 发送事件
    }
}
```

### 2.4 JavaScript API

```typescript
// src/services/notification/NotificationService.ts

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { NotificationModule } = NativeModules;
const notificationEmitter = new NativeEventEmitter(NotificationModule);

export interface NotificationData {
  title: string;
  body: string;
  type: 'message' | 'system' | 'call';
  payload?: Record<string, any>;
}

export class NotificationService {
  private static listeners: Array<(data: NotificationData) => void> = [];

  static async getFCMToken(): Promise<string> {
    return await NotificationModule.getFCMToken();
  }

  static async showLocalNotification(data: NotificationData): Promise<void> {
    await NotificationModule.showLocalNotification(
      data.title,
      data.body,
      data.payload || {}
    );
  }

  static async cancelAllNotifications(): Promise<void> {
    await NotificationModule.cancelAllNotifications();
  }

  static async getInitialNotification(): Promise<NotificationData | null> {
    const data = await NotificationModule.getInitialNotification();
    return data ? this.parseNotificationData(data) : null;
  }

  static addListener(callback: (data: NotificationData) => void): () => void {
    const subscription = notificationEmitter.addListener(
      'onNotificationReceived',
      (data) => callback(this.parseNotificationData(data))
    );

    this.listeners.push(callback);

    return () => {
      subscription.remove();
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private static parseNotificationData(data: any): NotificationData {
    return {
      title: data.title || '',
      body: data.body || '',
      type: data.type || 'message',
      payload: data.payload,
    };
  }
}
```

### 2.5 使用方法

```typescript
// 获取 FCM Token
const token = await NotificationService.getFCMToken();
await api.updateFCMToken(token);

// 显示本地通知
await NotificationService.showLocalNotification({
  title: '新消息',
  body: '张三: 你好！',
  type: 'message',
  payload: { conversationId: 'conv-123' },
});

// 监听通知
useEffect(() => {
  const unsubscribe = NotificationService.addListener((data) => {
    console.log('收到通知:', data);
    // 导航到对应页面
    navigation.navigate('Chat', { id: data.payload?.conversationId });
  });

  return unsubscribe;
}, []);
```

---

## 3. 后台任务模块 (BackgroundTaskModule)

### 3.1 功能说明

- 后台消息同步
- 心跳保活
- 定时任务执行

### 3.2 原生实现

```kotlin
// android/app/src/main/java/com/sillychat/background/BackgroundTaskModule.kt

package com.sillychat.background

import android.content.Context
import androidx.work.*
import com.facebook.react.bridge.*
import java.util.concurrent.TimeUnit

class BackgroundTaskModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BackgroundTaskModule"

    @ReactMethod
    fun scheduleSyncTask(intervalMinutes: Int, promise: Promise) {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

            val syncWork = PeriodicWorkRequestBuilder<SyncWorker>(
                intervalMinutes.toLong(),
                TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .addTag("sync")
                .build()

            WorkManager.getInstance(reactApplicationContext)
                .enqueueUniquePeriodicWork(
                    "message_sync",
                    ExistingPeriodicWorkPolicy.KEEP,
                    syncWork
                )

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun cancelSyncTask(promise: Promise) {
        try {
            WorkManager.getInstance(reactApplicationContext)
                .cancelUniqueWork("message_sync")
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", e.message)
        }
    }

    @ReactMethod
    fun startKeepAliveService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, KeepAliveService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopKeepAliveService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, KeepAliveService::class.java)
            reactApplicationContext.stopService(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message)
        }
    }
}

// Worker 实现
class SyncWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            // 调用核心层进行消息同步
            val core = CoreLibrary()
            core.syncMessages()

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}

// 保活服务
class KeepAliveService : Service() {

    override fun onCreate() {
        super.onCreate()
        startForeground()
    }

    private fun startForeground() {
        val channelId = "keep_alive"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "后台服务",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("SillyChat")
            .setContentText("保持连接中...")
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .build()

        startForeground(1, notification)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
```

### 3.3 JavaScript API

```typescript
// src/services/background/BackgroundTaskService.ts

import { NativeModules } from 'react-native';

const { BackgroundTaskModule } = NativeModules;

export class BackgroundTaskService {
  static async scheduleSyncTask(intervalMinutes: number = 15): Promise<void> {
    await BackgroundTaskModule.scheduleSyncTask(intervalMinutes);
  }

  static async cancelSyncTask(): Promise<void> {
    await BackgroundTaskModule.cancelSyncTask();
  }

  static async startKeepAlive(): Promise<void> {
    await BackgroundTaskModule.startKeepAliveService();
  }

  static async stopKeepAlive(): Promise<void> {
    await BackgroundTaskModule.stopKeepAliveService();
  }
}
```

---

## 4. 存储模块 (StorageModule)

### 4.1 功能说明

- 加密键值存储 (MMKV)
- 加密数据库 (SQLCipher)
- 密钥管理 (Android Keystore)

### 4.2 原生实现

```kotlin
// android/app/src/main/java/com/sillychat/storage/StorageModule.kt

package com.sillychat.storage

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import com.facebook.react.bridge.*
import com.tencent.mmkv.MMKV
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class StorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val mmkv: MMKV by lazy {
        MMKV.initialize(reactApplicationContext)
        MMKV.defaultMMKV()
    }

    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply {
        load(null)
    }

    override fun getName() = "StorageModule"

    @ReactMethod
    fun setItem(key: String, value: String, encrypted: Boolean, promise: Promise) {
        try {
            val dataToStore = if (encrypted) {
                encrypt(value)
            } else {
                value
            }
            mmkv.encode(key, dataToStore)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STORE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getItem(key: String, encrypted: Boolean, promise: Promise) {
        try {
            val stored = mmkv.decodeString(key)
            if (stored == null) {
                promise.resolve(null)
                return
            }

            val value = if (encrypted) {
                decrypt(stored)
            } else {
                stored
            }
            promise.resolve(value)
        } catch (e: Exception) {
            promise.reject("RETRIEVE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun removeItem(key: String, promise: Promise) {
        try {
            mmkv.removeValueForKey(key)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("REMOVE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun clear(promise: Promise) {
        try {
            mmkv.clearAll()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", e.message)
        }
    }

    private fun encrypt(plaintext: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val iv = cipher.iv
        val encrypted = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(iv + encrypted, Base64.DEFAULT)
    }

    private fun decrypt(ciphertext: String): String {
        val decoded = Base64.decode(ciphertext, Base64.DEFAULT)
        val iv = decoded.sliceArray(0 until 12)
        val encrypted = decoded.sliceArray(12 until decoded.size)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(encrypted), Charsets.UTF_8)
    }

    private fun getOrCreateKey(): SecretKey {
        val alias = "sillychat_storage_key"
        return keyStore.getKey(alias, null) as? SecretKey ?: generateKey(alias)
    }

    private fun generateKey(alias: String): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            "AndroidKeyStore"
        )
        keyGenerator.init(
            KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return keyGenerator.generateKey()
    }
}
```

### 4.3 JavaScript API

```typescript
// src/services/storage/SecureStorage.ts

import { NativeModules } from 'react-native';

const { StorageModule } = NativeModules;

export class SecureStorage {
  static async setItem(key: string, value: string, encrypted = true): Promise<void> {
    await StorageModule.setItem(key, value, encrypted);
  }

  static async getItem(key: string, encrypted = true): Promise<string | null> {
    return await StorageModule.getItem(key, encrypted);
  }

  static async removeItem(key: string): Promise<void> {
    await StorageModule.removeItem(key);
  }

  static async clear(): Promise<void> {
    await StorageModule.clear();
  }
}
```

---

## 5. 生物识别模块 (BiometricModule)

### 5.1 功能说明

- 指纹识别
- 面部识别
- 生物识别状态监听

### 5.2 原生实现

```kotlin
// android/app/src/main/java/com/sillychat/biometric/BiometricModule.kt

package com.sillychat.biometric

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.*

class BiometricModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BiometricModule"

    @ReactMethod
    fun isAvailable(promise: Promise) {
        val biometricManager = BiometricManager.from(reactApplicationContext)
        val canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        )

        val result = Arguments.createMap().apply {
            putBoolean("available", canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS)
            putString("error", getErrorString(canAuthenticate))
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun getBiometricType(promise: Promise) {
        val biometricManager = BiometricManager.from(reactApplicationContext)
        val canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        )

        if (canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS) {
            // 检测设备支持的生物识别类型
            val type = when {
                reactApplicationContext.packageManager.hasSystemFeature(
                    PackageManager.FEATURE_FACE
                ) -> "face"
                reactApplicationContext.packageManager.hasSystemFeature(
                    PackageManager.FEATURE_FINGERPRINT
                ) -> "fingerprint"
                else -> "unknown"
            }
            promise.resolve(type)
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun authenticate(title: String, subtitle: String, promise: Promise) {
        val activity = currentActivity as? FragmentActivity
            ?: run {
                promise.reject("NO_ACTIVITY", "需要 FragmentActivity")
                return
            }

        val executor = ContextCompat.getMainExecutor(reactApplicationContext)

        val biometricPrompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(
                    result: AuthenticationResult
                ) {
                    promise.resolve(true)
                }

                override fun onAuthenticationFailed() {
                    promise.resolve(false)
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    promise.reject("AUTH_ERROR", errString.toString())
                }
            }
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText("取消")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .build()

        biometricPrompt.authenticate(promptInfo)
    }

    private fun getErrorString(errorCode: Int): String? {
        return when (errorCode) {
            BiometricManager.BIOMETRIC_SUCCESS -> null
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> "设备不支持生物识别"
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> "生物识别硬件不可用"
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "未录入生物识别信息"
            else -> "未知错误"
        }
    }
}
```

### 5.3 JavaScript API

```typescript
// src/services/biometric/BiometricService.ts

import { NativeModules } from 'react-native';

const { BiometricModule } = NativeModules;

export type BiometricType = 'fingerprint' | 'face' | 'iris' | null;

export interface BiometricAvailability {
  available: boolean;
  error: string | null;
}

export class BiometricService {
  static async isAvailable(): Promise<BiometricAvailability> {
    return await BiometricModule.isAvailable();
  }

  static async getBiometricType(): Promise<BiometricType> {
    return await BiometricModule.getBiometricType();
  }

  static async authenticate(
    title = "验证身份",
    subtitle = "请使用生物识别验证"
  ): Promise<boolean> {
    try {
      return await BiometricModule.authenticate(title, subtitle);
    } catch (error) {
      console.error('生物识别验证失败:', error);
      return false;
    }
  }
}
```

---

## 6. 模块注册

### 6.1 Package 注册

```kotlin
// android/app/src/main/java/com/sillychat/SillyChatPackage.kt

package com.sillychat

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.sillychat.background.BackgroundTaskModule
import com.sillychat.biometric.BiometricModule
import com.sillychat.notification.NotificationModule
import com.sillychat.storage.StorageModule

class SillyChatPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(
        NotificationModule(reactContext),
        BackgroundTaskModule(reactContext),
        StorageModule(reactContext),
        BiometricModule(reactContext),
    )

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
```

### 6.2 Application 注册

```kotlin
// android/app/src/main/java/com/sillychat/MainApplication.kt

package com.sillychat

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.shell.MainReactPackage
import java.util.Arrays

class MainApplication : Application(), ReactApplication {

    private val mReactNativeHost = object : ReactNativeHost(this) {
        override fun getUseDeveloperSupport() = BuildConfig.DEBUG

        override fun getPackages(): List<ReactPackage> {
            return Arrays.asList(
                MainReactPackage(),
                SillyChatPackage() // 注册自定义模块
            )
        }
    }

    override fun getReactNativeHost() = mReactNativeHost

    override fun onCreate() {
        super.onCreate()
        // 初始化
    }
}
```

---

## 7. 相关文档

- [开发指南](./dev-guide.md) - 环境搭建和开发规范
- [架构文档](./architecture.md) - 系统架构说明
- [API 文档](./api-reference.md) - 组件和 Hooks API
- [测试指南](./testing-guide.md) - 测试方法
- [发布指南](./deployment.md) - 打包发布流程
