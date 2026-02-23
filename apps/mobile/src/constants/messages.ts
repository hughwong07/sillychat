/**
 * 界面文本消息常量
 * 所有中文界面文本集中管理
 */

// ==================== 通用文本 ====================

export const COMMON = {
  confirm: '确定',
  cancel: '取消',
  save: '保存',
  delete: '删除',
  edit: '编辑',
  add: '添加',
  remove: '移除',
  close: '关闭',
  back: '返回',
  next: '下一步',
  done: '完成',
  loading: '加载中...',
  retry: '重试',
  search: '搜索',
  send: '发送',
  more: '更多',
  settings: '设置',
  profile: '个人资料',
  logout: '退出登录',
  unknown: '未知',
  empty: '暂无数据',
  error: '出错了',
  success: '操作成功',
} as const;

// ==================== 导航标题 ====================

export const NAVIGATION = {
  conversations: '消息',
  agents: '智能助手',
  discover: '发现',
  profile: '我的',
  settings: '设置',
  chat: '聊天',
  about: '关于',
  help: '帮助',
} as const;

// ==================== 聊天界面 ====================

export const CHAT = {
  // 输入框
  inputPlaceholder: '输入消息...',
  inputPlaceholderDisabled: '无法发送消息',
  voiceInput: '按住说话',
  voiceRecording: '松开结束',
  send: '发送',

  // 消息状态
  sending: '发送中',
  sent: '已发送',
  delivered: '已送达',
  read: '已读',
  failed: '发送失败',

  // 操作
  copy: '复制',
  forward: '转发',
  recall: '撤回',
  delete: '删除',
  quote: '引用',
  multiSelect: '多选',

  // 系统消息
  messageRecalled: '消息已撤回',
  messageDeleted: '消息已删除',
  newMessages: '新消息',
  loadMore: '加载更多',
  noMoreMessages: '没有更多消息了',

  // 语音
  voiceMessage: '语音消息',
  voiceDuration: '{duration}\'\'',
  voicePlaying: '播放中...',
} as const;

// ==================== 对话列表 ====================

export const CONVERSATION = {
  // 标题
  title: '消息',
  emptyTitle: '还没有消息',
  emptySubtitle: '开始一段新的对话吧',

  // 操作
  newChat: '新建聊天',
  searchPlaceholder: '搜索对话',
  markAllRead: '全部已读',
  clearAll: '清空全部',

  // 状态
  online: '在线',
  offline: '离线',
  typing: '正在输入...',
  lastSeen: '上次在线 {time}',

  // 菜单
  pin: '置顶',
  unpin: '取消置顶',
  mute: '静音',
  unmute: '取消静音',
  delete: '删除对话',
  clearHistory: '清空记录',
} as const;

// ==================== 代理面板 ====================

export const AGENT = {
  // 标题
  title: '智能助手',
  emptyTitle: '还没有助手',
  emptySubtitle: '添加一个智能助手开始对话',

  // 状态
  statusIdle: '空闲',
  statusBusy: '忙碌',
  statusOffline: '离线',
  statusError: '异常',

  // 操作
  addAgent: '添加助手',
  editAgent: '编辑助手',
  activate: '激活',
  deactivate: '停用',
  configure: '配置',

  // 详情
  capabilities: '能力',
  personality: '性格',
  knowledgeBase: '知识库',
  conversationHistory: '对话历史',

  // 提示
  activateConfirm: '确定要激活这个助手吗？',
  deactivateConfirm: '确定要停用这个助手吗？',
  deleteConfirm: '确定要删除这个助手吗？此操作不可恢复。',
} as const;

// ==================== 设置页面 ====================

export const SETTINGS = {
  // 标题
  title: '设置',

  // 分组
  groupGeneral: '通用',
  groupAppearance: '外观',
  groupNotifications: '通知',
  groupPrivacy: '隐私',
  groupStorage: '存储',
  groupAbout: '关于',

  // 通用设置
  language: '语言',
  languageZh: '简体中文',
  languageEn: 'English',
  fontSize: '字体大小',
  fontSizeSmall: '小',
  fontSizeMedium: '中',
  fontSizeLarge: '大',

  // 外观设置
  theme: '主题',
  themeLight: '浅色',
  themeDark: '深色',
  themeSystem: '跟随系统',

  // 通知设置
  notifications: '消息通知',
  sound: '声音',
  vibration: '振动',
  showPreview: '显示预览',

  // 隐私设置
n  readReceipts: '已读回执',
  readReceiptsDesc: '允许他人看到您是否已读消息',
  typingIndicators: '输入状态',
  typingIndicatorsDesc: '允许他人看到您正在输入',

  // 存储设置
  storageUsage: '存储空间',
  clearCache: '清除缓存',
  autoDownload: '自动下载',
  syncSettings: '同步设置',

  // 关于
  version: '版本',
  checkUpdate: '检查更新',
  privacyPolicy: '隐私政策',
  termsOfService: '服务条款',
  feedback: '意见反馈',

  // 提示
  clearCacheConfirm: '确定要清除缓存吗？',
  logoutConfirm: '确定要退出登录吗？',
} as const;

// ==================== 错误消息 ====================

export const ERRORS = {
  // 网络
  networkError: '网络连接失败，请检查网络设置',
  timeoutError: '请求超时，请稍后重试',
  serverError: '服务器错误，请稍后重试',

  // 认证
  authFailed: '登录失败，请检查账号密码',
  sessionExpired: '登录已过期，请重新登录',
  permissionDenied: '没有权限执行此操作',

  // 消息
  sendFailed: '消息发送失败',
  uploadFailed: '文件上传失败',
  downloadFailed: '文件下载失败',

  // 通用
  unknownError: '发生未知错误',
  retryLater: '请稍后重试',
  invalidInput: '输入无效',
} as const;

// ==================== 时间显示 ====================

export const TIME_DISPLAY = {
  justNow: '刚刚',
  minutesAgo: '{minutes}分钟前',
  hoursAgo: '{hours}小时前',
  yesterday: '昨天',
  daysAgo: '{days}天前',
  longTimeAgo: '很久以前',
} as const;
