# API 参考文档

> 本文档详细介绍 SillyChat Android 应用的所有公共 API，包括 React Native 组件、Hooks、工具函数和类型定义。

---

## 目录

1. [组件 API](#1-组件-api)
2. [Hooks API](#2-hooks-api)
3. [工具函数](#3-工具函数)
4. [类型定义](#4-类型定义)
5. [常量](#5-常量)

---

## 1. 组件 API

### 1.1 通用组件 (Common)

#### Button

多功能按钮组件，支持多种变体和加载状态。

```typescript
import { Button } from '@/components/common/Button';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  children: React.ReactNode;
}
```

**使用示例:**

```tsx
// 主要按钮
<Button variant="primary" onPress={handleSubmit}>
  发送消息
</Button>

// 加载状态
<Button loading disabled>
  发送中...
</Button>

// 带图标的按钮
<Button
  variant="outline"
  leftIcon={<Icon name="camera" />}
  onPress={handleCamera}
>
  拍照
</Button>
```

#### Input

受控输入框组件，支持多种输入类型和验证。

```typescript
import { Input } from '@/components/common/Input';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helper?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

**使用示例:**

```tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');

<Input
  label="邮箱地址"
  value={email}
  onChangeText={setEmail}
  placeholder="请输入邮箱"
  keyboardType="email-address"
  autoCapitalize="none"
  error={error}
  leftIcon={<Icon name="email" />}
/>
```

#### Avatar

用户头像组件，支持多种尺寸和状态指示器。

```typescript
import { Avatar } from '@/components/common/Avatar';

interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  status?: 'online' | 'offline' | 'away' | 'busy';
  showStatus?: boolean;
  onPress?: () => void;
  borderColor?: string;
}
```

**使用示例:**

```tsx
// 网络图片
<Avatar
  source={{ uri: user.avatarUrl }}
  name={user.name}
  size="lg"
  status="online"
  showStatus
/>

// 使用首字母作为占位
<Avatar name="张三" size={48} />
```

#### Card

卡片容器组件，用于内容分组。

```typescript
import { Card } from '@/components/common/Card';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  onPress?: () => void;
  disabled?: boolean;
}
```

---

### 1.2 聊天组件 (Chat)

#### MessageBubble

消息气泡组件，支持多种消息类型和状态。

```typescript
import { MessageBubble } from '@/components/chat/MessageBubble';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onReply?: () => void;
  onReaction?: (emoji: string) => void;
}
```

**使用示例:**

```tsx
<MessageBubble
  message={{
    id: 'msg-001',
    content: '你好！',
    type: 'text',
    status: 'read',
    timestamp: Date.now(),
    sender: { id: 'user-1', name: '张三' },
  }}
  isOwn={false}
  onLongPress={() => showMessageOptions(message)}
  onReaction={(emoji) => addReaction(message.id, emoji)}
/>
```

#### MessageList

虚拟化消息列表组件，优化大量消息的渲染性能。

```typescript
import { MessageList } from '@/components/chat/MessageList';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onLoadMore?: () => Promise<void>;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  renderEmpty?: () => React.ReactNode;
  renderLoading?: () => React.ReactNode;
}
```

**使用示例:**

```tsx
<MessageList
  messages={messages}
  currentUserId={user.id}
  onLoadMore={async () => {
    await fetchMoreMessages();
  }}
  onReply={setReplyTo}
  renderEmpty={() => (
    <View style={styles.empty}>
      <Text>还没有消息，开始聊天吧！</Text>
    </View>
  )}
/>
```

#### InputBar

聊天输入栏组件，支持文本、语音、图片等多种输入方式。

```typescript
import { InputBar } from '@/components/chat/InputBar';

interface InputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showVoice?: boolean;
  showImage?: boolean;
  showEmoji?: boolean;
  replyTo?: Message | null;
  onCancelReply?: () => void;
}
```

#### ChatHeader

聊天页面头部组件，显示会话信息和操作按钮。

```typescript
import { ChatHeader } from '@/components/chat/ChatHeader';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatar?: ImageSourcePropType;
  status?: 'online' | 'offline' | 'typing';
  onBack?: () => void;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
  onMore?: () => void;
}
```

---

### 1.3 布局组件 (Layout)

#### SafeAreaView

安全区域视图，适配刘海屏和手势条。

```typescript
import { SafeAreaView } from '@/components/layout/SafeAreaView';

interface SafeAreaViewProps {
  children: React.ReactNode;
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
  style?: ViewStyle;
}
```

#### Header

页面头部导航组件。

```typescript
import { Header } from '@/components/layout/Header';

