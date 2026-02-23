# Android后台任务模块开发文档

## 概述

本文档描述了SillyChat Android应用的后台任务模块，包括任务调度、消息同步和定期清理功能。

## 架构设计

### 组件关系

```
┌─────────────────────────────────────────────────────────────┐
│                    WorkManagerService                        │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  scheduleSync   │  │ scheduleCleanup │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
└───────────┼────────────────────┼────────────────────────────┘
            │                    │
            ▼                    ▼
┌──────────────────────┐  ┌──────────────────────┐
│   MessageSyncWorker  │  │    CleanupWorker     │
│  ┌────────────────┐  │  │  ┌────────────────┐  │
│  │  syncPending   │  │  │  │ cleanupCache   │  │
│  │    Messages    │  │  │  ├────────────────┤  │
│  ├────────────────┤  │  │  │ cleanupTemp    │  │
│  │  retryOnError  │  │  │  ├────────────────┤  │
│  │   (exponential)│  │  │  │ optimizeDB     │  │
│  └────────────────┘  │  │  ├────────────────┤  │
└──────────────────────┘  │  │ cleanupOldMsgs │  │
                          │  └────────────────┘  │
                          └──────────────────────┘
```

## 核心类说明

### 1. WorkManagerService

**位置**: `app/src/main/java/com/sillychat/app/service/WorkManagerService.kt`

**职责**:
- 统一管理所有后台任务的调度
- 提供任务状态查询接口
- 处理任务取消操作

**主要方法**:

| 方法 | 说明 |
|------|------|
| `schedulePeriodicMessageSync()` | 调度周期性消息同步任务 |
| `scheduleOneTimeMessageSync()` | 调度一次性消息同步任务 |
| `schedulePeriodicCleanup()` | 调度定期清理任务 |
| `runImmediateCleanup()` | 立即执行清理任务 |
| `cancelMessageSync()` | 取消消息同步任务 |
| `cancelCleanup()` | 取消清理任务 |
| `isWorkRunning()` | 检查任务是否正在运行 |

**使用示例**:
```kotlin
// 获取服务实例
val workManagerService = WorkManagerService.getInstance(context)

// 调度默认任务
workManagerService.scheduleDefaultTasks()

// 调度自定义频率的同步任务
workManagerService.schedulePeriodicMessageSync(
    repeatInterval = 30,
    timeUnit = TimeUnit.MINUTES
)

// 立即执行清理
workManagerService.runImmediateCleanup()
```

---

### 2. MessageSyncWorker

**位置**: `app/src/main/java/com/sillychat/app/worker/MessageSyncWorker.kt`

**职责**:
- 在后台同步离线消息
- 处理网络恢复时的自动重试
- 支持指数退避重试策略

**约束条件**:
- 需要网络连接
- 电量不低于低电量阈值

**重试策略**:
- 最大重试次数: 3次
- 退避策略: 指数退避
- 可重试错误: 网络错误、超时错误、IO错误

**输出数据**:
```kotlin
KEY_SYNC_RESULT      // "success" | "failure" | "retry"
KEY_SYNCED_COUNT     // 同步成功的消息数
KEY_FAILED_COUNT     // 同步失败的消息数
KEY_ERROR_MESSAGE    // 错误信息
KEY_RETRY_COUNT      // 重试次数
```

**使用示例**:
```kotlin
// 创建WorkRequest
val workRequest = MessageSyncWorker.createWorkRequest(
    isPeriodic = true,
    repeatIntervalMinutes = 15
)

// 监听任务状态
val workInfo = WorkManager.getInstance(context)
    .getWorkInfosForUniqueWorkLiveData(MessageSyncWorker.WORK_NAME)
```

---

### 3. CleanupWorker

**位置**: `app/src/main/java/com/sillychat/app/worker/CleanupWorker.kt`

**职责**:
- 清理过期缓存文件
- 压缩数据库
- 清理临时文件
- 清理过期消息

**约束条件**:
- 电量不低于低电量阈值
- 存储空间不低于低存储阈值
- 建议在充电时执行

**清理策略**:
| 清理项 | 保留期限 | 说明 |
|--------|----------|------|
| 缓存文件 | 7天 | 清理应用缓存目录 |
| 临时文件 | 24小时 | 清理temp目录 |
| 消息数据 | 90天 | 软删除过期消息 |
| 最小剩余空间 | 100MB | 空间不足时跳过清理 |

