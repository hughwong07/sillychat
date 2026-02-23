# SillyChat 鸿蒙端开发文档

## 项目概述

SillyChat 鸿蒙端是基于 HarmonyOS ArkTS 开发的 AI 聊天应用，提供与 AI 助手对话、管理 AI 代理、应用设置等功能。

## 技术栈

- **开发语言**: ArkTS (TypeScript)
- **UI 框架**: ArkUI
- **状态管理**: @State, @Prop, @Observed, @Track
- **存储**: Preferences (轻量级键值存储)
- **网络**: HTTP 请求 (待实现)

## 项目结构

```
entry/src/main/ets/
├── components/          # 可复用组件
│   ├── AgentCard.ets    # 代理卡片组件
│   ├── EmptyState.ets   # 空状态组件
│   ├── LoadingMore.ets  # 加载更多组件
│   ├── MessageInput.ets # 消息输入组件
│   ├── MessageItem.ets  # 消息项组件
│   └── SearchBar.ets    # 搜索栏组件
├── constants/           # 常量定义
│   ├── Colors.ets       # 颜色常量
│   └── Config.ets       # 配置常量
├── data/                # 数据层
│   ├── local/           # 本地数据
│   │   └── PreferencesUtil.ets  # 偏好存储工具
│   ├── remote/          # 远程数据
│   │   └── ApiService.ets       # API 服务
│   └── repository/      # 数据仓库
│       ├── AgentRepository.ets   # 代理仓库
│       └── MessageRepository.ets # 消息仓库
├── model/               # 数据模型
│   ├── Agent.ets        # 代理模型
│   └── Message.ets      # 消息模型
├── pages/               # 页面
│   ├── agent/           # 代理管理
│   │   └── AgentPage.ets
│   ├── chat/            # 聊天
│   │   └── ChatPage.ets
│   ├── profile/         # 个人资料
│   │   └── ProfilePage.ets
│   └── settings/        # 设置
│       └── SettingsPage.ets
├── utils/               # 工具类
│   └── Logger.ets       # 日志工具
└── viewmodel/           # 视图模型
    ├── AgentViewModel.ets   # 代理视图模型
    └── ChatViewModel.ets    # 聊天视图模型
```

## 核心功能

### 1. 聊天功能 (ChatPage)

#### 功能特性
- 实时消息发送和接收
- 流式响应显示（打字机效果）
- 历史消息分页加载
- 消息搜索
- 长按菜单（复制、删除、转发）
- 代理切换
- 滚动到底部按钮

#### 主要组件
- **MessageList**: 消息列表显示
- **MessageInput**: 消息输入框
- **StreamingMessageItem**: 流式消息显示
- **SearchBar**: 消息搜索

#### 状态管理
```typescript
@State viewModel: ChatViewModel = ChatViewModel.getInstance();
@State isSearchMode: boolean = false;
@State searchQuery: string = '';
@State showScrollToBottom: boolean = false;
```

### 2. 代理管理 (AgentPage)

#### 功能特性
- 代理列表显示
- 创建代理表单
- 编辑代理
- 删除代理确认
- 代理搜索过滤
- 类别筛选
- 激活状态切换
- 代理详情查看

#### 主要组件
- **AgentCard**: 代理卡片
- **AgentDetailCard**: 代理详情
- **CategorySelector**: 类别选择器

#### 表单字段
- 名称（必填）
- 角色（必填）
- 描述（可选）
- 系统提示词（可选）
- 类别
- 温度 (0-2)
- 最大令牌数 (500-4000)

### 3. 设置页面 (SettingsPage)

#### 功能特性
- 深色模式切换
- 语言设置
- 通知设置
- 声音设置
- 震动设置
- 字体大小设置
- 时间戳显示设置
- 自动同步设置
- 同步间隔设置
- 清除缓存
- 退出登录

#### 设置持久化
使用 PreferencesUtil 进行设置存储：
```typescript
private preferences: PreferencesUtil | null = null;

// 保存设置
private saveSetting(key: string, value: boolean | string | number): void {
  if (!this.preferences) return;
  if (typeof value === 'boolean') {
    this.preferences.putBoolean(key, value);
  } else if (typeof value === 'string') {
    this.preferences.putString(key, value);
  } else if (typeof value === 'number') {
    this.preferences.putNumber(key, value);
  }
}
```

## 通用组件

### 1. SearchBar 搜索栏

```typescript
SearchBar({
  placeholder: '搜索',
  showClearButton: true,
  onSearch: (text: string) => { /* 搜索回调 */ },
  onTextChange: (text: string) => { /* 文本变化回调 */ }
})
```

### 2. EmptyState 空状态

```typescript
EmptyState({
  icon: $r('app.media.ic_inbox'),
  title: '暂无数据',
  description: '描述文本',
  buttonText: '操作按钮',
  onButtonClick: () => { /* 按钮回调 */ }
})
```

