// IPC Channel definitions
export const IPCChannels = {
  // Window control
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',

  // Theme
  THEME_GET: 'theme:get',
  THEME_SET: 'theme:set',
  THEME_CHANGED: 'theme:changed',

  // App
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_PATH: 'app:getPath',
  APP_RESTART: 'app:restart',

  // Platform
  PLATFORM_GET: 'platform:get',

  // Storage (Local)
  STORAGE_GET: 'storage:get',
  STORAGE_SET: 'storage:set',
  STORAGE_DELETE: 'storage:delete',
  STORAGE_CLEAR: 'storage:clear',

  // XSG Core integration
  XSG_INIT: 'xsg:init',
  XSG_GET_GATEWAY_STATUS: 'xsg:getGatewayStatus',
  XSG_START_GATEWAY: 'xsg:startGateway',
  XSG_STOP_GATEWAY: 'xsg:stopGateway',
  XSG_SEND_MESSAGE: 'xsg:sendMessage',
  XSG_ON_MESSAGE: 'xsg:onMessage',
} as const;

export type IPCChannel = (typeof IPCChannels)[keyof typeof IPCChannels];
