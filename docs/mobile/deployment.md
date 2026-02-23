# 发布指南

> 本文档详细介绍 SillyChat Android 应用的打包、签名和发布流程。

---

## 1. 打包 APK/AAB

### 1.1 构建配置

#### 配置 build.gradle

```kotlin
// android/app/build.gradle

plugins {
    id("com.android.application")
    id("com.facebook.react")
}

android {
    namespace "com.sillychat"
    compileSdkVersion rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.sillychat"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"

        // 支持多架构
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
    }

    signingConfigs {
        debug {
            storeFile file("debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }

        release {
            storeFile file(SILLYCHAT_RELEASE_STORE_FILE)
            storePassword SILLYCHAT_RELEASE_STORE_PASSWORD
            keyAlias SILLYCHAT_RELEASE_KEY_ALIAS
            keyPassword SILLYCHAT_RELEASE_KEY_PASSWORD
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.debug
            debuggable true
        }

        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
        }
    }

    // 输出 APK/AAB 配置
    applicationVariants.all { variant ->
        variant.outputs.all {
            outputFileName = "SillyChat-${variant.versionName}-${variant.buildType.name}.apk"
        }
    }

    // 打包配置
    bundle {
        language {
            enableSplit = true
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
    implementation("com.google.firebase:firebase-messaging:23.4.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    implementation("com.tencent:mmkv:1.3.2")
}
```

#### 配置 ProGuard

```proguard
# android/app/proguard-rules.pro

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.sillychat.** { *; }

# 保持 native 方法
-keepclasseswithmembernames class * {
    native <methods>;
}

# 保持 JavaScript 接口
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# MMKV
-keep class com.tencent.mmkv.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# 加密相关
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }
```

### 1.2 打包命令

```bash
# 1. 清理构建缓存
cd android
./gradlew clean
cd ..

# 2. 安装依赖
npm install

# 3. 打包 APK (调试版)
npm run android -- --mode=debug

# 4. 打包 APK (发布版)
cd android
./gradlew assembleRelease

# 输出位置: android/app/build/outputs/apk/release/app-release.apk

# 5. 打包 AAB (Google Play 要求)
./gradlew bundleRelease

# 输出位置: android/app/build/outputs/bundle/release/app-release.aab
```

### 1.3 自动化打包脚本

```bash
#!/bin/bash
# scripts/build.sh

set -e

# 配置
APP_NAME="SillyChat"
VERSION=$(node -p "require('./package.json').version")
BUILD_TYPE=${1:-release}
OUTPUT_DIR="./builds"

echo "🚀 开始构建 ${APP_NAME} v${VERSION} (${BUILD_TYPE})"

# 清理
rm -rf ${OUTPUT_DIR}
mkdir -p ${OUTPUT_DIR}

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 类型检查
echo "🔍 类型检查..."
npx tsc --noEmit

# 运行测试
echo "🧪 运行测试..."
npm test -- --coverage --silent

# 构建
echo "🏗️ 构建应用..."
cd android

if [ "$BUILD_TYPE" = "release" ]; then
    ./gradlew clean assembleRelease bundleRelease

    # 复制 APK
    cp app/build/outputs/apk/release/app-release.apk \
       "${OUTPUT_DIR}/${APP_NAME}-${VERSION}.apk"

    # 复制 AAB
    cp app/build/outputs/bundle/release/app-release.aab \
       "${OUTPUT_DIR}/${APP_NAME}-${VERSION}.aab"
else
    ./gradlew clean assembleDebug
    cp app/build/outputs/apk/debug/app-debug.apk \
       "${OUTPUT_DIR}/${APP_NAME}-${VERSION}-debug.apk"
fi

cd ..

# 生成校验和
echo "🔐 生成校验和..."
cd ${OUTPUT_DIR}
sha256sum * > checksums.txt
cd ..

echo "✅ 构建完成!"
echo "📁 输出目录: ${OUTPUT_DIR}"
ls -lh ${OUTPUT_DIR}
```

---

## 2. 签名配置

### 2.1 生成签名密钥

