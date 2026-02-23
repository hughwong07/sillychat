import fs from 'fs/promises';
import type { ConfigLoadResult, AppConfig, UserSettings, AIAgentConfig, StorageConfig, SyncConfig, SecurityConfig } from './types';
import {
  getSettingsFilePath,
  getAgentsFilePath,
  getStorageFilePath,
  getSyncFilePath,
  getSecurityFilePath,
  configFileExists,
} from './paths';

/**
 * 配置加载器
 * 负责从文件系统加载配置
 */

/**
 * 从文件加载JSON配置
 */
async function loadJsonFile<T>(filePath: string): Promise<ConfigLoadResult<T>> {
  try {
    const exists = await configFileExists(filePath);
    if (!exists) {
      return {
        success: false,
        error: `File not found: ${filePath}`,
        isDefault: true,
      };
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as T;
    return {
      success: true,
      data,
      isDefault: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      isDefault: true,
    };
  }
}

/**
 * 加载用户设置配置
 */
export async function loadUserSettings(): Promise<ConfigLoadResult<UserSettings>> {
  return loadJsonFile<UserSettings>(getSettingsFilePath());
}

/**
 * 加载AI代理配置
 */
export async function loadAgentsConfig(): Promise<ConfigLoadResult<AIAgentConfig[]>> {
  return loadJsonFile<AIAgentConfig[]>(getAgentsFilePath());
}

/**
 * 加载存储配置
 */
export async function loadStorageConfig(): Promise<ConfigLoadResult<StorageConfig>> {
  return loadJsonFile<StorageConfig>(getStorageFilePath());
}

/**
 * 加载同步配置
 */
export async function loadSyncConfig(): Promise<ConfigLoadResult<SyncConfig>> {
  return loadJsonFile<SyncConfig>(getSyncFilePath());
}

/**
 * 加载安全配置
 */
export async function loadSecurityConfig(): Promise<ConfigLoadResult<SecurityConfig>> {
  return loadJsonFile<SecurityConfig>(getSecurityFilePath());
}

/**
 * 加载完整应用配置
 * 合并所有配置文件
 */
export async function loadAppConfig(): Promise<ConfigLoadResult<AppConfig>> {
  const [
    userResult,
    agentsResult,
    storageResult,
    syncResult,
    securityResult,
  ] = await Promise.all([
    loadUserSettings(),
    loadAgentsConfig(),
    loadStorageConfig(),
    loadSyncConfig(),
    loadSecurityConfig(),
  ]);

  const errors: string[] = [];

  if (!userResult.success && !userResult.isDefault) {
    errors.push(`User settings: ${userResult.error}`);
  }
  if (!agentsResult.success && !agentsResult.isDefault) {
    errors.push(`Agents: ${agentsResult.error}`);
  }
  if (!storageResult.success && !storageResult.isDefault) {
    errors.push(`Storage: ${storageResult.error}`);
  }
  if (!syncResult.success && !syncResult.isDefault) {
    errors.push(`Sync: ${syncResult.error}`);
  }
  if (!securityResult.success && !securityResult.isDefault) {
    errors.push(`Security: ${securityResult.error}`);
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join('; '),
      isDefault: false,
    };
  }

  const config: AppConfig = {
    _version: {
      version: 1,
      updatedAt: new Date().toISOString(),
      migrationHistory: [],
    },
    user: userResult.data!,
    agents: agentsResult.data || [],
    storage: storageResult.data!,
    sync: syncResult.data!,
    security: securityResult.data!,
  };

  return {
    success: true,
    data: config,
    isDefault: userResult.isDefault,
  };
}
