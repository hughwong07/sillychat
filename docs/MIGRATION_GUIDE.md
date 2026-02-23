# 迁移指南

## 概述

本指南帮助开发者从旧版本迁移到更新后的依赖版本。本次更新涉及 Core、Mobile、Desktop、Android 和鸿蒙端的所有依赖。

---

## 1. Core 模块迁移

### 依赖更新

```bash
# 删除旧依赖
cd /path/to/SillyChat
rm -rf node_modules package-lock.json

# 安装新依赖
npm install --legacy-peer-deps
```

### 破坏性变更

#### ESLint 配置更新
- 版本: ^9.21.0 -> ^9.25.1
- 新配置格式可能需要调整 `.eslintrc.js`

#### TypeScript 更新
- 版本: ^5.7.3 -> ^5.8.3
- 检查新的严格类型检查选项

### 验证步骤

```bash
# 类型检查
npx tsc --noEmit

# 运行测试
npm test

# 代码检查
npm run lint
```

---

## 2. Mobile (React Native) 迁移

### 依赖更新

```bash
cd apps/mobile
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### React Native 更新 (0.73.2 -> 0.73.11)

#### Android 端

1. **清理构建缓存**
```bash
cd android
./gradlew clean
cd ..
```

2. **重新安装依赖**
```bash
npm install
npx pod-install  # iOS (如果需要)
```

3. **Metro 配置检查**
确保 `metro.config.js` 兼容新版本：
```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  // 你的自定义配置
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

### React Navigation 更新

保持在 v6.x，无需迁移到 v7。如果未来需要迁移到 v7：

```bash
# v7 迁移命令 (当前不需要执行)
npm install @react-navigation/native@^7 @react-navigation/native-stack@^7
```

### 验证步骤

```bash
# 类型检查
npm run type-check

# 运行测试
npm test

# Android 构建
cd android
./gradlew assembleDebug
```

---

## 3. Desktop (Electron) 迁移

### 依赖更新

```bash
cd apps/desktop
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Electron 更新 (28 -> 35)

#### 主要变更

1. **Node.js 版本要求**
   - Electron 35 需要 Node.js 18.12.0 或更高
   - 检查 `package.json` 中的 `engines` 字段

2. **IPC 通信检查**
   确保主进程和渲染进程通信正常：
   ```typescript
   // 主进程 (main/index.ts)
   ipcMain.handle('channel-name', handler);

   // 预加载脚本 (preload/index.ts)
   contextBridge.exposeInMainWorld('electronAPI', {
     invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
   });
   ```

3. **原生模块重新编译**
   ```bash
   npm run postinstall
   # 或
   npx electron-rebuild
   ```

### React 19 迁移

#### 主要变更

1. **组件类型定义**
   ```typescript
   // 旧写法
   const Component: React.FC<Props> = (props) => { ... }

   // 新写法 (推荐)
   function Component(props: Props): JSX.Element { ... }
   ```

2. **Ref 转发**
   ```typescript
   // 使用 forwardRef 的新方式
   const Component = forwardRef<HTMLElement, Props>((props, ref) => {
     return <div ref={ref} />;
   });
   ```

### Vite 6 迁移

#### 配置更新

检查 `vite.config.ts`：
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // 确保 target 与 Electron 的 Chromium 版本兼容
    target: 'es2020'
  }
});
```

### 验证步骤

```bash
# 开发模式
npm run dev

# 构建测试
npm run build

# 打包测试
npm run pack
```

---

## 4. Android 迁移

### Gradle 更新

#### 更新 Gradle Wrapper

