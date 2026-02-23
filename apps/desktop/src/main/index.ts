import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { WindowManager } from './window-manager.js';
import { IPCChannels } from '../common/channels.js';
import { setupCoreIPC, initializeCore } from './core-integration.js';
import { configureMacOSWindow, isDarkMode, getAccentColor } from './macos/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

class SillyChatDesktopApp {
  private windowManager: WindowManager;
  private isQuitting = false;

  constructor() {
    this.windowManager = new WindowManager();
    this.initialize();
  }

  private initialize(): void {
    this.setupAppEvents();
    this.setupIPC();
    this.setupSecurity();
  }

  private setupAppEvents(): void {
    // App ready
    app.whenReady().then(async () => {
      // Initialize core modules
      try {
        await initializeCore();
        console.log('[Main] Core modules initialized');
      } catch (error) {
        console.error('[Main] Core initialization failed:', error);
      }

      const mainWindow = await this.windowManager.createMainWindow();

      // Configure macOS-specific features
      if (process.platform === 'darwin') {
        configureMacOSWindow(mainWindow, {
          onNewChat: () => mainWindow.webContents.send('menu-new-chat'),
          onOpenSettings: () => mainWindow.webContents.send('menu-open-settings'),
          onToggleAgentPanel: () => mainWindow.webContents.send('menu-toggle-agent-panel'),
          onToggleSidebar: () => mainWindow.webContents.send('menu-toggle-sidebar'),
          onSearch: () => mainWindow.webContents.send('menu-search'),
          onSendMessage: () => mainWindow.webContents.send('menu-send-message'),
        });

        // Expose macOS-specific APIs
        ipcMain.handle('macos-is-dark-mode', () => isDarkMode());
        ipcMain.handle('macos-get-accent-color', () => getAccentColor());
      }

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.windowManager.createMainWindow();
        }
      });
    });

    // App quit
    app.on('before-quit', () => {
      this.isQuitting = true;
      // Clean up IPC handlers to prevent memory leaks
      this.cleanupIPC();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      });
    });
  }

  private setupIPC(): void {
    // Window control
    ipcMain.handle(IPCChannels.WINDOW_MINIMIZE, () => {
      this.windowManager.minimize();
    });

    ipcMain.handle(IPCChannels.WINDOW_MAXIMIZE, () => {
      this.windowManager.maximize();
    });

    ipcMain.handle(IPCChannels.WINDOW_CLOSE, () => {
      this.windowManager.close();
    });

    ipcMain.handle(IPCChannels.WINDOW_IS_MAXIMIZED, () => {
      return this.windowManager.isMaximized();
    });

    // Theme
    ipcMain.handle(IPCChannels.THEME_GET, () => {
      return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    });

    ipcMain.handle(IPCChannels.THEME_SET, (_, theme: 'light' | 'dark' | 'system') => {
      nativeTheme.themeSource = theme;
    });

    // App info
    ipcMain.handle(IPCChannels.APP_GET_VERSION, () => {
      return app.getVersion();
    });

    ipcMain.handle(IPCChannels.APP_GET_PATH, (_, name: 'home' | 'appData' | 'userData' | 'cache' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs') => {
      return app.getPath(name);
    });

    // Platform info
    ipcMain.handle(IPCChannels.PLATFORM_GET, () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.platform === 'darwin' ? (process as NodeJS.Process & { getSystemVersion?(): string }).getSystemVersion?.() || '' : process.version,
      };
    });

    // Core integration IPC
    setupCoreIPC();
  }

  private cleanupIPC(): void {
    // Remove all IPC handlers to prevent memory leaks
    ipcMain.removeHandler(IPCChannels.WINDOW_MINIMIZE);
    ipcMain.removeHandler(IPCChannels.WINDOW_MAXIMIZE);
    ipcMain.removeHandler(IPCChannels.WINDOW_CLOSE);
    ipcMain.removeHandler(IPCChannels.WINDOW_IS_MAXIMIZED);
    ipcMain.removeHandler(IPCChannels.THEME_GET);
    ipcMain.removeHandler(IPCChannels.THEME_SET);
    ipcMain.removeHandler(IPCChannels.APP_GET_VERSION);
    ipcMain.removeHandler(IPCChannels.APP_GET_PATH);
    ipcMain.removeHandler(IPCChannels.PLATFORM_GET);
    ipcMain.removeHandler(IPCChannels.STORAGE_GET);
    ipcMain.removeHandler(IPCChannels.STORAGE_SET);
    ipcMain.removeHandler(IPCChannels.STORAGE_DELETE);
    ipcMain.removeHandler(IPCChannels.STORAGE_CLEAR);
    ipcMain.removeHandler(IPCChannels.XSG_INIT);
    ipcMain.removeHandler(IPCChannels.XSG_GET_GATEWAY_STATUS);
    ipcMain.removeHandler(IPCChannels.XSG_START_GATEWAY);
    ipcMain.removeHandler(IPCChannels.XSG_STOP_GATEWAY);
    ipcMain.removeHandler(IPCChannels.XSG_SEND_MESSAGE);
    if (process.platform === 'darwin') {
      ipcMain.removeHandler('macos-is-dark-mode');
      ipcMain.removeHandler('macos-get-accent-color');
    }
  }

  private setupSecurity(): void {
    // Additional security configurations
    app.setAboutPanelOptions({
      applicationName: 'SillyChat',
      applicationVersion: app.getVersion(),
      copyright: 'Copyright © 2026',
    });
  }
}

// Initialize app
new SillyChatDesktopApp();
