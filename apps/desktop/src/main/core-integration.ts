/**
 * XSG Core Integration Module
 * 主进程与核心引擎集成模块
 */

import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { IPCChannels } from '../common/channels.js';
import { getConfigManager } from '../../../src/core/config/manager.js';
import { StorageManager } from '../../../src/core/storage/manager.js';

// Validation helpers
function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && key.length < 256;
}

function isValidPort(port: unknown): port is number {
  return typeof port === 'number' && Number.isInteger(port) && port > 0 && port < 65536;
}

function isValidMessage(message: unknown): message is Record<string, unknown> {
  return message !== null && typeof message === 'object';
}

// Core singleton instances
let storageManager: StorageManager | null = null;

/**
 * Initialize core modules
 */
export async function initializeCore(): Promise<void> {
  try {
    // Initialize config
    const configManager = getConfigManager();
    await configManager.initialize();

    // Initialize storage
    storageManager = new StorageManager();
    await storageManager.initialize();

    console.log('[Core] Core modules initialized');
  } catch (error) {
    console.error('[Core] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Setup core-related IPC handlers
 */
export function setupCoreIPC(): void {
  // Initialize core when requested
  ipcMain.handle(IPCChannels.XSG_INIT, async () => {
    try {
      await initializeCore();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  });

  // Storage operations
  ipcMain.handle(IPCChannels.STORAGE_GET, async (_event: IpcMainInvokeEvent, key: string) => {
    try {
      if (!isValidKey(key)) {
        return { success: false, error: 'Invalid key format' };
      }
      // Use electron-store or similar for now
      // Full storage manager integration will be implemented
      return { success: true, data: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage get failed'
      };
    }
  });

  ipcMain.handle(IPCChannels.STORAGE_SET, async (_event: IpcMainInvokeEvent, key: string, value: unknown) => {
    try {
      if (!isValidKey(key)) {
        return { success: false, error: 'Invalid key format' };
      }
      // Validate value size (limit to 10MB)
      const valueStr = JSON.stringify(value);
      if (valueStr.length > 10 * 1024 * 1024) {
        return { success: false, error: 'Value too large (max 10MB)' };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage set failed'
      };
    }
  });

  ipcMain.handle(IPCChannels.STORAGE_DELETE, async (_event: IpcMainInvokeEvent, key: string) => {
    try {
      if (!isValidKey(key)) {
        return { success: false, error: 'Invalid key format' };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage delete failed'
      };
    }
  });

  ipcMain.handle(IPCChannels.STORAGE_CLEAR, async () => {
    try {
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage clear failed'
      };
    }
  });

  // Gateway status (placeholder for full implementation)
  ipcMain.handle(IPCChannels.XSG_GET_GATEWAY_STATUS, () => {
    return {
      running: false,
      port: 0,
      connections: 0
    };
  });

  ipcMain.handle(IPCChannels.XSG_START_GATEWAY, async (_event: IpcMainInvokeEvent, port?: number) => {
    try {
      // Validate port if provided
      if (port !== undefined && !isValidPort(port)) {
        return { success: false, error: 'Invalid port number (must be 1-65535)' };
      }
      // Full implementation will integrate with GatewayServer
      return { success: true, port: port || 8080 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start gateway'
      };
    }
  });

  ipcMain.handle(IPCChannels.XSG_STOP_GATEWAY, async () => {
    try {
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop gateway'
      };
    }
  });

  // Message handling
  ipcMain.handle(IPCChannels.XSG_SEND_MESSAGE, async (_event: IpcMainInvokeEvent, message: unknown) => {
    try {
      // Validate message
      if (!isValidMessage(message)) {
        return { success: false, error: 'Invalid message format' };
      }
      // Broadcast to all renderer windows
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        window.webContents.send(IPCChannels.XSG_ON_MESSAGE, message);
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  });
}

/**
 * Get storage manager instance
 */
export function getStorageManager(): StorageManager | null {
  return storageManager;
}
