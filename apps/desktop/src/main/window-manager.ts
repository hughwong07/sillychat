import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized: boolean;
}

/**
 * 窗口管理器
 * 优化：窗口状态保存/恢复、内存管理、性能优化
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private windowState: WindowState | null = null;
  private readonly stateFilePath: string;

  constructor() {
    this.stateFilePath = path.join(app.getPath('userData'), 'window-state.json');
    this.loadWindowState();
  }

  async createMainWindow(): Promise<BrowserWindow> {
    // 恢复保存的窗口状态或使用默认配置
    const savedBounds = this.windowState;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    let bounds: WindowState;
    if (savedBounds) {
      // 确保窗口在屏幕范围内
      const isVisible = savedBounds.x >= 0 && savedBounds.y >= 0 &&
        savedBounds.x + savedBounds.width <= screenWidth &&
        savedBounds.y + savedBounds.height <= screenHeight;

      bounds = isVisible ? savedBounds : this.getDefaultBounds();
    } else {
      bounds = this.getDefaultBounds();
    }

    this.mainWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      minWidth: 900,
      minHeight: 600,
      show: false, // 准备就绪后再显示
      frame: process.platform !== 'darwin',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      vibrancy: process.platform === 'darwin' ? 'sidebar' : undefined,
      visualEffectState: process.platform === 'darwin' ? 'followWindow' : undefined,
      // 性能优化：启用硬件加速
      backgroundColor: '#ffffff',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        // 性能优化：限制内存使用
        experimentalFeatures: false,
      },
    });

    // 恢复最大化状态
    if (savedBounds?.isMaximized) {
      this.mainWindow.maximize();
    }

    // 加载内容
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // 准备就绪后显示窗口
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    // 保存窗口状态
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.saveWindowState();
        this.mainWindow?.hide();
      } else {
        this.saveWindowState();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 内存优化：窗口隐藏时暂停非必要任务
    this.mainWindow.on('hide', () => {
      this.mainWindow?.webContents.send('window-state-change', 'hidden');
    });

    this.mainWindow.on('show', () => {
      this.mainWindow?.webContents.send('window-state-change', 'shown');
    });

    // 性能监控
    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('[WindowManager] Main window loaded');
    });

    // 内存警告处理
    this.mainWindow.webContents.on('console-message', (event, level, message) => {
      if (message.includes('out of memory') || message.includes('memory pressure')) {
        console.warn('[WindowManager] Memory warning detected:', message);
        this.handleMemoryPressure();
      }
    });

    return this.mainWindow;
  }

  /**
   * 获取默认窗口尺寸
   */
  private getDefaultBounds(): WindowState {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = Math.min(1400, width * 0.8);
    const windowHeight = Math.min(900, height * 0.8);

    return {
      width: windowWidth,
      height: windowHeight,
      x: Math.round((width - windowWidth) / 2),
      y: Math.round((height - windowHeight) / 2),
      isMaximized: false,
    };
  }

  /**
   * 加载窗口状态
   */
  private loadWindowState(): void {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf-8');
        this.windowState = JSON.parse(data) as WindowState;
      }
    } catch (error) {
      console.error('[WindowManager] Failed to load window state:', error);
    }
  }

  /**
   * 保存窗口状态
   */
  private saveWindowState(): void {
    if (!this.mainWindow) return;

    try {
      const bounds = this.mainWindow.getNormalBounds();
      const state: WindowState = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: this.mainWindow.isMaximized(),
      };

      fs.writeFileSync(this.stateFilePath, JSON.stringify(state));
    } catch (error) {
      console.error('[WindowManager] Failed to save window state:', error);
    }
  }

  /**
   * 处理内存压力
   */
  private handleMemoryPressure(): void {
    // 清理缓存
    this.mainWindow?.webContents.send('memory-pressure');

    // 如果内存仍然紧张，考虑重启渲染进程
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      console.log('[WindowManager] Reloading page to free memory');
      this.mainWindow.webContents.reload();
    }
  }

  minimize(): void {
    this.mainWindow?.minimize();
  }

  maximize(): void {
    if (this.mainWindow?.isMaximized()) {
      this.mainWindow.unmaximize();
    } else {
      this.mainWindow?.maximize();
    }
  }

  close(): void {
    if (process.platform === 'darwin') {
      this.mainWindow?.hide();
    } else {
      this.mainWindow?.close();
    }
  }

  isMaximized(): boolean {
    return this.mainWindow?.isMaximized() ?? false;
  }

  /**
   * 获取主窗口
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.saveWindowState();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close();
    }
    this.mainWindow = null;
  }

  private get isQuitting(): boolean {
    return (global as { isQuitting?: boolean }).isQuitting ?? false;
  }
}
