import fs from 'fs/promises';
import { EventEmitter } from 'events';
import type { AppConfig, UserSettings, AIAgentConfig, StorageConfig, SyncConfig, SecurityConfig, ConfigChangeEvent, ConfigChangeListener, ConfigValidationResult } from './types';
import { validateUserSettings, validateAIAgentConfig, validateStorageConfig, validateSyncConfig, validateSecurityConfig } from './schema';
import { getSettingsFilePath, getAgentsFilePath, getStorageFilePath, getSyncFilePath, getSecurityFilePath, ensureConfigDirs } from './paths';
import { loadAppConfig } from './loader';

export class ConfigManager extends EventEmitter {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;
  private configListeners: Map<string, Set<ConfigChangeListener<unknown>>> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async initialize(): Promise<void> {
    await ensureConfigDirs();
    const result = await loadAppConfig();
    if (result.success && result.data) {
      this.config = result.data;
    } else {
      this.config = this.createDefaultConfig();
      await this.saveAll();
    }
  }

  private createDefaultConfig(): AppConfig {
    const now = new Date().toISOString();
    return {
      _version: { version: 1, updatedAt: now, migrationHistory: [] },
      user: {
        ui: { theme: 'system', language: 'zh-CN', fontSize: 14, zoomLevel: 1, sidebarWidth: 250, showAvatars: true, showTimestamps: true, compactMode: false, enableAnimations: true, alwaysOnTop: false, minimizeToTray: true, minimizeOnClose: true },
        notifications: { level: 'all', desktopNotifications: true, soundEnabled: true, soundType: 'default', dndStartTime: null, dndEndTime: null, messagePreview: true },
        shortcuts: { sendMessage: 'Enter', newConversation: 'Ctrl+N', search: 'Ctrl+K', toggleSidebar: 'Ctrl+B', fullscreen: 'F11', quickScreenshot: 'Ctrl+Shift+S' },
        updatedAt: now
      },
      agents: [],
      storage: {
        local: { dataPath: '', dbPath: '', filesPath: '', cachePath: '', logsPath: '', maxDbSize: 100, maxFilesSize: 10, maxCacheSize: 500, cleanupThreshold: 0.9 },
        cloudProviders: []
      },
      sync: {
        enabled: false, defaultMode: 'manual', defaultInterval: 30,
        items: [
          { entityType: 'settings', enabled: true, conflictResolution: 'newest', excludePatterns: [] },
          { entityType: 'agents', enabled: true, conflictResolution: 'newest', excludePatterns: [] },
          { entityType: 'conversation', enabled: true, conflictResolution: 'newest', excludePatterns: [] },
          { entityType: 'message', enabled: true, conflictResolution: 'newest', excludePatterns: [] },
          { entityType: 'blob', enabled: false, conflictResolution: 'manual', excludePatterns: [] }
        ],
        wifiOnly: false, chargingOnly: false, batteryThreshold: 20, retryCount: 3, retryInterval: 5
      },
      security: {
        encryption: { level: 'local', storageAlgorithm: 'AES-256-GCM', keyDerivation: 'Argon2id', autoLockTimeout: 30, requirePasswordOnStartup: false, enableBiometric: false },
        privacy: { sendAnalytics: false, autoCheckUpdates: true, messageRetentionDays: 0, autoDeleteArchived: false, clipboardAccess: true, screenCaptureAccess: false },
        trustedDevices: []
      }
    };
  }

  public getConfig(): AppConfig {
    if (!this.config) throw new Error('ConfigManager not initialized');
    return this.config;
  }

  public getUserSettings(): UserSettings { return this.getConfig().user; }
  public getAgents(): AIAgentConfig[] { return this.getConfig().agents; }
  public getStorageConfig(): StorageConfig { return this.getConfig().storage; }
  public getSyncConfig(): SyncConfig { return this.getConfig().sync; }
  public getSecurityConfig(): SecurityConfig { return this.getConfig().security; }

