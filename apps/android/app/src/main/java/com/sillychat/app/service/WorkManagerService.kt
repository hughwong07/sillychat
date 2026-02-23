package com.sillychat.app.service

import android.content.Context
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.Observer
import androidx.work.*
import com.sillychat.app.worker.CleanupWorker
import com.sillychat.app.worker.MessageSyncWorker
import timber.log.Timber
import java.util.concurrent.TimeUnit

/**
 * WorkManager服务类
 * 统一管理所有后台任务的调度和配置
 */
class WorkManagerService private constructor(private val context: Context) {

    private val workManager: WorkManager = WorkManager.getInstance(context)

    companion object {
        @Volatile
        private var instance: WorkManagerService? = null

        fun getInstance(context: Context): WorkManagerService {
            return instance ?: synchronized(this) {
                instance ?: WorkManagerService(context.applicationContext).also {
                    instance = it
                }
            }
        }

        // Work名称常量
        const val WORK_NAME_MESSAGE_SYNC = "message_sync_work"
        const val WORK_NAME_CLEANUP = "cleanup_work"
        const val WORK_NAME_ONE_TIME_SYNC = "one_time_sync_work"

        // 默认配置
        private const val DEFAULT_RETRY_COUNT = 3
        private const val DEFAULT_BACKOFF_DELAY_MS = 10000L // 10秒
        private val DEFAULT_BACKOFF_POLICY = BackoffPolicy.EXPONENTIAL
    }

    /**
     * 初始化WorkManager配置
     */
    fun initialize() {
        Timber.d("WorkManagerService initialized")
        // 配置全局WorkManager
        val config = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
        WorkManager.initialize(context, config)
    }