在 `gradle/wrapper/gradle-wrapper.properties`：
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11-bin.zip
```

#### 插件更新

`build.gradle.kts` (项目级):
```kotlin
plugins {
    id("com.android.application") version "8.9.1" apply false
    id("org.jetbrains.kotlin.android") version "2.1.20" apply false
    id("com.google.dagger.hilt.android") version "2.56.2" apply false
}
```

### Kotlin 2.1 迁移

#### 主要变更

1. **K2 编译器**
   - Kotlin 2.1 默认使用 K2 编译器
   - 如果遇到问题，可以在 `gradle.properties` 中禁用：
   ```properties
   kotlin.experimental.tryK2=false
   ```

2. **协程 API 检查**
   确保协程代码兼容：
   ```kotlin
   // 检查所有 Flow 和 suspend 函数
   viewModelScope.launch {
       // 你的协程代码
   }
   ```

### Ktor 3.x 迁移

#### 客户端配置更新

`app/build.gradle.kts`:
```kotlin
implementation("io.ktor:ktor-client-core:3.1.2")
implementation("io.ktor:ktor-client-cio:3.1.2")
implementation("io.ktor:ktor-client-websockets:3.1.2")
implementation("io.ktor:ktor-client-content-negotiation:3.1.2")
implementation("io.ktor:ktor-serialization-kotlinx-json:3.1.2")
```

#### 代码变更

检查 HTTP 客户端配置：
```kotlin
val client = HttpClient(CIO) {
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            isLenient = true
        })
    }
    // 新的超时配置 API
    install(HttpTimeout) {
        requestTimeoutMillis = 30000
        connectTimeoutMillis = 10000
    }
}
```

### Compose BOM 更新

#### 版本映射

| 旧版本 | 新版本 |
|--------|--------|
| 2023.08.00 | 2025.04.01 |

#### 兼容性检查

运行以下命令检查 Compose 编译器版本：
```bash
./gradlew app:dependencies --configuration implementation | grep compose
```

### 验证步骤

```bash
# 清理构建
./gradlew clean

# 编译检查
./gradlew compileDebugKotlin

# 运行测试
./gradlew test

# 构建 APK
./gradlew assembleDebug
```

---

## 5. 鸿蒙端 (HarmonyOS) 迁移

### SDK 更新

#### 更新 build-profile.json5

```json5
{
  "app": {
    "compileSdkVersion": 12,
    "compatibleSdkVersion": 12
  }
}
```

### 依赖安装

```bash
cd entry
ohpm install @ohos/axios@^2.2.0
ohpm install @ohos/crypto-js@^2.0.3
ohpm install @ohos/dataorm@^2.0.0
```

### API 适配

检查 API 9 到 API 12 的变更：
- 权限申请方式
- 存储 API 变更
- 网络请求配置

---

## 6. 数据库迁移 (Core)

### DatabaseManager 更新

新的 DatabaseManager 实现了完整的内存存储：

```typescript
import { DatabaseManager } from './storage/database';

const db = new DatabaseManager({ dbPath: './data/silly.db' });
await db.connect();

// 新的 API
await db.upsertBlobEntry(hash, size, mimeType);
await db.createConversation(conversation);
await db.createMessage(message);
```

### 数据迁移

如果需要迁移旧数据：

```typescript
// 导出旧数据
const oldData = await oldDb.export();

// 导入到新数据库
await newDb.import(oldData);
```

---

## 7. 常见问题

### Q: 构建失败，提示依赖冲突

A: 使用 `--legacy-peer-deps` 标志：
```bash
npm install --legacy-peer-deps
```

### Q: TypeScript 类型错误

A: 检查 `tsconfig.json` 配置：
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

### Q: Android 构建出现 "Duplicate class" 错误

A: 在 `app/build.gradle.kts` 中添加：
```kotlin
android {
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "/META-INF/versions/9/previous-compilation-data.bin"
        }
    }
}
```

### Q: Electron 应用启动白屏

A: 检查 CSP 配置和 preload 脚本路径：
```typescript
// main/index.ts
const win = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
});
```

### Q: React Native Metro 打包失败

A: 重置 Metro 缓存：
```bash
npx react-native start --reset-cache
# 或
npm start -- --reset-cache
```

---

## 8. 回滚方案

如果迁移出现问题，可以回滚到之前的版本：

### Core/Desktop/Mobile

```bash
# 恢复 package.json
git checkout HEAD -- package.json

# 恢复依赖
rm -rf node_modules package-lock.json
npm install
```

### Android

```bash
# 恢复 build.gradle.kts
git checkout HEAD -- apps/android/build.gradle.kts
git checkout HEAD -- apps/android/app/build.gradle.kts

# 重新同步
./gradlew clean
```

---

## 9. 支持

如果在迁移过程中遇到问题：

1. 查看项目文档: `/docs`
2. 检查 GitHub Issues
3. 联系开发团队

---

## 10. 验证清单

迁移完成后，请确认以下功能正常：

- [ ] Core 模块测试通过
- [ ] Mobile Android 构建成功
- [ ] Mobile iOS 构建成功 (如果适用)
- [ ] Desktop 开发模式运行正常
- [ ] Desktop 打包成功
- [ ] Android 原生模块工作正常
- [ ] 数据库操作正常
- [ ] 网络请求正常
- [ ] 文件存储正常
- [ ] 推送通知正常 (如果适用)
