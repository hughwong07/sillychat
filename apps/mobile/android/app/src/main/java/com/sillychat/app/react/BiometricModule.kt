package com.sillychat.app.react

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.biometric.BiometricPrompt.AuthenticationResult
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import java.util.concurrent.Executor
import androidx.fragment.app.FragmentActivity

class BiometricModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val ERROR_CODE_CANCELED = "USER_CANCELED"
        private const val ERROR_CODE_NOT_AVAILABLE = "NOT_AVAILABLE"
        private const val ERROR_CODE_NOT_ENROLLED = "NOT_ENROLLED"
        private const val ERROR_CODE_LOCKOUT = "LOCKOUT"
        private const val ERROR_CODE_AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
        private const val ERROR_CODE_INVALID_ACTIVITY = "INVALID_ACTIVITY"

        // Biometric types
        const val BIOMETRIC_TYPE_FINGERPRINT = 1
        const val BIOMETRIC_TYPE_FACE = 2
        const val BIOMETRIC_TYPE_IRIS = 4
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String = "BiometricModule"

    override fun getConstants(): Map<String, Any>? {
        return mapOf(
            "BIOMETRIC_TYPE_FINGERPRINT" to BIOMETRIC_TYPE_FINGERPRINT,
            "BIOMETRIC_TYPE_FACE" to BIOMETRIC_TYPE_FACE,
            "BIOMETRIC_TYPE_IRIS" to BIOMETRIC_TYPE_IRIS,
            "ERROR_CODE_CANCELED" to ERROR_CODE_CANCELED,
            "ERROR_CODE_NOT_AVAILABLE" to ERROR_CODE_NOT_AVAILABLE,
            "ERROR_CODE_NOT_ENROLLED" to ERROR_CODE_NOT_ENROLLED,
            "ERROR_CODE_LOCKOUT" to ERROR_CODE_LOCKOUT,
            "ERROR_CODE_AUTHENTICATION_FAILED" to ERROR_CODE_AUTHENTICATION_FAILED
        )
    }

    @ReactMethod
    fun isSensorAvailable(promise: Promise) {
        try {
            val biometricManager = BiometricManager.from(reactApplicationContext)

            // Check for strong biometric (fingerprint, face unlock with Class 3)
            val canAuthenticateStrong = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG
            )

            // Check for weak biometric (face unlock with Class 2)
            val canAuthenticateWeak = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            )

            // Check for device credential
            val canAuthenticateDeviceCredential = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )

            val available = canAuthenticateStrong == BiometricManager.BIOMETRIC_SUCCESS ||
                    canAuthenticateWeak == BiometricManager.BIOMETRIC_SUCCESS

            val result = Arguments.createMap().apply {
                putBoolean("available", available)
                putString("biometryType", getBiometryType())
                putBoolean("strongBiometric", canAuthenticateStrong == BiometricManager.BIOMETRIC_SUCCESS)
                putBoolean("weakBiometric", canAuthenticateWeak == BiometricManager.BIOMETRIC_SUCCESS)
                putBoolean("deviceCredential", canAuthenticateDeviceCredential == BiometricManager.BIOMETRIC_SUCCESS)

                if (!available) {
                    putString("error", getErrorMessage(canAuthenticateStrong))
                }
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SENSOR_CHECK_ERROR", "Failed to check biometric sensor: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getBiometryType(promise: Promise) {
        promise.resolve(getBiometryType())
    }

    @ReactMethod
    fun simplePrompt(params: ReadableMap, promise: Promise) {
        mainHandler.post {
            try {
                val activity = currentActivity as? FragmentActivity
                    ?: run {
                        promise.reject(
                            ERROR_CODE_INVALID_ACTIVITY,
                            "Current activity is not a FragmentActivity",
                            null
                        )
                        return@post
                    }

                val title = params.getString("title") ?: "Authentication Required"
                val subtitle = params.getString("subtitle") ?: ""
                val description = params.getString("description") ?: ""
                val cancelButtonText = params.getString("cancelButtonText") ?: "Cancel"
                val fallbackToDeviceCredentials = params.hasKey("fallbackToDeviceCredentials") &&
                        params.getBoolean("fallbackToDeviceCredentials")

                val biometricManager = BiometricManager.from(reactApplicationContext)
                val canAuthenticate = biometricManager.canAuthenticate(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG
                )

                if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
                    promise.reject(
                        getErrorCode(canAuthenticate),
                        getErrorMessage(canAuthenticate),
                        null
                    )
                    return@post
                }

                val executor = ContextCompat.getMainExecutor(reactApplicationContext)

                val biometricPrompt = BiometricPrompt(
                    activity,
                    executor,
                    createAuthenticationCallback(promise)
                )

                val promptInfo = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle(subtitle.takeIf { it.isNotEmpty() })
                    .setDescription(description.takeIf { it.isNotEmpty() })
                    .setNegativeButtonText(cancelButtonText)
                    .apply {
                        if (fallbackToDeviceCredentials && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            setAllowedAuthenticators(
                                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
                            )
                        } else {
                            setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                        }
                    }
                    .build()

                biometricPrompt.authenticate(promptInfo)

            } catch (e: Exception) {
                promise.reject("PROMPT_ERROR", "Failed to show biometric prompt: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun authenticateWithDeviceCredential(params: ReadableMap, promise: Promise) {
        mainHandler.post {
            try {
                val activity = currentActivity as? FragmentActivity
                    ?: run {
                        promise.reject(
                            ERROR_CODE_INVALID_ACTIVITY,
                            "Current activity is not a FragmentActivity",
                            null
                        )
                        return@post
                    }

                val title = params.getString("title") ?: "Authentication Required"
                val subtitle = params.getString("subtitle") ?: ""
                val description = params.getString("description") ?: ""

                val biometricManager = BiometricManager.from(reactApplicationContext)
                val canAuthenticate = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    biometricManager.canAuthenticate(
                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    )
                } else {
                    // On older versions, check for device credential differently
                    BiometricManager.BIOMETRIC_SUCCESS
                }

                if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
                    promise.reject(
                        getErrorCode(canAuthenticate),
                        getErrorMessage(canAuthenticate),
                        null
                    )
                    return@post
                }

                val executor = ContextCompat.getMainExecutor(reactApplicationContext)

                val biometricPrompt = BiometricPrompt(
                    activity,
                    executor,
                    createAuthenticationCallback(promise)
                )

                val promptInfoBuilder = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle(subtitle.takeIf { it.isNotEmpty() })
                    .setDescription(description.takeIf { it.isNotEmpty() })

                // Set authenticators based on API level
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    promptInfoBuilder.setAllowedAuthenticators(
                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    )
                } else {
                    // On older versions, we need to allow both biometric and device credential
                    promptInfoBuilder.setAllowedAuthenticators(
                        BiometricManager.Authenticators.BIOMETRIC_WEAK or
                                BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    )
                    promptInfoBuilder.setNegativeButtonText("Cancel")
                }

                biometricPrompt.authenticate(promptInfoBuilder.build())

            } catch (e: Exception) {
                promise.reject("PROMPT_ERROR", "Failed to show device credential prompt: ${e.message}", e)
            }
        }
    }

    private fun createAuthenticationCallback(promise: Promise): BiometricPrompt.AuthenticationCallback {
        return object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: AuthenticationResult) {
                super.onAuthenticationSucceeded(result)

                val resultMap = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("message", "Authentication successful")

                    // Add authentication type info
                    val authType = when (result.authenticationType) {
                        BiometricPrompt.AUTHENTICATION_RESULT_TYPE_BIOMETRIC -> "biometric"
                        BiometricPrompt.AUTHENTICATION_RESULT_TYPE_DEVICE_CREDENTIAL -> "deviceCredential"
                        else -> "unknown"
                    }
                    putString("authenticationType", authType)
                }

                promise.resolve(resultMap)
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                // Don't reject here, wait for onAuthenticationError
                // This is called for each failed attempt
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)

                val errorCodeStr = when (errorCode) {
                    BiometricPrompt.ERROR_USER_CANCELED,
                    BiometricPrompt.ERROR_NEGATIVE_BUTTON -> ERROR_CODE_CANCELED
                    BiometricPrompt.ERROR_LOCKOUT -> ERROR_CODE_LOCKOUT
                    BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> ERROR_CODE_LOCKOUT
                    else -> ERROR_CODE_AUTHENTICATION_FAILED
                }

                val resultMap = Arguments.createMap().apply {
                    putBoolean("success", false)
                    putString("error", errorCodeStr)
                    putString("errorMessage", errString.toString())
                    putInt("errorCode", errorCode)
                }

                // Resolve with error info instead of rejecting for better UX
                promise.resolve(resultMap)
            }
        }
    }

    private fun getBiometryType(): String {
        val packageManager = reactApplicationContext.packageManager

        return when {
            packageManager.hasSystemFeature(PackageManager.FEATURE_FACE) -> "FaceID"
            packageManager.hasSystemFeature(PackageManager.FEATURE_IRIS) -> "Iris"
            packageManager.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT) -> "Fingerprint"
            else -> "Biometric"
        }
    }

    private fun getErrorCode(canAuthenticate: Int): String {
        return when (canAuthenticate) {
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> ERROR_CODE_NOT_AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> ERROR_CODE_NOT_AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> ERROR_CODE_NOT_ENROLLED
            BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> ERROR_CODE_NOT_AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> ERROR_CODE_NOT_AVAILABLE
            BiometricManager.BIOMETRIC_STATUS_UNKNOWN -> ERROR_CODE_NOT_AVAILABLE
            else -> ERROR_CODE_NOT_AVAILABLE
        }
    }

    private fun getErrorMessage(canAuthenticate: Int): String {
        return when (canAuthenticate) {
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> "Biometric hardware not available"
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> "Biometric hardware unavailable"
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "No biometric credentials enrolled"
            BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> "Security update required"
            BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> "Biometric authentication not supported"
            BiometricManager.BIOMETRIC_STATUS_UNKNOWN -> "Unknown biometric status"
            else -> "Biometric authentication not available"
        }
    }
}