interface HeaderProps {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  transparent?: boolean;
}
```

#### BottomTabBar

底部标签栏组件。

```typescript
import { BottomTabBar } from '@/components/layout/BottomTabBar';

interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number | string;
}

interface BottomTabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}
```

---

## 2. Hooks API

### 2.1 认证相关

#### useAuth

管理用户认证状态和操作。

```typescript
import { useAuth } from '@/hooks/useAuth';

interface UseAuthReturn {
  // 状态
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;

  // 操作
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

// 使用示例
const { user, login, logout, isLoading } = useAuth();

const handleLogin = async () => {
  try {
    await login({ email: 'user@example.com', password: 'password' });
    navigation.navigate('Home');
  } catch (error) {
    showError(error.message);
  }
};
```

#### useBiometric

生物识别认证 Hook。

```typescript
import { useBiometric } from '@/hooks/useBiometric';

interface UseBiometricReturn {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'face' | 'iris' | null;
  isAuthenticated: boolean;
  authenticate: (reason?: string) => Promise<boolean>;
}

// 使用示例
const { isAvailable, authenticate } = useBiometric();

const handleSecureAction = async () => {
  if (!isAvailable) {
    // 回退到密码验证
    return;
  }

  const success = await authenticate('验证身份以查看敏感信息');
  if (success) {
    // 执行敏感操作
  }
};
```

---

### 2.2 聊天相关

#### useChat

聊天会话管理 Hook。

```typescript
import { useChat } from '@/hooks/useChat';

interface UseChatReturn {
  // 状态
  messages: Message[];
  conversation: Conversation | null;
  isLoading: boolean;
  hasMore: boolean;
  typingUsers: string[];

  // 操作
  sendMessage: (content: string, options?: SendOptions) => Promise<void>;
  sendImage: (uri: string) => Promise<void>;
  sendVoice: (uri: string, duration: number) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  recallMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: () => Promise<void>;
}

// 使用示例
const { messages, sendMessage, isLoading, loadMore } = useChat(conversationId);

const handleSend = async (text: string) => {
  await sendMessage(text, {
    replyTo: replyMessage?.id,
    mentions: mentionedUsers,
  });
};
```

#### useConversations

会话列表管理 Hook。

```typescript
import { useConversations } from '@/hooks/useConversations';

interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  hasMore: boolean;
  unreadCount: number;

  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  pinConversation: (id: string) => Promise<void>;
  unpinConversation: (id: string) => Promise<void>;
  muteConversation: (id: string, duration: number) => Promise<void>;
  unmuteConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  archiveConversation: (id: string) => Promise<void>;
}
```

#### useTyping

打字状态管理 Hook。

```typescript
import { useTyping } from '@/hooks/useTyping';

interface UseTypingReturn {
  isTyping: boolean;
  typingUsers: string[];
  startTyping: () => void;
  stopTyping: () => void;
}

// 使用示例
const { isTyping, startTyping, stopTyping } = useTyping(conversationId);

useEffect(() => {
  if (inputText.length > 0 && !isTyping) {
    startTyping();
  } else if (inputText.length === 0 && isTyping) {
    stopTyping();
  }
}, [inputText]);
```

---

### 2.3 网络相关

#### useGateway

网关连接管理 Hook。

```typescript
import { useGateway } from '@/hooks/useGateway';

interface UseGatewayReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  latency: number;

  connect: () => Promise<void>;
  disconnect: () => void;
  send: (data: any) => Promise<void>;
  onMessage: (handler: (message: any) => void) => () => void;
}

// 使用示例
const { isConnected, connect, onMessage } = useGateway();

useEffect(() => {
  const unsubscribe = onMessage((message) => {
    console.log('收到消息:', message);
  });

  return unsubscribe;
}, []);
```

#### useApi

API 请求 Hook，支持缓存和自动重试。

```typescript
import { useApi } from '@/hooks/useApi';

interface UseApiOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  body?: any;
  cache?: boolean;
  cacheTime?: number;
  retry?: number;
  retryDelay?: number;
}

interface UseApiReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// 使用示例
const { data: user, isLoading, error, refetch } = useApi<User>({
  url: '/api/users/me',
  cache: true,
  cacheTime: 5 * 60 * 1000, // 5分钟
});
```

---

### 2.4 存储相关

#### useStorage

本地存储 Hook。

```typescript
import { useStorage } from '@/hooks/useStorage';

