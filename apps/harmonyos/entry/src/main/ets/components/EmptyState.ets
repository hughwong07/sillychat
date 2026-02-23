import { Colors } from '../constants/Colors';

/**
 * 空状态组件
 * 用于列表为空时的显示
 */
@Component
export struct EmptyState {
  // 配置属性
  @Prop icon: Resource = $r('app.media.ic_inbox');
  @Prop iconSize: number = 80;
  @Prop title: string = '暂无数据';
  @Prop description: string = '';
  @Prop buttonText: string = '';
  @Prop showIcon: boolean = true;

  // 回调事件
  onButtonClick?: () => void;

  build() {
    Column() {
      if (this.showIcon) {
        Image(this.icon)
          .width(this.iconSize)
          .height(this.iconSize)
          .fillColor(Colors.textTertiary)
          .opacity(0.5)
      }

      Text(this.title)
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor(Colors.textSecondary)
        .margin({ top: this.showIcon ? 24 : 0 })

      if (this.description.length > 0) {
        Text(this.description)
          .fontSize(14)
          .fontColor(Colors.textTertiary)
          .margin({ top: 8 })
          .textAlign(TextAlign.Center)
          .padding({ horizontal: 32 })
      }

      if (this.buttonText.length > 0) {
        Button(this.buttonText)
          .type(ButtonType.Capsule)
          .backgroundColor(Colors.primary)
          .fontSize(14)
          .fontColor(Colors.textOnPrimary)
          .margin({ top: 24 })
          .padding({ horizontal: 24, vertical: 8 })
          .onClick(() => {
            if (this.onButtonClick) {
              this.onButtonClick();
            }
          })
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .padding(32)
  }
}

/**
 * 搜索为空状态
 */
@Component
export struct EmptySearchResult {
  @Prop searchQuery: string = '';

  onClearSearch?: () => void;

  build() {
    Column() {
      Image($r('app.media.ic_search'))
        .width(64)
        .height(64)
        .fillColor(Colors.textTertiary)
        .opacity(0.5)

      Text(`未找到 "${this.searchQuery}" 的相关结果`)
        .fontSize(16)
        .fontColor(Colors.textSecondary)
        .margin({ top: 16 })
        .textAlign(TextAlign.Center)
        .padding({ horizontal: 32 })

      Text('请尝试其他关键词')
        .fontSize(14)
        .fontColor(Colors.textTertiary)
        .margin({ top: 8 })

      Button('清除搜索')
        .type(ButtonType.Capsule)
        .backgroundColor(Colors.surfaceVariant)
        .fontColor(Colors.textPrimary)
        .margin({ top: 24 })
        .onClick(() => {
          if (this.onClearSearch) {
            this.onClearSearch();
          }
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}

/**
 * 网络错误状态
 */
@Component
export struct NetworkErrorState {
  @Prop message: string = '网络连接失败';
  @Prop description: string = '请检查网络设置后重试';

  onRetry?: () => void;

  build() {
    Column() {
      Image($r('app.media.ic_wifi_off'))
        .width(80)
        .height(80)
        .fillColor(Colors.textTertiary)
        .opacity(0.5)

      Text(this.message)
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor(Colors.textSecondary)
        .margin({ top: 24 })

      Text(this.description)
        .fontSize(14)
        .fontColor(Colors.textTertiary)
        .margin({ top: 8 })
        .textAlign(TextAlign.Center)
        .padding({ horizontal: 32 })

      Button('重新加载')
        .type(ButtonType.Capsule)
        .backgroundColor(Colors.primary)
        .fontColor(Colors.textOnPrimary)
        .margin({ top: 24 })
        .padding({ horizontal: 24, vertical: 10 })
        .onClick(() => {
          if (this.onRetry) {
            this.onRetry();
          }
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .padding(32)
  }
}

/**
 * 错误状态
 */
@Component
export struct ErrorState {
  @Prop title: string = '出错了';
  @Prop message: string = '发生未知错误，请稍后重试';
  @Prop showRetry: boolean = true;

  onRetry?: () => void;

  build() {
    Column() {
      Image($r('app.media.ic_error'))
        .width(80)
        .height(80)
        .fillColor(Colors.error)
        .opacity(0.5)

      Text(this.title)
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor(Colors.textSecondary)
        .margin({ top: 24 })

      Text(this.message)
        .fontSize(14)
        .fontColor(Colors.textTertiary)
        .margin({ top: 8 })
        .textAlign(TextAlign.Center)
        .padding({ horizontal: 32 })

      if (this.showRetry) {
        Button('重试')
          .type(ButtonType.Capsule)
          .backgroundColor(Colors.error)
          .fontColor(Colors.textOnError)
          .margin({ top: 24 })
          .padding({ horizontal: 32, vertical: 10 })
          .onClick(() => {
            if (this.onRetry) {
              this.onRetry();
            }
          })
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .padding(32)
  }
}

/**
 * 需要登录状态
 */
@Component
export struct NeedLoginState {
  @Prop title: string = '需要登录';
  @Prop description: string = '登录后可以查看更多内容';

  onLogin?: () => void;

  build() {
    Column() {
      Image($r('app.media.ic_person'))
        .width(80)
        .height(80)
        .fillColor(Colors.textTertiary)
        .opacity(0.5)

      Text(this.title)
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor(Colors.textSecondary)
        .margin({ top: 24 })

      Text(this.description)
        .fontSize(14)
        .fontColor(Colors.textTertiary)
        .margin({ top: 8 })
        .textAlign(TextAlign.Center)
        .padding({ horizontal: 32 })

      Button('立即登录')
        .type(ButtonType.Capsule)
        .backgroundColor(Colors.primary)
        .fontColor(Colors.textOnPrimary)
        .margin({ top: 24 })
        .padding({ horizontal: 32, vertical: 10 })
        .onClick(() => {
          if (this.onLogin) {
            this.onLogin();
          }
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .padding(32)
  }
}

/**
 * 成功状态（用于操作完成后的显示）
 */
@Component
export struct SuccessState {
  @Prop title: string = '操作成功';
  @Prop description: string = '';
  @Prop buttonText: string = '确定';

  onConfirm?: () => void;

  build() {
    Column() {
      // 成功图标
      Column() {
        Image($r('app.media.ic_check'))
          .width(40)
          .height(40)
          .fillColor(Colors.textOnPrimary)
      }
      .width(80)
      .height(80)
      .backgroundColor(Colors.success)
      .borderRadius(40)
      .justifyContent(FlexAlign.Center)

      Text(this.title)
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor(Colors.textPrimary)
        .margin({ top: 24 })

      if (this.description.length > 0) {
        Text(this.description)
          .fontSize(14)
          .fontColor(Colors.textSecondary)
          .margin({ top: 8 })
          .textAlign(TextAlign.Center)
          .padding({ horizontal: 32 })
      }

      Button(this.buttonText)
        .type(ButtonType.Capsule)
        .backgroundColor(Colors.primary)
        .fontColor(Colors.textOnPrimary)
        .margin({ top: 32 })
        .padding({ horizontal: 48, vertical: 12 })
        .onClick(() => {
          if (this.onConfirm) {
            this.onConfirm();
          }
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .padding(32)
  }
}
