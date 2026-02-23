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

// Expose APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  window: windowAPI,
  theme: themeAPI,
  app: appAPI,
  platform: platformAPI,
  storage: storageAPI,
  xsg: xsgAPI,
});

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
    };
  }
}
