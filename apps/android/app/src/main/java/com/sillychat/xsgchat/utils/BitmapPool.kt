package com.sillychat.app.utils

import android.graphics.Bitmap
import android.util.LruCache
import timber.log.Timber

/**
 * Bitmap对象池
 * 复用Bitmap对象，减少GC压力
 */
class BitmapPool private constructor() {
    companion object {
        private const val TAG = "BitmapPool"
        // 最大缓存大小：8MB
        private const val MAX_SIZE = 8 * 1024 * 1024

        @Volatile
        private var instance: BitmapPool? = null

        fun getInstance(): BitmapPool {
            return instance ?: synchronized(this) {
                instance ?: BitmapPool().also { instance = it }
            }
        }
    }

    // 使用LruCache管理Bitmap
    private val cache = object : LruCache<String, Bitmap>(MAX_SIZE) {
        override fun sizeOf(key: String, bitmap: Bitmap): Int {
            return bitmap.byteCount
        }

        override fun entryRemoved(
            evicted: Boolean,
            key: String,
            oldValue: Bitmap,
            newValue: Bitmap?
        ) {
            if (evicted && !oldValue.isRecycled) {
                oldValue.recycle()
                Timber.tag(TAG).d("Recycled bitmap: $key")
            }
        }
    }

    /**
     * 获取Bitmap
     */
    fun get(key: String): Bitmap? {
        return cache.get(key)
    }

    /**
     * 放入Bitmap
     */
    fun put(key: String, bitmap: Bitmap) {
        if (get(key) == null) {
            cache.put(key, bitmap)
        }
    }

    /**
     * 移除Bitmap
     */
    fun remove(key: String): Bitmap? {
        return cache.remove(key)
    }

    /**
     * 清空缓存
     */
    fun clear() {
        cache.evictAll()
        Timber.tag(TAG).d("Bitmap pool cleared")
    }

    /**
     * 获取当前缓存大小
     */
    fun size(): Int {
        return cache.size()
    }

    /**
     * 获取最大缓存大小
     */
    fun maxSize(): Int {
        return cache.maxSize()
    }
}

/**
 * Bitmap配置优化
 */
object BitmapConfig {
    /**
     * 根据使用场景选择最优配置
     */
    fun getOptimalConfig(hasAlpha: Boolean): Bitmap.Config {
        return if (hasAlpha) {
            Bitmap.Config.ARGB_8888
        } else {
            // 无透明通道时使用RGB_565节省内存
            Bitmap.Config.RGB_565
        }
    }

    /**
     * 计算采样率
     */
    fun calculateInSampleSize(
        options: BitmapFactory.Options,
        reqWidth: Int,
        reqHeight: Int
    ): Int {
        val height = options.outHeight
        val width = options.outWidth
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2

            while (
                halfHeight / inSampleSize >= reqHeight &&
                halfWidth / inSampleSize >= reqWidth
            ) {
                inSampleSize *= 2
            }
        }

        return inSampleSize
    }
}

import android.graphics.BitmapFactory