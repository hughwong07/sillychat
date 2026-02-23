/**
 * SillyChat - Settings Reducer
 */

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'zh' | 'en';
export type FontSize = 'small' | 'medium' | 'large';

export interface SettingsState {
  theme: Theme;
  language: Language;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  fontSize: FontSize;
  messagePreview: boolean;
  autoDownloadMedia: boolean;
  dataSaver: boolean;
}

export const initialSettingsState: SettingsState = {
  theme: 'system',
  language: 'zh',
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  fontSize: 'medium',
  messagePreview: true,
  autoDownloadMedia: true,
  dataSaver: false,
};

export enum SettingsActionType {
  SET_THEME = 'SET_THEME',
  SET_LANGUAGE = 'SET_LANGUAGE',
  SET_NOTIFICATIONS = 'SET_NOTIFICATIONS',
  SET_SOUND = 'SET_SOUND',
  SET_VIBRATION = 'SET_VIBRATION',
  SET_FONT_SIZE = 'SET_FONT_SIZE',
  SET_MESSAGE_PREVIEW = 'SET_MESSAGE_PREVIEW',
  SET_AUTO_DOWNLOAD = 'SET_AUTO_DOWNLOAD',
  SET_DATA_SAVER = 'SET_DATA_SAVER',
  RESET_SETTINGS = 'RESET_SETTINGS',
}

export type SettingsAction =
  | { type: SettingsActionType.SET_THEME; payload: Theme }
  | { type: SettingsActionType.SET_LANGUAGE; payload: Language }
  | { type: SettingsActionType.SET_NOTIFICATIONS; payload: boolean }
  | { type: SettingsActionType.SET_SOUND; payload: boolean }
  | { type: SettingsActionType.SET_VIBRATION; payload: boolean }
  | { type: SettingsActionType.SET_FONT_SIZE; payload: FontSize }
  | { type: SettingsActionType.SET_MESSAGE_PREVIEW; payload: boolean }
  | { type: SettingsActionType.SET_AUTO_DOWNLOAD; payload: boolean }
  | { type: SettingsActionType.SET_DATA_SAVER; payload: boolean }
  | { type: SettingsActionType.RESET_SETTINGS };

export function settingsReducer(
  state: SettingsState,
  action: SettingsAction
): SettingsState {
  switch (action.type) {
    case SettingsActionType.SET_THEME:
      return { ...state, theme: action.payload };

    case SettingsActionType.SET_LANGUAGE:
      return { ...state, language: action.payload };

    case SettingsActionType.SET_NOTIFICATIONS:
      return { ...state, notificationsEnabled: action.payload };

    case SettingsActionType.SET_SOUND:
      return { ...state, soundEnabled: action.payload };

    case SettingsActionType.SET_VIBRATION:
      return { ...state, vibrationEnabled: action.payload };

    case SettingsActionType.SET_FONT_SIZE:
      return { ...state, fontSize: action.payload };

    case SettingsActionType.SET_MESSAGE_PREVIEW:
      return { ...state, messagePreview: action.payload };

    case SettingsActionType.SET_AUTO_DOWNLOAD:
      return { ...state, autoDownloadMedia: action.payload };

    case SettingsActionType.SET_DATA_SAVER:
      return { ...state, dataSaver: action.payload };

    case SettingsActionType.RESET_SETTINGS:
      return initialSettingsState;

    default:
      return state;
  }
}
