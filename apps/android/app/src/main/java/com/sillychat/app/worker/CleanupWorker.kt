package com.sillychat.app.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.sillychat.app.data.local.AppDatabase
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * 清理Worker
 * 负责定期清理过期缓存、压缩数据库、清理临时文件
 */
@HiltWorker
class CleanupWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val database: AppDatabase
) : CoroutineWorker(context, params) {

    companion object {
        const val WORK_NAME = "CleanupWorker"

        // 输出数据Key
        const val KEY_CLEANUP_RESULT = "cleanup_result"
        const val KEY_CACHE_CLEANED_BYTES = "cache_cleaned_bytes"
        const val KEY_TEMP_FILES_DELETED = "temp_files_deleted"
        const val KEY_DATABASE_OPTIMIZED = "database_optimized"
        const val KEY_OLD_MESSAGES_DELETED = "old_messages_deleted"
        const val KEY_ERROR_MESSAGE = "error_message"
        const val KEY_DURATION_MS = "duration_ms"

        // 清理配置
        private const val CACHE_MAX_AGE_DAYS = 7L // 缓存文件最大保留天数
        private const val MESSAGE_RETENTION_DAYS = 90L // 消息保留天数
        private const val TEMP_FILE_MAX_AGE_HOURS = 24L // 临时文件最大保留小时数
        private const val MIN_FREE_SPACE_MB = 100L // 最小剩余空间(MB)

        /**
         * 创建WorkRequest的便捷方法
         */
        fun createWorkRequest(
            isPeriodic: Boolean = true,
            repeatIntervalHours: Long = 24
        ): WorkRequest {
            val constraints = Constraints.Builder()
                .setRequiresBatteryNotLow(true)
                .setRequiresStorageNotLow(true)
                .build()

            return if (isPeriodic) {
                PeriodicWorkRequestBuilder<CleanupWorker>(
                    repeatIntervalHours,
                    TimeUnit.HOURS
                )
                    .setConstraints(constraints)
                    .setBackoffCriteria(
                        BackoffPolicy.LINEAR,
                        WorkRequest.MIN_BACKOFF_MILLIS,
                        TimeUnit.MILLISECONDS
                    )
                    .addTag(WORK_NAME)
                    .build()
            } else {
                OneTimeWorkRequestBuilder<CleanupWorker>()
                    .setConstraints(constraints)
                    .addTag(WORK_NAME)
                    .build()
            }
        }
    }

    // 清理统计
    private var cacheCleanedBytes: Long = 0
    private var tempFilesDeleted: Int = 0
    private var databaseOptimized: Boolean = false
    private var oldMessagesDeleted: Int = 0

    override suspend fun doWork(): Result {
        val startTime = System.currentTimeMillis()
        Timber.d("CleanupWorker started")

        return try {
            // 检查存储空间
            if (!checkStorageSpace()) {
                Timber.w("Storage space is low, skipping cleanup")
                return Result.success(createOutputData(startTime, "存储空间不足，跳过清理"))
            }

            // 执行各项清理任务
            withContext(Dispatchers.IO) {
                // 1. 清理缓存文件
                cleanupCacheFiles()

                // 2. 清理临时文件
                cleanupTempFiles()

                // 3. 压缩数据库
                optimizeDatabase()

                // 4. 清理过期消息
                cleanupOldMessages()

                // 5. 清理应用缓存目录
                cleanupAppCache()
            }

            val duration = System.currentTimeMillis() - startTime
            Timber.d("CleanupWorker completed in ${duration}ms")

            Result.success(createOutputData(startTime))

        } catch (e: Exception) {
            Timber.e(e, "CleanupWorker failed")

            val duration = System.currentTimeMillis() - startTime
            val outputData = createOutputData(
                startTime,
                errorMessage = e.message ?: "清理过程中发生错误"
            )

            // 清理任务失败不应该影响其他功能，返回成功但记录错误
            Result.success(outputData)
        }
    }

    /**
     * 清理缓存文件
     */
    private fun cleanupCacheFiles() {
        try {
            val cacheDir = applicationContext.cacheDir
            val externalCacheDir = applicationContext.externalCacheDir

            cacheCleanedBytes += cleanupDirectory(cacheDir, CACHE_MAX_AGE_DAYS)
            externalCacheDir?.let {
                cacheCleanedBytes += cleanupDirectory(it, CACHE_MAX_AGE_DAYS)
            }

            Timber.d("Cache cleaned: $cacheCleanedBytes bytes")
        } catch (e: Exception) {
            Timber.e(e, "Failed to cleanup cache")
        }
    }

    /**
     * 清理临时文件
     */
    private fun cleanupTempFiles() {
        try {
            val tempDir = File(applicationContext.cacheDir, "temp")
            if (!tempDir.exists()) return

            val cutoffTime = System.currentTimeMillis() -
                TimeUnit.HOURS.toMillis(TEMP_FILE_MAX_AGE_HOURS)

            tempDir.listFiles()?.forEach { file ->
                if (file.lastModified() < cutoffTime) {
                    if (file.delete()) {
                        tempFilesDeleted++
                    }
                }
            }

            Timber.d("Temp files deleted: $tempFilesDeleted")
        } catch (e: Exception) {
            Timber.e(e, "Failed to cleanup temp files")
        }
    }

    /**
     * 优化数据库
     */
    private suspend fun optimizeDatabase() {
        try {
            // 执行VACUUM命令压缩数据库
            database.openHelper.writableDatabase.execSQL("VACUUM")
            databaseOptimized = true

            Timber.d("Database optimized")
        } catch (e: Exception) {
            Timber.e(e, "Failed to optimize database")
        }
    }

    /**
     * 清理过期消息
     */
    private suspend fun cleanupOldMessages() {
        try {
            val cutoffTime = System.currentTimeMillis() -
                TimeUnit.DAYS.toMillis(MESSAGE_RETENTION_DAYS)

            // 获取过期消息数量
            val messageDao = database.messageDao()
            val oldMessages = messageDao.getMessagesBefore(cutoffTime)

            // 软删除过期消息
            oldMessages.forEach { message ->
                messageDao.softDelete(message.id)
                oldMessagesDeleted++
            }

            Timber.d("Old messages soft-deleted: $oldMessagesDeleted")
        } catch (e: Exception) {
            Timber.e(e, "Failed to cleanup old messages")
        }
    }

    /**
     * 清理应用缓存目录
     */
    private fun cleanupAppCache() {
        try {
            // 清理图片缓存
            val imageCacheDir = File(applicationContext.cacheDir, "images")
            if (imageCacheDir.exists()) {
                cacheCleanedBytes += cleanupDirectory(imageCacheDir, CACHE_MAX_AGE_DAYS)
            }

            // 清理文件缓存
            val fileCacheDir = File(applicationContext.cacheDir, "files")
            if (fileCacheDir.exists()) {
                cacheCleanedBytes += cleanupDirectory(fileCacheDir, CACHE_MAX_AGE_DAYS)
            }
        } catch (e: Exception) {
            Timber.e(e, "Failed to cleanup app cache")
        }
    }

    /**
     * 清理目录中的过期文件
     * @return 清理的字节数
     */
    private fun cleanupDirectory(directory: File, maxAgeDays: Long): Long {
        var cleanedBytes: Long = 0

        if (!directory.exists() || !directory.isDirectory) return 0

        val cutoffTime = System.currentTimeMillis() -
            TimeUnit.DAYS.toMillis(maxAgeDays)

        directory.listFiles()?.forEach { file ->
            try {
                if (file.isFile && file.lastModified() < cutoffTime) {
                    val fileSize = file.length()
                    if (file.delete()) {
                        cleanedBytes += fileSize
                    }
                } else if (file.isDirectory) {
                    cleanedBytes += cleanupDirectory(file, maxAgeDays)
                    // 如果目录为空则删除
                    if (file.listFiles()?.isEmpty() == true) {
                        file.delete()
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to delete file: ${file.absolutePath}")
            }
        }

        return cleanedBytes
    }

    /**
     * 检查存储空间
     */
    private fun checkStorageSpace(): Boolean {
        return try {
            val stat = android.os.StatFs(applicationContext.cacheDir.path)
            val availableBytes = stat.availableBytes
            val availableMB = availableBytes / (1024 * 1024)

            availableMB >= MIN_FREE_SPACE_MB
        } catch (e: Exception) {
            Timber.e(e, "Failed to check storage space")
            true // 如果无法检查，默认继续执行
        }
    }

    /**
     * 创建输出数据
     */
    private fun createOutputData(
        startTime: Long,
        errorMessage: String? = null
    ): Data {
        val duration = System.currentTimeMillis() - startTime

        return workDataOf(
            KEY_CLEANUP_RESULT to if (errorMessage == null) "success" else "partial",
            KEY_CACHE_CLEANED_BYTES to cacheCleanedBytes,
            KEY_TEMP_FILES_DELETED to tempFilesDeleted,
            KEY_DATABASE_OPTIMIZED to databaseOptimized,
            KEY_OLD_MESSAGES_DELETED to oldMessagesDeleted,
            KEY_ERROR_MESSAGE to errorMessage,
            KEY_DURATION_MS to duration
        )
    }

    /**
     * 清理资源
     */
    override suspend fun onStopped() {
        super.onStopped()
        Timber.d("CleanupWorker stopped")
    }
}

/**
 * 清理状态数据类
 */
data class CleanupWorkStatus(
    val state: WorkInfo.State,
    val cacheCleanedBytes: Long = 0,
    val tempFilesDeleted: Int = 0,
    val databaseOptimized: Boolean = false,
    val oldMessagesDeleted: Int = 0,
    val errorMessage: String? = null,
    val durationMs: Long = 0
) {
    val cacheCleanedMB: Double
        get() = cacheCleanedBytes / (1024.0 * 1024.0)

    val isRunning: Boolean
        get() = state == WorkInfo.State.RUNNING

    val isSuccess: Boolean
        get() = state == WorkInfo.State.SUCCEEDED && errorMessage == null

    val isPartialSuccess: Boolean
        get() = state == WorkInfo.State.SUCCEEDED && errorMessage != null

    companion object {
        fun fromWorkInfo(workInfo: WorkInfo?): CleanupWorkStatus? {
            workInfo ?: return null

            return CleanupWorkStatus(
                state = workInfo.state,
                cacheCleanedBytes = workInfo.outputData.getLong(
                    CleanupWorker.KEY_CACHE_CLEANED_BYTES, 0
                ),
                tempFilesDeleted = workInfo.outputData.getInt(
                    CleanupWorker.KEY_TEMP_FILES_DELETED, 0
                ),
                databaseOptimized = workInfo.outputData.getBoolean(
                    CleanupWorker.KEY_DATABASE_OPTIMIZED, false
                ),
                oldMessagesDeleted = workInfo.outputData.getInt(
                    CleanupWorker.KEY_OLD_MESSAGES_DELETED, 0
                ),
                errorMessage = workInfo.outputData.getString(
                    CleanupWorker.KEY_ERROR_MESSAGE
                ),
                durationMs = workInfo.outputData.getLong(
                    CleanupWorker.KEY_DURATION_MS, 0
                )
            )
        }
    }
}
