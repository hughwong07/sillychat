import { Colors } from '../constants/Colors';

/**
 * 加载更多组件
 * 用于列表底部加载更多数据
 */
@Component
export struct LoadingMore {
  @Prop isLoading: boolean = false;
  @Prop hasMore: boolean = true;
  @Prop loadingText: string = '加载中...';
  @Prop noMoreText: string = '没有更多了';
  @Prop errorText: string = '加载失败，点击重试';
  @Prop isError: boolean = false;

  onLoadMore?: () => void;
  onRetry?: () => void;

  build() {
    Row() {
      if (this.isLoading) {
        // 加载中状态
        LoadingProgress()
          .width(20)
          .height(20)
          .color(Colors.primary)

        Text(this.loadingText)
          .fontSize(14)
          .fontColor(Colors.textSecondary)
          .margin({ left: 8 })
      } else if (this.isError) {
        // 错误状态
        Image($r('app.media.ic_error'))
          .width(20)
          .height(20)
          .fillColor(Colors.error)

        Text(this.errorText)
          .fontSize(14)
          .fontColor(Colors.error)
          .margin({ left: 8 })
      } else if (!this.hasMore) {
        // 没有更多数据
        Divider()
          .color(Colors.divider)
          .layoutWeight(1)

        Text(this.noMoreText)
          .fontSize(12)
          .fontColor(Colors.textTertiary)
          .margin({ horizontal: 12 })

        Divider()
          .color(Colors.divider)
          .layoutWeight(1)
      } else {
        // 点击加载更多
        Image($r('app.media.ic_expand_more'))
          .width(20)
          .height(20)
          .fillColor(Colors.textSecondary)

        Text('点击加载更多')
          .fontSize(14)
          .fontColor(Colors.textSecondary)
          .margin({ left: 8 })
      }
    }
    .width('100%')
    .height(48)
    .justifyContent(FlexAlign.Center)
    .onClick(() => {
      if (this.isError && this.onRetry) {
        this.onRetry();
      } else if (!this.isLoading && this.hasMore && this.onLoadMore) {
        this.onLoadMore();
      }
    })
  }
}

/**
 * 下拉刷新头部组件
 */
@Component
export struct RefreshHeader {
  @Prop isRefreshing: boolean = false;
  @Prop pullProgress: number = 0; // 0-1

  build() {
    Row() {
      if (this.isRefreshing) {
        LoadingProgress()
          .width(24)
          .height(24)
          .color(Colors.primary)

        Text('刷新中...')
          .fontSize(14)
          .fontColor(Colors.textSecondary)
          .margin({ left: 8 })
      } else {
        // 根据下拉进度旋转箭头
        Image($r('app.media.ic_arrow_down'))
          .width(20)
          .height(20)
          .fillColor(this.pullProgress >= 1 ? Colors.primary : Colors.textTertiary)
          .rotate({ angle: this.pullProgress >= 1 ? 180 : 0 })

        Text(this.pullProgress >= 1 ? '释放刷新' : '下拉刷新')
          .fontSize(14)
          .fontColor(this.pullProgress >= 1 ? Colors.primary : Colors.textSecondary)
          .margin({ left: 8 })
      }
    }
    .width('100%')
    .height(50)
    .justifyContent(FlexAlign.Center)
  }
}

/**
 * 骨架屏加载组件
 * 用于内容加载时的占位显示
 */
@Component
export struct SkeletonLoading {
  @Prop itemCount: number = 5;
  @Prop showAvatar: boolean = true;
  @Prop linesPerItem: number = 2;

  @State shimmerOffset: number = 0;

  aboutToAppear() {
    // 启动 shimmer 动画
    this.startShimmerAnimation();
  }

  private startShimmerAnimation() {
    setInterval(() => {
      this.shimmerOffset = (this.shimmerOffset + 1) % 100;
    }, 16);
  }

  build() {
    Column() {
      ForEach(Array(this.itemCount).fill(0), (_, index: number) => {
        this.SkeletonItemBuilder()
      })
    }
    .width('100%')
    .padding(16)
  }

  @Builder
  SkeletonItemBuilder() {
    Row() {
      if (this.showAvatar) {
        // 头像占位
        Column()
          .width(48)
          .height(48)
          .backgroundColor(Colors.surfaceVariant)
          .borderRadius(24)
          .margin({ right: 12 })
      }

      // 内容占位
      Column() {
        // 标题行
        Column()
          .width('60%')
          .height(16)
          .backgroundColor(Colors.surfaceVariant)
          .borderRadius(4)

        // 内容行
        if (this.linesPerItem > 1) {
          Column()
            .width('90%')
            .height(14)
            .backgroundColor(Colors.surfaceVariant)
            .borderRadius(4)
            .margin({ top: 8 })
        }

        if (this.linesPerItem > 2) {
          Column()
            .width('75%')
            .height(14)
            .backgroundColor(Colors.surfaceVariant)
            .borderRadius(4)
            .margin({ top: 8 })
        }
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding({ vertical: 12 })
  }
}

/**
 * 全屏加载组件
 */
@Component
export struct FullScreenLoading {
  @Prop message: string = '加载中...';
  @Prop showSpinner: boolean = true;

  build() {
    Column() {
      if (this.showSpinner) {
        LoadingProgress()
          .width(48)
          .height(48)
          .color(Colors.primary)
      }

      Text(this.message)
        .fontSize(16)
        .fontColor(Colors.textSecondary)
        .margin({ top: 16 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor(Colors.background)
  }
}

/**
 * 局部加载遮罩
 */
@Component
export struct LoadingOverlay {
  @Prop isLoading: boolean = false;
  @Prop message: string = '处理中...';

  build() {
    Stack() {
      // 内容区域（由父组件提供）

      if (this.isLoading) {
        Column() {
          Column() {
            LoadingProgress()
              .width(40)
              .height(40)
              .color(Colors.primary)

            Text(this.message)
              .fontSize(14)
              .fontColor(Colors.textSecondary)
              .margin({ top: 12 })
          }
          .padding(24)
          .backgroundColor(Colors.surface)
          .borderRadius(12)
          .shadow({ radius: 8, color: Colors.shadow })
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
        .backgroundColor('rgba(0, 0, 0, 0.3)')
      }
    }
    .width('100%')
    .height('100%')
  }
}
