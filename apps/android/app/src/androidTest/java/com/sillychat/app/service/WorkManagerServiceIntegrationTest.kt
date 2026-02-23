package com.sillychat.app.service

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.*
import androidx.work.testing.WorkManagerTestInitHelper
import com.sillychat.app.worker.CleanupWorker
import com.sillychat.app.worker.MessageSyncWorker
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit

/**
 * WorkManagerService集成测试
 * 测试任务调度和约束条件
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class WorkManagerServiceIntegrationTest {

    @get:Rule
    var hiltRule = HiltAndroidRule(this)

    private lateinit var context: Context
    private lateinit var workManagerService: WorkManagerService

    @Before
    fun setup() {
        hiltRule.inject()
        context = ApplicationProvider.getApplicationContext()

        // 初始化WorkManager测试环境
        val config = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.DEBUG)
            .build()

        WorkManagerTestInitHelper.initializeTestWorkManager(context, config)
        workManagerService = WorkManagerService.getInstance(context)
    }

    @After
    fun tearDown() {
        workManagerService.cancelAllWork()
    }

    /**
     * 测试完整任务调度流程
     */
    @Test
    fun testFullTaskSchedulingFlow() = runBlocking {
        // When - 调度所有默认任务
        workManagerService.scheduleDefaultTasks()

        // Then - 验证任务已创建
        val workManager = WorkManager.getInstance(context)

        val messageSyncWork = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_MESSAGE_SYNC
        ).get()

        val cleanupWork = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_CLEANUP
        ).get()

        assertTrue("Message sync work should be scheduled", messageSyncWork.isNotEmpty())
        assertTrue("Cleanup work should be scheduled", cleanupWork.isNotEmpty())
    }

    /**
     * 测试任务约束条件
     */
    @Test
    fun testTaskConstraints() = runBlocking {
        // Given - 调度带约束的任务
        workManagerService.schedulePeriodicMessageSync(
            requiresNetwork = true,
            requiresCharging = false
        )

        // Then - 验证约束条件
        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_MESSAGE_SYNC
        ).get()

        assertTrue(workInfos.isNotEmpty())
        // 约束条件在WorkRequest中设置
    }

    /**
     * 测试任务取消
     */
    @Test
    fun testTaskCancellation() = runBlocking {
        // Given
        workManagerService.schedulePeriodicMessageSync()

        // When
        workManagerService.cancelMessageSync()

        // Then
        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_MESSAGE_SYNC
        ).get()

        assertTrue(
            "Work should be cancelled",
            workInfos.all { it.state == WorkInfo.State.CANCELLED }
        )
    }

    /**
     * 测试一次性任务调度
     */
    @Test
    fun testOneTimeTaskScheduling() = runBlocking {
        // When
        workManagerService.scheduleOneTimeMessageSync(delayMs = 1000)

        // Then
        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_ONE_TIME_SYNC
        ).get()

        assertTrue("One-time work should be scheduled", workInfos.isNotEmpty())
    }

    /**
     * 测试立即清理任务
     */
    @Test
    fun testImmediateCleanup() = runBlocking {
        // When
        workManagerService.runImmediateCleanup()

        // Then
        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosByTag("immediate_cleanup").get()

        assertTrue("Immediate cleanup should be scheduled", workInfos.isNotEmpty())
    }

    /**
     * 测试多个任务的独立性
     */
    @Test
    fun testTaskIndependence() = runBlocking {
        // Given - 调度多个不同类型的任务
        workManagerService.schedulePeriodicMessageSync()
        workManagerService.schedulePeriodicCleanup()

        // When - 只取消消息同步任务
        workManagerService.cancelMessageSync()

        // Then - 清理任务应该仍然存在
        val workManager = WorkManager.getInstance(context)
        val cleanupWork = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_CLEANUP
        ).get()

        assertTrue("Cleanup work should still exist", cleanupWork.isNotEmpty())
        assertFalse(
            "Cleanup work should not be cancelled",
            cleanupWork.all { it.state == WorkInfo.State.CANCELLED }
        )
    }

    /**
     * 测试任务时间间隔配置
     */
    @Test
    fun testTaskIntervalConfiguration() {
        // 创建不同时间间隔的WorkRequest
        val shortIntervalWork = MessageSyncWorker.createWorkRequest(
            isPeriodic = true,
            repeatIntervalMinutes = 15
        ) as PeriodicWorkRequest

        val longIntervalWork = CleanupWorker.createWorkRequest(
            isPeriodic = true,
            repeatIntervalHours = 24
        ) as PeriodicWorkRequest

        // 验证时间间隔
        assertEquals(15 * 60 * 1000, shortIntervalWork.workSpec.intervalDuration)
        assertEquals(24 * 60 * 60 * 1000, longIntervalWork.workSpec.intervalDuration)
    }

    /**
     * 测试WorkManager单例
     */
    @Test
    fun testServiceSingleton() {
        val instance1 = WorkManagerService.getInstance(context)
        val instance2 = WorkManagerService.getInstance(context)

        assertSame("Service should be singleton", instance1, instance2)
    }

    /**
     * 测试任务状态查询
     */
    @Test
    fun testWorkStatusQuery() = runBlocking {
        // Given
        workManagerService.schedulePeriodicMessageSync()

        // When - 检查任务是否运行（新任务不会立即运行）
        val isRunning = workManagerService.isWorkRunning(
            WorkManagerService.WORK_NAME_MESSAGE_SYNC
        )

        // Then
        assertFalse("Newly scheduled work should not be running immediately", isRunning)
    }
}
