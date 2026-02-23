import path from 'path';
import os from 'os';
import fs from 'fs/promises';

/**
 * 配置路径管理
 * 管理所有配置文件和目录的路径
 */

const CONFIG_DIR_NAME = '.silly';
const CONFIG_SUBDIR = 'config';

/**
 * 获取配置根目录
 * 返回 ~/.silly/
 */
export function getConfigRootDir(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

/**
 * 获取配置文件目录
 * 返回 ~/.silly/config/
 */
export function getConfigDir(): string {
  return path.join(getConfigRootDir(), CONFIG_SUBDIR);
}

/**
 * 获取主配置文件路径
 * 返回 ~/.silly/config/settings.json
 */
export function getSettingsFilePath(): string {
  return path.join(getConfigDir(), 'settings.json');
}

/**
 * 获取AI代理配置文件路径
 * 返回 ~/.silly/config/agents.json
 */
export function getAgentsFilePath(): string {
  return path.join(getConfigDir(), 'agents.json');
}

/**
 * 获取存储配置文件路径
 * 返回 ~/.silly/config/storage.json
 */
export function getStorageFilePath(): string {
  return path.join(getConfigDir(), 'storage.json');
}

/**
 * 获取同步配置文件路径
 * 返回 ~/.silly/config/sync.json
 */
export function getSyncFilePath(): string {
  return path.join(getConfigDir(), 'sync.json');
}

/**
 * 获取安全配置文件路径
 * 返回 ~/.silly/config/security.json
 */
export function getSecurityFilePath(): string {
  return path.join(getConfigDir(), 'security.json');
}

/**
 * 获取数据目录路径
 * 返回 ~/.silly/data/
 */
export function getDataDir(): string {
  return path.join(getConfigRootDir(), 'data');
}

/**
 * 获取数据库文件路径
 * 返回 ~/.silly/data/silly.db
 */
export function getDatabasePath(): string {
  return path.join(getDataDir(), 'silly.db');
}

/**
 * 获取文件存储目录路径
 * 返回 ~/.silly/data/files/
 */
export function getFilesDir(): string {
  return path.join(getDataDir(), 'files');
}

/**
 * 获取缓存目录路径
 * 返回 ~/.silly/data/cache/
 */
export function getCacheDir(): string {
  return path.join(getDataDir(), 'cache');
}

/**
 * 获取日志目录路径
 * 返回 ~/.silly/logs/
 */
export function getLogsDir(): string {
  return path.join(getConfigRootDir(), 'logs');
}

/**
 * 获取备份目录路径
 * 返回 ~/.silly/backups/
 */
export function getBackupsDir(): string {
  return path.join(getConfigRootDir(), 'backups');
}

/**
 * 获取锁文件路径
 * 返回 ~/.silly/lock/silly.lock
 */
export function getLockFilePath(): string {
  return path.join(getConfigRootDir(), 'lock', 'silly.lock');
}

/**
 * 确保配置目录存在
 * 如果不存在则创建
 */
export async function ensureConfigDirs(): Promise<void> {
  const dirs = [
    getConfigRootDir(),
    getConfigDir(),
    getDataDir(),
    getFilesDir(),
    getCacheDir(),
    getLogsDir(),
    getBackupsDir(),
    path.join(getConfigRootDir(), 'lock'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * 获取所有配置文件路径
 */
export function getAllConfigPaths(): string[] {
  return [
    getSettingsFilePath(),
    getAgentsFilePath(),
    getStorageFilePath(),
    getSyncFilePath(),
    getSecurityFilePath(),
  ];
}

/**
 * 检查配置文件是否存在
 */
export async function configFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
