/**
 * macOS Notifications
 * macOS 通知中心集成
 */

import { Notification, BrowserWindow, app } from 'electron';

interface NotificationOptions {
  title: string;
  body: string;
  subtitle?: string;
  icon?: string;
  silent?: boolean;
  hasReply?: boolean;
  replyPlaceholder?: string;
  actions?: Array<{
    type: 'button';
    text: string;
  }>;
}

/**
 * Show native macOS notification
 */
export function showNotification(
  options: NotificationOptions,
  callbacks?: {
    onClick?: () => void;
    onReply?: (reply: string) => void;
    onAction?: (index: number) => void;
  }
): Notification | null {
  if (process.platform !== 'darwin') return null;

  // Check notification permission
  if (!Notification.isSupported()) {
    console.warn('[macOS] Notifications not supported');
    return null;
  }

  const notification = new Notification({
    title: options.title,
    subtitle: options.subtitle,
    body: options.body,
    silent: options.silent ?? false,
    hasReply: options.hasReply ?? false,
    replyPlaceholder: options.replyPlaceholder ?? '回复...',
    actions: options.actions,
  });

  notification.on('click', () => {
    callbacks?.onClick?.();
  });

  notification.on('reply', (_, reply) => {
    callbacks?.onReply?.(reply);
  });

  notification.on('action', (_, index) => {
    callbacks?.onAction?.(index);
  });

  notification.show();
  return notification;
}

/**
 * Show new message notification
 */
export function showNewMessageNotification(
  senderName: string,
  message: string,
  onClick?: () => void
): void {
  showNotification(
    {
      title: '新消息',
      subtitle: `来自 ${senderName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      hasReply: true,
      replyPlaceholder: '快速回复...',
    },
    {
      onClick,
      onReply: (reply) => {
        console.log('[Notification] Quick reply:', reply);
        // Handle quick reply
      },
    }
  );
}

/**
 * Show AI response notification
 */
export function showAIResponseNotification(
  agentName: string,
  response: string,
  onClick?: () => void
): void {
  showNotification(
    {
      title: `${agentName} 回复`,
      body: response.length > 150 ? response.substring(0, 150) + '...' : response,
      silent: true, // AI responses are usually silent
    },
    {
      onClick,
    }
  );
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') return false;

  // On macOS, notification permission is handled by the system
  // We just need to check if notifications are supported
  return Notification.isSupported();
}

/**
 * Setup notification handlers
 */
export function setupNotifications(window: BrowserWindow): void {
  if (process.platform !== 'darwin') return;

  // Handle notification click to focus window
  app.on('activate', () => {
    if (window.isMinimized()) {
      window.restore();
    }
    window.focus();
  });
}
