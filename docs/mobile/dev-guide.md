# Android 开发指南

> 本文档详细介绍 SillyChat Android 应用的开发环境搭建、项目结构和开发规范。

---

## 1. 环境搭建

### 1.1 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Android Studio | 2023.1.1 | 最新稳定版 |
| JDK | 17 | 17 |
| Android SDK | API 24 (Android 7.0) | API 34 (Android 14) |
| Node.js | 18.x | 20.x LTS |
| React Native CLI | 0.73+ | 最新 |

### 1.2 安装步骤

#### 步骤 1: 安装 JDK 17

```bash
# Windows (使用 Chocolatey)
choco install openjdk17

# macOS (使用 Homebrew)
brew install openjdk@17

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install openjdk-17-jdk
```

验证安装:
```bash
java -version
# 输出: openjdk version "17.0.x"
```

#### 步骤 2: 安装 Android Studio

1. 下载 Android Studio: https://developer.android.com/studio
2. 安装时选择:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device

3. 配置环境变量:

```bash
# Windows
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools"

# macOS/Linux
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### 步骤 3: 安装 Node.js 和依赖

```bash
# 使用 nvm 安装 Node.js (推荐)
nvm install 20
nvm use 20

# 验证
node -v  # v20.x.x
npm -v   # 10.x.x
```

#### 步骤 4: 安装 React Native CLI

```bash
npm install -g @react-native-community/cli
```

#### 步骤 5: 克隆并配置项目

```bash
# 克隆仓库
git clone https://github.com/your-org/SillyChat.git
cd SillyChat/apps/mobile

# 安装依赖
npm install

# iOS 依赖 (仅 macOS)
cd ios && pod install && cd ..
```

### 1.3 验证环境

```bash
# 检查环境
npx react-native doctor

# 预期输出应显示所有检查项通过
```

---

## 2. 项目结构

```
SillyChat/apps/mobile/
├── android/                    # Android 原生代码
│   ├── app/
│   │   ├── src/main/java/com/sillychat/
│   │   │   ├── MainActivity.kt
│   │   │   ├── MainApplication.kt
│   │   │   ├── modules/        # 原生模块
│   │   │   │   ├── notification/
│   │   │   │   ├── background/
│   │   │   │   └── storage/
│   │   │   └── utils/
│   │   └── build.gradle
│   └── build.gradle
│
├── ios/                        # iOS 原生代码 (如需要)
│
├── src/                        # React Native 源码
│   ├── components/             # 可复用组件
│   │   ├── common/             # 通用组件
│   │   ├── chat/               # 聊天相关组件
│   │   ├── layout/             # 布局组件
│   │   └── ui/                 # UI 基础组件
│   │
│   ├── screens/                # 页面组件
│   │   ├── auth/               # 认证相关
│   │   ├── chat/               # 聊天页面
│   │   ├── contacts/           # 联系人
│   │   ├── settings/           # 设置
│   │   └── home/               # 首页
│   │
│   ├── navigation/             # 导航配置
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── TabNavigator.tsx
│   │
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   ├── useGateway.ts
│   │   └── useStorage.ts
│   │
│   ├── services/               # 业务服务
│   │   ├── api/                # API 客户端
│   │   ├── gateway/            # 网关连接
│   │   ├── storage/            # 本地存储
│   │   └── notification/       # 通知服务
│   │
│   ├── store/                  # 状态管理 (Zustand)
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   ├── userStore.ts
│   │   └── index.ts
│   │
│   ├── utils/                  # 工具函数
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── validation.ts
│   │   └── encryption.ts
│   │
│   ├── theme/                  # 主题配置
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   │
│   ├── types/                  # TypeScript 类型定义
│   │   ├── api.ts
│   │   ├── chat.ts
│   │   ├── user.ts
│   │   └── index.ts
│   │
│   └── constants/              # 常量定义
│       ├── config.ts
│       ├── messages.ts
│       └── endpoints.ts
│
├── __tests__/                  # 测试文件
├── assets/                     # 静态资源
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── docs/                       # 文档
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── app.json
```

---

## 3. 开发规范

### 3.1 代码风格

#### TypeScript 规范

```typescript
// ✅ 正确: 使用接口定义类型
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ❌ 错误: 使用 any
type User = any;

// ✅ 正确: 明确的函数返回类型
async function fetchUser(id: string): Promise<User | null> {
  // ...
}

