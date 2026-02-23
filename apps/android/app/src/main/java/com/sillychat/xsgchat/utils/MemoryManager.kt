package com.sillychat.app.utils

import android.app.ActivityManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import coil.ImageLoader
import coil.annotation.ExperimentalCoilApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 内存管理器
 * 负责监控和优化应用内存使用
 */
@Singleton
class MemoryManager @Inject constructor(
    private val context: Context,
    private val imageLoader: ImageLoader
) {
    companion object {
        private const val TAG = "MemoryManager"
        // 内存阈值（百分比）
        private const val MEMORY_THRESHOLD_LOW = 0.8
        private const val MEMORY_THRESHOLD_CRITICAL = 0.9
        // 缓存清理间隔（毫秒）
        private const val CLEANUP_INTERVAL = 5 * 60 * 1000L // 5分钟
    }

    private val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager

    /**
     * 获取当前内存使用情况
     */
    fun getMemoryInfo(): MemoryInfo {
        val runtime = Runtime.getRuntime()
        val maxMemory = runtime.maxMemory()
        val totalMemory = runtime.totalMemory()
        val freeMemory = runtime.freeMemory()
        val usedMemory = totalMemory - freeMemory

        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)

        return MemoryInfo(
            maxHeapSize = maxMemory,
            totalHeapSize = totalMemory,
            freeHeapSize = freeMemory,
            usedHeapSize = usedMemory,
            usedPercent = usedMemory.toDouble() / maxMemory,
            availableSystemMemory = memoryInfo.availMem,
            totalSystemMemory = memoryInfo.totalMem,
            lowMemory = memoryInfo.lowMemory
        )
    }

    /**
     * 检查内存是否紧张
     */
    fun isMemoryLow(): Boolean {
        val info = getMemoryInfo()
        return info.usedPercent > MEMORY_THRESHOLD_LOW || info.lowMemory
    }

    /**
     * 检查内存是否严重不足
     */
    fun isMemoryCritical(): Boolean {
        val info = getMemoryInfo()
        return info.usedPercent > MEMORY_THRESHOLD_CRITICAL
    }

    /**
     * 执行内存清理
     * 根据内存压力级别执行不同清理策略
     */
    suspend fun performCleanup(level: CleanupLevel = CleanupLevel.NORMAL) {
        Timber.tag(TAG).d("Performing cleanup with level: $level")

        when (level) {
            CleanupLevel.LIGHT -> performLightCleanup()
            CleanupLevel.NORMAL -> performNormalCleanup()
            CleanupLevel.AGGRESSIVE -> performAggressiveCleanup()
        }

        // 触发GC
        System.gc()
    }

    /**
     * 轻度清理
     * 清理临时文件和弱引用
     */
    private suspend fun performLightCleanup() {
        withContext(Dispatchers.IO) {
            // 清理临时文件
            clearTempFiles()
        }
    }

    /**
     * 常规清理
     * 清理图片缓存和临时文件
     */
    private suspend fun performNormalCleanup() {
        performLightCleanup()

        withContext(Dispatchers.IO) {
            // 清理Coil内存缓存
            clearImageMemoryCache()

            // 清理过时日志
            clearOldLogs()
        }
    }

    /**
     * 深度清理
     * 清理所有缓存和释放资源
     */
    private suspend fun performAggressiveCleanup() {
        performNormalCleanup()

        withContext(Dispatchers.IO) {
            // 清理Coil磁盘缓存
            clearImageDiskCache()

            // 清理数据库缓存
            clearDatabaseCache()
        }
    }

    /**
     * 清理图片内存缓存
     */
    @OptIn(ExperimentalCoilApi::class)
    private fun clearImageMemoryCache() {
        imageLoader.memoryCache?.clear()
        Timber.tag(TAG).d("Image memory cache cleared")
    }

    /**
     * 清理图片磁盘缓存
     */
    @OptIn(ExperimentalCoilApi::class)
    private suspend fun clearImageDiskCache() {
        imageLoader.diskCache?.clear()
        Timber.tag(TAG).d("Image disk cache cleared")
    }

    /**
     * 清理临时文件
     */
    private fun clearTempFiles() {
        val tempDir = context.cacheDir
        tempDir.listFiles()?.forEach { file ->
            if (file.isFile && file.name.startsWith("temp_")) {
                file.delete()
            }
        }
        Timber.tag(TAG).d("Temp files cleared")
    }

    /**
     * 清理过时日志
     */
    private fun clearOldLogs() {
        val logDir = File(context.filesDir, "logs")
        if (logDir.exists()) {
            val oneWeekAgo = System.currentTimeMillis() - 7 * 24 * 60 * 60 * 1000
            logDir.listFiles()?.forEach { file ->
                if (file.lastModified() < oneWeekAgo) {
                    file.delete()
                }
            }
        }
    }

    /**
     * 清理数据库缓存
     */
    private fun clearDatabaseCache() {
        // 触发数据库VACUUM操作
        context.deleteDatabase("sillychat_database-journal")
    }

    /**
     * 优化Bitmap加载
     * 根据可用内存动态调整采样率
     */
    fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val (height: Int, width: Int) = options.run { outHeight to outWidth }
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight: Int = height / 2
            val halfWidth: Int = width / 2

            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }

        // 根据内存情况调整采样率
        if (isMemoryLow()) {
            inSampleSize *= 2
        }

        return inSampleSize
    }

    /**
     * 获取优化的Bitmap
     */
    fun decodeSampledBitmapFromFile(filePath: String, reqWidth: Int, reqHeight: Int): Bitmap? {
        return try {
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
                BitmapFactory.decodeFile(filePath, this)
                inSampleSize = calculateInSampleSize(this, reqWidth, reqHeight)
                inJustDecodeBounds = false
                // 使用RGB_565节省内存
                inPreferredConfig = Bitmap.Config.RGB_565
            }
            BitmapFactory.decodeFile(filePath, options)
        } catch (e: Exception) {
            Timber.tag(TAG).e(e, "Failed to decode bitmap")
            null
        }
    }
}

/**
 * 内存信息
 */
data class MemoryInfo(
    val maxHeapSize: Long,
    val totalHeapSize: Long,
    val freeHeapSize: Long,
    val usedHeapSize: Long,
    val usedPercent: Double,
    val availableSystemMemory: Long,
    val totalSystemMemory: Long,
    val lowMemory: Boolean
) {
    fun formatUsedMemory(): String = formatBytes(usedHeapSize)
    fun formatMaxMemory(): String = formatBytes(maxHeapSize)
    fun formatAvailableMemory(): String = formatBytes(availableSystemMemory)

    private fun formatBytes(bytes: Long): String {
        val unit = 1024
        if (bytes < unit) return "$bytes B"
        val exp = (Math.log(bytes.toDouble()) / Math.log(unit.toDouble())).toInt()
        val pre = "KMGTPE"[exp - 1]
        return String.format("%.1f %sB", bytes / Math.pow(unit.toDouble(), exp.toDouble()), pre)
    }
}

/**
 * 清理级别
 */
enum class CleanupLevel {
    LIGHT,      // 轻度清理
    NORMAL,     // 常规清理
    AGGRESSIVE  // 深度清理
}
