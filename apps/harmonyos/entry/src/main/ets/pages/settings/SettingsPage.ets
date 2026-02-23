import { Colors, DarkColors } from '../../constants/Colors';
import { promptAction, router } from '@kit.ArkUI';
import { PrefKeys, PreferencesUtil } from '../../data/local/PreferencesUtil';
import { Logger } from '../../utils/Logger';

const TAG = 'SettingsPage';

/**
 * 设置页面
 * 应用设置和配置
 */
@Entry
@Component
struct SettingsPage {
  @State darkMode: boolean = false;
  @State language: string = '简体中文';
  @State notificationEnabled: boolean = true;
  @State soundEnabled: boolean = true;
  @State vibrationEnabled: boolean = true;
  @State messageFontSize: number = 16;
  @State showTimestamp: boolean = true;
  @State autoSync: boolean = true;
  @State syncInterval: number = 5;
  @State isLoading: boolean = false;

  private preferences: PreferencesUtil | null = null;

  aboutToAppear() {
    Logger.info(TAG, 'SettingsPage appearing');
    this.preferences = PreferencesUtil.getInstance(getContext());
    this.loadSettings();
  }

  /**
   * 加载设置
   */
  private async loadSettings(): Promise<void> {
    if (!this.preferences) return;

    this.isLoading = true;
    try {
      // 初始化 preferences
      await this.preferences.initPreferences();

      this.darkMode = this.preferences.getBoolean(PrefKeys.THEME_MODE, false);
      this.language = this.preferences.getString(PrefKeys.LANGUAGE, '简体中文');
      this.notificationEnabled = this.preferences.getBoolean(PrefKeys.NOTIFICATION_ENABLED, true);
      this.soundEnabled = this.preferences.getBoolean(PrefKeys.SOUND_ENABLED, true);
      this.vibrationEnabled = this.preferences.getBoolean(PrefKeys.VIBRATION_ENABLED, true);
      this.messageFontSize = this.preferences.getNumber(PrefKeys.MESSAGE_FONT_SIZE, 16);
      this.showTimestamp = this.preferences.getBoolean(PrefKeys.SHOW_TIMESTAMP, true);
      this.autoSync = this.preferences.getBoolean(PrefKeys.AUTO_SYNC, true);
      this.syncInterval = this.preferences.getNumber(PrefKeys.SYNC_INTERVAL, 5);

      Logger.info(TAG, 'Settings loaded successfully');
    } catch (error) {
      Logger.error(TAG, `Failed to load settings: ${JSON.stringify(error)}`);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 保存设置
   */
  private saveSetting(key: string, value: boolean | string | number): void {
    if (!this.preferences) return;

    try {
      if (typeof value === 'boolean') {
        this.preferences.putBoolean(key, value);
      } else if (typeof value === 'string') {
        this.preferences.putString(key, value);
      } else if (typeof value === 'number') {
        this.preferences.putNumber(key, value);
      }
      Logger.debug(TAG, `Setting saved: ${key} = ${value}`);
    } catch (error) {
      Logger.error(TAG, `Failed to save setting: ${key}, error: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 切换主题
   */
  private toggleTheme(isDark: boolean): void {
    this.darkMode = isDark;
    this.saveSetting(PrefKeys.THEME_MODE, isDark);

    // 应用主题
    this.applyTheme(isDark);

    promptAction.showToast({ message: isDark ? '已切换到深色模式' : '已切换到浅色模式' });
  }

  /**
   * 应用主题
   */
  private applyTheme(isDark: boolean): void {
    // 主题切换逻辑
    // 实际应用中，这里会更新全局颜色配置
    Logger.info(TAG, `Theme applied: ${isDark ? 'dark' : 'light'}`);
  }

  build() {
    Column() {
      // 顶部导航栏
      this.TopBarBuilder()

      if (this.isLoading) {
        // 加载中
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
            .color(Colors.primary)

          Text('加载设置中...')
            .fontSize(14)
            .fontColor(Colors.textSecondary)
            .margin({ top: 12 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        // 设置列表
        List() {
          // 外观设置
          ListItemGroup({ header: this.SectionHeaderBuilder('外观') }) {
            // 深色模式
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_dark_mode'),
                '深色模式',
                () => this.darkMode ? '开启' : '关闭',
                undefined,
                () => {
                  Toggle({ type: ToggleType.Switch, isOn: this.darkMode })
                    .selectedColor(Colors.primary)
                    .onChange((isOn: boolean) => {
                      this.toggleTheme(isOn);
                    })
                }
              )
            }

            // 语言
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_language'),
                '语言',
                () => this.language,
                () => {
                  this.showLanguageSelector();
                }
              )
            }
          }

          // 通知设置
          ListItemGroup({ header: this.SectionHeaderBuilder('通知') }) {
            // 消息通知
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_notifications'),
                '消息通知',
                () => this.notificationEnabled ? '已开启' : '已关闭',
                undefined,
                () => {
                  Toggle({ type: ToggleType.Switch, isOn: this.notificationEnabled })
                    .selectedColor(Colors.primary)
                    .onChange((isOn: boolean) => {
                      this.notificationEnabled = isOn;
                      this.saveSetting(PrefKeys.NOTIFICATION_ENABLED, isOn);
                    })
                }
              )
            }

            // 声音
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_volume'),
                '声音',
                () => this.soundEnabled ? '已开启' : '已关闭',
                undefined,
                () => {
                  Toggle({ type: ToggleType.Switch, isOn: this.soundEnabled })
                    .selectedColor(Colors.primary)
                    .onChange((isOn: boolean) => {
                      this.soundEnabled = isOn;
                      this.saveSetting(PrefKeys.SOUND_ENABLED, isOn);
                    })
                }
              )
            }

            // 震动
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_vibration'),
                '震动',
                () => this.vibrationEnabled ? '已开启' : '已关闭',
                undefined,
                () => {
                  Toggle({ type: ToggleType.Switch, isOn: this.vibrationEnabled })
                    .selectedColor(Colors.primary)
                    .onChange((isOn: boolean) => {
                      this.vibrationEnabled = isOn;
                      this.saveSetting(PrefKeys.VIBRATION_ENABLED, isOn);
                    })
                }
              )
            }
          }

          // 聊天设置
          ListItemGroup({ header: this.SectionHeaderBuilder('聊天') }) {
            // 字体大小
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_text_format'),
                '字体大小',
                () => `${this.messageFontSize}sp`,
                () => {
                  this.showFontSizeSelector();
                }
              )
            }

            // 显示时间戳
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_schedule'),
                '显示时间戳',
                () => this.showTimestamp ? '已开启' : '已关闭',
                undefined,
                () => {
                  Toggle({ type: ToggleType.Switch, isOn: this.showTimestamp })
                    .selectedColor(Colors.primary)
                    .onChange((isOn: boolean) => {
                      this.showTimestamp = isOn;
                      this.saveSetting(PrefKeys.SHOW_TIMESTAMP, isOn);
                    })
                }
              )
            }
          }

          // 同步设置
          ListItemGroup({ header: this.SectionHeaderBuilder('同步') }) {
            // 自动同步
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_sync'),
                '自动同步',
                () => this.autoSync ? '已开启' : '已关闭',
                undefined,
                () => {
                  Toggle({ type: ToggleType.Switch, isOn: this.autoSync })
                    .selectedColor(Colors.primary)
                    .onChange((isOn: boolean) => {
                      this.autoSync = isOn;
                      this.saveSetting(PrefKeys.AUTO_SYNC, isOn);
                    })
                }
              )
            }

            // 同步间隔
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_timer'),
                '同步间隔',
                () => `${this.syncInterval} 分钟`,
                () => {
                  this.showSyncIntervalSelector();
                }
              )
            }
            .enabled(this.autoSync)
            .opacity(this.autoSync ? 1 : 0.5)
          }

          // 关于
          ListItemGroup({ header: this.SectionHeaderBuilder('关于') }) {
            // 版本
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_info'),
                '版本',
                () => '1.0.0'
              )
            }

            // 隐私政策
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_privacy'),
                '隐私政策',
                () => '',
                () => {
                  router.pushUrl({ url: 'pages/settings/PrivacyPolicyPage' });
                }
              )
            }

            // 用户协议
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_description'),
                '用户协议',
                () => '',
                () => {
                  router.pushUrl({ url: 'pages/settings/UserAgreementPage' });
                }
              )
            }
          }

          // 清除数据
          ListItemGroup() {
            ListItem() {
              this.SettingItemBuilder(
                $r('app.media.ic_delete'),
                '清除缓存',
                () => '',
                () => {
                  this.showClearCacheConfirm();
                }
              )
            }

            ListItem() {
              Row() {
                Text('退出登录')
                  .fontSize(16)
                  .fontColor(Colors.error)

                Blank()
              }
              .width('100%')
              .padding(16)
            }
            .onClick(() => {
              this.showLogoutConfirm();
            })
          }
          .margin({ top: 16 })
        }
        .width('100%')
        .height('100%')
        .padding({ vertical: 8 })
        .edgeEffect(EdgeEffect.Spring)
        .scrollBar(BarState.Auto)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Colors.background)
  }

  @Builder
  TopBarBuilder() {
    Row() {
      // 返回按钮
      Button() {
        Image($r('app.media.ic_arrow_back'))
          .width(24)
          .height(24)
          .fillColor(Colors.textOnPrimary)
      }
      .type(ButtonType.Circle)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        router.back();
      })

      Text('设置')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor(Colors.textOnPrimary)
        .layoutWeight(1)
    }
    .width('100%')
    .height(56)
    .padding({ horizontal: 8 })
    .backgroundColor(Colors.primary)
    .justifyContent(FlexAlign.SpaceBetween)
  }

  @Builder
  SectionHeaderBuilder(title: string) {
    Text(title)
      .fontSize(14)
      .fontColor(Colors.primary)
      .fontWeight(FontWeight.Medium)
      .padding({ horizontal: 16, vertical: 8 })
  }

  @Builder
  SettingItemBuilder(
    icon: Resource,
    title: string,
    subtitleGetter: () => string,
    onClick?: () => void,
    trailingBuilder?: () => void
  ) {
    Row() {
      Image(icon)
        .width(24)
        .height(24)
        .fillColor(Colors.textSecondary)

      Column() {
        Text(title)
          .fontSize(16)
          .fontColor(Colors.textPrimary)

        if (subtitleGetter()) {
          Text(subtitleGetter())
            .fontSize(12)
            .fontColor(Colors.textSecondary)
            .margin({ top: 2 })
        }
      }
      .layoutWeight(1)
      .margin({ left: 16 })
      .alignItems(HorizontalAlign.Start)

      if (trailingBuilder) {
        trailingBuilder()
      } else if (onClick) {
        Image($r('app.media.ic_chevron_right'))
          .width(20)
          .height(20)
          .fillColor(Colors.textTertiary)
      }
    }
    .width('100%')
    .padding(16)
    .onClick(onClick)
  }

  /**
   * 显示语言选择器
   */
  private showLanguageSelector(): void {
    promptAction.showActionMenu({
      title: '选择语言',
      buttons: [
        { text: '简体中文', color: Colors.textPrimary },
        { text: '繁體中文', color: Colors.textPrimary },
        { text: 'English', color: Colors.textPrimary }
      ]
    }).then((result) => {
      const languages = ['简体中文', '繁體中文', 'English'];
      if (result.index >= 0 && result.index < languages.length) {
        this.language = languages[result.index];
        this.saveSetting(PrefKeys.LANGUAGE, this.language);
        promptAction.showToast({ message: '语言设置已保存' });
      }
    });
  }

  /**
   * 显示字体大小选择器
   */
  private showFontSizeSelector(): void {
    promptAction.showActionMenu({
      title: '选择字体大小',
      buttons: [
        { text: '小 (14sp)', color: Colors.textPrimary },
        { text: '中 (16sp)', color: Colors.textPrimary },
        { text: '大 (18sp)', color: Colors.textPrimary },
        { text: '超大 (20sp)', color: Colors.textPrimary }
      ]
    }).then((result) => {
      const sizes = [14, 16, 18, 20];
      if (result.index >= 0 && result.index < sizes.length) {
        this.messageFontSize = sizes[result.index];
        this.saveSetting(PrefKeys.MESSAGE_FONT_SIZE, this.messageFontSize);
        promptAction.showToast({ message: '字体大小已保存' });
      }
    });
  }

  /**
   * 显示同步间隔选择器
   */
  private showSyncIntervalSelector(): void {
    promptAction.showActionMenu({
      title: '选择同步间隔',
      buttons: [
        { text: '1 分钟', color: Colors.textPrimary },
        { text: '5 分钟', color: Colors.textPrimary },
        { text: '15 分钟', color: Colors.textPrimary },
        { text: '30 分钟', color: Colors.textPrimary },
        { text: '60 分钟', color: Colors.textPrimary }
      ]
    }).then((result) => {
      const intervals = [1, 5, 15, 30, 60];
      if (result.index >= 0 && result.index < intervals.length) {
        this.syncInterval = intervals[result.index];
        this.saveSetting(PrefKeys.SYNC_INTERVAL, this.syncInterval);
        promptAction.showToast({ message: '同步间隔已保存' });
      }
    });
  }

  /**
   * 显示清除缓存确认
   */
  private showClearCacheConfirm(): void {
    promptAction.showDialog({
      title: '清除缓存',
      message: '确定要清除应用缓存吗？这不会删除您的聊天记录。',
      buttons: [
        { text: '取消', color: Colors.textSecondary },
        { text: '清除', color: Colors.error }
      ]
    }).then((result) => {
      if (result.index === 1) {
        this.clearCache();
      }
    });
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    try {
      // 清除缓存逻辑
      if (this.preferences) {
        // 保留用户设置，只清除临时数据
        const keysToKeep = [
          PrefKeys.THEME_MODE,
          PrefKeys.LANGUAGE,
          PrefKeys.NOTIFICATION_ENABLED,
          PrefKeys.SOUND_ENABLED,
          PrefKeys.VIBRATION_ENABLED,
          PrefKeys.MESSAGE_FONT_SIZE,
          PrefKeys.SHOW_TIMESTAMP,
          PrefKeys.AUTO_SYNC,
          PrefKeys.SYNC_INTERVAL,
          PrefKeys.USER_ID,
          PrefKeys.USER_TOKEN
        ];

        const allKeys = this.preferences.getAllKeys();
        allKeys.forEach(key => {
          if (!keysToKeep.includes(key)) {
            this.preferences!.delete(key);
          }
        });
      }
      promptAction.showToast({ message: '缓存已清除' });
      Logger.info(TAG, 'Cache cleared');
    } catch (error) {
      Logger.error(TAG, `Failed to clear cache: ${JSON.stringify(error)}`);
      promptAction.showToast({ message: '清除缓存失败' });
    }
  }

  /**
   * 显示退出登录确认
   */
  private showLogoutConfirm(): void {
    promptAction.showDialog({
      title: '退出登录',
      message: '确定要退出登录吗？',
      buttons: [
        { text: '取消', color: Colors.textSecondary },
        { text: '退出', color: Colors.error }
      ]
    }).then((result) => {
      if (result.index === 1) {
        this.logout();
      }
    });
  }

  /**
   * 退出登录
   */
  private logout(): void {
    try {
      if (this.preferences) {
        this.preferences.delete(PrefKeys.USER_TOKEN);
        this.preferences.delete(PrefKeys.USER_ID);
        this.preferences.delete(PrefKeys.USER_NAME);
        this.preferences.delete(PrefKeys.USER_EMAIL);
        this.preferences.delete(PrefKeys.USER_AVATAR);
      }
      promptAction.showToast({ message: '已退出登录' });
      Logger.info(TAG, 'User logged out');

      // 跳转到登录页面
      // router.replaceUrl({ url: 'pages/login/LoginPage' });
    } catch (error) {
      Logger.error(TAG, `Failed to logout: ${JSON.stringify(error)}`);
      promptAction.showToast({ message: '退出登录失败' });
    }
  }
}