**输出数据**:
```kotlin
KEY_CLEANUP_RESULT        // "success" | "partial"
KEY_CACHE_CLEANED_BYTES   // 清理的缓存字节数
KEY_TEMP_FILES_DELETED    // 删除的临时文件数
KEY_DATABASE_OPTIMIZED    // 数据库是否已优化
KEY_OLD_MESSAGES_DELETED  // 删除的过期消息数
KEY_DURATION_MS           // 执行耗时
```

---

## 任务调度配置

### 默认配置

```kotlin
// 消息同步
周期: 15分钟
网络要求: 必须
电量要求: 不低于低电量阈值

// 清理任务
周期: 24小时
充电要求: 建议
电量要求: 不低于低电量阈值
存储要求: 不低于低存储阈值
```

### 自定义配置

```kotlin
// 高频同步（适用于实时聊天场景）
workManagerService.schedulePeriodicMessageSync(
    repeatInterval = 5,
    timeUnit = TimeUnit.MINUTES,
    requiresNetwork = true,
    requiresCharging = false
)

// 低频清理（适用于存储敏感场景）
workManagerService.schedulePeriodicCleanup(
    repeatInterval = 12,
    timeUnit = TimeUnit.HOURS,
    requiresCharging = true
)
```

---

## 状态监控

### SyncWorkStatus

用于监控消息同步任务状态:

```kotlin
data class SyncWorkStatus(
    val state: WorkInfo.State,        // 任务状态
    val syncedCount: Int,             // 同步成功数
    val failedCount: Int,             // 同步失败数
    val errorMessage: String?,        // 错误信息
    val retryCount: Int               // 重试次数
) {
    val isRunning: Boolean
    val isSuccess: Boolean
    val isFailed: Boolean
    val isRetrying: Boolean
}
```

### CleanupWorkStatus

用于监控清理任务状态:

```kotlin
data class CleanupWorkStatus(
    val state: WorkInfo.State,
    val cacheCleanedBytes: Long,
    val tempFilesDeleted: Int,
    val databaseOptimized: Boolean,
    val oldMessagesDeleted: Int,
    val errorMessage: String?,
    val durationMs: Long
) {
    val cacheCleanedMB: Double
    val isSuccess: Boolean
    val isPartialSuccess: Boolean
}
```

---

## 最佳实践

### 1. 任务调度时机

```kotlin
class SillyChatApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // 应用启动时调度默认任务
        WorkManagerService.getInstance(this).scheduleDefaultTasks()
    }
}
```

### 2. 网络恢复处理

```kotlin
class NetworkChangeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (isNetworkAvailable(context)) {
            // 网络恢复时立即执行同步
            WorkManagerService.getInstance(context)
                .scheduleOneTimeMessageSync(delayMs = 0)
        }
    }
}
```

### 3. 电池优化

```kotlin
// 请求忽略电池优化（需要用户授权）
fun requestBatteryOptimizationWhitelist(context: Context) {
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    if (!powerManager.isIgnoringBatteryOptimizations(context.packageName)) {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
        }
        context.startActivity(intent)
    }
}
```

---

## 测试

### 单元测试

```bash
# 运行所有Worker测试
./gradlew :app:testDebugUnitTest --tests "com.sillychat.app.worker.*"

# 运行服务测试
./gradlew :app:testDebugUnitTest --tests "com.sillychat.app.service.*"
```

### 集成测试

```bash
# 运行集成测试
./gradlew :app:connectedAndroidTest
```

---

## 故障排查

### 常见问题

**Q: 任务没有按时执行**
- 检查是否添加了RECEIVE_BOOT_COMPLETED权限
- 检查电池优化白名单设置
- 查看WorkManager日志

**Q: 同步任务频繁失败**
- 检查网络连接状态
- 查看重试次数和错误信息
- 确认服务器API可用性

**Q: 清理任务没有效果**
- 检查存储空间是否充足
- 确认文件权限
- 查看清理日志输出

### 调试技巧

```kotlin
// 启用WorkManager调试日志
val config = Configuration.Builder()
    .setMinimumLoggingLevel(android.util.Log.DEBUG)
    .build()
WorkManager.initialize(context, config)

// 查看任务状态
WorkManager.getInstance(context)
    .getWorkInfosForUniqueWorkLiveData("message_sync_work")
    .observe(owner) { workInfos ->
        workInfos.forEach { workInfo ->
            Log.d("WorkManager", "State: ${workInfo.state}")
        }
    }
```

---

## 更新日志

### v1.0.0 (2026-02-23)
- 初始版本发布
- 实现消息同步Worker
- 实现清理Worker
- 添加完整测试覆盖
