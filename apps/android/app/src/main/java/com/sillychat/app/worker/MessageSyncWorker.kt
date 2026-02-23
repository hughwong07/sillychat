package com.sillychat.app.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.sillychat.app.data.repository.MessageRepository
import com.sillychat.app.data.repository.SyncResult
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

/**
 * 消息同步Worker
 * 负责在后台同步离线消息，支持网络恢复时自动重试
 */
@HiltWorker
class MessageSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val messageRepository: MessageRepository
) : CoroutineWorker(context, params) {

    companion object {
        const val WORK_NAME = "MessageSyncWorker"
        const val KEY_SYNC_RESULT = "sync_result"
        const val KEY_ERROR_MESSAGE = "error_message"
        const val KEY_SYNCED_COUNT = "synced_count"
        const val KEY_FAILED_COUNT = "failed_count"
        const val KEY_RETRY_COUNT = "retry_count"

        // 最大重试次数
        private const val MAX_RETRY_ATTEMPTS = 3

        // 重试延迟（指数退避）
        private val RETRY_DELAYS = listOf(10L, 30L, 60L) // 秒

        /**
         * 创建WorkRequest的便捷方法
         */
        fun createWorkRequest(
            isPeriodic: Boolean = false,
            repeatIntervalMinutes: Long = 15
        ): WorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

            return if (isPeriodic) {
                PeriodicWorkRequestBuilder<MessageSyncWorker>(
                    repeatIntervalMinutes,
                    TimeUnit.MINUTES
                )
                    .setConstraints(constraints)
                    .setBackoffCriteria(
                        BackoffPolicy.EXPONENTIAL,
                        WorkRequest.MIN_BACKOFF_MILLIS,
                        TimeUnit.MILLISECONDS
                    )
                    .addTag(WORK_NAME)
                    .build()
            } else {
                OneTimeWorkRequestBuilder<MessageSyncWorker>()
                    .setConstraints(constraints)
                    .setBackoffCriteria(
                        BackoffPolicy.EXPONENTIAL,
                        WorkRequest.MIN_BACKOFF_MILLIS,
                        TimeUnit.MILLISECONDS
                    )
                    .addTag(WORK_NAME)
                    .build()
            }
        }
    }

    override suspend fun doWork(): Result {
        Timber.d("MessageSyncWorker started, attempt: ${runAttemptCount + 1}")

        val startTime = System.currentTimeMillis()

        return try {
            // 检查网络状态
            if (!isNetworkAvailable()) {
                Timber.w("Network not available, retrying later")
                return Result.retry()
            }

            // 执行同步
            val syncResult = performSync()

            val duration = System.currentTimeMillis() - startTime
            Timber.d("MessageSyncWorker completed in ${duration}ms: $syncResult")

            // 构建输出数据
            val outputData = workDataOf(
                KEY_SYNC_RESULT to "success",
                KEY_SYNCED_COUNT to syncResult.syncedCount,
                KEY_FAILED_COUNT to syncResult.failedCount,
                KEY_RETRY_COUNT to runAttemptCount
            )

            Result.success(outputData)

        } catch (e: UnknownHostException) {
            Timber.e(e, "Network error during sync")
            handleRetry("网络连接失败，请检查网络设置")

        } catch (e: java.net.SocketTimeoutException) {
            Timber.e(e, "Connection timeout during sync")
            handleRetry("连接超时，正在重试...")

        } catch (e: java.io.IOException) {
            Timber.e(e, "IO error during sync")
            handleRetry("网络错误: ${e.message}")

        } catch (e: Exception) {
            Timber.e(e, "Unexpected error during sync")

            // 检查是否是可重试的错误
            if (isRetryableError(e) && runAttemptCount < MAX_RETRY_ATTEMPTS) {
                handleRetry("同步失败: ${e.message}")
            } else {
                // 不可重试或已达到最大重试次数
                val outputData = workDataOf(
                    KEY_SYNC_RESULT to "failure",
                    KEY_ERROR_MESSAGE to (e.message ?: "未知错误"),
                    KEY_RETRY_COUNT to runAttemptCount
                )
                Result.failure(outputData)
            }
        }
    }

    /**
     * 执行实际的同步操作
     */
    private suspend fun performSync(): SyncResult {
        return withContext(Dispatchers.IO) {
            Timber.d("Starting message synchronization")

            val result = messageRepository.syncPendingMessages()

            result.getOrElse { error ->
                Timber.e(error, "Sync failed")
                throw error
            }
        }
    }

    /**
     * 处理重试逻辑
     */
    private fun handleRetry(errorMessage: String): Result {
        val currentAttempt = runAttemptCount + 1

        return if (currentAttempt < MAX_RETRY_ATTEMPTS) {
            Timber.d("Retrying sync (attempt $currentAttempt/$MAX_RETRY_ATTEMPTS)")

            val outputData = workDataOf(
                KEY_SYNC_RESULT to "retry",
                KEY_ERROR_MESSAGE to errorMessage,
                KEY_RETRY_COUNT to runAttemptCount
            )

            // 使用指数退避策略
            Result.retry()
        } else {
            Timber.w("Max retry attempts reached, giving up")

            val outputData = workDataOf(
                KEY_SYNC_RESULT to "failure",
                KEY_ERROR_MESSAGE to "$errorMessage (已重试$MAX_RETRY_ATTEMPTS次)",
                KEY_RETRY_COUNT to runAttemptCount
            )

            Result.failure(outputData)
        }
    }

    /**
     * 检查网络是否可用
     */
    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = applicationContext.getSystemService(
            Context.CONNECTIVITY_SERVICE
        ) as? android.net.ConnectivityManager

        return connectivityManager?.activeNetworkInfo?.isConnected == true
    }

    /**
     * 检查错误是否可重试
     */
    private fun isRetryableError(error: Exception): Boolean {
        return when (error) {
            is UnknownHostException,
            is java.net.SocketTimeoutException,
            is java.net.SocketException,
            is java.io.IOException -> true
            else -> false
        }
    }

    /**
     * 清理资源
     */
    override suspend fun onStopped() {
        super.onStopped()
        Timber.d("MessageSyncWorker stopped")
        // 清理任何正在进行的操作
    }
}

/**
 * 同步状态数据类
 */
data class SyncWorkStatus(
    val state: WorkInfo.State,
    val syncedCount: Int = 0,
    val failedCount: Int = 0,
    val errorMessage: String? = null,
    val retryCount: Int = 0
) {
    val isRunning: Boolean
        get() = state == WorkInfo.State.RUNNING

    val isSuccess: Boolean
        get() = state == WorkInfo.State.SUCCEEDED

    val isFailed: Boolean
        get() = state == WorkInfo.State.FAILED

    val isRetrying: Boolean
        get() = state == WorkInfo.State.ENQUEUED && retryCount > 0

    companion object {
        fun fromWorkInfo(workInfo: WorkInfo?): SyncWorkStatus? {
            workInfo ?: return null

            return SyncWorkStatus(
                state = workInfo.state,
                syncedCount = workInfo.outputData.getInt(MessageSyncWorker.KEY_SYNCED_COUNT, 0),
                failedCount = workInfo.outputData.getInt(MessageSyncWorker.KEY_FAILED_COUNT, 0),
                errorMessage = workInfo.outputData.getString(MessageSyncWorker.KEY_ERROR_MESSAGE),
                retryCount = workInfo.outputData.getInt(MessageSyncWorker.KEY_RETRY_COUNT, 0)
            )
        }
    }
}
