import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  async createMainWindow(): Promise<BrowserWindow> {
    // Use macOS recommended bounds on macOS, otherwise calculate
    let bounds;
    if (process.platform === 'darwin') {
      // Dynamic import to avoid loading macOS module on other platforms
      const { getRecommendedWindowBounds } = await import('./macos/window.js');
      bounds = getRecommendedWindowBounds();
    } else {
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      bounds = {
        width: Math.min(1400, width * 0.8),
        height: Math.min(900, height * 0.8),
        minWidth: 900,
        minHeight: 600,
      };
    }

    this.mainWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      minWidth: bounds.minWidth,
      minHeight: bounds.minHeight,
      show: false,
      frame: process.platform !== 'darwin', // macOS uses frameless with hidden titlebar
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      vibrancy: process.platform === 'darwin' ? 'sidebar' : undefined,
      visualEffectState: process.platform === 'darwin' ? 'followWindow' : undefined,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    // Load content
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window close
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
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

  private get isQuitting(): boolean {
    return (global as { isQuitting?: boolean }).isQuitting ?? false;
  }
}