interface UseStorageReturn<T> {
  value: T | null;
  setValue: (value: T) => Promise<void>;
  removeValue: () => Promise<void>;
  isLoading: boolean;
}

// 使用示例
const { value: theme, setValue: setTheme } = useStorage<string>('theme', 'light');

const toggleTheme = async () => {
  await setTheme(theme === 'light' ? 'dark' : 'light');
};
```

#### useMMKV

高性能键值存储 Hook。

```typescript
import { useMMKV } from '@/hooks/useMMKV';

// 使用示例
const [userId, setUserId] = useMMKV<string>('user_id');
const [isFirstLaunch, setIsFirstLaunch] = useMMKV<boolean>('first_launch', true);
```

---

### 2.5 UI 相关

#### useTheme

主题管理 Hook。

```typescript
import { useTheme } from '@/hooks/useTheme';

interface UseThemeReturn {
  theme: 'light' | 'dark' | 'system';
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

// 使用示例
const { colors, isDark, toggleTheme } = useTheme();

return (
  <View style={{ backgroundColor: colors.background }}>
    <Text style={{ color: colors.text }}>Hello</Text>
  </View>
);
```

#### useKeyboard

键盘状态 Hook。

```typescript
import { useKeyboard } from '@/hooks/useKeyboard';

interface UseKeyboardReturn {
  isVisible: boolean;
  height: number;
  animationDuration: number;
}

// 使用示例
const { isVisible, height } = useKeyboard();

return (
  <View style={{ paddingBottom: isVisible ? height : 0 }}>
    {/* 内容 */}
  </View>
);
```

#### useDebounce

防抖 Hook。

```typescript
import { useDebounce } from '@/hooks/useDebounce';

// 使用示例
const [searchText, setSearchText] = useState('');
const debouncedSearch = useDebounce(searchText, 500);

useEffect(() => {
  // 500ms 后执行搜索
  performSearch(debouncedSearch);
}, [debouncedSearch]);
```

---

## 3. 工具函数

### 3.1 日期时间

```typescript
import {
  formatTime,
  formatDate,
  formatRelativeTime,
  isToday,
  isYesterday,
} from '@/utils/datetime';

// 格式化时间
formatTime(new Date()); // "14:30"
formatTime(timestamp, 'HH:mm:ss'); // "14:30:00"

// 格式化日期
formatDate(new Date()); // "2024-01-15"
formatDate(date, 'YYYY年MM月DD日'); // "2024年01月15日"

// 相对时间
formatRelativeTime(Date.now() - 60000); // "1分钟前"
formatRelativeTime(Date.now() - 3600000); // "1小时前"

// 判断
isToday(date); // true/false
isYesterday(date); // true/false
```

### 3.2 格式化

```typescript
import {
  formatFileSize,
  formatDuration,
  formatPhoneNumber,
  truncate,
} from '@/utils/format';

// 文件大小
formatFileSize(1024); // "1 KB"
formatFileSize(1024 * 1024); // "1 MB"

// 时长
formatDuration(65); // "01:05"
formatDuration(3661, 'HH:mm:ss'); // "01:01:01"

// 手机号
formatPhoneNumber('13800138000'); // "138 **** 8000"

// 截断文本
truncate('这是一段很长的文本', 10); // "这是一段很..."
```

### 3.3 验证

```typescript
import {
  isEmail,
  isPhone,
  isPassword,
  isUrl,
  validate,
} from '@/utils/validation';

// 单独验证
isEmail('test@example.com'); // true
isPhone('13800138000'); // true
isPassword('Abc123!@#'); // true (8位以上，包含大小写、数字、特殊字符)

// 组合验证
const result = validate({
  email: { value: 'test@example.com', rules: ['required', 'email'] },
  password: { value: 'password', rules: ['required', 'min:8'] },
});
// result: { valid: false, errors: { password: '至少需要8个字符' } }
```

### 3.4 加密

```typescript
import {
  encrypt,
  decrypt,
  hash,
  generateKey,
  base64Encode,
  base64Decode,
} from '@/utils/encryption';

// AES 加密
const encrypted = await encrypt(data, key);
const decrypted = await decrypt(encrypted, key);

// 哈希
const sha256 = await hash(data, 'sha256');

// Base64
const encoded = base64Encode('Hello World');
const decoded = base64Decode(encoded);
```

### 3.5 设备

```typescript
import {
  getDeviceInfo,
  getAppVersion,
  checkPermission,
  requestPermission,
} from '@/utils/device';

// 设备信息
const info = await getDeviceInfo();
// { brand: 'Xiaomi', model: 'Mi 10', systemVersion: '13', ... }

// 权限检查
const hasCamera = await checkPermission('camera');
if (!hasCamera) {
  const granted = await requestPermission('camera');
}
```

---

## 4. 类型定义

### 4.1 用户相关

```typescript
interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  phone: string | null;
  status: UserStatus;
  bio: string | null;
  createdAt: number;
  updatedAt: number;
}

