# Mobile API 文档 (React Native)

SillyChat React Native SDK API 文档。

## 快速开始

### 安装

```bash
npm install @sillychat/react-native
# 或
yarn add @sillychat/react-native
```

### iOS 配置

```bash
cd ios && pod install
```

### Android 配置

```gradle
// android/build.gradle
allprojects {
    repositories {
        maven { url 'https://jitpack.io' }
    }
}
```

### 初始化

```typescript
// App.tsx
import { SillyChatProvider } from '@sillychat/react-native';

export default function App() {
  return (
    <SillyChatProvider
      config={{
        apiKey: 'your-api-key',
        baseURL: 'https://api.sillychat.io',
        enableLogging: __DEV__,
      }}
    >
      <NavigationContainer>
        {/* 你的应用 */}
      </NavigationContainer>
    </SillyChatProvider>
  );
}
```

## Hooks API

### useAgents

管理 AI 代理。

```typescript
import { useAgents } from '@sillychat/react-native';

function AgentScreen() {
  const { agents, createAgent, updateAgent, deleteAgent, isLoading } = useAgents();

  const handleCreate = async () => {
    const agent = await createAgent({
      id: 'assistant-1',
      identity: {
        name: 'AI助手',
        role: 'assistant',
      },
      modelConfig: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        apiKey: 'your-key',
      },
    });
  };

  return (
    <FlatList
      data={agents}
      renderItem={({ item }) => <AgentCard agent={item} />}
    />
  );
}
```

### useConversation

管理单个对话。

```typescript
import { useConversation } from '@sillychat/react-native';

function ChatScreen({ route }: { route: { params: { conversationId: string } } }) {
  const { conversationId } = route.params;
  const {
    conversation,
    messages,
    sendMessage,
    sendMessageStream,
    isLoading,
    streamingContent,
  } = useConversation(conversationId);

  const handleSend = async (text: string) => {
    // 普通发送
    await sendMessage(text);

    // 或流式发送
    await sendMessageStream(text, {
      onChunk: (chunk) => console.log(chunk.content),
      onComplete: (message) => console.log('Done:', message),
    });
  };

  return (
    <GiftedChat
      messages={messages}
      onSend={(msgs) => handleSend(msgs[0].text)}
      isTyping={isLoading}
    />
  );
}
```

### useConversations

管理对话列表。

```typescript
import { useConversations } from '@sillychat/react-native';

function ConversationListScreen() {
  const {
    conversations,
    createConversation,
    deleteConversation,
    refresh,
    isLoading,
    hasMore,
    loadMore,
  } = useConversations({
    agentId: 'assistant-1',
    limit: 20,
  });

  return (
    <FlatList
      data={conversations}
      onRefresh={refresh}
      refreshing={isLoading}
      onEndReached={loadMore}
      renderItem={({ item }) => (
        <ConversationItem
          conversation={item}
          onDelete={() => deleteConversation(item.id)}
        />
      )}
    />
  );
}
```

### useAuth

认证管理。

```typescript
import { useAuth } from '@sillychat/react-native';

function LoginScreen() {
  const { user, login, register, logout, isAuthenticated, isLoading } = useAuth();

  const handleLogin = async (username: string, password: string) => {
    try {
      await login({ username, password });
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('登录失败', error.message);
    }
  };

  return (
    <View>
      {!isAuthenticated ? (
        <LoginForm onSubmit={handleLogin} />
      ) : (
        <Button title="退出" onPress={logout} />
      )}
    </View>
  );
}
```

### useStorage

本地存储。

```typescript
import { useStorage } from '@sillychat/react-native';

function SettingsScreen() {
  const [darkMode, setDarkMode] = useStorage('darkMode', false);
  const [fontSize, setFontSize] = useStorage('fontSize', 16);

  return (
    <View>
      <Switch value={darkMode} onValueChange={setDarkMode} />
      <Slider value={fontSize} onValueChange={setFontSize} />
    </View>
  );
}
```

### useNetwork

网络状态。

