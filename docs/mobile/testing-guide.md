# 测试指南

> 本文档详细介绍 SillyChat Android 应用的测试策略、测试写法和执行方法。

---

## 1. 测试策略

### 1.1 测试金字塔

```
                    /\
                   /  \
                  / E2E \          # 端到端测试 (10%)
                 /--------\         # Detox / Appium
                /          \
               / Integration \      # 集成测试 (20%)
              /----------------\     # React Native Testing Library
             /                  \
            /     Unit Tests      \  # 单元测试 (70%)
           /------------------------\ # Jest + React Test Renderer
          /                          \
```

### 1.2 测试类型

| 测试类型 | 工具 | 覆盖率目标 | 执行频率 |
|----------|------|------------|----------|
| 单元测试 | Jest | 80%+ | 每次提交 |
| 集成测试 | React Native Testing Library | 60%+ | 每次 PR |
| E2E 测试 | Detox | 核心流程 | 每日构建 |
| 性能测试 | Flipper / Firebase Perf | 关键指标 | 每周 |
| 快照测试 | Jest Snapshot | UI 组件 | 每次 PR |

### 1.3 测试目录结构

```
SillyChat/apps/mobile/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── __tests__/
│   │       └── Button.test.tsx       # 组件单元测试
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── __tests__/
│   │       └── useAuth.test.ts       # Hooks 测试
│   │
│   ├── services/
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── __tests__/
│   │       └── api.test.ts           # API 测试
│   │
│   └── utils/
│       ├── format.ts
│       └── __tests__/
│           └── format.test.ts        # 工具函数测试
│
├── __tests__/                        # 集成测试
│   ├── integration/
│   │   ├── auth-flow.test.tsx
│   │   └── chat-flow.test.tsx
│   └── setup.ts                      # 测试配置
│
├── e2e/                              # E2E 测试
│   ├── firstTest.spec.js
│   ├── chat.spec.js
│   └── init.js
│
├── jest.config.js                    # Jest 配置
├── jest.setup.js                     # 测试初始化
└── detox.config.js                   # Detox 配置
```

---

## 2. 单元测试

### 2.1 配置 Jest

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-mmkv)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
};
```

```javascript
// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// 全局 Mock
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// MMKV Mock
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));
```

### 2.2 组件测试

```typescript
// src/components/common/__tests__/Button.test.tsx

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Click me</Button>);

    fireEvent.press(screen.getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(
      <Button onPress={onPress} disabled>
        Click me
      </Button>
    );

    fireEvent.press(screen.getByText('Click me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByTestId('button-loading')).toBeTruthy();
  });

  it('applies variant styles correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveStyle({
      backgroundColor: '#007AFF',
    });

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByText('Danger')).toHaveStyle({
      backgroundColor: '#FF3B30',
    });
  });

  it('matches snapshot', () => {
    const tree = render(
      <Button variant="primary" size="lg">
        Snapshot Test
      </Button>
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

### 2.3 Hooks 测试

```typescript
// src/hooks/__tests__/useAuth.test.ts

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '../useAuth';
import { apiClient } from '@/services/api/client';

// Mock API 客户端
jest.mock('@/services/api/client');

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('logs in successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { token: 'fake-token', user: mockUser },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('handles login error', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(
      new Error('Invalid credentials')
    );

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login({
          email: 'test@example.com',
          password: 'wrong',
        });
      } catch (e) {
        // 预期抛出错误
      }
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('logs out successfully', async () => {
    const { result } = renderHook(() => useAuth());

    // 先登录
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { token: 'fake-token', user: { id: '1' } },
    });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password',
      });
    });

    // 再登出
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

### 2.4 工具函数测试

```typescript
// src/utils/__tests__/format.test.ts

import {
  formatFileSize,
  formatDuration,
  formatPhoneNumber,
  truncate,
} from '../format';

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('handles decimal places', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1536, 0)).toBe('2 KB');
  });
});

describe('formatDuration', () => {
  it('formats seconds correctly', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(59)).toBe('00:59');
    expect(formatDuration(60)).toBe('01:00');
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('formats with custom format', () => {
    expect(formatDuration(3661, 'mm:ss')).toBe('61:01');
  });
});

describe('formatPhoneNumber', () => {
  it('masks phone number correctly', () => {
    expect(formatPhoneNumber('13800138000')).toBe('138 **** 8000');
    expect(formatPhoneNumber('13800138000', '***-****-****')).toBe(
      '138-0013-8000'
    );
  });
});