```bash
# 生成新的密钥库
keytool -genkeypair \
    -v \
    -keystore sillychat-release.keystore \
    -alias sillychat-key \
    -keyalg RSA \
    -keysize 4096 \
    -validity 10000 \
    -dname "CN=SillyChat, OU=Development, O=SillyChat Inc, L=Beijing, ST=Beijing, C=CN"

# 查看密钥信息
keytool -list -v -keystore sillychat-release.keystore

# 导出证书
keytool -export -rfc \
    -keystore sillychat-release.keystore \
    -alias sillychat-key \
    -file sillychat-release.crt
```

### 2.2 配置签名密钥

#### 方式 1: 环境变量 (推荐 CI/CD)

```bash
# ~/.bashrc 或 ~/.zshrc
export SILLYCHAT_RELEASE_STORE_FILE=sillychat-release.keystore
export SILLYCHAT_RELEASE_KEY_ALIAS=sillychat-key
export SILLYCHAT_RELEASE_STORE_PASSWORD=your-store-password
export SILLYCHAT_RELEASE_KEY_PASSWORD=your-key-password
```

#### 方式 2: local.properties (本地开发)

```properties
# android/local.properties (不要提交到版本控制)
SILLYCHAT_RELEASE_STORE_FILE=sillychat-release.keystore
SILLYCHAT_RELEASE_KEY_ALIAS=sillychat-key
SILLYCHAT_RELEASE_STORE_PASSWORD=your-store-password
SILLYCHAT_RELEASE_KEY_PASSWORD=your-key-password
```

#### 方式 3: 密钥管理服务

```kotlin
// 使用 AWS Secrets Manager / Azure Key Vault
def getSigningConfigFromCloud() {
    // 从云服务获取密钥信息
    def secret = awsSecretsManager.getSecret("sillychat-signing")
    return [
        storeFile: file(secret.storeFile),
        storePassword: secret.storePassword,
        keyAlias: secret.keyAlias,
        keyPassword: secret.keyPassword
    ]
}
```

### 2.3 密钥安全最佳实践

```bash
# 1. 将密钥库添加到 .gitignore
echo "*.keystore" >> .gitignore
echo "*.jks" >> .gitignore
echo "android/local.properties" >> .gitignore

# 2. 安全备份密钥库
gpg --symmetric --cipher-algo AES256 sillychat-release.keystore
# 备份加密后的文件: sillychat-release.keystore.gpg

# 3. 使用 GitHub Actions 密钥
# 在 GitHub 仓库设置中添加 Secrets:
# - SIGNING_KEY_BASE64 (base64 编码的密钥库)
# - SIGNING_KEY_ALIAS
# - SIGNING_KEY_PASSWORD
# - SIGNING_STORE_PASSWORD
```

---

## 3. Google Play 发布

### 3.1 准备工作

#### 创建 Google Play 开发者账号

1. 访问 https://play.google.com/console
2. 支付 $25 注册费
3. 完成开发者验证

#### 准备应用资料

```
应用信息:
├── 应用名称: SillyChat
├── 简短描述: 智能、简洁、有趣的聊天体验 (80字符以内)
├── 完整描述: 详见下方
├── 应用图标: 512x512 PNG
├── 功能图片: 1024x500 PNG
├── 截图:
│   ├── 手机: 最少 2 张，推荐 4-8 张 (1080x1920)
│   ├── 平板: 可选 (2732x2048)
│   └── 大屏设备: 可选
├── 分类: 通讯 / 社交
├── 内容分级: 填写问卷获取
└── 隐私政策: https://sillychat.app/privacy
```

#### 完整描述模板

```
SillyChat - 让沟通更简单

🚀 主要功能:
• 端到端加密 - 您的消息只有您和收件人可以阅读
• 实时消息 - 即时送达，已读回执
• 多媒体分享 - 图片、视频、语音消息
• 群组聊天 - 支持多达 500 人的群组
• 消息撤回 - 发送后 2 分钟内可撤回
• 深色模式 - 保护您的眼睛

🔒 安全与隐私:
• 采用 Signal 协议实现端到端加密
• 消息不存储在服务器
• 支持生物识别锁定
• 可设置消息自动销毁

💡 为什么选择小傻瓜:
• 简洁直观的界面设计
• 极低的电量和流量消耗
• 完全免费，无广告
• 持续更新，稳定可靠

立即下载，开启安全聊天新体验！
```