type UserStatus = 'online' | 'offline' | 'away' | 'busy' | 'invisible';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}
```

### 4.2 消息相关

```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  type: MessageType;
  content: string;
  attachments: Attachment[];
  replyTo: Message | null;
  reactions: Reaction[];
  mentions: string[];
  status: MessageStatus;
  isRecalled: boolean;
  createdAt: number;
  updatedAt: number;
}

type MessageType = 'text' | 'image' | 'voice' | 'video' | 'file' | 'location' | 'system';
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface Attachment {
  id: string;
  type: 'image' | 'voice' | 'video' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface Reaction {
  emoji: string;
  userId: string;
  createdAt: number;
}
```

### 4.3 会话相关

```typescript
interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatarUrl: string | null;
  participants: Participant[];
  lastMessage: Message | null;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  muteUntil: number | null;
  createdAt: number;
  updatedAt: number;
}

interface Participant {
  userId: string;
  user: User;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
}
```

### 4.4 API 相关

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  code: string;
  timestamp: number;
}

interface ApiError {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
  status: number;
}

interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}
```

### 4.5 主题相关

```typescript
interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;

  background: string;
  surface: string;
  card: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  border: string;
  divider: string;

  overlay: string;
  shadow: string;
}

interface Theme {
  colors: ThemeColors;
  spacing: Spacing;
  typography: Typography;
  borderRadius: BorderRadius;
  shadows: Shadows;
}
```

---

## 5. 常量

### 5.1 配置常量

```typescript
import {
  APP_INFO,
  DEFAULT_SETTINGS,
  GATEWAY_CONFIG,
  PAGINATION,
  MESSAGE_LIMITS,
  ANIMATION,
  STORAGE,
  REGEX,
  TIME_FORMAT,
  ERROR_CODES,
} from '@/constants/config';

// 应用信息
APP_INFO.name; // "小傻瓜聊天工具"
APP_INFO.version; // "1.0.0"

// 分页配置
PAGINATION.messagesPerPage; // 20
PAGINATION.conversationsPerPage; // 15

// 消息限制
MESSAGE_LIMITS.maxTextLength; // 2000
MESSAGE_LIMITS.maxImageSize; // 10MB
MESSAGE_LIMITS.maxFileSize; // 100MB

// 动画时长
ANIMATION.fast; // 150ms
ANIMATION.normal; // 300ms
ANIMATION.slow; // 500ms
```

### 5.2 错误代码

```typescript
import { ERROR_CODES } from '@/constants/config';

ERROR_CODES.NETWORK_ERROR; // 1001
ERROR_CODES.TIMEOUT_ERROR; // 1002
ERROR_CODES.AUTH_ERROR; // 1003
ERROR_CODES.NOT_FOUND; // 1004
ERROR_CODES.SERVER_ERROR; // 1005
ERROR_CODES.VALIDATION_ERROR; // 1006
```

### 5.3 API 端点

```typescript
import { ENDPOINTS } from '@/constants/endpoints';

// 认证
ENDPOINTS.AUTH.LOGIN; // '/api/auth/login'
ENDPOINTS.AUTH.REGISTER; // '/api/auth/register'
ENDPOINTS.AUTH.LOGOUT; // '/api/auth/logout'
ENDPOINTS.AUTH.REFRESH; // '/api/auth/refresh'

// 用户
ENDPOINTS.USERS.ME; // '/api/users/me'
ENDPOINTS.USERS.BY_ID; // '/api/users/:id'
ENDPOINTS.USERS.SEARCH; // '/api/users/search'

// 消息
ENDPOINTS.MESSAGES.LIST; // '/api/conversations/:id/messages'
ENDPOINTS.MESSAGES.SEND; // '/api/conversations/:id/messages'
ENDPOINTS.MESSAGES.DELETE; // '/api/messages/:id'
```

---

## 6. 相关文档

- [开发指南](./dev-guide.md) - 环境搭建和开发规范
- [架构文档](./architecture.md) - 系统架构说明
- [原生模块文档](./native-modules.md) - Android 原生模块详情
- [测试指南](./testing-guide.md) - 测试方法
- [发布指南](./deployment.md) - 打包发布流程
