# Android 功能测试 - 用户操作指南

## 🎯 当前状态

### ✅ 已完成（自动化）
- [x] Android SDK 环境配置
- [x] Gradle 构建系统配置
- [x] 测试依赖配置（JUnit4 + Robolectric + MockK）
- [x] ~50 个单元测试用例编写
- [x] 源代码编译验证（通过）

### ⏳ 需手动执行
- [ ] 运行单元测试（需重启系统后）
- [ ] 查看测试报告
- [ ] 修复失败的测试（如有）

---

## 📋 已创建的测试文件

### 1. BiometricModuleTest.kt
**位置**: `app/src/test/java/com/sillychat/app/react/`
**测试用例**: ~15 个

覆盖功能：
- `getConstants()` - 验证模块常量
- `isSensorAvailable()` - 传感器可用性检查（强/弱/无生物识别）
- `getBiometryType()` - 生物识别类型检测
- `simplePrompt()` - 认证提示
- `authenticateWithDeviceCredential()` - 设备凭证认证
- 错误处理（无效 Activity、传感器不可用等）

### 2. StorageModuleTest.kt
**位置**: `app/src/test/java/com/sillychat/app/react/`
**测试用例**: ~20 个

覆盖功能：
- `setItem/getItem` - 非加密存储
- `setItem/getItem` - 加密存储（AES/GCM）
- `removeItem/clear/getAllKeys` - 存储管理
- 生物识别保护存储
- 特殊字符和 Unicode 支持
- 大值存储
- 错误处理（存储失败、异常处理）

### 3. NotificationModuleTest.kt
**位置**: `app/src/test/java/com/sillychat/app/react/`
**测试用例**: ~15 个

覆盖功能：
- `checkNotificationPermissions()` - Android 13+ 权限检查
- `requestNotificationPermissions()` - 权限请求
- `displayNotification()` - 通知显示（基本/动作/大文本）
- `cancelNotification/cancelAllNotifications` - 通知取消
- 错误处理

---

## 🚀 手动运行测试步骤

### 步骤 1: 重启系统
**原因**: 解决 Windows 文件锁定问题

1. 保存所有工作
2. 重启计算机
3. 重新打开终端

### 步骤 2: 运行测试
```bash
# 进入项目目录
cd E:/silly/SillyChat/apps/mobile/android

# 清理构建缓存
gradle clean

# 运行所有单元测试
gradle testDebugUnitTest
```

### 步骤 3: 查看测试报告
```bash
# 报告位置
app/build/reports/tests/testDebugUnitTest/index.html

# 用浏览器打开
start app/build/reports/tests/testDebugUnitTest/index.html
```

### 步骤 4: 运行特定测试类（可选）
```bash
# 只运行 BiometricModule 测试
gradle :app:testDebugUnitTest --tests "com.sillychat.app.react.BiometricModuleTest"

# 只运行 StorageModule 测试
gradle :app:testDebugUnitTest --tests "com.sillychat.app.react.StorageModuleTest"

# 只运行 NotificationModule 测试
gradle :app:testDebugUnitTest --tests "com.sillychat.app.react.NotificationModuleTest"
```

---

## 📊 预期结果

### 测试通过标准
| 模块 | 预期测试数 | 目标通过率 |
|------|-----------|-----------|
| BiometricModule | ~15 | > 80% |
| StorageModule | ~20 | > 85% |
| NotificationModule | ~15 | > 80% |
| **总计** | **~50** | **> 80%** |

### 成功指标
- ✅ 所有测试编译通过
- ✅ 测试执行无崩溃
- ✅ 通过率 > 80%
- ✅ 无内存泄漏

---

## 🔧 故障排除

### 问题 1: 文件锁定
**症状**: `Unable to delete file '.../classes.jar'`
**解决**: 重启系统后重试

### 问题 2: SDK 未找到
**症状**: `SDK location not found`
**解决**:
```bash
# 检查 local.properties
cat local.properties
# 应包含: sdk.dir=C:\\Users\\HughWang\\AppData\\Local\\Android\\Sdk
```

### 问题 3: 内存不足
**症状**: `OutOfMemoryError`
**解决**:
```bash
# 增加 Gradle 内存
gradle testDebugUnitTest -Dorg.gradle.jvmargs="-Xmx4g"
```

### 问题 4: 测试编译错误
**症状**: Kotlin 编译错误
**解决**:
```bash
# 清理并重新构建
gradle clean
gradle testDebugUnitTest --rerun-tasks
```

---

## 📝 后续步骤

### 测试通过后
1. **查看覆盖率报告**
   ```bash
   gradle jacocoTestReport
   # 查看: app/build/reports/jacoco/test/html/index.html
   ```

2. **创建集成测试**
   - `BiometricModuleIntegrationTest.kt`
   - `StorageModuleIntegrationTest.kt`
   - `NotificationModuleIntegrationTest.kt`

3. **配置 CI/CD**
   ```yaml
   # GitHub Actions 示例
   - name: Run Android Unit Tests
     run: |
       cd apps/mobile/android
       gradle testDebugUnitTest
   ```

---

## 📁 相关文件

### 配置文件
- `build.gradle` - 项目级构建配置
- `settings.gradle` - 项目设置
- `app/build.gradle` - 应用级构建配置
- `local.properties` - SDK 路径配置
- `gradle/wrapper/gradle-wrapper.properties` - Gradle 版本

### 源代码
- `app/src/main/java/com/sillychat/app/react/BiometricModule.kt`
- `app/src/main/java/com/sillychat/app/react/StorageModule.kt`
- `app/src/main/java/com/sillychat/app/react/NotificationModule.kt`

### 测试代码
- `app/src/test/java/com/sillychat/app/react/BiometricModuleTest.kt`
- `app/src/test/java/com/sillychat/app/react/StorageModuleTest.kt`
- `app/src/test/java/com/sillychat/app/react/NotificationModuleTest.kt`

### 文档
- `ANDROID_TEST_README.md` - 本文件
- `ANDROID_TEST_SETUP.md` - 测试设置指南
- `TEST_REPORT.md` - 测试报告

---

## ✅ 检查清单

- [ ] 重启系统
- [ ] 进入项目目录: `cd E:/silly/SillyChat/apps/mobile/android`
- [ ] 运行: `gradle clean`
- [ ] 运行: `gradle testDebugUnitTest`
- [ ] 查看测试报告
- [ ] 记录失败的测试（如有）
- [ ] 修复失败的测试
- [ ] 重新运行测试直到通过

---

**创建时间**: 2026-02-24
**版本**: 1.0
