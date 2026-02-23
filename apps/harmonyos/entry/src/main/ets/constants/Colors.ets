/**
 * 颜色常量
 * 定义应用的主题色和通用颜色
 */
export class Colors {
  // 主色调
  static readonly primary: ResourceColor = '#6750A4';
  static readonly primaryContainer: ResourceColor = '#EADDFF';
  static readonly onPrimary: ResourceColor = '#FFFFFF';
  static readonly onPrimaryContainer: ResourceColor = '#21005D';
  static readonly primaryDisabled: ResourceColor = '#6750A44D';

  // 次色调
  static readonly secondary: ResourceColor = '#625B71';
  static readonly secondaryContainer: ResourceColor = '#E8DEF8';
  static readonly onSecondary: ResourceColor = '#FFFFFF';
  static readonly onSecondaryContainer: ResourceColor = '#1D192B';

  // 第三色调
  static readonly tertiary: ResourceColor = '#7D5260';
  static readonly tertiaryContainer: ResourceColor = '#FFD8E4';
  static readonly onTertiary: ResourceColor = '#FFFFFF';
  static readonly onTertiaryContainer: ResourceColor = '#31111D';

  // 错误色
  static readonly error: ResourceColor = '#B3261E';
  static readonly errorContainer: ResourceColor = '#F9DEDC';
  static readonly onError: ResourceColor = '#FFFFFF';
  static readonly onErrorContainer: ResourceColor = '#410E0B';

  // 成功色
  static readonly success: ResourceColor = '#4CAF50';
  static readonly successContainer: ResourceColor = '#E8F5E9';
  static readonly onSuccess: ResourceColor = '#FFFFFF';

  // 警告色
  static readonly warning: ResourceColor = '#FF9800';
  static readonly warningContainer: ResourceColor = '#FFF3E0';
  static readonly onWarning: ResourceColor = '#FFFFFF';

  // 信息色
  static readonly info: ResourceColor = '#2196F3';
  static readonly infoContainer: ResourceColor = '#E3F2FD';
  static readonly onInfo: ResourceColor = '#FFFFFF';

  // 背景色
  static readonly background: ResourceColor = '#FFFBFE';
  static readonly onBackground: ResourceColor = '#1C1B1F';
  static readonly surface: ResourceColor = '#FFFBFE';
  static readonly surfaceVariant: ResourceColor = '#E7E0EC';
  static readonly onSurface: ResourceColor = '#1C1B1F';
  static readonly onSurfaceVariant: ResourceColor = '#49454F';

  // 轮廓色
  static readonly outline: ResourceColor = '#79747E';
  static readonly outlineVariant: ResourceColor = '#CAC4D0';

  // 阴影色
  static readonly shadow: ResourceColor = '#000000';

  // 分隔线
  static readonly divider: ResourceColor = '#E0E0E0';
  static readonly dividerOnPrimary: ResourceColor = 'rgba(255,255,255,0.2)';

  // 文本色
  static readonly textPrimary: ResourceColor = '#1C1B1F';
  static readonly textSecondary: ResourceColor = '#49454F';
  static readonly textTertiary: ResourceColor = '#79747E';
  static readonly textDisabled: ResourceColor = '#9E9E9E';
  static readonly textOnPrimary: ResourceColor = '#FFFFFF';
  static readonly textOnPrimarySecondary: ResourceColor = 'rgba(255,255,255,0.7)';
  static readonly textOnError: ResourceColor = '#FFFFFF';

  // 其他颜色
  static readonly purple: ResourceColor = '#9C27B0';
  static readonly pink: ResourceColor = '#E91E63';
  static readonly red: ResourceColor = '#F44336';
  static readonly orange: ResourceColor = '#FF5722';
  static readonly yellow: ResourceColor = '#FFEB3B';
  static readonly green: ResourceColor = '#4CAF50';
  static readonly teal: ResourceColor = '#009688';
  static readonly cyan: ResourceColor = '#00BCD4';
  static readonly blue: ResourceColor = '#2196F3';
  static readonly indigo: ResourceColor = '#3F51B5';

  // 透明
  static readonly transparent: ResourceColor = 'transparent';
  static readonly white: ResourceColor = '#FFFFFF';
  static readonly black: ResourceColor = '#000000';
}

/**
 * 深色主题颜色（预留）
 */
export class DarkColors {
  static readonly primary: ResourceColor = '#D0BCFF';
  static readonly primaryContainer: ResourceColor = '#4F378B';
  static readonly onPrimary: ResourceColor = '#381E72';
  static readonly onPrimaryContainer: ResourceColor = '#EADDFF';

  static readonly background: ResourceColor = '#1C1B1F';
  static readonly onBackground: ResourceColor = '#E6E1E5';
  static readonly surface: ResourceColor = '#1C1B1F';
  static readonly surfaceVariant: ResourceColor = '#49454F';
  static readonly onSurface: ResourceColor = '#E6E1E5';
  static readonly onSurfaceVariant: ResourceColor = '#CAC4D0';

  static readonly textPrimary: ResourceColor = '#E6E1E5';
  static readonly textSecondary: ResourceColor = '#CAC4D0';
  static readonly textTertiary: ResourceColor = '#938F99';
}
