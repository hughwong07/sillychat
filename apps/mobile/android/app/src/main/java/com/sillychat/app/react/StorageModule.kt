package com.sillychat.app.react

import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.biometric.BiometricPrompt.AuthenticationResult
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.util.Base64
import androidx.fragment.app.FragmentActivity
import java.util.concurrent.Executors

class StorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val PREFS_NAME = "SillyChatSecureStorage"
        private const val KEY_ALIAS = "SillyChatStorageKey"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_TAG_LENGTH = 128
        private const val GCM_IV_LENGTH = 12

        private val executor = Executors.newSingleThreadExecutor()
        private val mainHandler = Handler(Looper.getMainLooper())
    }

    private val sharedPreferences: SharedPreferences by lazy {
        reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private val keyStore: KeyStore by lazy {
        KeyStore.getInstance(ANDROID_KEYSTORE).apply {
            load(null)
        }
    }

    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String = "StorageModule"

    override fun invalidate() {
        super.invalidate()
        coroutineScope.cancel()
        executor.shutdown()
    }

    @ReactMethod
    fun setItem(key: String, value: String, useEncryption: Boolean, promise: Promise) {
        coroutineScope.launch {
            try {
                val result = if (useEncryption) {
                    encryptAndStore(key, value)
                } else {
                    sharedPreferences.edit().putString(key, value).commit()
                }

                withContext(Dispatchers.Main) {
                    if (result) {
                        promise.resolve(null)
                    } else {
                        promise.reject("STORAGE_ERROR", "Failed to store value", null)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("STORAGE_ERROR", "Error storing value: ${e.message}", e)
                }
            }
        }
    }

    @ReactMethod
    fun getItem(key: String, useEncryption: Boolean, promise: Promise) {
        coroutineScope.launch {
            try {
                val value = if (useEncryption) {
                    retrieveAndDecrypt(key)
                } else {
                    sharedPreferences.getString(key, null)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(value)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("RETRIEVAL_ERROR", "Error retrieving value: ${e.message}", e)
                }
            }
        }
    }

    @ReactMethod
    fun removeItem(key: String, promise: Promise) {
        coroutineScope.launch {
            try {
                val result = sharedPreferences.edit().remove(key).commit()

                withContext(Dispatchers.Main) {
                    if (result) {
                        promise.resolve(true)
                    } else {
                        promise.reject("REMOVE_ERROR", "Failed to remove item", null)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("REMOVE_ERROR", "Error removing item: ${e.message}", e)
                }
            }
        }
    }

    @ReactMethod
    fun clear(promise: Promise) {
        coroutineScope.launch {
            try {
                val result = sharedPreferences.edit().clear().commit()

                withContext(Dispatchers.Main) {
                    if (result) {
                        promise.resolve(true)
                    } else {
                        promise.reject("CLEAR_ERROR", "Failed to clear storage", null)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("CLEAR_ERROR", "Error clearing storage: ${e.message}", e)
                }
            }
        }
    }

    @ReactMethod
    fun getAllKeys(promise: Promise) {
        coroutineScope.launch {
            try {
                val keys = sharedPreferences.all.keys.toList()
                val writableArray = Arguments.createArray()
                keys.forEach { writableArray.pushString(it) }

                withContext(Dispatchers.Main) {
                    promise.resolve(writableArray)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("GET_KEYS_ERROR", "Error getting keys: ${e.message}", e)
                }
            }
        }
    }

    @ReactMethod
    fun setItemWithBiometric(key: String, value: String, promptTitle: String, promptSubtitle: String, promise: Promise) {
        mainHandler.post {
            try {
                val activity = currentActivity as? FragmentActivity
                    ?: throw IllegalStateException("Activity is not a FragmentActivity")

                val biometricManager = BiometricManager.from(reactApplicationContext)
                val canAuthenticate = biometricManager.canAuthenticate(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG
                )

                if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
                    promise.reject("BIOMETRIC_ERROR", "Biometric authentication not available", null)
                    return@post
                }

                val executor = Executors.newSingleThreadExecutor()

                val biometricPrompt = BiometricPrompt(
                    activity,
                    executor,
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: AuthenticationResult) {
                            super.onAuthenticationSucceeded(result)
                            coroutineScope.launch {
                                try {
                                    val cipher = result.cryptoObject?.cipher
                                        ?: getCipher()
                                    val success = encryptAndStoreWithCipher(key, value, cipher)

                                    withContext(Dispatchers.Main) {
                                        if (success) {
                                            promise.resolve(null)
                                        } else {
                                            promise.reject("STORAGE_ERROR", "Failed to store with biometric", null)
                                        }
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        promise.reject("STORAGE_ERROR", e.message, e)
                                    }
                                }
                            }
                        }

                        override fun onAuthenticationFailed() {
                            super.onAuthenticationFailed()
                            promise.reject("AUTH_FAILED", "Biometric authentication failed", null)
                        }

                        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                            super.onAuthenticationError(errorCode, errString)
                            promise.reject("AUTH_ERROR", "Biometric error: $errString", null)
                        }
                    }
                )

                val promptInfo = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(promptTitle)
                    .setSubtitle(promptSubtitle)
                    .setNegativeButtonText("Cancel")
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                    .build()

                val cipher = getCipher()
                val secretKey = getOrCreateSecretKey()
                cipher.init(Cipher.ENCRYPT_MODE, secretKey)

                biometricPrompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))

            } catch (e: Exception) {
                promise.reject("BIOMETRIC_SETUP_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getItemWithBiometric(key: String, promptTitle: String, promptSubtitle: String, promise: Promise) {
        mainHandler.post {
            try {
                val activity = currentActivity as? FragmentActivity
                    ?: throw IllegalStateException("Activity is not a FragmentActivity")

                val encryptedData = sharedPreferences.getString(key, null)
                    ?: run {
                        promise.resolve(null)
                        return@post
                    }

                val biometricManager = BiometricManager.from(reactApplicationContext)
                val canAuthenticate = biometricManager.canAuthenticate(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG
                )

                if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
                    promise.reject("BIOMETRIC_ERROR", "Biometric authentication not available", null)
                    return@post
                }

                val executor = Executors.newSingleThreadExecutor()

                val biometricPrompt = BiometricPrompt(
                    activity,
                    executor,
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: AuthenticationResult) {
                            super.onAuthenticationSucceeded(result)
                            coroutineScope.launch {
                                try {
                                    val cipher = result.cryptoObject?.cipher
                                        ?: getCipher()
                                    val value = decryptWithCipher(encryptedData, cipher)

                                    withContext(Dispatchers.Main) {
                                        promise.resolve(value)
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        promise.reject("DECRYPTION_ERROR", e.message, e)
                                    }
                                }
                            }
                        }

                        override fun onAuthenticationFailed() {
                            super.onAuthenticationFailed()
                            promise.reject("AUTH_FAILED", "Biometric authentication failed", null)
                        }

                        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                            super.onAuthenticationError(errorCode, errString)
                            promise.reject("AUTH_ERROR", "Biometric error: $errString", null)
                        }
                    }
                )

                val promptInfo = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(promptTitle)
                    .setSubtitle(promptSubtitle)
                    .setNegativeButtonText("Cancel")
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                    .build()

                // Extract IV from stored data and init cipher for decryption
                val cipher = getCipher()
                val secretKey = getOrCreateSecretKey()

                val decodedData = Base64.decode(encryptedData, Base64.DEFAULT)
                val iv = decodedData.copyOfRange(0, GCM_IV_LENGTH)
                cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(GCM_TAG_LENGTH, iv))

                biometricPrompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))

            } catch (e: Exception) {
                promise.reject("BIOMETRIC_SETUP_ERROR", e.message, e)
            }
        }
    }

    private fun getOrCreateSecretKey(): SecretKey {
        if (keyStore.containsAlias(KEY_ALIAS)) {
            return (keyStore.getEntry(KEY_ALIAS, null) as KeyStore.SecretKeyEntry).secretKey
        } else {
            val keyGenerator = KeyGenerator.getInstance("AES", ANDROID_KEYSTORE)
            keyGenerator.init(
                android.security.keystore.KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or
                            android.security.keystore.KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .setUserAuthenticationRequired(false)
                    .build()
            )
            return keyGenerator.generateKey()
        }
    }

    private fun getCipher(): Cipher {
        return Cipher.getInstance(TRANSFORMATION)
    }

    private fun encryptAndStore(key: String, value: String): Boolean {
        return try {
            val cipher = getCipher()
            val secretKey = getOrCreateSecretKey()
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)

            val encryptedBytes = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
            val iv = cipher.iv

            // Combine IV + encrypted data
            val combined = ByteArray(iv.size + encryptedBytes.size)
            System.arraycopy(iv, 0, combined, 0, iv.size)
            System.arraycopy(encryptedBytes, 0, combined, iv.size, encryptedBytes.size)

            val encryptedBase64 = Base64.encodeToString(combined, Base64.DEFAULT)
            sharedPreferences.edit().putString(key, encryptedBase64).commit()
        } catch (e: Exception) {
            false
        }
    }

    private fun encryptAndStoreWithCipher(key: String, value: String, cipher: Cipher): Boolean {
        return try {
            val encryptedBytes = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
            val iv = cipher.iv

            val combined = ByteArray(iv.size + encryptedBytes.size)
            System.arraycopy(iv, 0, combined, 0, iv.size)
            System.arraycopy(encryptedBytes, 0, combined, iv.size, encryptedBytes.size)

            val encryptedBase64 = Base64.encodeToString(combined, Base64.DEFAULT)
            sharedPreferences.edit().putString(key, encryptedBase64).commit()
        } catch (e: Exception) {
            false
        }
    }

    private fun retrieveAndDecrypt(key: String): String? {
        return try {
            val encryptedBase64 = sharedPreferences.getString(key, null) ?: return null
            val cipher = getCipher()
            decryptWithCipher(encryptedBase64, cipher)
        } catch (e: Exception) {
            null
        }
    }

    private fun decryptWithCipher(encryptedBase64: String, cipher: Cipher): String? {
        return try {
            val decodedData = Base64.decode(encryptedBase64, Base64.DEFAULT)

            // Extract IV and encrypted data
            val iv = decodedData.copyOfRange(0, GCM_IV_LENGTH)
            val encryptedBytes = decodedData.copyOfRange(GCM_IV_LENGTH, decodedData.size)

            // Initialize cipher with IV if not already initialized
            if (cipher.iv == null) {
                val secretKey = getOrCreateSecretKey()
                cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(GCM_TAG_LENGTH, iv))
            }

            val decryptedBytes = cipher.doFinal(encryptedBytes)
            String(decryptedBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            null
        }
    }
}
