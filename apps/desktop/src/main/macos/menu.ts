/**
 * macOS Native Menu
 * macOS 原生应用菜单
 */

import { Menu, MenuItem, app, shell, dialog } from 'electron';
import type { BrowserWindow } from 'electron';

interface MenuCallbacks {
  onNewChat?: () => void;
  onOpenSettings?: () => void;
  onToggleAgentPanel?: () => void;
  onToggleSidebar?: () => void;
  onSearch?: () => void;
}

/**
 * Create macOS application menu
 */
export function createMacOSMenu(window: BrowserWindow, callbacks: MenuCallbacks = {}): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu
    {
      label: app.getName(),
      submenu: [
        {
          label: '关于 SillyChat',
          role: 'about',
        },
        { type: 'separator' },
        {
          label: '偏好设置...',
          accelerator: 'Cmd+,',
          click: () => callbacks.onOpenSettings?.(),
        },
        { type: 'separator' },
        {
          label: '隐藏',
          role: 'hide',
        },
        {
          label: '隐藏其他',
          role: 'hideOthers',
        },
        {
          label: '显示全部',
          role: 'unhide',
        },
        { type: 'separator' },
        {
          label: '退出',
          role: 'quit',
          accelerator: 'Cmd+Q',
        },
      ],
    },

    // File Menu
    {
      label: '文件',
      submenu: [
        {
          label: '新建对话',
          accelerator: 'Cmd+N',
          click: () => callbacks.onNewChat?.(),
        },
        { type: 'separator' },
        {
          label: '关闭窗口',
          role: 'close',
          accelerator: 'Cmd+W',
        },
      ],
    },

    // Edit Menu
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
        { type: 'separator' },
        {
          label: '搜索',
          accelerator: 'Cmd+F',
          click: () => callbacks.onSearch?.(),
        },
      ],
    },

    // View Menu
    {
      label: '视图',
      submenu: [
        {
          label: '重新加载',
          role: 'reload',
          accelerator: 'Cmd+R',
        },
        {
          label: '强制刷新',
          role: 'forceReload',
          accelerator: 'Cmd+Shift+R',
        },
        {
          label: '开发者工具',
          role: 'toggleDevTools',
          accelerator: 'Cmd+Option+I',
        },
        { type: 'separator' },
        {
          label: '实际大小',
          role: 'resetZoom',
          accelerator: 'Cmd+0',
        },
        {
          label: '放大',
          role: 'zoomIn',
          accelerator: 'Cmd+Plus',
        },
        {
          label: '缩小',
          role: 'zoomOut',
          accelerator: 'Cmd+-',
        },
        { type: 'separator' },
        {
          label: '切换全屏',
          role: 'togglefullscreen',
          accelerator: 'Ctrl+Cmd+F',
        },
      ],
    },

    // Window Menu
    {
      label: '窗口',
      submenu: [
        {
          label: '最小化',
          role: 'minimize',
          accelerator: 'Cmd+M',
        },
        {
          label: '缩放',
          role: 'zoom',
        },
        { type: 'separator' },
        {
          label: '显示侧边栏',
          accelerator: 'Cmd+B',
          click: () => callbacks.onToggleSidebar?.(),
        },
        {
          label: '显示代理面板',
          accelerator: 'Cmd+J',
          click: () => callbacks.onToggleAgentPanel?.(),
        },
        { type: 'separator' },
        {
          label: '前置全部窗口',
          role: 'front',
        },
      ],
    },

    // Help Menu
    {
      label: '帮助',
      submenu: [
        {
          label: 'SillyChat 官网',
          click: async () => {
            await shell.openExternal('https://github.com/hughwong07/sillychat');
          },
        },
        {
          label: '问题反馈',
          click: async () => {
            await shell.openExternal('https://github.com/hughwong07/sillychat/issues');
          },
        },
        { type: 'separator' },
        {
          label: '键盘快捷键',
          accelerator: 'Cmd+/',
          click: () => {
            dialog.showMessageBox(window, {
              type: 'info',
              title: '键盘快捷键',
              message: '常用快捷键',
              detail: `
新建对话: Cmd+N
搜索: Cmd+F
偏好设置: Cmd+,
显示侧边栏: Cmd+B
显示代理面板: Cmd+J
全屏: Ctrl+Cmd+F
              `.trim(),
            });
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

/**
 * Setup macOS dock menu
 */
export function setupDockMenu(callbacks: MenuCallbacks = {}): void {
  if (process.platform !== 'darwin') return;

  const dockMenu = Menu.buildFromTemplate([
    {
      label: '新建对话',
      click: () => callbacks.onNewChat?.(),
    },
    {
      label: '打开设置',
      click: () => callbacks.onOpenSettings?.(),
    },
  ]);

  app.dock.setMenu(dockMenu);
}

/**
 * Setup macOS-specific menu handlers
 */
export function setupMacOSMenu(window: BrowserWindow, callbacks: MenuCallbacks = {}): void {
  if (process.platform !== 'darwin') return;

  const menu = createMacOSMenu(window, callbacks);
  Menu.setApplicationMenu(menu);

  setupDockMenu(callbacks);
}
