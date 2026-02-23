package com.xiaoshagua.xsgchat.viewmodel

import androidx.compose.runtime.Stable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * 主题模式
 */
enum class ThemeMode {
    SYSTEM,     // 跟随系统
    LIGHT,      // 浅色模式
    DARK        // 深色模式
}

/**
 * 语言设置
 */
enum class AppLanguage {
    SYSTEM,     // 跟随系统
    SIMPLIFIED_CHINESE,  // 简体中文
    ENGLISH     // 英文
}

/**
 * 设置界面状态
 */
@Stable
data class SettingsUiState(
    /**
     * 主题模式
     */
    val themeMode: ThemeMode = ThemeMode.SYSTEM,

    /**
     * 语言设置
     */
    val language: AppLanguage = AppLanguage.SYSTEM,

    /**
     * 消息通知开关
     */
    val notificationsEnabled: Boolean = true,

    /**
     * 声音开关
     */
    val soundEnabled: Boolean = true,

    /**
     * 震动开关
     */
    val vibrationEnabled: Boolean = true,

    /**
     * 自动同步开关
     */
    val autoSyncEnabled: Boolean = true,

    /**
     * 仅在WiFi下同步
     */
    val syncOnlyOnWifi: Boolean = false,

    /**
     * 字体大小
     */
    val fontSize: FontSize = FontSize.MEDIUM,

    /**
     * 消息气泡样式
     */
    val bubbleStyle: BubbleStyle = BubbleStyle.MODERN,

    /**
     * 是否启用生物识别
     */
    val biometricEnabled: Boolean = false,

    /**
     * 是否已设置生物识别
     */
    val isBiometricSet: Boolean = false,

    /**
     * API服务器地址
     */
    val apiServerUrl: String = "https://api.xiaoshagua.com",

    /**
     * 是否正在加载
     */
    val isLoading: Boolean = false,

    /**
     * 错误信息
     */
    val error: String? = null,

    /**
     * 成功提示
     */
    val successMessage: String? = null
)

/**
 * 字体大小
 */
enum class FontSize {
    SMALL, MEDIUM, LARGE
}

/**
 * 消息气泡样式
 */
enum class BubbleStyle {
    MODERN, CLASSIC, MINIMAL
}

/**
 * 设置ViewModel
 * 管理应用设置和用户偏好
 */
@HiltViewModel
class SettingsViewModel @Inject constructor() : ViewModel() {