```typescript
import { useNetwork } from '@sillychat/react-native';

function NetworkAwareComponent() {
  const { isConnected, type, isWifi, isCellular } = useNetwork();

  if (!isConnected) {
    return <OfflineMessage />;
  }

  return (
    <View>
      <Text>网络类型: {type}</Text>
      {isWifi && <Text>使用WiFi，可以下载大文件</Text>}
    </View>
  );
}
```

## 组件

### Chat

完整聊天界面组件。

```typescript
import { Chat } from '@sillychat/react-native';

function ChatScreen() {
  return (
    <Chat
      conversationId="conv-1"
      agentId="assistant-1"
      onMessageSend={(message) => console.log('Sent:', message)}
      onMessageReceive={(message) => console.log('Received:', message)}
      enableAttachments={true}
      enableVoice={true}
      theme={{
        primary: '#007AFF',
        background: '#FFFFFF',
        text: '#000000',
      }}
    />
  );
}
```

### AgentSelector

代理选择器。

```typescript
import { AgentSelector } from '@sillychat/react-native';

function AgentSelectScreen() {
  return (
    <AgentSelector
      selectedId={selectedAgentId}
      onSelect={(agent) => setSelectedAgent(agent)}
      showCreateButton={true}
      onCreatePress={() => navigation.navigate('CreateAgent')}
    />
  );
}
```

### MessageList

消息列表组件。

```typescript
import { MessageList } from '@sillychat/react-native';

function CustomChatScreen() {
  return (
    <MessageList
      messages={messages}
      currentUser={currentUser}
      onMessageLongPress={(message) => showActions(message)}
      onLoadEarlier={loadMore}
      isLoadingEarlier={isLoadingMore}
      renderMessage={(props) => <CustomMessage {...props} />}
    />
  );
}
```

### MessageInput

消息输入组件。

```typescript
import { MessageInput } from '@sillychat/react-native';

function CustomInput() {
  return (
    <MessageInput
      onSend={(text, attachments) => sendMessage(text, attachments)}
      onAttachmentPress={pickAttachment}
      onVoicePress={recordVoice}
      placeholder="输入消息..."
      maxLength={2000}
      enableAttachments={true}
      enableVoice={true}
    />
  );
}
```

## 原生模块

### Biometric

生物识别认证。

```typescript
import { Biometric } from '@sillychat/react-native';

// 检查可用性
const available = await Biometric.isAvailable();
// { available: true, biometryType: 'FaceID' }

// 认证
const result = await Biometric.authenticate({
  promptMessage: '验证身份',
  cancelButtonText: '取消',
  fallbackLabel: '使用密码',
});

if (result.success) {
  // 认证成功
}
```

### SecureStorage

安全存储。

```typescript
import { SecureStorage } from '@sillychat/react-native';

// 存储
await SecureStorage.setItem('apiKey', 'secret-key');
await SecureStorage.setItem('userId', 'user-123');

// 读取
const apiKey = await SecureStorage.getItem('apiKey');

// 删除
await SecureStorage.removeItem('apiKey');
await SecureStorage.clear();
```

### Notifications

推送通知。

```typescript
import { Notifications } from '@sillychat/react-native';

// 请求权限
const granted = await Notifications.requestPermission();

// 获取设备令牌
const token = await Notifications.getToken();

// 监听消息
Notifications.onMessage((message) => {
  console.log('Foreground message:', message);
});

Notifications.onNotificationOpened((notification) => {
  console.log('Notification opened:', notification);
  navigation.navigate('Chat', { conversationId: notification.data.conversationId });
});

// 本地通知
await Notifications.showLocalNotification({
  title: '新消息',
  body: '你有一条新消息',
  data: { conversationId: 'conv-1' },
});
```

### FilePicker

文件选择。

```typescript
import { FilePicker } from '@sillychat/react-native';

// 选择图片
const images = await FilePicker.pickImages({
  multiple: true,
  maxFiles: 5,
});

// 选择文档
const documents = await FilePicker.pickDocuments({
  types: ['pdf', 'doc', 'docx'],
});

// 拍照
const photo = await FilePicker.takePhoto();

// 录制视频
const video = await FilePicker.recordVideo({
  maxDuration: 60,
});
```

