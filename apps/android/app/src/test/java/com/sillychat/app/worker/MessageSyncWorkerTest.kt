package com.sillychat.app.worker

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.ListenableWorker
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import androidx.work.testing.TestListenableWorkerBuilder
import com.sillychat.app.data.model.Message
import com.sillychat.app.data.model.SyncResult
import com.sillychat.app.data.model.SyncStatus
import com.sillychat.app.data.repository.MessageRepository
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.IOException

/**
 * MessageSyncWorker单元测试
 */
@ExperimentalCoroutinesApi
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class MessageSyncWorkerTest {

    private lateinit var context: Context
    private lateinit var mockMessageRepository: MessageRepository

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        mockMessageRepository = mockk()
    }

    /**
     * 测试同步成功的情况
     */
    @Test
    fun `should return success when sync completes successfully`() = runTest {
        // Given
        val syncResult = SyncResult(
            syncedCount = 5,
            failedCount = 0,
            serverMessages = emptyList()
        )
        coEvery { mockMessageRepository.syncPendingMessages() } returns Result.success(syncResult)

        val worker = TestListenableWorkerBuilder<MessageSyncWorker>(context)
            .setWorkerFactory(createTestFactory())
            .build()

        // When
        val result = worker.doWork()

        // Then
        assertTrue(result is ListenableWorker.Result.Success)
        val successResult = result as ListenableWorker.Result.Success
        assertEquals("success", successResult.outputData.getString(MessageSyncWorker.KEY_SYNC_RESULT))
        assertEquals(5, successResult.outputData.getInt(MessageSyncWorker.KEY_SYNCED_COUNT, 0))
        assertEquals(0, successResult.outputData.getInt(MessageSyncWorker.KEY_FAILED_COUNT, -1))
    }

    /**
     * 测试同步部分失败的情况
     */
    @Test
    fun `should return success with failed count when some messages fail`() = runTest {
        // Given
        val syncResult = SyncResult(
            syncedCount = 3,
            failedCount = 2,
            serverMessages = emptyList()
        )
        coEvery { mockMessageRepository.syncPendingMessages() } returns Result.success(syncResult)

        val worker = TestListenableWorkerBuilder<MessageSyncWorker>(context)
            .setWorkerFactory(createTestFactory())
            .build()

        // When
        val result = worker.doWork()

        // Then
        assertTrue(result is ListenableWorker.Result.Success)
        val successResult = result as ListenableWorker.Result.Success
        assertEquals(3, successResult.outputData.getInt(MessageSyncWorker.KEY_SYNCED_COUNT, 0))
        assertEquals(2, successResult.outputData.getInt(MessageSyncWorker.KEY_FAILED_COUNT, -1))
    }

    /**
     * 测试网络错误时的重试行为
     */
    @Test
    fun `should return retry when network error occurs`() = runTest {
        // Given
        coEvery { mockMessageRepository.syncPendingMessages() } throws
            java.net.UnknownHostException("No network")

        val worker = TestListenableWorkerBuilder<MessageSyncWorker>(context)
            .setWorkerFactory(createTestFactory())
            .build()

        // When
        val result = worker.doWork()

        // Then
        assertTrue(result is ListenableWorker.Result.Retry)
    }

    /**
     * 测试超时错误时的重试行为
     */
    @Test
    fun `should return retry when timeout occurs`() = runTest {
        // Given
        coEvery { mockMessageRepository.syncPendingMessages() } throws
            java.net.SocketTimeoutException("Connection timeout")

        val worker = TestListenableWorkerBuilder<MessageSyncWorker>(context)
            .setWorkerFactory(createTestFactory())
            .build()

        // When
        val result = worker.doWork()

        // Then
        assertTrue(result is ListenableWorker.Result.Retry)
    }

    /**
     * 测试IO错误时的重试行为
     */
    @Test
    fun `should return retry when IO error occurs`() = runTest {
        // Given
        coEvery { mockMessageRepository.syncPendingMessages() } throws
            IOException("IO error")

        val worker = TestListenableWorkerBuilder<MessageSyncWorker>(context)
            .setWorkerFactory(createTestFactory())
            .build()

        // When
        val result = worker.doWork()

        // Then
        assertTrue(result is ListenableWorker.Result.Retry)
    }

    /**
     * 测试达到最大重试次数后的失败
     */
    @Test
    fun `should return failure when max retries exceeded`() = runTest {
        // Given - 非可重试错误
        coEvery { mockMessageRepository.syncPendingMessages() } throws
            IllegalStateException("Unexpected error")

        val worker = TestListenableWorkerBuilder<MessageSyncWorker>(context)
            .setWorkerFactory(createTestFactory())
            .setRunAttemptCount(3)
            .build()

        // When
        val result = worker.doWork()

        // Then
        assertTrue(result is ListenableWorker.Result.Failure)
    }

    /**
     * 测试空待同步列表的情况
     */
    @Test
    fun `should return success when no pending messages`() = runTest {
        // Given
        val syncResult = SyncResult(
            syncedCount = 0,
            failedCount = 0,
            serverMessages = emptyList()
        )
        coEvery { mockMessageRepository.syncPendingMessages() } returns Result.success(syncResult)

        val worker = TestListenableWorkerBuilder<MessageSyncWorker>(context)
            .setWorkerFactory(createTestFactory())
            .build()

        // When
        val result = worker.doWork()

        // Then
        assertTrue(result is ListenableWorker.Result.Success)
        val successResult = result as ListenableWorker.Result.Success
        assertEquals(0, successResult.outputData.getInt(MessageSyncWorker.KEY_SYNCED_COUNT, -1))
    }

    /**
     * 测试SyncWorkStatus数据类
     */
    @Test
    fun `SyncWorkStatus should correctly parse WorkInfo`() {
        // This test validates the SyncWorkStatus data class structure
        val status = SyncWorkStatus(
            state = androidx.work.WorkInfo.State.SUCCEEDED,
            syncedCount = 10,
            failedCount = 2,
            errorMessage = null,
            retryCount = 1
        )

        assertTrue(status.isSuccess)
        assertFalse(status.isRunning)
        assertFalse(status.isFailed)
        assertEquals(10, status.syncedCount)
        assertEquals(2, status.failedCount)
    }

    /**
     * 测试WorkRequest创建
     */
    @Test
    fun `should create periodic work request correctly`() {
        val workRequest = MessageSyncWorker.createWorkRequest(
            isPeriodic = true,
            repeatIntervalMinutes = 30
        )

        assertNotNull(workRequest)
        assertTrue(workRequest.tags.contains(MessageSyncWorker.WORK_NAME))
    }

    @Test
    fun `should create one-time work request correctly`() {
        val workRequest = MessageSyncWorker.createWorkRequest(isPeriodic = false)

        assertNotNull(workRequest)
        assertTrue(workRequest.tags.contains(MessageSyncWorker.WORK_NAME))
    }

    /**
     * 创建测试WorkerFactory
     */
    private fun createTestFactory(): WorkerFactory {
        return object : WorkerFactory() {
            override fun createWorker(
                appContext: Context,
                workerClassName: String,
                workerParameters: WorkerParameters
            ): androidx.work.ListenableWorker? {
                return if (workerClassName == MessageSyncWorker::class.java.name) {
                    MessageSyncWorker(
                        appContext,
                        workerParameters,
                        mockMessageRepository
                    )
                } else null
            }
        }
    }
}
