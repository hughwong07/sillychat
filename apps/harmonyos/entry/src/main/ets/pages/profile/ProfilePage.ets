import { Colors } from '../../constants/Colors';
import { promptAction, router } from '@kit.ArkUI';
import { PrefKeys, PreferencesUtil } from '../../data/local/PreferencesUtil';

/**
 * 个人资料页面
 * 显示和编辑用户信息
 */
@Entry
@Component
struct ProfilePage {
  @State isEditing: boolean = false;
  @State showLogoutConfirm: boolean = false;

  // 用户数据
  @State userName: string = '用户名';
  @State userEmail: string = 'user@example.com';
  @State userBio: string = '这个人很懒，什么都没有写...';

  // 编辑数据
  @State editName: string = '';
  @State editEmail: string = '';
  @State editBio: string = '';

  private preferences: PreferencesUtil | null = null;

  aboutToAppear() {
    this.preferences = PreferencesUtil.getInstance(getContext());
    this.loadUserData();
  }

  /**
   * 加载用户数据
   */
  private loadUserData(): void {
    if (!this.preferences) return;

    this.userName = this.preferences.getString(PrefKeys.USER_NAME, '用户名');
    this.userEmail = this.preferences.getString(PrefKeys.USER_EMAIL, 'user@example.com');
    // 可以从其他存储加载更多数据
  }

  /**
   * 保存用户数据
   */
  private saveUserData(): void {
    if (!this.preferences) return;

    this.preferences.putString(PrefKeys.USER_NAME, this.userName);
    this.preferences.putString(PrefKeys.USER_EMAIL, this.userEmail);
    // 保存其他数据
  }

  build() {
    Column() {
      // 顶部导航栏
      this.TopBarBuilder()

      // 内容
      Scroll() {
        Column() {
          // 头像区域
          this.AvatarSectionBuilder()

          // 用户信息或编辑表单
          if (this.isEditing) {
            this.EditFormBuilder()
          } else {
            this.InfoSectionBuilder()
          }

          Divider()
            .color(Colors.divider)
            .margin({ vertical: 16, horizontal: 16 })

          // 统计数据
          this.StatsSectionBuilder()

          Divider()
            .color(Colors.divider)
            .margin({ vertical: 16, horizontal: 16 })

          // 菜单列表
          this.MenuSectionBuilder()

          // 退出登录按钮
          Button('退出登录')
            .type(ButtonType.Capsule)
            .fontColor(Colors.error)
            .backgroundColor(Color.Transparent)
            .border({ width: 1, color: Colors.error })
            .margin({ top: 24, bottom: 32 })
            .onClick(() => {
              this.showLogoutConfirm = true;
            })
        }
        .width('100%')
        .padding({ vertical: 16 })
      }
      .width('100%')
      .height('100%')
      .scrollBar(BarState.Auto)
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
        if (this.isEditing) {
          this.isEditing = false;
        } else {
          router.back();
        }
      })

      Text('个人资料')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor(Colors.textOnPrimary)
        .layoutWeight(1)

