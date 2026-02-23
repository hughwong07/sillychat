package com.sillychat.app.worker

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.*
import androidx.work.testing.TestWorkerBuilder
import com.sillychat.app.data.local.AppDatabase
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.Executor
import java.util.concurrent.Executors

/**
 * CleanupWorker集成测试
 * 测试清理Worker在实际Android环境中的行为
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class CleanupWorkerIntegrationTest {

    @get:Rule
    var hiltRule = HiltAndroidRule(this)

    private lateinit var context: Context
    private lateinit var executor: Executor
    private lateinit var mockDatabase: AppDatabase

    @Before
    fun setup() {
        hiltRule.inject()
        context = ApplicationProvider.getApplicationContext()
        executor = Executors.newSingleThreadExecutor()
        mockDatabase = mockk(relaxed = true)
    }

    /**
     * 测试Worker创建和基本执行
     */
    @Test
    fun testWorkerExecution() {
        every { mockDatabase.openHelper } returns mockk(relaxed = true)

        val worker = TestWorkerBuilder<CleanupWorker>(
            context = context,
            executor = executor
        ).build()

        val result = runBlocking { worker.doWork() }

        assertTrue(result is ListenableWorker.Result.Success)
    }

    /**
     * 测试Worker约束条件
     */
    @Test
    fun testWorkerConstraints() {
        val workRequest = CleanupWorker.createWorkRequest(isPeriodic = false)

        val constraints = workRequest.workSpec.constraints
        assertNotNull(constraints)
        assertTrue(constraints.requiresBatteryNotLow())
        assertTrue(constraints.requiresStorageNotLow())
    }

    /**
     * 测试周期性WorkRequest创建
     */
    @Test
    fun testPeriodicWorkRequestCreation() {
        val workRequest = CleanupWorker.createWorkRequest(
            isPeriodic = true,
            repeatIntervalHours = 24
        ) as PeriodicWorkRequest

        assertEquals(24 * 60 * 60 * 1000, workRequest.workSpec.intervalDuration)
        assertTrue(workRequest.tags.contains(CleanupWorker.WORK_NAME))
    }

    /**
     * 测试Worker输出数据
     */
    @Test
    fun testWorkerOutputData() = runBlocking {
        every { mockDatabase.openHelper } returns mockk(relaxed = true)

        val worker = TestWorkerBuilder<CleanupWorker>(
            context = context,
            executor = executor
        ).build()

        val result = worker.doWork() as ListenableWorker.Result.Success

        assertEquals("success", result.outputData.getString(CleanupWorker.KEY_CLEANUP_RESULT))
        assertTrue(result.outputData.getBoolean(CleanupWorker.KEY_DATABASE_OPTIMIZED, false))
        assertTrue(result.outputData.getLong(CleanupWorker.KEY_DURATION_MS, 0) >= 0)
    }

    /**
     * 测试缓存目录清理
     */
    @Test
    fun testCacheCleanup() {
        // 创建测试缓存文件
        val testCacheDir = File(context.cacheDir, "test_cache")
        testCacheDir.mkdirs()
        val testFile = File(testCacheDir, "old_file.txt")
        testFile.writeText("Test content")

        // 修改文件时间为7天前
        val oldTime = System.currentTimeMillis() - (8 * 24 * 60 * 60 * 1000)
        testFile.setLastModified(oldTime)

        every { mockDatabase.openHelper } returns mockk(relaxed = true)

        val worker = TestWorkerBuilder<CleanupWorker>(
            context = context,
            executor = executor
        ).build()

        runBlocking { worker.doWork() }

        // 清理测试文件
        testFile.delete()
        testCacheDir.delete()
    }

    /**
     * 测试Worker标签
     */
    @Test
    fun testWorkerTags() {
        val workRequest = CleanupWorker.createWorkRequest(isPeriodic = false)

        assertTrue(workRequest.tags.contains(CleanupWorker.WORK_NAME))
    }

    /**
     * 测试退避策略配置
     */
    @Test
    fun testBackoffPolicyConfiguration() {
        val workRequest = CleanupWorker.createWorkRequest(isPeriodic = false)

        assertEquals(
            BackoffPolicy.LINEAR,
            workRequest.workSpec.backoffPolicy
        )
    }

    /**
     * 测试存储空间检查
     */
    @Test
    fun testStorageSpaceCheck() {
        // 验证缓存目录可访问
        assertTrue(context.cacheDir.exists())

        val availableSpace = context.cacheDir.usableSpace
        assertTrue(availableSpace > 0)
    }

    /**
     * 测试临时文件清理
     */
    @Test
    fun testTempFileCleanup() {
        // 创建临时目录和文件
        val tempDir = File(context.cacheDir, "temp")
        tempDir.mkdirs()

        val tempFile = File(tempDir, "temp_file.tmp")
        tempFile.writeText("Temporary content")

        // 设置文件为24小时前
        val oldTime = System.currentTimeMillis() - (25 * 60 * 60 * 1000)
        tempFile.setLastModified(oldTime)

        every { mockDatabase.openHelper } returns mockk(relaxed = true)

        val worker = TestWorkerBuilder<CleanupWorker>(
            context = context,
            executor = executor
        ).build()

        runBlocking { worker.doWork() }

        // 清理
        tempFile.delete()
        tempDir.delete()
    }
}
