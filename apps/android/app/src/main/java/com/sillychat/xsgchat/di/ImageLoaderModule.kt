package com.sillychat.app.di

import android.content.Context
import coil.ImageLoader
import coil.decode.SvgDecoder
import coil.disk.DiskCache
import coil.memory.MemoryCache
import coil.request.CachePolicy
import coil.util.DebugLogger
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Dispatcher
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Coil图片加载模块
 * 提供优化的ImageLoader配置
 */
@Module
@InstallIn(SingletonComponent::class)
object ImageLoaderModule {

    /**
     * 提供Coil ImageLoader实例
     * 配置内存缓存、磁盘缓存和网络优化
     */
    @Provides
    @Singleton
    fun provideImageLoader(
        @ApplicationContext context: Context
    ): ImageLoader {
        return ImageLoader.Builder(context)
            // 内存缓存配置
            .memoryCache {
                MemoryCache.Builder(context)
                    // 最大内存缓存大小：可用内存的25%
                    .maxSizePercent(0.25)
                    // 启用弱引用缓存
                    .weakReferencesEnabled(true)
                    .build()
            }
            // 磁盘缓存配置
            .diskCache {
                DiskCache.Builder()
                    .directory(context.cacheDir.resolve("image_cache"))
                    // 最大磁盘缓存：100MB
                    .maxSizeBytes(100 * 1024 * 1024)
                    .build()
            }
            // 网络客户端配置
            .okHttpClient {
                OkHttpClient.Builder()
                    // 连接超时
                    .connectTimeout(15, TimeUnit.SECONDS)
                    // 读取超时
                    .readTimeout(30, TimeUnit.SECONDS)
                    // 限制并发请求数，避免过多网络连接
                    .dispatcher(Dispatcher().apply {
                        maxRequests = 10
                        maxRequestsPerHost = 5
                    })
                    .build()
            }
            // 添加SVG解码器支持
            .components {
                add(SvgDecoder.Factory())
            }
            // 默认启用跨帧动画
            .crossfade(true)
            // 开发模式下启用日志
            .apply {
                if (BuildConfig.DEBUG) {
                    logger(DebugLogger())
                }
            }
            // 默认缓存策略
            .respectCacheHeaders(false)
            .build()
    }
}