### 3.2 发布流程

#### 内部测试

```bash
# 1. 构建 AAB
./gradlew bundleRelease

# 2. 使用 Google Play 内部应用分享
# 上传 AAB 到 Play Console → 内部测试 → 创建发布

# 3. 添加测试人员
# Play Console → 内部测试 → 测试人员 → 添加邮箱列表
```

#### 封闭测试 (Closed Testing)

```bash
# 1. 准备测试版本
./gradlew bundleRelease

# 2. 在 Play Console 创建封闭测试轨道
# - 选择测试国家/地区
# - 添加测试人员 (最多 2000 人)

# 3. 提交审核 (通常 1-3 天)
```

#### 正式版发布

```bash
# 1. 确保版本号递增
# android/app/build.gradle:
# versionCode 2  # 必须比之前高
# versionName "1.0.1"

# 2. 构建生产 AAB
./gradlew bundleRelease

# 3. 签名验证
jarsigner -verify -verbose -certs builds/SillyChat-1.0.1.aab

# 4. 上传到 Play Console
# - 选择"正式版"
# - 上传 AAB
# - 填写版本说明
# - 提交审核
```

### 3.3 使用 Play Console API 自动化

```bash
# 安装 fastlane
sudo gem install fastlane

# 初始化 fastlane
cd android
fastlane init

# 配置 Fastfile
```

```ruby
# android/fastlane/Fastfile
default_platform(:android)

platform :android do
  desc "部署到内部测试"
  lane :internal do
    gradle(task: "bundleRelease")

    upload_to_play_store(
      track: 'internal',
      release_status: 'draft',
      aab: '../builds/SillyChat.aab'
    )
  end

  desc "部署到封闭测试"
  lane :beta do
    gradle(task: "bundleRelease")

    upload_to_play_store(
      track: 'beta',
      release_status: 'completed',
      aab: '../builds/SillyChat.aab'
    )
  end

  desc "部署到正式版"
  lane :production do
    gradle(task: "bundleRelease")

    upload_to_play_store(
      track: 'production',
      release_status: 'draft',
      aab: '../builds/SillyChat.aab'
    )
  end
end
```

```bash
# 运行 fastlane
fastlane android internal
fastlane android beta
fastlane android production
```

---

## 4. 国内应用市场发布

### 4.1 主流市场清单

| 市场 | 官网 | 审核周期 | 特殊要求 |
|------|------|----------|----------|
| 华为应用市场 | https://appgallery.huawei.com | 1-3天 | HMS 集成 |
| 小米应用商店 | https://dev.mi.com | 1-2天 | MIUI 适配 |
| OPPO 软件商店 | https://open.oppomobile.com | 1-3天 | 实名认证 |
| vivo 应用商店 | https://dev.vivo.com.cn | 1-3天 | 企业认证 |
| 应用宝 | https://app.open.qq.com | 1-5天 | QQ 登录 |
| 百度手机助手 | https://app.baidu.com | 2-5天 | 百度统计 |
| 360 手机助手 | http://dev.360.cn | 2-5天 | 360 加固 |
| 魅族应用商店 | https://open.flyme.cn | 2-5天 | Flyme 适配 |

### 4.2 华为应用市场

#### HMS 集成

```kotlin
// build.gradle
dependencies {
    implementation 'com.huawei.hms:push:6.11.0.300'
    implementation 'com.huawei.hms:hianalytics:6.12.0.300'
    implementation 'com.huawei.agconnect:agconnect-core:1.9.1.300'
}

// agconnect-services.json 放入 app 目录
```

```kotlin
// 华为推送服务
class HuaweiPushService : HmsMessageService() {
    override fun onMessageReceived(message: RemoteMessage) {
        // 处理华为推送消息
    }

    override fun onNewToken(token: String) {
        // 上传华为 Push Token
    }
}
```

#### 发布步骤