## API 服务

### ApiService

直接访问底层 API。

```typescript
import { ApiService } from '@sillychat/react-native';

// 配置
ApiService.configure({
  baseURL: 'https://api.sillychat.io',
  timeout: 30000,
});

// 设置认证令牌
ApiService.setAuthToken('jwt-token');

// GET
const agents = await ApiService.get('/agents');

// POST
const agent = await ApiService.post('/agents', {
  name: 'New Agent',
  role: 'assistant',
});

// 上传文件
const result = await ApiService.uploadFile('/upload', {
  uri: 'file://path/to/file.jpg',
  name: 'file.jpg',
  type: 'image/jpeg',
}, (progress) => {
  console.log(`Upload: ${progress}%`);
});
```

### WebSocket

WebSocket 客户端。

```typescript
import { WebSocketClient } from '@sillychat/react-native';

const ws = new WebSocketClient('wss://api.sillychat.io/ws');

ws.onConnect(() => {
  console.log('Connected');
});

ws.onMessage((message) => {
  console.log('Received:', message);
});

ws.onDisconnect(() => {
  console.log('Disconnected');
});

ws.connect();

// 发送消息
ws.send({
  type: 'chat.message',
  content: 'Hello!',
});

// 断开连接
ws.disconnect();
```

## 类型定义

### Agent

```typescript
interface Agent {
  id: string;
  identity: AgentIdentity;
  modelConfig: ModelConfig;
  capabilities: AgentCapabilities;
  status: AgentStatus;
  createdAt: number;
  updatedAt: number;
}

interface AgentIdentity {
  name: string;
  role: 'master' | 'assistant' | 'expert' | 'guest';
  avatar?: string;
  description?: string;
  welcomeMessage?: string;
}

interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'openclaw' | 'local' | 'custom';
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}
```

### Conversation

```typescript
interface Conversation {
  id: string;
  title: string;
  agentId: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Message

```typescript
interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  senderId: string;
  attachments?: Attachment[];
  createdAt: number;
}

interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  uri: string;
  name: string;
  size: number;
}
```

## 主题定制

```typescript
import { ThemeProvider } from '@sillychat/react-native';

const customTheme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C7C7CC',
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
};

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      {/* 你的应用 */}
    </ThemeProvider>
  );
}
```

## 最佳实践

### 1. 错误处理

```typescript
import { useErrorHandler } from '@sillychat/react-native';

function MyComponent() {
  const handleError = useErrorHandler();

  const doSomething = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      handleError(error, {
        showAlert: true,
        fallbackMessage: '操作失败，请重试',
      });
    }
  };
}
```

### 2. 离线支持

```typescript
import { useOffline } from '@sillychat/react-native';

function ChatScreen() {
  const { isOffline, queueMessage, syncWhenOnline } = useOffline();

  const handleSend = async (text: string) => {
    if (isOffline) {
      // 离线时加入队列
      await queueMessage({
        type: 'chat.message',
        content: text,
      });
      Alert.alert('消息将在联网后发送');
    } else {
      await sendMessage(text);
    }
  };

  useEffect(() => {
    // 联网时同步
    syncWhenOnline();
  }, [isOffline]);
}
```

### 3. 性能优化

```typescript
import { memo, useCallback } from 'react';

// 使用 memo 避免不必要的重渲染
const MessageItem = memo(({ message, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{message.content}</Text>
    </TouchableOpacity>
  );
});

function MessageList({ messages }) {
  // 使用 useCallback 缓存回调
  const handlePress = useCallback((message) => {
    // 处理点击
  }, []);

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageItem message={item} onPress={handlePress} />
      )}
      maxToRenderPerBatch={10}
      windowSize={10}
    />
  );
}
```

---

*更多示例请参考 [Mobile 示例项目](../../examples/mobile-sample/)*
