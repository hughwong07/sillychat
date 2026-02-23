package com.sillychat.app.service

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.*
import androidx.work.testing.WorkManagerTestInitHelper
import com.sillychat.app.worker.CleanupWorker
import com.sillychat.app.worker.MessageSyncWorker
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.concurrent.TimeUnit

/**
 * WorkManagerService单元测试
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class WorkManagerServiceTest {

    private lateinit var context: Context
    private lateinit var workManagerService: WorkManagerService

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()

        // 初始化WorkManager测试环境
        val config = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.DEBUG)
            .setExecutor(androidx.arch.core.executor.ArchTaskExecutor.getIOThreadExecutor())
            .build()

        WorkManagerTestInitHelper.initializeTestWorkManager(context, config)
        workManagerService = WorkManagerService.getInstance(context)
    }

    @After
    fun tearDown() {
        workManagerService.cancelAllWork()
    }

    /**
     * 测试单例模式
     */
    @Test
    fun `should return same instance for singleton`() {
        val instance1 = WorkManagerService.getInstance(context)
        val instance2 = WorkManagerService.getInstance(context)

        assertSame(instance1, instance2)
    }

    /**
     * 测试调度周期性消息同步任务
     */
    @Test
    fun `should schedule periodic message sync work`() = runBlocking {
        // When
        val operation = workManagerService.schedulePeriodicMessageSync(
            repeatInterval = 15,
            timeUnit = TimeUnit.MINUTES
        )

        // Then
        assertNotNull(operation)

        // 验证任务已调度
        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_MESSAGE_SYNC
        ).get()

        assertTrue(workInfos.isNotEmpty())
    }

    /**
     * 测试调度一次性消息同步任务
     */
    @Test
    fun `should schedule one-time message sync work`() = runBlocking {
        // When
        val operation = workManagerService.scheduleOneTimeMessageSync(
            delayMs = 0
        )

        // Then
        assertNotNull(operation)

        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_ONE_TIME_SYNC
        ).get()

        assertTrue(workInfos.isNotEmpty())
    }

    /**
     * 测试调度定期清理任务
     */
    @Test
    fun `should schedule periodic cleanup work`() = runBlocking {
        // When
        val operation = workManagerService.schedulePeriodicCleanup(
            repeatInterval = 24,
            timeUnit = TimeUnit.HOURS
        )

        // Then
        assertNotNull(operation)

        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_CLEANUP
        ).get()

        assertTrue(workInfos.isNotEmpty())
    }

    /**
     * 测试立即执行清理任务
     */
    @Test
    fun `should run immediate cleanup`() = runBlocking {
        // When
        val operation = workManagerService.runImmediateCleanup()

        // Then
        assertNotNull(operation)
    }

    /**
     * 测试取消消息同步任务
     */
    @Test
    fun `should cancel message sync work`() = runBlocking {
        // Given
        workManagerService.schedulePeriodicMessageSync()

        // When
        workManagerService.cancelMessageSync()

        // Then
        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_MESSAGE_SYNC
        ).get()

        // 任务应该被取消或不存在
        val allCancelled = workInfos.all {
            it.state == WorkInfo.State.CANCELLED
        }
        assertTrue(allCancelled || workInfos.isEmpty())
    }

    /**
     * 测试取消清理任务
     */
    @Test
    fun `should cancel cleanup work`() = runBlocking {
        // Given
        workManagerService.schedulePeriodicCleanup()

        // When
        workManagerService.cancelCleanup()

        // Then
        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_CLEANUP
        ).get()

        val allCancelled = workInfos.all {
            it.state == WorkInfo.State.CANCELLED
        }
        assertTrue(allCancelled || workInfos.isEmpty())
    }

    /**
     * 测试取消所有任务
     */
    @Test
    fun `should cancel all work`() = runBlocking {
        // Given
        workManagerService.schedulePeriodicMessageSync()
        workManagerService.schedulePeriodicCleanup()

        // When
        workManagerService.cancelAllWork()

        // Then - 验证所有任务被取消
        val workManager = WorkManager.getInstance(context)
        val allWorkInfos = workManager.getWorkInfosByTag("*").get()

        val allCancelled = allWorkInfos.all {
            it.state == WorkInfo.State.CANCELLED
        }
        assertTrue(allCancelled || allWorkInfos.isEmpty())
    }

    /**
     * 测试检查任务是否运行
     */
    @Test
    fun `should check if work is running`() = runBlocking {
        // Given - 调度任务但不执行
        workManagerService.scheduleOneTimeMessageSync()

        // When
        val isRunning = workManagerService.isWorkRunning(
            WorkManagerService.WORK_NAME_ONE_TIME_SYNC
        )

        // Then - 新调度的任务不应该立即处于运行状态
        assertFalse(isRunning)
    }

    /**
     * 测试调度默认任务
     */
    @Test
    fun `should schedule default tasks`() = runBlocking {
        // When
        workManagerService.scheduleDefaultTasks()

        // Then
        val workManager = WorkManager.getInstance(context)

        val messageSyncWork = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_MESSAGE_SYNC
        ).get()

        val cleanupWork = workManager.getWorkInfosForUniqueWork(
            WorkManagerService.WORK_NAME_CLEANUP
        ).get()

        assertTrue(messageSyncWork.isNotEmpty())
        assertTrue(cleanupWork.isNotEmpty())
    }

    /**
     * 测试WorkRequest约束条件
     */
    @Test
    fun `should create work request with correct constraints`() {
        val workRequest = MessageSyncWorker.createWorkRequest(isPeriodic = false)

        val constraints = workRequest.workSpec.constraints
        assertNotNull(constraints)
        assertEquals(NetworkType.CONNECTED, constraints.requiredNetworkType)
    }

    @Test
    fun `should create cleanup work request with correct constraints`() {
        val workRequest = CleanupWorker.createWorkRequest(isPeriodic = false)

        val constraints = workRequest.workSpec.constraints
        assertNotNull(constraints)
    }

    /**
     * 测试常量值
     */
    @Test
    fun `should have correct work name constants`() {
        assertEquals("message_sync_work", WorkManagerService.WORK_NAME_MESSAGE_SYNC)
        assertEquals("cleanup_work", WorkManagerService.WORK_NAME_CLEANUP)
        assertEquals("one_time_sync_work", WorkManagerService.WORK_NAME_ONE_TIME_SYNC)
    }
}
