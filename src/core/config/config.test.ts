import { describe, it, expect, beforeEach, vi } from "vitest";
import { validateUserSettings, validateAIAgentConfig } from "./schema";
import { getConfigDir, getSettingsFilePath } from "./paths";
import { ConfigManager, getConfigManager } from "./manager";
import type { AIAgentConfig } from "./types";

describe("Config Schema Validation", () => {
  describe("UserSettings", () => {
    it("should validate correct user settings", () => {
      const validSettings = {
        ui: { theme: "system", language: "zh-CN", fontSize: 14, zoomLevel: 1, sidebarWidth: 250, showAvatars: true, showTimestamps: true, compactMode: false, enableAnimations: true, alwaysOnTop: false, minimizeToTray: true, minimizeOnClose: true },
        notifications: { level: "all", desktopNotifications: true, soundEnabled: true, soundType: "default", dndStartTime: null, dndEndTime: null, messagePreview: true },
        shortcuts: { sendMessage: "Enter", newConversation: "Ctrl+N", search: "Ctrl+K", toggleSidebar: "Ctrl+B", fullscreen: "F11", quickScreenshot: "Ctrl+Shift+S" },
        updatedAt: new Date().toISOString()
      };
      const result = validateUserSettings(validSettings);
      expect(result.success).toBe(true);
    });
  });
});

describe("Config Paths", () => {
  it("should return correct config directory", () => {
    const configDir = getConfigDir();
    expect(configDir).toContain(".silly");
    expect(configDir).toContain("config");
  });
});

describe("ConfigManager", () => {
  let manager: ConfigManager;
  beforeEach(async () => {
    manager = getConfigManager();
    await manager.initialize();
  });
  it("should be a singleton", () => {
    const manager2 = getConfigManager();
    expect(manager).toBe(manager2);
  });
  it.skip("should get user settings", () => {
    const settings = manager.getUserSettings();
    expect(settings).toBeDefined();
    expect(settings.ui).toBeDefined();
  });
});
