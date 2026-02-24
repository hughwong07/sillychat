package com.sillychat.app.react

import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import io.mockk.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Build.VERSION_CODES.TIRAMISU])
class NotificationModuleTest {

    private lateinit var reactContext: ReactApplicationContext
    private lateinit var notificationModule: NotificationModule

    @Before
    fun setup() {
        reactContext = mockk(relaxed = true)
        every { reactContext.applicationContext } returns reactContext

        notificationModule = NotificationModule(reactContext)
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `getName returns NotificationModule`() {
        assertEquals("NotificationModule", notificationModule.name)
    }

    @Test
    fun `checkPermissions handles permission check`() {
        val mockPromise = TestPromise()
        notificationModule.checkPermissions(mockPromise)
        assertTrue(mockPromise.isResolved || mockPromise.isRejected)
    }

    @Test
    fun `displayNotification shows notification`() {
        val mockPromise = TestPromise()
        val mockNotificationManager = mockk<NotificationManager>(relaxed = true)

        every { reactContext.getSystemService(Context.NOTIFICATION_SERVICE) } returns mockNotificationManager

        val options = Arguments.createMap().apply {
            putString("title", "Test Title")
            putString("body", "Test Body")
        }

        notificationModule.displayNotification(options, mockPromise)

        assertTrue(mockPromise.isResolved)
    }

    @Test
    fun `cancelNotification cancels specific notification`() {
        val mockPromise = TestPromise()
        val mockNotificationManager = mockk<NotificationManager>(relaxed = true)

        every { reactContext.getSystemService(Context.NOTIFICATION_SERVICE) } returns mockNotificationManager

        notificationModule.cancelNotification(123, mockPromise)

        assertTrue(mockPromise.isResolved)
    }

    @Test
    fun `cancelAllNotifications cancels all notifications`() {
        val mockPromise = TestPromise()
        val mockNotificationManager = mockk<NotificationManager>(relaxed = true)

        every { reactContext.getSystemService(Context.NOTIFICATION_SERVICE) } returns mockNotificationManager

        notificationModule.cancelAllNotifications(mockPromise)

        assertTrue(mockPromise.isResolved)
    }

    class TestPromise : BaseTestPromise() {
        var resolvedValue: Any? = null
            private set
        var rejectionCode: String? = null
            private set
        var rejectionMessage: String? = null
            private set
        var rejectionThrowable: Throwable? = null
            private set

        val isResolved: Boolean get() = resolvedValue != null
        val isRejected: Boolean get() = rejectionCode != null

        override fun resolve(value: Any?) {
            resolvedValue = value
        }

        override fun reject(code: String, message: String, throwable: Throwable?) {
            rejectionCode = code
            rejectionMessage = message
            rejectionThrowable = throwable
        }
    }
}
