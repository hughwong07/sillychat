/**
 * macOS Touch Bar Support
 * macOS Touch Bar 支持
 */

import { TouchBar, nativeImage, BrowserWindow } from 'electron';

const { TouchBarButton, TouchBarSpacer, TouchBarPopover, TouchBarLabel } = TouchBar;

interface TouchBarCallbacks {
  onNewChat?: () => void;
  onSendMessage?: () => void;
  onToggleAgentPanel?: () => void;
  onToggleSidebar?: () => void;
  onSearch?: () => void;
}

/**
 * Create Touch Bar for chat interface
 */
export function createChatTouchBar(callbacks: TouchBarCallbacks = {}): TouchBar {
  // New Chat Button
  const newChatButton = new TouchBarButton({
    label: '💬 新建',
    backgroundColor: '#A4D037',
    click: () => callbacks.onNewChat?.(),
  });

  // Send Button
  const sendButton = new TouchBarButton({
    label: '➤ 发送',
    backgroundColor: '#2DB5C8',
    click: () => callbacks.onSendMessage?.(),
  });

  // Agent Panel Toggle
  const agentPanelButton = new TouchBarButton({
    label: '🤖 代理',
    click: () => callbacks.onToggleAgentPanel?.(),
  });

  // Search Button
  const searchButton = new TouchBarButton({
    label: '🔍 搜索',
    click: () => callbacks.onSearch?.(),
  });

  // Sidebar Toggle
  const sidebarButton = new TouchBarButton({
    label: '☰ 侧边栏',
    click: () => callbacks.onToggleSidebar?.(),
  });

  // Spacer
  const spacer = new TouchBarSpacer({ size: 'flexible' });

  // Create Touch Bar
  return new TouchBar({
    items: [
      newChatButton,
      new TouchBarSpacer({ size: 'small' }),
      sidebarButton,
      new TouchBarSpacer({ size: 'small' }),
      agentPanelButton,
      spacer,
      searchButton,
      new TouchBarSpacer({ size: 'small' }),
      sendButton,
    ],
  });
}

/**
 * Setup Touch Bar for window
 */
export function setupTouchBar(window: BrowserWindow, callbacks: TouchBarCallbacks = {}): void {
  if (process.platform !== 'darwin') return;

  const touchBar = createChatTouchBar(callbacks);
  window.setTouchBar(touchBar);
}

/**
 * Update Touch Bar based on app state
 */
export function updateTouchBarState(
  window: BrowserWindow,
  state: {
    hasInput?: boolean;
    isAgentPanelOpen?: boolean;
    isSidebarOpen?: boolean;
  }
): void {
  if (process.platform !== 'darwin') return;

  // Touch Bar will be recreated when state changes
  // In a real implementation, you'd update specific items
}