  public async updateUserSettings(settings: Partial<UserSettings>): Promise<ConfigValidationResult> {
    const newSettings = { ...this.getUserSettings(), ...settings, updatedAt: new Date().toISOString() };
    const validation = validateUserSettings(newSettings);
    if (!validation.success) {
      return { valid: false, errors: validation.error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message, code: e.code })) };
    }
    const oldValue = this.config!.user;
    this.config!.user = validation.data;
    await this.saveUserSettings();
    this.emitChange('user', oldValue, validation.data);
    return { valid: true, errors: [] };
  }

  public async addAgent(agent: AIAgentConfig): Promise<ConfigValidationResult> {
    const validation = validateAIAgentConfig(agent);
    if (!validation.success) {
      return { valid: false, errors: validation.error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message, code: e.code })) };
    }
    const oldValue = [...this.config!.agents];
    this.config!.agents.push(validation.data);
    await this.saveAgents();
    this.emitChange('agents', oldValue, this.config!.agents);
    return { valid: true, errors: [] };
  }

  public async removeAgent(id: string): Promise<boolean> {
    const oldValue = [...this.config!.agents];
    const index = this.config!.agents.findIndex((a: any) => a.id === id);
    if (index === -1) return false;
    this.config!.agents.splice(index, 1);
    await this.saveAgents();
    this.emitChange('agents', oldValue, this.config!.agents);
    return true;
  }

  public async updateStorageConfig(config: Partial<StorageConfig>): Promise<ConfigValidationResult> {
    const newConfig = { ...this.getStorageConfig(), ...config };
    const validation = validateStorageConfig(newConfig);
    if (!validation.success) {
      return { valid: false, errors: validation.error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message, code: e.code })) };
    }
    const oldValue = this.config!.storage;
    this.config!.storage = validation.data;
    await this.saveStorage();
    this.emitChange('storage', oldValue, validation.data);
    return { valid: true, errors: [] };
  }

  public async updateSyncConfig(config: Partial<SyncConfig>): Promise<ConfigValidationResult> {
    const newConfig = { ...this.getSyncConfig(), ...config };
    const validation = validateSyncConfig(newConfig);
    if (!validation.success) {
      return { valid: false, errors: validation.error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message, code: e.code })) };
    }
    const oldValue = this.config!.sync;
    this.config!.sync = validation.data;
    await this.saveSync();
    this.emitChange('sync', oldValue, validation.data);
    return { valid: true, errors: [] };
  }

  public async updateSecurityConfig(config: Partial<SecurityConfig>): Promise<ConfigValidationResult> {
    const newConfig = { ...this.getSecurityConfig(), ...config };
    const validation = validateSecurityConfig(newConfig);
    if (!validation.success) {
      return { valid: false, errors: validation.error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message, code: e.code })) };
    }
    const oldValue = this.config!.security;
    this.config!.security = validation.data;
    await this.saveSecurity();
    this.emitChange('security', oldValue, validation.data);
    return { valid: true, errors: [] };
  }

  private async saveUserSettings(): Promise<void> {
    await fs.writeFile(getSettingsFilePath(), JSON.stringify(this.config!.user, null, 2));
  }

  private async saveAgents(): Promise<void> {
    await fs.writeFile(getAgentsFilePath(), JSON.stringify(this.config!.agents, null, 2));
  }

  private async saveStorage(): Promise<void> {
    await fs.writeFile(getStorageFilePath(), JSON.stringify(this.config!.storage, null, 2));
  }

  private async saveSync(): Promise<void> {
    await fs.writeFile(getSyncFilePath(), JSON.stringify(this.config!.sync, null, 2));
  }

  private async saveSecurity(): Promise<void> {
    await fs.writeFile(getSecurityFilePath(), JSON.stringify(this.config!.security, null, 2));
  }

  public async saveAll(): Promise<void> {
    await Promise.all([this.saveUserSettings(), this.saveAgents(), this.saveStorage(), this.saveSync(), this.saveSecurity()]);
  }

  public onChange<T>(key: string, listener: ConfigChangeListener<T>): () => void {
    if (!this.configListeners.has(key)) this.configListeners.set(key, new Set());
    this.configListeners.get(key)!.add(listener as ConfigChangeListener<unknown>);
    return () => { this.configListeners.get(key)?.delete(listener as ConfigChangeListener<unknown>); };
  }

  private emitChange<T>(key: string, oldValue: T, newValue: T): void {
    const event: ConfigChangeEvent<T> = { type: 'updated', key, oldValue, newValue, timestamp: Date.now() };
    this.configListeners.get(key)?.forEach((listener: any) => { try { listener(event); } catch (error) { console.error('Error in config change listener for ' + key + ':', error); } });
    this.configListeners.get('*')?.forEach((listener: any) => { try { listener(event); } catch (error) { console.error('Error in config change listener for *:', error); } });
    this.emit('change', event);
    this.emit('change:' + key, event);
  }

  public validate(): ConfigValidationResult {
    return { valid: true, errors: [] };
  }

  public async reload(): Promise<void> {
    const result = await loadAppConfig();
    if (result.success && result.data) {
      const oldValue = this.config;
      this.config = result.data;
      this.emitChange('*', oldValue, this.config);
    }
  }
}

export function getConfigManager(): ConfigManager {
  return ConfigManager.getInstance();
}