1. 注册华为开发者账号 (https://developer.huawei.com)
2. 完成企业认证
3. 创建应用，填写应用信息
4. 上传 APK + 应用截图
5. 提交审核

### 4.3 小米应用商店

#### MIUI 适配

```kotlin
// 适配 MIUI 通知栏
def isMIUI(): Boolean {
    return !TextUtils.isEmpty(SystemProperty.get("ro.miui.ui.version.name"))
}

// 请求 MIUI 权限
fun requestMIUIPermission(activity: Activity) {
    val intent = Intent("miui.intent.action.APP_PERM_EDITOR").apply {
        setClassName(
            "com.miui.securitycenter",
            "com.miui.permcenter.permissions.PermissionsEditorActivity"
        )
        putExtra("extra_pkgname", activity.packageName)
    }
    activity.startActivity(intent)
}
```

### 4.4 多市场发布自动化

```python
#!/usr/bin/env python3
# scripts/publish_china.py

import os
import requests
from typing import Dict, List

class AppStorePublisher:
    def __init__(self):
        self.config = {
            'huawei': {
                'client_id': os.getenv('HUAWEI_CLIENT_ID'),
                'client_secret': os.getenv('HUAWEI_CLIENT_SECRET'),
            },
            'xiaomi': {
                'api_key': os.getenv('XIAOMI_API_KEY'),
            },
            # ...
        }

    def publish_to_huawei(self, apk_path: str, release_notes: str):
        """发布到华为应用市场"""
        # 获取访问令牌
        token = self._get_huawei_token()

        # 上传 APK
        upload_url = self._get_upload_url(token)
        with open(apk_path, 'rb') as f:
            response = requests.put(upload_url, data=f)

        # 提交审核
        self._submit_for_review(token, release_notes)

        print("✅ 华为应用市场发布成功")

    def publish_to_all(self, apk_path: str, release_notes: str):
        """发布到所有市场"""
        markets = ['huawei', 'xiaomi', 'oppo', 'vivo', 'tencent']

        for market in markets:
            try:
                method = getattr(self, f'publish_to_{market}')
                method(apk_path, release_notes)
            except Exception as e:
                print(f"❌ {market} 发布失败: {e}")

if __name__ == '__main__':
    publisher = AppStorePublisher()
    publisher.publish_to_all(
        'builds/SillyChat-1.0.0.apk',
        '修复已知问题，提升稳定性'
    )
```

---

## 5. 版本管理

### 5.1 版本号规范

采用语义化版本控制 (SemVer): `主版本.次版本.修订号`

```
版本号格式: MAJOR.MINOR.PATCH

示例: 1.2.3
- MAJOR (1): 重大更新，可能不兼容
- MINOR (2): 新功能，向后兼容
- PATCH (3): 问题修复

Android versionCode 计算:
versionCode = MAJOR * 10000 + MINOR * 100 + PATCH
# 1.2.3 = 10203
```

### 5.2 版本发布清单

```markdown
## 发布前检查清单

### 代码
- [ ] 版本号已更新 (build.gradle)
- [ ] CHANGELOG.md 已更新
- [ ] 所有测试通过
- [ ] 代码审查完成

### 构建
- [ ] 清理构建缓存
- [ ] 构建 Release APK/AAB
- [ ] 签名验证通过
- [ ] 安装测试通过

### 文档
- [ ] 更新日志已准备
- [ ] 应用商店截图已更新 (如有 UI 变更)
- [ ] 隐私政策已更新 (如有变更)

### 发布
- [ ] 内部测试通过
- [ ] 封闭测试通过 (如需要)
- [ ] 应用商店提交
- [ ] 监控崩溃报告

### 发布后
- [ ] 监控崩溃率
- [ ] 收集用户反馈
- [ ] 准备热修复 (如需要)
```

### 5.3 热修复方案

```bash
# 使用 React Native CodePush 进行热修复

# 1. 安装 CodePush
npm install react-native-code-push

# 2. 发布热修复
appcenter codepush release-react \
    -a SillyChat/SillyChat-Android \
    -d Production \
    -m \
    --description "修复崩溃问题"

# 3. 查看发布状态
appcenter codepush deployment list -a SillyChat/SillyChat-Android
```

---

## 6. 相关文档

- [开发指南](./dev-guide.md) - 环境搭建和开发规范
- [架构文档](./architecture.md) - 系统架构说明
- [API 文档](./api-reference.md) - 组件和 Hooks API
- [原生模块文档](./native-modules.md) - Android 原生模块
- [测试指南](./testing-guide.md) - 测试方法
