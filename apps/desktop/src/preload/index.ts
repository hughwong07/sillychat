import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPCChannels } from '../common/channels.js';

// Window API
const windowAPI = {
  minimize: () => ipcRenderer.invoke(IPCChannels.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IPCChannels.WINDOW_MAXIMIZE),
  close: () => ipcRenderer.invoke(IPCChannels.WINDOW_CLOSE),
  isMaximized: () => ipcRenderer.invoke(IPCChannels.WINDOW_IS_MAXIMIZED),
};

// Theme API
const themeAPI = {
  get: () => ipcRenderer.invoke(IPCChannels.THEME_GET),
  set: (theme: 'light' | 'dark' | 'system') => ipcRenderer.invoke(IPCChannels.THEME_SET, theme),
  onChanged: (callback: (theme: 'light' | 'dark') => void) => {
    const handler = (_: IpcRendererEvent, theme: 'light' | 'dark') => callback(theme);
    ipcRenderer.on(IPCChannels.THEME_CHANGED, handler);
    return () => ipcRenderer.off(IPCChannels.THEME_CHANGED, handler);
  },
};

// App API
const appAPI = {
  getVersion: () => ipcRenderer.invoke(IPCChannels.APP_GET_VERSION),
  getPath: (name: Parameters<typeof ipcRenderer.invoke>[1]) => ipcRenderer.invoke(IPCChannels.APP_GET_PATH, name),
};

// Platform API
const platformAPI = {
  get: () => ipcRenderer.invoke(IPCChannels.PLATFORM_GET),
};

// Storage API
const storageAPI = {
  get: (key: string) => ipcRenderer.invoke(IPCChannels.STORAGE_GET, key),
  set: (key: string, value: unknown) => ipcRenderer.invoke(IPCChannels.STORAGE_SET, key, value),
  delete: (key: string) => ipcRenderer.invoke(IPCChannels.STORAGE_DELETE, key),
  clear: () => ipcRenderer.invoke(IPCChannels.STORAGE_CLEAR),
};

// XSG Core API
const xsgAPI = {
  init: () => ipcRenderer.invoke(IPCChannels.XSG_INIT),
  getGatewayStatus: () => ipcRenderer.invoke(IPCChannels.XSG_GET_GATEWAY_STATUS),
  startGateway: () => ipcRenderer.invoke(IPCChannels.XSG_START_GATEWAY),
  stopGateway: () => ipcRenderer.invoke(IPCChannels.XSG_STOP_GATEWAY),
  sendMessage: (message: unknown) => ipcRenderer.invoke(IPCChannels.XSG_SEND_MESSAGE, message),
  onMessage: (callback: (message: unknown) => void) => {
    const handler = (_: IpcRendererEvent, message: unknown) => callback(message);
    ipcRenderer.on(IPCChannels.XSG_ON_MESSAGE, handler);
    return () => ipcRenderer.off(IPCChannels.XSG_ON_MESSAGE, handler);
  },
};

// macOS API
const macosAPI = {
  isDarkMode: () => ipcRenderer.invoke('macos-is-dark-mode'),
  getAccentColor: () => ipcRenderer.invoke('macos-get-accent-color'),
  onMenuAction: (callback: (action: string) => void) => {
    // Create separate handlers for each event
    const handlers: Record<string, (event: IpcRendererEvent, ...args: unknown[]) => void> = {
      'menu-new-chat': () => callback('new-chat'),
      'menu-open-settings': () => callback('open-settings'),
      'menu-toggle-agent-panel': () => callback('toggle-agent-panel'),
      'menu-toggle-sidebar': () => callback('toggle-sidebar'),
      'menu-search': () => callback('search'),
      'menu-send-message': () => callback('send-message'),
      'fullscreen-change': (_, state: boolean) => callback(`fullscreen:${state}`),
      'system-theme-changed': (_, theme: string) => callback(`theme:${theme}`),
    };

    // Register all handlers
    Object.entries(handlers).forEach(([channel, handler]) => {
      ipcRenderer.on(channel, handler);
    });

    // Return cleanup function
    return () => {
      Object.entries(handlers).forEach(([channel, handler]) => {
        ipcRenderer.off(channel, handler);
      });
    };
  },
};

// Build API object
const api = {
  window: windowAPI,
  theme: themeAPI,
  app: appAPI,
  platform: platformAPI,
  storage: storageAPI,
  xsg: xsgAPI,
};

// Only expose macOS API on macOS platform
if (process.platform === 'darwin') {
  (api as typeof api & { macos: typeof macosAPI }).macos = macosAPI;
}

// Expose APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', api);

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: {
      window: typeof windowAPI;
      theme: typeof themeAPI;
      app: typeof appAPI;
      platform: typeof platformAPI;
      storage: typeof storageAPI;
      xsg: typeof xsgAPI;
      macos?: typeof macosAPI;
    };
  }
}