### 3. LoadingMore 加载更多

```typescript
LoadingMore({
  isLoading: boolean,
  hasMore: boolean,
  onLoadMore: () => { /* 加载回调 */ }
})
```

## 数据模型

### Agent 代理模型

```typescript
class Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  role: string;
  isActive: boolean;
  isDefault: boolean;
  category: AgentCategory;
  status: AgentStatus;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}
```

### Message 消息模型

```typescript
class Message {
  id: string;
  content: string;
  role: MessageRole;
  conversationId: string;
  timestamp: number;
  syncStatus: SyncStatus;
  senderName?: string;
  attachments: Attachment[];
}
```

## 视图模型

### ChatViewModel

```typescript
export class ChatViewModel {
  @Track uiState: ChatUiState = new ChatUiState();

  // 发送消息
  public async sendMessage(): Promise<void>;

  // 加载更多消息
  public async loadMoreMessages(): Promise<void>;

  // 搜索消息
  public searchMessages(query: string): Message[];

  // 删除消息
  public deleteMessage(messageId: string): void;

  // 选择代理
  public selectAgent(agent: Agent): void;
}
```

### AgentViewModel

```typescript
export class AgentViewModel {
  @Track uiState: AgentUiState = new AgentUiState();

  // 创建代理
  public async createAgent(agent: Agent): Promise<void>;

  // 更新代理
  public async updateAgent(agent: Agent): Promise<void>;

  // 删除代理
  public async deleteAgent(agentId: string): Promise<void>;

  // 搜索代理
  public updateSearchQuery(query: string): void;

  // 按类别筛选
  public filterByCategory(category: AgentCategory | null): void;
}
```

## 主题系统

### 颜色常量

```typescript
// 浅色主题
export class Colors {
  static readonly primary: ResourceColor = '#6750A4';
  static readonly background: ResourceColor = '#FFFBFE';
  static readonly surface: ResourceColor = '#FFFBFE';
  // ...
}

// 深色主题
export class DarkColors {
  static readonly primary: ResourceColor = '#D0BCFF';
  static readonly background: ResourceColor = '#1C1B1F';
  static readonly surface: ResourceColor = '#1C1B1F';
  // ...
}
```

### 主题切换

```typescript
private toggleTheme(isDark: boolean): void {
  this.darkMode = isDark;
  this.saveSetting(PrefKeys.THEME_MODE, isDark);
  this.applyTheme(isDark);
}
```

## 最佳实践

### 1. 状态管理
- 使用 @State 管理组件内部状态
- 使用 @Prop 传递父子组件状态
- 使用 @Observed 和 @Track 管理复杂对象
- 使用 ViewModel 管理页面级状态

### 2. 性能优化
- 使用 List 的懒加载机制
- 合理使用缓存
- 避免不必要的重渲染
- 及时清理定时器和监听器

### 3. 错误处理
- 使用 try-catch 处理异常
- 记录错误日志
- 提供用户友好的错误提示

### 4. 代码规范
- 使用有意义的命名
- 添加必要的注释
- 保持代码简洁
- 遵循 ArkTS 编码规范

## 调试技巧

### 1. 日志输出
```typescript
import { Logger } from '../utils/Logger';

Logger.info(TAG, '信息日志');
Logger.warn(TAG, '警告日志');
Logger.error(TAG, '错误日志');
Logger.debug(TAG, '调试日志');
```

### 2. 状态查看
- 使用 DevEco Studio 的调试工具
- 在控制台查看日志输出
- 使用断点调试

## 构建和运行

### 1. 环境要求
- DevEco Studio 3.1.0 或更高版本
- HarmonyOS SDK API 9 或更高版本
- Node.js 14.x 或更高版本

### 2. 构建步骤
1. 打开 DevEco Studio
2. 导入项目
3. 同步 Gradle 配置
4. 连接设备或启动模拟器
5. 点击运行按钮

### 3. 发布构建
```bash
# 构建 HAP 包
./gradlew assembleRelease

# 输出路径
entry/build/default/outputs/default/entry-default-signed.hap
```

## 常见问题

### 1. 编译错误
**问题**: 编译时出现类型错误
**解决**: 检查类型定义，确保所有变量都有正确的类型注解

### 2. 运行时错误
**问题**: 应用运行时崩溃
**解决**: 检查日志输出，定位错误位置，添加错误处理

### 3. 性能问题
**问题**: 列表滚动卡顿
**解决**: 使用懒加载，优化渲染逻辑，减少不必要的计算

## 更新日志

### v1.0.0 (2026-02-23)
- 初始版本发布
- 实现聊天功能
- 实现代理管理
- 实现设置功能
- 添加通用组件库

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

- 项目主页: https://github.com/sillychat/sillychat
- 问题反馈: https://github.com/sillychat/sillychat/issues
