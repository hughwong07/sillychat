# Desktop API 文档 (Electron)

SillyChat Electron SDK API 文档。

## 快速开始

### 安装

```bash
npm install @sillychat/desktop
# 或
yarn add @sillychat/desktop
```

### 主进程配置

```typescript
// src/main/index.ts
import { SillyChatDesktop } from '@sillychat/desktop/main';

const app = new SillyChatDesktop({
  config: {
    apiKey: 'your-api-key',
    baseURL: 'https://api.sillychat.io',
    dataPath: app.getPath('userData'),
  },
  window: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS
  },
  features: {
    enableTouchBar: true,
    enableMenuBar: true,
    enableNotifications: true,
    enableAutoUpdater: true,
  },
});

app.start();
```

### 渲染进程配置

```typescript
// src/renderer/main.tsx
import { SillyChatRenderer } from '@sillychat/desktop/renderer';

const client = new SillyChatRenderer({
  ipcRenderer: window.electron.ipcRenderer,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SillyChatProvider client={client}>
    <App />
  </SillyChatProvider>
);
```

## 主进程 API

### SillyChatDesktop

主应用类。

```typescript
class SillyChatDesktop {
  constructor(options: DesktopOptions);

  // 生命周期
  async start(): Promise<void>;
  async quit(): Promise<void>;

  // 窗口管理
  createWindow(options?: WindowOptions): BrowserWindow;
  getMainWindow(): BrowserWindow | null;
  closeWindow(windowId?: number): void;

  // 菜单
  setMenu(template: MenuTemplate): void;
  updateMenu(id: string, updates: Partial<MenuItem>): void;

  // 托盘
  createTray(icon: string, menu: MenuTemplate): Tray;
  updateTrayMenu(menu: MenuTemplate): void;

  // 通知
  showNotification(options: NotificationOptions): void;

  // 自动更新
  checkForUpdates(): Promise<UpdateInfo>;
  downloadUpdate(): Promise<void>;
  installUpdate(): void;
}
```

#### 使用示例

```typescript
import { SillyChatDesktop, MenuTemplate } from '@sillychat/desktop/main';

const app = new SillyChatDesktop({
  config: { /* ... */ },
  window: { /* ... */ },
});

// 自定义菜单
const menuTemplate: MenuTemplate = [
  {
    label: '文件',
    submenu: [
      {
        label: '新建对话',
        accelerator: 'CmdOrCtrl+N',
        click: () => app.createNewConversation(),
      },
      { type: 'separator' },
      {
        label: '退出',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit(),
      },
    ],
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ],
  },
];

app.setMenu(menuTemplate);

// 系统托盘
const trayMenu: MenuTemplate = [
  {
    label: '显示主窗口',
    click: () => app.getMainWindow()?.show(),
  },
  { type: 'separator' },
  {
    label: '退出',
    click: () => app.quit(),
  },
];

app.createTray('assets/tray-icon.png', trayMenu);

// 启动
app.start();
```

### WindowManager

窗口管理。

```typescript
class WindowManager {
  // 创建窗口
  createMainWindow(): BrowserWindow;
  createChildWindow(options: WindowOptions): BrowserWindow;

  // 窗口操作
  minimize(windowId?: number): void;
  maximize(windowId?: number): void;
  close(windowId?: number): void;
  isMaximized(windowId?: number): boolean;

  // 窗口状态
  saveWindowState(): void;
  restoreWindowState(): WindowState;
}
```

### CoreIntegration

与核心引擎集成。

```typescript
import { setupCoreIPC, initializeCore } from '@sillychat/desktop/main';

// 初始化核心
await initializeCore({
  dataPath: app.getPath('userData'),
  gatewayPort: 8080,
});

// 设置 IPC 处理器
setupCoreIPC();
```

### IPC Channels

预定义的 IPC 通道。

```typescript
enum IPCChannels {
  // 窗口控制
  WINDOW_MINIMIZE = 'window-minimize',
  WINDOW_MAXIMIZE = 'window-maximize',
  WINDOW_CLOSE = 'window-close',
  WINDOW_IS_MAXIMIZED = 'window-is-maximized',

  // 主题
  THEME_GET = 'theme-get',
  THEME_SET = 'theme-set',

  // 应用信息
  APP_GET_VERSION = 'app-get-version',
  APP_GET_PATH = 'app-get-path',

  // 平台信息
  PLATFORM_GET = 'platform-get',

  // 存储
  STORAGE_GET = 'storage-get',
  STORAGE_SET = 'storage-set',
  STORAGE_DELETE = 'storage-delete',
  STORAGE_CLEAR = 'storage-clear',

  // XSG 核心
  XSG_INIT = 'xsg-init',
  XSG_GET_GATEWAY_STATUS = 'xsg-get-gateway-status',
  XSG_START_GATEWAY = 'xsg-start-gateway',
  XSG_STOP_GATEWAY = 'xsg-stop-gateway',
  XSG_SEND_MESSAGE = 'xsg-send-message',
}
```