describe('truncate', () => {
  it('truncates long text', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('uses custom suffix', () => {
    expect(truncate('Hello World', 5, '>>')).toBe('Hello>>');
  });
});
```

### 2.5 API 测试

```typescript
// src/services/api/__tests__/client.test.ts

import { apiClient } from '../client';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

const mock = new MockAdapter(axios);

describe('apiClient', () => {
  afterEach(() => {
    mock.reset();
  });

  it('makes GET request successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    mock.onGet('/users/1').reply(200, mockData);

    const result = await apiClient.get('/users/1');
    expect(result.data).toEqual(mockData);
  });

  it('handles 401 error and refreshes token', async () => {
    mock.onGet('/protected').replyOnce(401);
    mock.onPost('/auth/refresh').reply(200, { token: 'new-token' });
    mock.onGet('/protected').replyOnce(200, { data: 'success' });

    const result = await apiClient.get('/protected');
    expect(result.data).toEqual({ data: 'success' });
  });

  it('retries on network error', async () => {
    mock.onGet('/retry').networkErrorOnce().reply(200, { success: true });

    const result = await apiClient.get('/retry');
    expect(result.data).toEqual({ success: true });
  });

  it('applies request interceptors', async () => {
    mock.onGet('/test').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer fake-token');
      return [200, {}];
    });

    await apiClient.get('/test');
  });
});
```

---

## 3. 集成测试

### 3.1 导航流程测试

```typescript
// __tests__/integration/auth-flow.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { AuthProvider } from '@/contexts/AuthContext';

const Stack = createNativeStackNavigator();

const App = () => (
  <AuthProvider>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  </AuthProvider>
);

describe('Auth Flow', () => {
  it('navigates to home after successful login', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<App />);

    // 输入登录信息
    fireEvent.changeText(
      getByPlaceholderText('邮箱'),
      'test@example.com'
    );
    fireEvent.changeText(
      getByPlaceholderText('密码'),
      'password123'
    );

    // 点击登录按钮
    fireEvent.press(getByText('登录'));

    // 等待导航到首页
    await waitFor(() => {
      expect(queryByText('首页')).toBeTruthy();
    });
  });

  it('shows error on invalid credentials', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<App />);

    fireEvent.changeText(
      getByPlaceholderText('邮箱'),
      'invalid@example.com'
    );
    fireEvent.changeText(
      getByPlaceholderText('密码'),
      'wrong'
    );

    fireEvent.press(getByText('登录'));

    const errorMessage = await findByText('邮箱或密码错误');
    expect(errorMessage).toBeTruthy();
  });
});
```

### 3.2 聊天流程测试

```typescript
// __tests__/integration/chat-flow.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ChatScreen } from '@/screens/chat/ChatScreen';
import { ChatProvider } from '@/contexts/ChatContext';
import { mockMessages, mockConversation } from '@/test-utils/mocks';

describe('Chat Flow', () => {
  it('sends a message and displays it in the list', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <ChatProvider>
        <ChatScreen route={{ params: { conversationId: 'conv-1' } }} />
      </ChatProvider>
    );

    // 输入消息
    const input = getByPlaceholderText('输入消息...');
    fireEvent.changeText(input, 'Hello!');

    // 发送消息
    fireEvent.press(getByTestId('send-button'));

    // 验证消息出现在列表中
    await waitFor(() => {
      expect(getByText('Hello!')).toBeTruthy();
    });
  });

  it('displays loading state while sending', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <ChatProvider>
        <ChatScreen route={{ params: { conversationId: 'conv-1' } }} />
      </ChatProvider>
    );

    fireEvent.changeText(getByPlaceholderText('输入消息...'), 'Test');
    fireEvent.press(getByTestId('send-button'));

    // 验证发送按钮显示加载状态
    expect(getByTestId('sending-indicator')).toBeTruthy();
  });

  it('handles message retry on failure', async () => {
    const { getByText, getByTestId, findByText } = render(
      <ChatProvider>
        <ChatScreen route={{ params: { conversationId: 'conv-1' } }} />
      </ChatProvider>
    );

    // 模拟发送失败
    fireEvent.changeText(getByPlaceholderText('输入消息...'), 'Fail message');
    fireEvent.press(getByTestId('send-button'));

    // 验证显示重试按钮
    const retryButton = await findByText('重试');
    expect(retryButton).toBeTruthy();

    // 点击重试
    fireEvent.press(retryButton);

    // 验证重新发送
    await waitFor(() => {
      expect(getByText('Fail message')).toBeTruthy();
    });
  });
});
```

---

## 4. E2E 测试

### 4.1 Detox 配置

```javascript
// detox.config.js
module.exports = {
  testRunner: {
    $0: 'jest',
    args: {
      config: 'e2e/jest.config.js',
      _: ['e2e'],
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build:
        'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30',
      },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};
```

```javascript
// e2e/jest.config.js
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.spec.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
```

### 4.2 E2E 测试用例

```javascript
// e2e/auth.spec.js

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen on first launch', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
  });

  it('should login with valid credentials', async () => {
    // 输入邮箱
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('email-input')).tapReturnKey();

    // 输入密码
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('password-input')).tapReturnKey();

    // 点击登录
    await element(by.id('login-button')).tap();

    // 验证导航到首页
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should show error with invalid credentials', async () => {
    await element(by.id('email-input')).typeText('wrong@example.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('邮箱或密码错误'))).toBeVisible();
  });

  it('should navigate to register screen', async () => {
    await element(by.id('register-link')).tap();
    await expect(element(by.id('register-screen'))).toBeVisible();
  });
});
```

```javascript
// e2e/chat.spec.js

