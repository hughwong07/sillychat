import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { WindowManager } from './window-manager.js';
import { IPCChannels } from '../common/channels.js';
import { setupCoreIPC, initializeCore } from './core-integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

class XSGDesktopApp {
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

      this.windowManager.createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.windowManager.createMainWindow();
        }
      });
    });

    // App quit
    app.on('before-quit', () => {
      this.isQuitting = true;
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
        version: process.getSystemVersion(),
      };
    });

    // Core integration IPC
    setupCoreIPC();
  }

  private setupSecurity(): void {
    // Additional security configurations
    app.setAboutPanelOptions({
      applicationName: '小傻瓜聊天工具',
      applicationVersion: app.getVersion(),
      copyright: 'Copyright © 2026',
    });
  }
}

// Initialize app
new XSGDesktopApp();