## 渲染进程 API

### SillyChatRenderer

渲染进程客户端。

```typescript
class SillyChatRenderer {
  constructor(options: RendererOptions);

  // 窗口控制
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;

  // 主题
  getTheme(): Promise<'light' | 'dark'>;
  setTheme(theme: 'light' | 'dark' | 'system'): Promise<void>;

  // 应用信息
  getVersion(): Promise<string>;
  getPath(name: AppPath): Promise<string>;

  // 平台信息
  getPlatform(): Promise<PlatformInfo>;

  // 存储
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;

  // XSG 核心
  initCore(): Promise<void>;
  getGatewayStatus(): Promise<GatewayStatus>;
  startGateway(): Promise<void>;
  stopGateway(): Promise<void>;
  sendMessage(message: XSGMessage): Promise<void>;
}
```

#### 使用示例

```typescript
import { SillyChatRenderer } from '@sillychat/desktop/renderer';

const client = new SillyChatRenderer({
  ipcRenderer: window.electron.ipcRenderer,
});

// 窗口控制
const handleMinimize = () => client.minimize();
const handleMaximize = async () => {
  const isMaximized = await client.isMaximized();
  if (isMaximized) {
    // 恢复窗口
  } else {
    await client.maximize();
  }
};

// 主题
const currentTheme = await client.getTheme();
await client.setTheme('dark');

// 存储
await client.setItem('user-preferences', JSON.stringify(prefs));
const saved = await client.getItem('user-preferences');
```

### Hooks

#### useDesktop

```typescript
import { useDesktop } from '@sillychat/desktop/renderer';

function TitleBar() {
  const { minimize, maximize, close, isMaximized } = useDesktop();

  return (
    <div className="title-bar">
      <button onClick={minimize}>−</button>
      <button onClick={maximize}>{isMaximized ? '□' : '▢'}</button>
      <button onClick={close}>×</button>
    </div>
  );
}
```

#### useTheme

```typescript
import { useTheme } from '@sillychat/desktop/renderer';

function App() {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <div className={isDark ? 'dark' : 'light'}>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
        <option value="system">跟随系统</option>
      </select>
    </div>
  );
}
```

#### useStorage

```typescript
import { useStorage } from '@sillychat/desktop/renderer';

function Settings() {
  const [apiKey, setApiKey] = useStorage('apiKey', '');
  const [theme, setTheme] = useStorage('theme', 'system');

  return (
    <div>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />
    </div>
  );
}
```

## macOS 特定 API

### TouchBar

```typescript
import { TouchBar } from '@sillychat/desktop/main/macos';

const touchBar = new TouchBar({
  items: [
    new TouchBarButton({
      label: '新对话',
      backgroundColor: '#007AFF',
      click: () => createNewConversation(),
    }),
    new TouchBarSpacer({ size: 'small' }),
    new TouchBarPopover({
      label: '代理',
      items: agentButtons,
    }),
  ],
});

mainWindow.setTouchBar(touchBar);
```

### 菜单栏扩展

```typescript
import { MenuBar } from '@sillychat/desktop/main/macos';

const menuBar = new MenuBar({
  icon: 'assets/menubar-icon.png',
  menu: [
    {
      label: '快速发送',
      submenu: [
        {
          label: '总结选中文本',
          click: () => summarizeSelectedText(),
        },
      ],
    },
  ],
});
```

## Windows 特定 API

### 任务栏缩略图

```typescript
import { Taskbar } from '@sillychat/desktop/main/windows';

Taskbar.setThumbnailClip(window, {
  x: 0,
  y: 0,
  width: 200,
  height: 150,
});

Taskbar.setThumbnailTooltip(window, 'SillyChat - AI助手');
```

### 跳转列表

```typescript
import { JumpList } from '@sillychat/desktop/main/windows';

JumpList.setCategories([
  {
    type: 'tasks',
    items: [
      {
        type: 'task',
        title: '新对话',
        program: process.execPath,
        args: '--new-conversation',
        iconPath: process.execPath,
        iconIndex: 0,
      },
    ],
  },
]);
```

