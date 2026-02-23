package com.sillychat.app.worker

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.*
import androidx.work.testing.TestWorkerBuilder
import com.sillychat.app.data.repository.MessageRepository
import com.sillychat.app.data.repository.SyncResult
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.Executor
import java.util.concurrent.Executors

/**
 * MessageSyncWorker集成测试
 * 测试Worker在实际Android环境中的行为
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class MessageSyncWorkerIntegrationTest {

    @get:Rule
    var hiltRule = HiltAndroidRule(this)

    private lateinit var context: Context
    private lateinit var executor: Executor
    private lateinit var mockMessageRepository: MessageRepository

    @Before
    fun setup() {
        hiltRule.inject()
        context = ApplicationProvider.getApplicationContext()
        executor = Executors.newSingleThreadExecutor()
        mockMessageRepository = mockk()
    }

    /**
     * 测试Worker创建和基本执行
     */
    @Test
    fun testWorkerExecution() {
        // Given
        val syncResult = SyncResult(
            syncedCount = 5,
            failedCount = 0,
            serverMessages = emptyList()
        )
        coEvery { mockMessageRepository.syncPendingMessages() } returns Result.success(syncResult)

        val worker = TestWorkerBuilder<MessageSyncWorker>(
            context = context,
            executor = executor
        ).build()

        // When
        val result = runBlocking { worker.doWork() }

        // Then
        assertTrue(result is ListenableWorker.Result.Success)
    }

    /**
     * 测试Worker约束条件
     */
    @Test
    fun testWorkerConstraints() {
        val workRequest = MessageSyncWorker.createWorkRequest(isPeriodic = false)

        // 验证约束条件
        val constraints = workRequest.workSpec.constraints
        assertNotNull(constraints)
        assertEquals(NetworkType.CONNECTED, constraints.requiredNetworkType)
        assertTrue(constraints.requiresBatteryNotLow())
    }

    /**
     * 测试周期性WorkRequest创建
     */
    @Test
    fun testPeriodicWorkRequestCreation() {
        val workRequest = MessageSyncWorker.createWorkRequest(
            isPeriodic = true,
            repeatIntervalMinutes = 15
        ) as PeriodicWorkRequest

        assertEquals(15, workRequest.workSpec.intervalDuration / (60 * 1000))
        assertTrue(workRequest.tags.contains(MessageSyncWorker.WORK_NAME))
    }

    /**
     * 测试Worker输出数据
     */
    @Test
    fun testWorkerOutputData() = runBlocking {
        // Given
        val syncResult = SyncResult(
            syncedCount = 10,
            failedCount = 2,
            serverMessages = emptyList()
        )
        coEvery { mockMessageRepository.syncPendingMessages() } returns Result.success(syncResult)

        val worker = TestWorkerBuilder<MessageSyncWorker>(
            context = context,
            executor = executor
        ).build()

        // When
        val result = worker.doWork() as ListenableWorker.Result.Success

        // Then
        assertEquals("success", result.outputData.getString(MessageSyncWorker.KEY_SYNC_RESULT))
        assertEquals(10, result.outputData.getInt(MessageSyncWorker.KEY_SYNCED_COUNT, 0))
        assertEquals(2, result.outputData.getInt(MessageSyncWorker.KEY_FAILED_COUNT, 0))
    }

    /**
     * 测试Worker重试机制
     */
    @Test
    fun testWorkerRetryOnNetworkError() = runBlocking {
        // Given - 网络错误
        coEvery { mockMessageRepository.syncPendingMessages() } throws
            java.net.UnknownHostException("No network")

        val worker = TestWorkerBuilder<MessageSyncWorker>(
            context = context,
            executor = executor
        ).build()

        // When
        val result = worker.doWork()

        // Then - 应该返回重试
        assertTrue(result is ListenableWorker.Result.Retry)
    }

    /**
     * 测试Worker标签
     */
    @Test
    fun testWorkerTags() {
        val workRequest = MessageSyncWorker.createWorkRequest(isPeriodic = false)

        assertTrue(workRequest.tags.contains(MessageSyncWorker.WORK_NAME))
    }

    /**
     * 测试退避策略配置
     */
    @Test
    fun testBackoffPolicyConfiguration() {
        val workRequest = MessageSyncWorker.createWorkRequest(isPeriodic = false)

        assertEquals(
            BackoffPolicy.EXPONENTIAL,
            workRequest.workSpec.backoffPolicy
        )
    }
}
