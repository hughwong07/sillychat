/**
 * macOS Window Management
 * macOS 特定窗口行为
 */

import { BrowserWindow, app, screen, systemPreferences } from 'electron';
import { setupMacOSMenu } from './menu.js';
import { setupTouchBar } from './touchbar.js';
import { setupNotifications } from './notifications.js';

interface MacOSWindowCallbacks {
  onNewChat?: () => void;
  onOpenSettings?: () => void;
  onToggleAgentPanel?: () => void;
  onToggleSidebar?: () => void;
  onSearch?: () => void;
  onSendMessage?: () => void;
}

/**
 * Configure macOS-specific window settings
 */
export function configureMacOSWindow(
  window: BrowserWindow,
  callbacks: MacOSWindowCallbacks = {}
): void {
  if (process.platform !== 'darwin') return;

  // Enable vibrant background (macOS visual effect)
  window.setVibrancy('sidebar');

  // Setup native menu
  setupMacOSMenu(window, callbacks);

  // Setup Touch Bar
  setupTouchBar(window, callbacks);

  // Setup notifications
  setupNotifications(window);

  // macOS window behavior
  setupWindowBehavior(window);

  // Setup appearance change listener
  setupAppearanceListener(window);
}

/**
 * Setup macOS window behavior
 */
function setupWindowBehavior(window: BrowserWindow): void {
  // Handle window state for macOS
  window.on('close', (event) => {
    // On macOS, hide window instead of closing when clicking the red button
    if (!app.quitting) {
      event.preventDefault();
      window.hide();
    }
  });

  // Restore window when clicking on dock icon
  app.on('activate', () => {
    if (!window.isVisible()) {
      window.show();
    }
  });

  // Handle fullscreen transition
  window.on('enter-full-screen', () => {
    window.webContents.send('fullscreen-change', true);
  });

  window.on('leave-full-screen', () => {
    window.webContents.send('fullscreen-change', false);
  });

  // Handle window resize (for vibrant background)
  window.on('resize', () => {
    // Re-apply vibrancy after resize
    window.setVibrancy('sidebar');
  });
}

/**
 * Setup appearance change listener (Dark/Light mode)
 */
function setupAppearanceListener(window: BrowserWindow): void {
  // Watch for system appearance changes
  systemPreferences.on('accent-color-changed', () => {
    window.webContents.send('system-accent-color-changed');
  });

  systemPreferences.on('color-scheme-changed', (_, newAppearance: 'light' | 'dark') => {
    window.webContents.send('system-theme-changed', newAppearance);
  });
}

/**
 * Get recommended window bounds for macOS
 */
export function getRecommendedWindowBounds(): {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
} {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // macOS typically has different window size preferences
  return {
    width: Math.min(1280, Math.floor(screenWidth * 0.7)),
    height: Math.min(800, Math.floor(screenHeight * 0.75)),
    minWidth: 800,
    minHeight: 600,
  };
}

/**
 * Set macOS window traffic light position
 */
export function setTrafficLightPosition(window: BrowserWindow, x: number, y: number): void {
  if (process.platform !== 'darwin') return;

  // This requires a native addon or electron-browser-window-options
  // For now, we use standard positioning
  window.setWindowButtonPosition({ x, y });
}

/**
 * Check if macOS is in Dark Mode
 */
export function isDarkMode(): boolean {
  if (process.platform !== 'darwin') return false;

  return systemPreferences.getEffectiveAppearance() === 'dark';
}

/**
 * Get macOS accent color
 */
export function getAccentColor(): string {
  if (process.platform !== 'darwin') return '#A4D037';

  const accentColor = systemPreferences.getAccentColor();
  return accentColor || '#A4D037';
}