    /**
     * UI状态
     */
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        Timber.d("SettingsViewModel 初始化")
        loadSettings()
    }

    /**
     * 加载设置
     * 实际项目中应该从DataStore或SharedPreferences读取
     */
    private fun loadSettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // 模拟从本地存储加载设置
                // 实际项目中使用 DataStore:
                // val themeMode = dataStore.getThemeMode()
                // val language = dataStore.getLanguage()
                // ...

                kotlinx.coroutines.delay(300) // 模拟加载延迟

                Timber.d("设置加载成功")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = null,
                        // 这里使用默认值，实际应从存储读取
                        themeMode = ThemeMode.SYSTEM,
                        language = AppLanguage.SYSTEM,
                        notificationsEnabled = true,
                        soundEnabled = true,
                        vibrationEnabled = true,
                        autoSyncEnabled = true,
                        syncOnlyOnWifi = false,
                        fontSize = FontSize.MEDIUM,
                        bubbleStyle = BubbleStyle.MODERN,
                        biometricEnabled = false,
                        isBiometricSet = false,
                        apiServerUrl = "https://api.xiaoshagua.com"
                    )
                }
            } catch (e: Exception) {
                Timber.e(e, "加载设置失败")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "加载设置失败: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * 保存所有设置
     */
    fun saveSettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // 实际项目中保存到 DataStore
                // dataStore.saveThemeMode(_uiState.value.themeMode)
                // dataStore.saveLanguage(_uiState.value.language)
                // ...

                kotlinx.coroutines.delay(200)

                Timber.d("设置保存成功")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = null,
                        successMessage = "设置已保存"
                    )
                }

                // 清除成功消息
                kotlinx.coroutines.delay(2000)
                _uiState.update { it.copy(successMessage = null) }
            } catch (e: Exception) {
                Timber.e(e, "保存设置失败")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "保存设置失败: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * 设置主题模式
     */
    fun setThemeMode(mode: ThemeMode) {
        Timber.d("设置主题模式: $mode")
        _uiState.update { it.copy(themeMode = mode) }
        saveSettings()
    }

    /**
     * 设置语言
     */
    fun setLanguage(language: AppLanguage) {
        Timber.d("设置语言: $language")
        _uiState.update { it.copy(language = language) }
        saveSettings()
    }

    /**
     * 设置通知开关
     */
    fun setNotificationsEnabled(enabled: Boolean) {
        Timber.d("设置通知开关: $enabled")
        _uiState.update { it.copy(notificationsEnabled = enabled) }
        saveSettings()
    }

    /**
     * 设置声音开关
     */
    fun setSoundEnabled(enabled: Boolean) {
        Timber.d("设置声音开关: $enabled")
        _uiState.update { it.copy(soundEnabled = enabled) }
        saveSettings()
    }

    /**
     * 设置震动开关
     */
    fun setVibrationEnabled(enabled: Boolean) {
        Timber.d("设置震动开关: $enabled")
        _uiState.update { it.copy(vibrationEnabled = enabled) }
        saveSettings()
    }

    /**
     * 设置自动同步
     */
    fun setAutoSyncEnabled(enabled: Boolean) {
        Timber.d("设置自动同步: $enabled")
        _uiState.update { it.copy(autoSyncEnabled = enabled) }
        saveSettings()
    }

    /**
     * 设置仅WiFi同步
     */
    fun setSyncOnlyOnWifi(enabled: Boolean) {
        Timber.d("设置仅WiFi同步: $enabled")
        _uiState.update { it.copy(syncOnlyOnWifi = enabled) }
        saveSettings()
    }

    /**
     * 设置字体大小
     */
    fun setFontSize(size: FontSize) {
        Timber.d("设置字体大小: $size")
        _uiState.update { it.copy(fontSize = size) }
        saveSettings()
    }

    /**
     * 设置气泡样式
     */
    fun setBubbleStyle(style: BubbleStyle) {
        Timber.d("设置气泡样式: $style")
        _uiState.update { it.copy(bubbleStyle = style) }
        saveSettings()
    }

    /**
     * 设置生物识别
     */
    fun setBiometricEnabled(enabled: Boolean) {
        Timber.d("设置生物识别: $enabled")
        _uiState.update { it.copy(biometricEnabled = enabled) }
        saveSettings()
    }

    /**
     * 更新生物识别设置状态
     */
    fun updateBiometricSetStatus(isSet: Boolean) {
        Timber.d("更新生物识别设置状态: $isSet")
        _uiState.update { it.copy(isBiometricSet = isSet) }
    }

    /**
     * 设置API服务器地址
     */
    fun setApiServerUrl(url: String) {
        Timber.d("设置API服务器地址: $url")
        _uiState.update { it.copy(apiServerUrl = url) }
    }

    /**
     * 验证并保存API服务器地址
     */
    fun validateAndSaveApiUrl(url: String) {
        Timber.d("验证并保存API服务器地址: $url")
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // 验证URL格式
                val isValid = try {
                    java.net.URL(url)
                    true
                } catch (e: Exception) {
                    Timber.w(e, "无效的URL格式: $url")
                    false
                }

                if (isValid) {
                    Timber.d("API服务器地址验证通过: $url")
                    _uiState.update {
                        it.copy(
                            apiServerUrl = url,
                            isLoading = false,
                            error = null,
                            successMessage = "服务器地址已更新"
                        )
                    }
                    saveSettings()
                } else {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "无效的URL格式"
                        )
                    }
                }

                // 清除消息
                kotlinx.coroutines.delay(2000)
                _uiState.update { it.copy(successMessage = null, error = null) }
            } catch (e: Exception) {
                Timber.e(e, "保存API服务器地址失败: $url")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "保存失败: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * 清除缓存
     */
    fun clearCache() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // 实际项目中清除应用缓存
                // context.cacheDir.deleteRecursively()

                kotlinx.coroutines.delay(500)

                Timber.d("缓存清除成功")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = null,
                        successMessage = "缓存已清除"
                    )
                }

                kotlinx.coroutines.delay(2000)
                _uiState.update { it.copy(successMessage = null) }
            } catch (e: Exception) {
                Timber.e(e, "清除缓存失败")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "清除缓存失败: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * 导出聊天记录
     */
    fun exportChatHistory() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // 实际项目中导出聊天记录到文件

                kotlinx.coroutines.delay(1000)

                Timber.d("聊天记录导出成功")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = null,
                        successMessage = "聊天记录已导出"
                    )
                }

                kotlinx.coroutines.delay(2000)
                _uiState.update { it.copy(successMessage = null) }
            } catch (e: Exception) {
                Timber.e(e, "导出聊天记录失败")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "导出失败: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * 重置所有设置
     */
    fun resetAllSettings() {
        viewModelScope.launch {
            try {
                _uiState.update {
                    SettingsUiState() // 重置为默认值
                }
                Timber.d("设置已重置为默认值")
                saveSettings()
            } catch (e: Exception) {
                Timber.e(e, "重置设置失败")
                _uiState.update { it.copy(error = "重置设置失败: ${e.message}") }
            }
        }
    }

    /**
     * 清除错误
     */
    fun clearError() {
        Timber.d("清除错误状态")
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 清除成功消息
     */
    fun clearSuccessMessage() {
        Timber.d("清除成功消息")
        _uiState.update { it.copy(successMessage = null) }
    }
}
