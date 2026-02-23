package com.xiaoshagua.xsgchat.biometric

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 生物识别管理器
 * 处理指纹、面部识别等生物认证功能
 */
@Singleton
class BiometricManagerHelper @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val biometricManager = BiometricManager.from(context)

    /**
     * 生物识别状态
     */
    private val _authState = MutableStateFlow<BiometricAuthState>(BiometricAuthState.Idle)
    val authState: StateFlow<BiometricAuthState> = _authState.asStateFlow()

    /**
     * 检查生物识别可用性
     */
    fun checkBiometricAvailability(): BiometricAvailability {
        return when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)) {
            BiometricManager.BIOMETRIC_SUCCESS -> {
                Timber.d("生物识别可用")
                BiometricAvailability.Available
            }
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> {
                Timber.w("设备没有生物识别硬件")
                BiometricAvailability.NoHardware
            }
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> {
                Timber.w("生物识别硬件不可用")
                BiometricAvailability.HardwareUnavailable
            }
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                Timber.w("用户未录入生物识别信息")
                BiometricAvailability.NotEnrolled
            }
            else -> {
                Timber.w("生物识别状态未知")
                BiometricAvailability.Unknown
            }
        }
    }

    /**
     * 检查是否可以使用生物识别
     */
    fun canAuthenticate(): Boolean {
        return checkBiometricAvailability() == BiometricAvailability.Available
    }

    /**
     * 显示生物识别认证对话框
     */
    fun showBiometricPrompt(
        activity: FragmentActivity,
        title: String = "生物识别认证",
        subtitle: String = "请验证您的身份",
        negativeButtonText: String = "取消",
        onSuccess: () -> Unit,
        onError: (errorCode: Int, errString: String) -> Unit = { _, _ -> },
        onFailed: () -> Unit = {}
    ) {
        if (!canAuthenticate()) {
            _authState.value = BiometricAuthState.Error(-1, "生物识别不可用")
            onError(-1, "生物识别不可用")
            return
        }

        val executor = ContextCompat.getMainExecutor(context)

        val biometricPrompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    Timber.e("生物识别错误: $errorCode - $errString")
                    _authState.value = BiometricAuthState.Error(errorCode, errString.toString())
                    onError(errorCode, errString.toString())
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    Timber.d("生物识别成功")
                    _authState.value = BiometricAuthState.Success
                    onSuccess()
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    Timber.w("生物识别失败")
                    _authState.value = BiometricAuthState.Failed
                    onFailed()
                }
            }
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText(negativeButtonText)
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .build()

        _authState.value = BiometricAuthState.Authenticating
        biometricPrompt.authenticate(promptInfo)
    }

    /**
     * 使用设备凭据进行认证（PIN/密码/图案）
     */
    fun showDeviceCredentialPrompt(
        activity: FragmentActivity,
        title: String = "设备认证",
        subtitle: String = "请验证您的身份",
        onSuccess: () -> Unit,
        onError: (errorCode: Int, errString: String) -> Unit = { _, _ -> }
    ) {
        val executor = ContextCompat.getMainExecutor(context)

        val biometricPrompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    Timber.e("设备认证错误: $errorCode - $errString")
                    _authState.value = BiometricAuthState.Error(errorCode, errString.toString())
                    onError(errorCode, errString.toString())
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    Timber.d("设备认证成功")
                    _authState.value = BiometricAuthState.Success
                    onSuccess()
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    Timber.w("设备认证失败")
                    _authState.value = BiometricAuthState.Failed
                }
            }
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
            .build()

        _authState.value = BiometricAuthState.Authenticating
        biometricPrompt.authenticate(promptInfo)
    }

    /**
     * 重置认证状态
     */
    fun resetState() {
        _authState.value = BiometricAuthState.Idle
    }
}

/**
 * 生物识别可用性状态
 */
sealed class BiometricAvailability {
    data object Available : BiometricAvailability()
    data object NoHardware : BiometricAvailability()
    data object HardwareUnavailable : BiometricAvailability()
    data object NotEnrolled : BiometricAvailability()
    data object Unknown : BiometricAvailability()
}

/**
 * 生物识别认证状态
 */
sealed class BiometricAuthState {
    data object Idle : BiometricAuthState()
    data object Authenticating : BiometricAuthState()
    data object Success : BiometricAuthState()
    data object Failed : BiometricAuthState()
    data class Error(val errorCode: Int, val message: String) : BiometricAuthState()
}

/**
 * 生物识别工具类
 */
object BiometricUtils {

    /**
     * 获取可用性描述
     */
    fun getAvailabilityDescription(availability: BiometricAvailability): String {
        return when (availability) {
            is BiometricAvailability.Available -> "生物识别可用"
            is BiometricAvailability.NoHardware -> "设备不支持生物识别"
            is BiometricAvailability.HardwareUnavailable -> "生物识别硬件不可用"
            is BiometricAvailability.NotEnrolled -> "未设置生物识别，请先在系统设置中录入"
            is BiometricAvailability.Unknown -> "无法确定生物识别状态"
        }
    }

    /**
     * 获取错误描述
     */
    fun getErrorDescription(errorCode: Int): String {
        return when (errorCode) {
            BiometricPrompt.ERROR_CANCELED -> "用户取消了认证"
            BiometricPrompt.ERROR_HW_NOT_PRESENT -> "设备没有生物识别硬件"
            BiometricPrompt.ERROR_HW_UNAVAILABLE -> "生物识别硬件不可用"
            BiometricPrompt.ERROR_LOCKOUT -> "尝试次数过多，请稍后重试"
            BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> "生物识别已永久锁定，请使用其他方式"
            BiometricPrompt.ERROR_NO_BIOMETRICS -> "未录入生物识别信息"
            BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL -> "未设置设备凭据"
            BiometricPrompt.ERROR_NO_SPACE -> "存储空间不足"
            BiometricPrompt.ERROR_TIMEOUT -> "认证超时"
            BiometricPrompt.ERROR_UNABLE_TO_PROCESS -> "无法处理当前生物识别数据"
            BiometricPrompt.ERROR_USER_CANCELED -> "用户取消了认证"
            BiometricPrompt.ERROR_VENDOR -> "厂商特定错误"
            else -> "未知错误"
        }
    }
}