// ❌ 错误: 隐式返回类型
async function fetchUser(id: string) {
  // ...
}
```

#### 组件规范

```typescript
// ✅ 正确: 函数组件 + 明确 Props
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  isOwn,
  timestamp,
  status,
}) => {
  return (
    <View style={[styles.container, isOwn && styles.ownContainer]}>
      <Text style={styles.content}>{content}</Text>
      <Text style={styles.time}>{formatTime(timestamp)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    maxWidth: '80%',
  },
  ownContainer: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  content: {
    fontSize: 16,
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
```

#### 命名规范

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| 组件 | PascalCase | `MessageBubble`, `ChatScreen` |
| Hooks | camelCase (use前缀) | `useAuth`, `useChat` |
| 工具函数 | camelCase | `formatTime`, `validateEmail` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRY` |
| 类型/接口 | PascalCase | `User`, `Message` |
| 文件名 | kebab-case | `message-bubble.tsx`, `use-auth.ts` |

### 3.2 文件组织

```typescript
// 文件结构顺序:
// 1. 导入 (按类型分组)
import React from 'react';                    // React 核心
import { View, Text } from 'react-native';    // RN 组件
import { useNavigation } from '@react-navigation/native'; // 第三方库

import { useAuth } from '@/hooks/useAuth';    // 项目内部
import { colors } from '@/theme/colors';      // 主题/配置

// 2. 类型定义
interface Props {
  // ...
}

// 3. 常量
const MAX_LENGTH = 200;

// 4. 组件/函数
export const Component: React.FC<Props> = () => {
  // ...
};

// 5. 样式
const styles = StyleSheet.create({
  // ...
});
```

### 3.3 状态管理规范

```typescript
// ✅ 正确: 使用 Zustand 创建 Store
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### 3.4 错误处理规范

```typescript
// ✅ 正确: 统一的错误处理
try {
  const result = await apiClient.post('/auth/login', credentials);
  return result.data;
} catch (error) {
  if (error instanceof ApiError) {
    // 已知 API 错误
    throw new AuthError(error.message, error.code);
  }
  // 未知错误
  throw new AuthError('网络错误，请稍后重试', 'NETWORK_ERROR');
}

// 错误边界组件
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // 上报错误到监控服务
    reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

---

## 4. 调试技巧

### 4.1 开发调试

#### 启动开发服务器

```bash
# 启动 Metro 服务器
npm start

# 在另一个终端运行 Android
npm run android

# 或指定设备
npm run android -- --deviceId=emulator-5554
```

#### 调试工具

```bash
# 打开 React Native Debugger
npm run debug

# 使用 Flipper (推荐)
# 1. 安装 Flipper: https://fbflipper.com/
# 2. 启动应用后自动连接

# 查看日志
adb logcat -s ReactNative:V ReactNativeJS:V
```

### 4.2 网络调试

```typescript
// 配置 API 客户端调试
import axios from 'axios';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// 请求拦截器 - 添加日志
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 添加日志
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);
```

### 4.3 性能调试

```typescript
// 使用 React DevTools Profiler
import { Profiler } from 'react';

const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  console.log('Profiler:', {
    id,
    phase,
    actualDuration,
    baseDuration,
  });
};

// 包裹需要分析的组件
<Profiler id="ChatScreen" onRender={onRenderCallback}>
  <ChatScreen />
</Profiler>
```

### 4.4 常见调试命令

```bash
# 清除缓存
npm start -- --reset-cache

# 重新安装依赖
rm -rf node_modules && npm install

# Android 清理
cd android && ./gradlew clean && cd ..

# 查看设备列表
adb devices

# 查看特定包日志
adb logcat -d | grep "com.sillychat"

# 性能分析
adb shell dumpsys meminfo com.sillychat

# 网络抓包
adb shell tcpdump -i any -w /sdcard/capture.pcap
```

---

## 5. 常见问题

### Q1: 应用启动白屏

**原因**: Metro 服务器未启动或连接失败

**解决**:
```bash
# 1. 确保 Metro 运行
npm start

# 2. 检查端口占用
lsof -i :8081  # macOS/Linux
netstat -ano | findstr :8081  # Windows

# 3. 重置缓存
npm start -- --reset-cache
```

### Q2: 原生模块链接失败

**原因**: 原生代码未正确编译

**解决**:
```bash
# Android
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
npm run android
```

### Q3: TypeScript 类型错误

**原因**: 类型定义缺失或不匹配

**解决**:
```bash
# 重新生成类型
npx tsc --noEmit

# 检查 tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

## 6. 相关文档

- [架构文档](./architecture.md) - 系统架构说明
- [API 文档](./api-reference.md) - 组件和 Hooks API
- [原生模块文档](./native-modules.md) - Android 原生模块
- [测试指南](./testing-guide.md) - 测试方法
- [发布指南](./deployment.md) - 打包发布流程
