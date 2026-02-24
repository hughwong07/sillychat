package com.sillychat.app.react

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap

abstract class BaseTestPromise : Promise {
    override fun reject(code: String, message: String, throwable: Throwable?) {}
    override fun reject(code: String, throwable: Throwable?) {}
    override fun reject(throwable: Throwable?) {}
    override fun reject(message: String) {}
    override fun reject(code: String, message: String) {}
    override fun reject(throwable: Throwable?, userInfo: WritableMap?) {}
    override fun reject(code: String, userInfo: WritableMap) {}
    override fun reject(code: String, throwable: Throwable, userInfo: WritableMap) {}
    override fun reject(code: String, message: String, userInfo: WritableMap) {}
    override fun reject(code: String, message: String, throwable: Throwable, userInfo: WritableMap) {}
}
