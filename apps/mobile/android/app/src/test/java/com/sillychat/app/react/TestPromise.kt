package com.sillychat.app.react

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap

class TestPromise : Promise {
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

    override fun reject(code: String, throwable: Throwable?) {}
    override fun reject(throwable: Throwable?) {}
    override fun reject(message: String) {}
    override fun reject(code: String, message: String) {}
    override fun reject(throwable: Throwable?, userInfo: WritableMap?) {}
    override fun reject(code: String, userInfo: WritableMap) {}
    override fun reject(code: String, throwable: Throwable, userInfo: WritableMap) {}
    override fun reject(code: String, message: String, throwable: Throwable, userInfo: WritableMap) {}
    override fun reject(code: String, message: String, userInfo: WritableMap) {}
}
