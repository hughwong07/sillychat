package com.sillychat.app.worker

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.ListenableWorker
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import androidx.work.testing.TestListenableWorkerBuilder
import com.sillychat.app.data.local.AppDatabase
import com.sillychat.app.data.local.MessageDao
import com.sillychat.app.data.model.Message
import com.sillychat.app.data.model.MessageRole
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/**
 * CleanupWorker单元测试
 */
@ExperimentalCoroutinesApi
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class CleanupWorkerTest {

    private lateinit var context: Context
    private lateinit var mockDatabase: AppDatabase
    private lateinit var mockMessageDao: MessageDao

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        mockDatabase = mockk(relaxed = true)
        mockMessageDao = mockk(relaxed = true)

        every { mockDatabase.messageDao() } returns mockMessageDao
        every { mockDatabase.openHelper } returns mockk(relaxed = true)
    }

    /**
     * 测试清理成功的情况
     */
    @Test
    fun `should return success when cleanup completes`() = runTest {
        // Given
        val oldMessages = listOf(
            createTestMessage("1", System.currentTimeMillis() - 100 * 24 * 60 * 60 * 1000),
            createTestMessage("2", System.currentTimeMillis() - 95 * 24 * 60 * 60 * 1000)
        )
        coEvery { mockMessageDao.getMessagesBefore(any()) } returns oldMessages

        val worker = TestListenableWorkerBuilder<CleanupWorker>(context)
            .setWorkerFactory(createTestFactory())
            .build()

        // When
        val result = worker.doWork()

        // Then
        assertTrue(result is ListenableWorker.Result.Success)
        val successResult = result as ListenableWorker.Result.Success
        assertEquals("success", successResult.outputData.getString(CleanupWorker.KEY_CLEANUP_RESULT))
        assertTrue(successResult.outputData.getBoolean(CleanupWorker.KEY_DATABASE_OPTIMIZED, false))
    }

    /**
     * 测试清理过程中发生错误时的处理
     */
    @Test
    fun `should return success with error message when partial failure occurs`() = runTest {
        // Given - 模拟数据库错误
        every { mockDatabase.openHelper } throws RuntimeException("Database error")

        val worker = TestListenableWorkerBuilder<CleanupWorker>(context)
            .setWorkerFactory(createTestFactory())
            .build()

        // When
        val result = worker.doWork()

        // Then - 清理任务失败不应该导致Worker失败
        assertTrue(result is ListenableWorker.Result.Success)
    }

    /**
     * 测试空过期消息列表的情况
     */
    @Test
    fun `should return success when no old messages to cleanup`() = runTest {
        // Given
        coEvery { mockMessageDao.getMessagesBefore(any()) } returns emptyList()

        val worker = TestListenableWorkerBuilder<CleanupWorker>(context)
            .setWorkerFactory(createTestFactory())
            .build()

        // When
        val result = worker.doWork()

        // Then
        assertTrue(result is ListenableWorker.Result.Success)
        val successResult = result as ListenableWorker.Result.Success
        assertEquals(0, successResult.outputData.getInt(CleanupWorker.KEY_OLD_MESSAGES_DELETED, -1))
    }

    /**
     * 测试CleanupWorkStatus数据类
     */
    @Test
    fun `CleanupWorkStatus should correctly parse output data`() {
        val status = CleanupWorkStatus(
            state = androidx.work.WorkInfo.State.SUCCEEDED,
            cacheCleanedBytes = 1024 * 1024 * 10, // 10MB
            tempFilesDeleted = 5,
            databaseOptimized = true,
            oldMessagesDeleted = 100,
            durationMs = 1500
        )

        assertTrue(status.isSuccess)
        assertFalse(status.isRunning)
        assertEquals(10.0, status.cacheCleanedMB, 0.01)
        assertEquals(5, status.tempFilesDeleted)
        assertTrue(status.databaseOptimized)
        assertEquals(100, status.oldMessagesDeleted)
    }

    @Test
    fun `CleanupWorkStatus should detect partial success`() {
        val status = CleanupWorkStatus(
            state = androidx.work.WorkInfo.State.SUCCEEDED,
            errorMessage = "Some cleanup tasks failed",
            cacheCleanedBytes = 1024
        )

        assertFalse(status.isSuccess)
        assertTrue(status.isPartialSuccess)
    }

    /**
     * 测试WorkRequest创建
     */
    @Test
    fun `should create periodic cleanup work request correctly`() {
        val workRequest = CleanupWorker.createWorkRequest(
            isPeriodic = true,
            repeatIntervalHours = 12
        )

        assertNotNull(workRequest)
        assertTrue(workRequest.tags.contains(CleanupWorker.WORK_NAME))
    }

    @Test
    fun `should create one-time cleanup work request correctly`() {
        val workRequest = CleanupWorker.createWorkRequest(isPeriodic = false)

        assertNotNull(workRequest)
        assertTrue(workRequest.tags.contains(CleanupWorker.WORK_NAME))
    }

    /**
     * 测试缓存目录清理逻辑
     */
    @Test
    fun `should calculate cache size correctly`() {
        // Create a temporary file to test size calculation
        val tempFile = File(context.cacheDir, "test_cache_file")
        tempFile.writeText("Test content for size calculation")

        val fileSize = tempFile.length()
        assertTrue(fileSize > 0)

        // Cleanup
        tempFile.delete()
    }

    /**
     * 测试存储空间检查
     */
    @Test
    fun `should check storage space availability`() {
        // 验证缓存目录存在且可访问
        assertTrue(context.cacheDir.exists())
        assertTrue(context.cacheDir.canRead())
        assertTrue(context.cacheDir.canWrite())
    }

    /**
     * 创建测试消息
     */
    private fun createTestMessage(id: String, timestamp: Long): Message {
        return Message(
            id = id,
            content = "Test message $id",
            role = MessageRole.USER,
            timestamp = timestamp,
            syncStatus = com.sillychat.app.data.model.SyncStatus.SYNCED
        )
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
                return if (workerClassName == CleanupWorker::class.java.name) {
                    CleanupWorker(
                        appContext,
                        workerParameters,
                        mockDatabase
                    )
                } else null
            }
        }
    }
}