describe('Chat Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });

    // 登录
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    // 等待首页加载
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should open conversation and send message', async () => {
    // 点击第一个会话
    await element(by.id('conversation-item-0')).tap();

    // 验证聊天页面
    await expect(element(by.id('chat-screen'))).toBeVisible();
    await expect(element(by.id('message-input'))).toBeVisible();

    // 输入并发送消息
    await element(by.id('message-input')).typeText('Hello from E2E test!');
    await element(by.id('send-button')).tap();

    // 验证消息出现在列表中
    await expect(element(by.text('Hello from E2E test!'))).toBeVisible();
  });

  it('should handle pull to refresh', async () => {
    await element(by.id('conversation-item-0')).tap();

    // 下拉刷新
    await element(by.id('message-list')).swipe('down', 'fast');

    // 验证加载指示器
    await expect(element(by.id('refresh-indicator'))).toBeVisible();
  });

  it('should navigate back to conversation list', async () => {
    await element(by.id('conversation-item-0')).tap();
    await expect(element(by.id('chat-screen'))).toBeVisible();

    // 点击返回
    await element(by.id('back-button')).tap();

    // 验证返回会话列表
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
```

### 4.3 运行 E2E 测试

```bash
# 构建应用
detox build --configuration android.emu.debug

# 运行测试
detox test --configuration android.emu.debug

# 运行特定测试文件
detox test --configuration android.emu.debug e2e/auth.spec.js

# 调试模式
detox test --configuration android.emu.debug --debug-synchronization 200
```

---

## 5. 性能测试

### 5.1 渲染性能测试

```typescript
// src/components/chat/__tests__/MessageList.perf.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MessageList } from '../MessageList';
import { generateMockMessages } from '@/test-utils/mocks';
import { measurePerformance } from '@/test-utils/performance';

describe('MessageList Performance', () => {
  it('renders 100 messages within performance budget', () => {
    const messages = generateMockMessages(100);

    const { duration } = measurePerformance(() => {
      render(
        <MessageList
          messages={messages}
          currentUserId="user-1"
        />
      );
    });

    // 渲染时间应小于 100ms
    expect(duration).toBeLessThan(100);
  });

  it('handles message updates efficiently', () => {
    const messages = generateMockMessages(50);

    const { rerender, duration } = measurePerformance(() => {
      const result = render(
        <MessageList
          messages={messages}
          currentUserId="user-1"
        />
      );

      // 添加新消息
      const newMessages = [...messages, generateMockMessages(1)[0]];
      result.rerender(
        <MessageList
          messages={newMessages}
          currentUserId="user-1"
        />
      );

      return result;
    });

    // 更新时间应小于 50ms
    expect(duration).toBeLessThan(50);
  });
});
```

### 5.2 内存泄漏测试

```typescript
// __tests__/performance/memory-leak.test.ts

import { cleanup, render } from '@testing-library/react-native';
import { ChatScreen } from '@/screens/chat/ChatScreen';

describe('Memory Leak Detection', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not leak memory on mount/unmount cycles', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize;

    // 多次挂载/卸载
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(
        <ChatScreen route={{ params: { conversationId: `conv-${i}` } }} />
      );
      unmount();
    }

    // 强制垃圾回收 (如果可用)
    if (global.gc) {
      global.gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize;

    // 内存增长应小于 10MB
    if (initialMemory && finalMemory) {
      const growth = (finalMemory - initialMemory) / 1024 / 1024;
      expect(growth).toBeLessThan(10);
    }
  });
});
```

### 5.3 使用 Flipper 进行性能分析

```typescript
// 启用 Flipper 性能插件
import { connectToDevTools } from 'react-devtools-core';

if (__DEV__) {
  connectToDevTools({
    host: 'localhost',
    port: 8097,
  });
}

// 在组件中使用 Performance API
const measureRender = (Component: React.ComponentType, props: any) => {
  performance.mark('render-start');

  const result = render(<Component {...props} />);

  performance.mark('render-end');
  performance.measure('render', 'render-start', 'render-end');

  const entries = performance.getEntriesByName('render');
  console.log(`Render time: ${entries[0].duration}ms`);

  return result;
};
```

---

## 6. 测试执行

### 6.1 测试脚本

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --ci --silent",
    "test:e2e": "detox test --configuration android.emu.debug",
    "test:e2e:release": "detox test --configuration android.emu.release",
    "test:integration": "jest __tests__/integration --testPathPattern=integration",
    "test:perf": "jest --testPathPattern=perf"
  }
}
```

### 6.2 CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Install dependencies
        run: npm ci

      - name: Setup Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 30
          arch: x86_64
          script: |
            npm run test:e2e
```

---

## 7. 相关文档

- [开发指南](./dev-guide.md) - 环境搭建和开发规范
- [架构文档](./architecture.md) - 系统架构说明
- [API 文档](./api-reference.md) - 组件和 Hooks API
- [原生模块文档](./native-modules.md) - Android 原生模块
- [发布指南](./deployment.md) - 打包发布流程