      // 编辑/保存按钮
      Button() {
        Image(this.isEditing ? $r('app.media.ic_check') : $r('app.media.ic_edit'))
          .width(24)
          .height(24)
          .fillColor(Colors.textOnPrimary)
      }
      .type(ButtonType.Circle)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        if (this.isEditing) {
          // 保存编辑
          this.userName = this.editName;
          this.userEmail = this.editEmail;
          this.userBio = this.editBio;
          this.saveUserData();
          this.isEditing = false;
          promptAction.showToast({ message: '保存成功' });
        } else {
          // 进入编辑模式
          this.editName = this.userName;
          this.editEmail = this.userEmail;
          this.editBio = this.userBio;
          this.isEditing = true;
        }
      })
    }
    .width('100%')
    .height(56)
    .padding({ horizontal: 8 })
    .backgroundColor(Colors.primary)
    .justifyContent(FlexAlign.SpaceBetween)
  }

  @Builder
  AvatarSectionBuilder() {
    Stack({ alignContent: Alignment.BottomEnd }) {
      Column() {
        Image($r('app.media.ic_person'))
          .width(60)
          .height(60)
          .fillColor(Colors.textOnPrimaryContainer)
      }
      .width(120)
      .height(120)
      .backgroundColor(Colors.primaryContainer)
      .borderRadius(60)
      .justifyContent(FlexAlign.Center)

      // 编辑头像按钮
      if (this.isEditing) {
        Button() {
          Image($r('app.media.ic_camera'))
            .width(20)
            .height(20)
            .fillColor(Colors.textOnPrimary)
        }
        .type(ButtonType.Circle)
        .width(40)
        .height(40)
        .backgroundColor(Colors.primary)
        .margin({ right: 8, bottom: 8 })
        .onClick(() => {
          promptAction.showToast({ message: '头像更换功能开发中' });
        })
      }
    }
    .width(120)
    .height(120)
    .margin({ top: 16 })
    .alignSelf(ItemAlign.Center)
  }

  @Builder
  InfoSectionBuilder() {
    Column() {
      Text(this.userName)
        .fontSize(24)
        .fontWeight(FontWeight.Medium)
        .fontColor(Colors.textPrimary)

      Text(this.userEmail)
        .fontSize(16)
        .fontColor(Colors.textSecondary)
        .margin({ top: 4 })

      Text(this.userBio)
        .fontSize(14)
        .fontColor(Colors.textSecondary)
        .margin({ top: 16, horizontal: 32 })
        .textAlign(TextAlign.Center)
    }
    .width('100%')
    .padding({ horizontal: 16 })
    .alignItems(HorizontalAlign.Center)
  }

  @Builder
  EditFormBuilder() {
    Column() {
      TextInput({ placeholder: '昵称', text: $$this.editName })
        .placeholderColor(Colors.textTertiary)
        .fontSize(16)
        .height(48)
        .backgroundColor(Colors.surface)
        .borderRadius(8)

      TextInput({ placeholder: '邮箱', text: $$this.editEmail })
        .placeholderColor(Colors.textTertiary)
        .fontSize(16)
        .height(48)
        .backgroundColor(Colors.surface)
        .borderRadius(8)
        .margin({ top: 16 })

      TextArea({ placeholder: '简介', text: $$this.editBio })
        .placeholderColor(Colors.textTertiary)
        .fontSize(16)
        .height(120)
        .backgroundColor(Colors.surface)
        .borderRadius(8)
        .margin({ top: 16 })
    }
    .width('100%')
    .padding({ horizontal: 16 })
  }

  @Builder
  StatsSectionBuilder() {
    Row() {
      this.StatItemBuilder('128', '消息')
      this.StatItemBuilder('5', '代理')
      this.StatItemBuilder('30', '天数')
    }
    .width('100%')
    .padding({ horizontal: 16 })
    .justifyContent(FlexAlign.SpaceEvenly)
  }

  @Builder
  StatItemBuilder(count: string, label: string) {
    Column() {
      Text(count)
        .fontSize(24)
        .fontWeight(FontWeight.Medium)
        .fontColor(Colors.primary)

      Text(label)
        .fontSize(14)
        .fontColor(Colors.textSecondary)
        .margin({ top: 4 })
    }
  }

  @Builder
  MenuSectionBuilder() {
    Column() {
      this.MenuItemBuilder(
        $r('app.media.ic_account_circle'),
        '账号设置',
        () => {
          promptAction.showToast({ message: '账号设置功能开发中' });
        }
      )

      this.MenuItemBuilder(
        $r('app.media.ic_security'),
        '隐私设置',
        () => {
          promptAction.showToast({ message: '隐私设置功能开发中' });
        }
      )

      this.MenuItemBuilder(
        $r('app.media.ic_notifications'),
        '通知设置',
        () => {
          router.pushUrl({ url: 'pages/settings/SettingsPage' });
        }
      )

      this.MenuItemBuilder(
        $r('app.media.ic_help'),
        '帮助与反馈',
        () => {
          promptAction.showToast({ message: '帮助与反馈功能开发中' });
        }
      )

      this.MenuItemBuilder(
        $r('app.media.ic_info'),
        '关于',
        () => {
          this.showAboutDialog();
        }
      )
    }
    .width('100%')
    .padding({ horizontal: 16 })
    .backgroundColor(Colors.surface)
    .borderRadius(12)
  }

  @Builder
  MenuItemBuilder(icon: Resource, title: string, onClick: () => void) {
    Row() {
      Image(icon)
        .width(24)
        .height(24)
        .fillColor(Colors.textSecondary)

      Text(title)
        .fontSize(16)
        .fontColor(Colors.textPrimary)
        .layoutWeight(1)
        .margin({ left: 16 })

      Image($r('app.media.ic_chevron_right'))
        .width(20)
        .height(20)
        .fillColor(Colors.textTertiary)
    }
    .width('100%')
    .padding(16)
    .onClick(onClick)
  }

  /**
   * 显示关于对话框
   */
  private showAboutDialog(): void {
    promptAction.showDialog({
      title: '关于 SillyChat',
      message: 'SillyChat v1.0.0\n\n一个智能AI聊天应用，支持多代理对话。\n\n© 2024 SillyChat Team',
      buttons: [
        { text: '确定', color: Colors.primary }
      ]
    });
  }

  /**
   * 退出登录确认对话框
   */
  private showLogoutConfirmDialog(): void {
    promptAction.showDialog({
      title: '确认退出',
      message: '确定要退出登录吗？',
      buttons: [
        { text: '取消', color: Colors.textSecondary },
        { text: '退出', color: Colors.error }
      ]
    }).then((result) => {
      if (result.index === 1) {
        this.showLogoutConfirm = false;
        // 执行退出登录
        if (this.preferences) {
          this.preferences.delete(PrefKeys.USER_TOKEN);
          this.preferences.delete(PrefKeys.USER_ID);
        }
        promptAction.showToast({ message: '已退出登录' });
        // 可以跳转到登录页面
      }
    });
  }
}
