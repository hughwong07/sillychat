/**
 * 颜色常量定义
 * Logo 配色：草绿主调 #A4D037，青蓝点缀 #2DB5C8
 */

// ==================== 品牌色 ====================

/**
 * 主色调 - 草绿
 */
export const PRIMARY = {
  main: '#A4D037',
  light: '#C5E47A',
  dark: '#7BA32A',
  50: '#F5FAE6',
  100: '#EBF5CC',
  200: '#D7EB99',
  300: '#C5E47A',
  400: '#B0D952',
  500: '#A4D037',
  600: '#8AB52E',
  700: '#7BA32A',
  800: '#6B8F24',
  900: '#5A7A1E',
} as const;

/**
 * 点缀色 - 青蓝
 */
export const ACCENT = {
  main: '#2DB5C8',
  light: '#5CC9D8',
  dark: '#1E8A99',
  50: '#E6F7F9',
  100: '#CCEFF3',
  200: '#99DFE8',
  300: '#66CFDD',
  400: '#5CC9D8',
  500: '#2DB5C8',
  600: '#2599A8',
  700: '#1E8A99',
  800: '#187780',
  900: '#126468',
} as const;

// ==================== 浅色主题 ====================

export const LIGHT_THEME = {
  // 品牌色
  primary: PRIMARY.main,
  primaryLight: PRIMARY.light,
  primaryDark: PRIMARY.dark,
  accent: ACCENT.main,
  accentLight: ACCENT.light,
  accentDark: ACCENT.dark,

  // 背景色
  background: '#FFFFFF',
  surface: '#FAFAFA',
  card: '#FFFFFF',

  // 文字色
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',

  // 边框和分割线
  border: '#E5E5E5',
  divider: '#EEEEEE',

  // 状态色
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // 其他
  placeholder: '#BBBBBB',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: PRIMARY.main,
} as const;

// ==================== 深色主题 ====================

export const DARK_THEME = {
  // 品牌色
  primary: PRIMARY.main,
  primaryLight: PRIMARY.light,
  primaryDark: PRIMARY.dark,
  accent: ACCENT.main,
  accentLight: ACCENT.light,
  accentDark: ACCENT.dark,

  // 背景色
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2C2C2C',

  // 文字色
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#808080',

  // 边框和分割线
  border: '#404040',
  divider: '#333333',

  // 状态色
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',

  // 其他
  placeholder: '#666666',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  notification: PRIMARY.main,
} as const;

// ==================== 通用颜色 ====================

export const COLORS = {
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
  primary: PRIMARY,
  accent: ACCENT,
  light: LIGHT_THEME,
  dark: DARK_THEME,
} as const;

// ==================== 聊天界面颜色 ====================

export const CHAT_COLORS = {
  // 用户消息气泡
  userBubble: PRIMARY.main,
  userBubbleText: '#FFFFFF',

  // 对方消息气泡
  otherBubble: '#F0F0F0',
  otherBubbleText: '#1A1A1A',

  // 代理消息气泡
  agentBubble: ACCENT.main + '20', // 20% 透明度
  agentBubbleText: '#1A1A1A',
  agentBubbleBorder: ACCENT.main,

  // 系统消息
  systemText: '#999999',
  systemBackground: 'transparent',

  // 输入框
  inputBackground: '#F5F5F5',
  inputText: '#1A1A1A',
  inputPlaceholder: '#999999',
} as const;

// ==================== 状态颜色 ====================

export const STATUS_COLORS = {
  online: '#4CAF50',
  offline: '#9E9E9E',
  away: '#FF9800',
  busy: '#F44336',
  typing: '#2DB5C8',
} as const;
