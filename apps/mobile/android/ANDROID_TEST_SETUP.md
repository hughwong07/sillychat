# Android 功能测试设置指南

## 已完成工作 ✅

### 1. 测试框架配置
- 创建了完整的 Android 项目构建配置
- 配置了 Gradle 构建系统
- 添加了测试依赖 (JUnit4, Robolectric, MockK, Kotlin Coroutines Test)

### 2. 单元测试文件
已创建以下测试文件：

| 测试文件 | 路径 | 测试用例数 | 覆盖功能 |
|---------|------|-----------|---------|
| BiometricModuleTest.kt | `app/src/test/java/com/sillychat/app/react/` | ~15 | 生物识别认证、传感器检测、错误处理 |
| StorageModuleTest.kt | `app/src/test/java/com/sillychat/app/react/` | ~20 | 安全存储、加密/解密、存储管理 |
| NotificationModuleTest.kt | `app/src/test/java/com/sillychat/app/react/` | ~15 | 通知权限、通知显示/取消 |

**总计**: ~50 个单元测试用例

### 3. 测试覆盖范围

#### BiometricModule 测试覆盖:
- ✅ `getConstants()` - 常量返回
- ✅ `isSensorAvailable()` - 各种可用性状态
- ✅ `getBiometryType()` - 生物识别类型检测
- ✅ `simplePrompt()` - 认证提示（成功/失败/取消）
- ✅ `authenticateWithDeviceCredential()` - 设备凭证认证
- ✅ 错误处理（无效 Activity、传感器不可用等）

#### StorageModule 测试覆盖:
- ✅ `setItem/getItem` - 非加密存储
- ✅ `setItem/getItem` - 加密存储（AES/GCM）
- ✅ `removeItem/clear/getAllKeys` - 存储管理
- ✅ 生物识别保护存储
- ✅ 特殊字符和 Unicode 支持
- ✅ 错误处理（存储失败、异常处理）

#### NotificationModule 测试覆盖:
- ✅ `checkNotificationPermissions()` - Android 13+ 权限检查
- ✅ `requestNotificationPermissions()` - 权限请求
- ✅ `displayNotification()` - 通知显示（基本/动作/大文本）
- ✅ `cancelNotification/cancelAllNotifications` - 通知取消
- ✅ 错误处理（NotificationManager 不可用等）

---

## 运行测试的前提条件

### 1. Android SDK 安装
需要在 `local.properties` 中配置正确的 Android SDK 路径：

```properties
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

或者设置环境变量：
```bash
set ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
```

### 2. 系统要求
- JDK 17 或更高版本
- Android SDK API 34
- Android Build Tools 34.0.0

### 3. 依赖下载
首次运行需要下载依赖：
```bash
cd apps/mobile/android
gradle build
```

---

## 运行测试

### 运行所有单元测试
```bash
cd apps/mobile/android
gradle testDebugUnitTest
```

### 运行特定测试类
```bash
gradle :app:testDebugUnitTest --tests "com.sillychat.app.react.BiometricModuleTest"
gradle :app:testDebugUnitTest --tests "com.sillychat.app.react.StorageModuleTest"
gradle :app:testDebugUnitTest --tests "com.sillychat.app.react.NotificationModuleTest"
```

### 生成测试报告
```bash
gradle :app:testDebugUnitTest
# 报告位置: app/build/reports/tests/testDebugUnitTest/index.html
```

---

## 测试结构说明

### 测试工具类
创建了 `TestPromise` 类来模拟 React Native 的 Promise 接口：
```kotlin
class TestPromise : com.facebook.react.bridge.Promise {
    // 用于验证异步操作结果
}
```

### 使用的测试技术
1. **Robolectric**: 模拟 Android 运行时环境
2. **MockK**: Kotlin 友好的 mocking 框架
3. **Kotlin Coroutines Test**: 协程测试支持
4. **JUnit4**: 测试框架

### 测试模式
每个测试类遵循以下模式：
```kotlin
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Build.VERSION_CODES.TIRAMISU])
class ModuleTest {
    @Before
    fun setup() { /* 初始化 */ }

    @After
    fun tearDown() { /* 清理 */ }

    @Test
    fun `test description`() { /* 测试用例 */ }
}
```

---

## 已知限制

### 1. 加密存储测试
由于 Android Keystore 在测试环境中行为不同，加密存储的测试使用了 mock 来验证业务逻辑，而不是真实的加密操作。

### 2. 生物识别 UI 测试
BiometricPrompt 的 UI 交互需要使用集成测试（connectedAndroidTest），单元测试主要验证逻辑路径。

### 3. 通知权限测试
Android 13+ 的通知权限测试依赖于系统的权限状态模拟。

---

## 下一步建议

### Phase 1: 运行单元测试
1. 配置 Android SDK 路径
2. 运行 `gradle testDebugUnitTest`
3. 修复任何失败的测试

### Phase 2: 集成测试
创建集成测试文件：
- `BiometricModuleIntegrationTest.kt`
- `StorageModuleIntegrationTest.kt`
- `NotificationModuleIntegrationTest.kt`

### Phase 3: E2E 测试
使用 Detox 框架完成端到端测试：
```bash
cd apps/mobile
npm run e2e:android
```

### Phase 4: CI/CD 集成
配置 GitHub Actions 或 Jenkins 自动化测试：
```yaml
- name: Run Android Unit Tests
  run: |
    cd apps/mobile/android
    gradle testDebugUnitTest
```

---

## 文件清单

### 配置文件
- `apps/mobile/android/build.gradle`
- `apps/mobile/android/settings.gradle`
- `apps/mobile/android/app/build.gradle`
- `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`
- `apps/mobile/android/local.properties` (需要更新 SDK 路径)
- `apps/mobile/android/app/src/main/AndroidManifest.xml`

### 测试文件
- `apps/mobile/android/app/src/test/java/com/sillychat/app/react/BiometricModuleTest.kt`
- `apps/mobile/android/app/src/test/java/com/sillychat/app/react/StorageModuleTest.kt`
- `apps/mobile/android/app/src/test/java/com/sillychat/app/react/NotificationModuleTest.kt`

### 资源文件
- `apps/mobile/android/app/src/main/res/values/colors.xml`
- `apps/mobile/android/app/src/main/res/values/strings.xml`

---

## 参考文档

- [Robolectric 文档](http://robolectric.org/)
- [MockK 文档](https://mockk.io/)
- [Android 测试文档](https://developer.android.com/training/testing)
- [React Native 原生模块测试](https://reactnative.dev/docs/native-modules-android)

---

**创建时间**: 2026-02-24
**状态**: 测试代码已完成，待配置 Android SDK 后运行