## Linux 特定 API

### AppIndicator

```typescript
import { AppIndicator } from '@sillychat/desktop/main/linux';

const indicator = new AppIndicator({
  icon: 'sillychat-indicator',
  menu: [
    { label: '显示', click: () => showWindow() },
    { label: '退出', click: () => quit() },
  ],
});
```

## 自动更新

```typescript
import { AutoUpdater } from '@sillychat/desktop/main';

const updater = new AutoUpdater({
  url: 'https://updates.sillychat.io',
  channel: 'stable',
});

// 检查更新
const updateInfo = await updater.checkForUpdates();
if (updateInfo.hasUpdate) {
  console.log(`新版本可用: ${updateInfo.version}`);
}

// 下载并安装
await updater.downloadUpdate();
updater.installUpdate();

// 事件监听
updater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: '更新可用',
    message: `新版本 ${info.version} 可用，是否下载？`,
    buttons: ['下载', '稍后'],
  });
});

updater.on('download-progress', (progress) => {
  console.log(`下载进度: ${progress.percent}%`);
});

updater.on('update-downloaded', () => {
  updater.installUpdate();
});
```

## 通知

```typescript
import { Notification } from '@sillychat/desktop/main';

// 显示通知
Notification.show({
  title: '新消息',
  body: 'AI助手: 你好！有什么可以帮助你的吗？',
  icon: 'assets/icon.png',
  sound: true,
  actions: [
    {
      type: 'button',
      text: '回复',
    },
  ],
});

// 点击通知
Notification.on('click', (notification) => {
  mainWindow.show();
  navigateToConversation(notification.data.conversationId);
});
```

## 对话框

```typescript
import { Dialog } from '@sillychat/desktop/main';

// 文件选择
const result = await Dialog.showOpenDialog({
  properties: ['openFile', 'multiSelections'],
  filters: [
    { name: '图片', extensions: ['jpg', 'png', 'gif'] },
    { name: '文档', extensions: ['pdf', 'doc', 'docx'] },
  ],
});

if (!result.canceled) {
  console.log('Selected:', result.filePaths);
}

// 保存文件
const saveResult = await Dialog.showSaveDialog({
  defaultPath: 'conversation.json',
  filters: [
    { name: 'JSON', extensions: ['json'] },
  ],
});

// 消息框
const response = await Dialog.showMessageBox({
  type: 'question',
  buttons: ['保存', '不保存', '取消'],
  defaultId: 0,
  title: '确认',
  message: '是否保存更改？',
});
```

## 剪贴板

```typescript
import { Clipboard } from '@sillychat/desktop/main';

// 写入文本
Clipboard.writeText('Hello World');

// 读取文本
const text = Clipboard.readText();

// 写入图片
Clipboard.writeImage(nativeImage.createFromPath('image.png'));

// 读取 HTML
const html = Clipboard.readHTML();

// 清空
Clipboard.clear();
```

## 原生菜单

```typescript
import { ContextMenu } from '@sillychat/desktop/main';

// 右键菜单
const menu = new ContextMenu([
  { label: '复制', role: 'copy' },
  { label: '粘贴', role: 'paste' },
  { type: 'separator' },
  {
    label: '更多',
    submenu: [
      { label: '选项 1', click: () => {} },
      { label: '选项 2', click: () => {} },
    ],
  },
]);

menu.popup({ window: mainWindow, x: 100, y: 100 });
```

## 最佳实践

### 1. 安全最佳实践

```typescript
// 启用上下文隔离
const window = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    preload: path.join(__dirname, 'preload.js'),
  },
});

// preload.js
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, callback) => ipcRenderer.on(channel, callback),
  },
});
```

### 2. 性能优化

```typescript
// 窗口状态恢复
const windowState = store.get('windowState', {
  width: 1200,
  height: 800,
});

const mainWindow = new BrowserWindow({
  width: windowState.width,
  height: windowState.height,
  x: windowState.x,
  y: windowState.y,
});

mainWindow.on('close', () => {
  store.set('windowState', mainWindow.getBounds());
});

// 内存管理
app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});
```

### 3. 单实例应用

```typescript
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_, argv) => {
    // 用户尝试打开第二个实例
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
```

---

*更多示例请参考 [Desktop 示例项目](../../examples/desktop-sample/)*
