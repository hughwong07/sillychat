/**
 * macOS Platform Support
 * macOS 平台支持入口
 */

export { createMacOSMenu, setupMacOSMenu, setupDockMenu } from './menu.js';
export { createChatTouchBar, setupTouchBar } from './touchbar.js';
export {
  showNotification,
  showNewMessageNotification,
  showAIResponseNotification,
  requestNotificationPermission,
  setupNotifications,
} from './notifications.js';
export {
  configureMacOSWindow,
  getRecommendedWindowBounds,
  setTrafficLightPosition,
  isDarkMode,
  getAccentColor,
} from './window.js';