    /**
     * 调度周期性消息同步任务
     * @param repeatInterval 重复间隔
     * @param timeUnit 时间单位
     * @param requiresNetwork 是否需要网络
     * @param requiresCharging 是否需要充电
     */
    fun schedulePeriodicMessageSync(
        repeatInterval: Long = 15,
        timeUnit: TimeUnit = TimeUnit.MINUTES,
        requiresNetwork: Boolean = true,
        requiresCharging: Boolean = false
    ): Operation {
        Timber.d("Scheduling periodic message sync: interval=$repeatInterval $timeUnit")

        val constraints = buildConstraints(
            requiresNetwork = requiresNetwork,
            requiresCharging = requiresCharging
        )

        val workRequest = PeriodicWorkRequestBuilder<MessageSyncWorker>(
            repeatInterval,
            timeUnit
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                DEFAULT_BACKOFF_POLICY,
                DEFAULT_BACKOFF_DELAY_MS,
                TimeUnit.MILLISECONDS
            )
            .addTag(WORK_NAME_MESSAGE_SYNC)
            .build()

        return workManager.enqueueUniquePeriodicWork(
            WORK_NAME_MESSAGE_SYNC,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    /**
     * 调度一次性消息同步任务
     * @param delayMs 延迟执行时间（毫秒）
     * @param requiresNetwork 是否需要网络
     */
    fun scheduleOneTimeMessageSync(
        delayMs: Long = 0,
        requiresNetwork: Boolean = true
    ): Operation {
        Timber.d("Scheduling one-time message sync: delay=$delayMs ms")

        val constraints = buildConstraints(requiresNetwork = requiresNetwork)

        val workRequest = OneTimeWorkRequestBuilder<MessageSyncWorker>()
            .setConstraints(constraints)
            .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
            .setBackoffCriteria(
                DEFAULT_BACKOFF_POLICY,
                DEFAULT_BACKOFF_DELAY_MS,
                TimeUnit.MILLISECONDS
            )
            .addTag(WORK_NAME_ONE_TIME_SYNC)
            .build()

        return workManager.enqueueUniqueWork(
            WORK_NAME_ONE_TIME_SYNC,
            ExistingWorkPolicy.REPLACE,
            workRequest
        )
    }

    /**
     * 调度定期清理任务
     * @param repeatInterval 重复间隔
     * @param timeUnit 时间单位
     * @param requiresCharging 是否需要充电（建议在充电时执行）
     */
    fun schedulePeriodicCleanup(
        repeatInterval: Long = 24,
        timeUnit: TimeUnit = TimeUnit.HOURS,
        requiresCharging: Boolean = true
    ): Operation {
        Timber.d("Scheduling periodic cleanup: interval=$repeatInterval $timeUnit")

        val constraints = buildConstraints(
            requiresNetwork = false,
            requiresCharging = requiresCharging,
            requiresBatteryNotLow = true
        )

        val workRequest = PeriodicWorkRequestBuilder<CleanupWorker>(
            repeatInterval,
            timeUnit
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                DEFAULT_BACKOFF_POLICY,
                DEFAULT_BACKOFF_DELAY_MS,
                TimeUnit.MILLISECONDS
            )
            .addTag(WORK_NAME_CLEANUP)
            .build()

        return workManager.enqueueUniquePeriodicWork(
            WORK_NAME_CLEANUP,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    /**
     * 立即执行清理任务
     */
    fun runImmediateCleanup(): Operation {
        Timber.d("Running immediate cleanup")

        val constraints = buildConstraints(requiresNetwork = false)

        val workRequest = OneTimeWorkRequestBuilder<CleanupWorker>()
            .setConstraints(constraints)
            .addTag("immediate_cleanup")
            .build()

        return workManager.enqueue(workRequest)
    }

    /**
     * 取消所有消息同步任务
     */
    fun cancelMessageSync() {
        Timber.d("Canceling message sync tasks")
        workManager.cancelUniqueWork(WORK_NAME_MESSAGE_SYNC)
        workManager.cancelUniqueWork(WORK_NAME_ONE_TIME_SYNC)
    }

    /**
     * 取消所有清理任务
     */
    fun cancelCleanup() {
        Timber.d("Canceling cleanup tasks")
        workManager.cancelUniqueWork(WORK_NAME_CLEANUP)
    }

    /**
     * 取消所有后台任务
     */
    fun cancelAllWork() {
        Timber.d("Canceling all work")
        workManager.cancelAllWork()
    }

    /**
     * 获取任务状态信息
     */
    fun getWorkStatus(workName: String): LiveData<WorkInfo?> {
        val sourceLiveData = workManager.getWorkInfosForUniqueWorkLiveData(workName)
        val resultLiveData = MutableLiveData<WorkInfo?>()

        val observer = Observer<List<WorkInfo>> { workInfos ->
            resultLiveData.value = workInfos.firstOrNull()
        }
        sourceLiveData.observeForever(observer)

        return resultLiveData
    }

    /**
     * 获取所有任务信息
     */
    fun getAllWorkStatus(): LiveData<List<WorkInfo>> {
        return workManager.getWorkInfosByTagLiveData("*")
    }

    /**
     * 检查任务是否正在运行
     */
    fun isWorkRunning(workName: String): Boolean {
        val workInfos = workManager.getWorkInfosForUniqueWork(workName).get()
        return workInfos.any { it.state == WorkInfo.State.RUNNING }
    }

    /**
     * 构建约束条件
     */
    private fun buildConstraints(
        requiresNetwork: Boolean = true,
        requiresCharging: Boolean = false,
        requiresBatteryNotLow: Boolean = false,
        requiresStorageNotLow: Boolean = false
    ): Constraints {
        return Constraints.Builder().apply {
            if (requiresNetwork) {
                setRequiredNetworkType(NetworkType.CONNECTED)
            }
            if (requiresCharging) {
                setRequiresCharging(true)
            }
            if (requiresBatteryNotLow) {
                setRequiresBatteryNotLow(true)
            }
            if (requiresStorageNotLow) {
                setRequiresStorageNotLow(true)
            }
        }.build()
    }

    /**
     * 调度所有默认任务
     * 在应用启动时调用
     */
    fun scheduleDefaultTasks() {
        Timber.d("Scheduling default tasks")
        schedulePeriodicMessageSync()
        schedulePeriodicCleanup()
    }
}

