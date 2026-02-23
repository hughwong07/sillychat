import { Message, MessageRole, SyncStatus } from '../model/Message';
import { Colors } from '../constants/Colors';

/**
 * 消息项组件
 * 显示单条消息，支持用户消息和助手消息的不同样式
 */
@Component
export struct MessageItem {
  @Prop message: Message;
  @Prop isLast: boolean = false;

  // 回调事件
  onLongPress?: () => void;
  onReplyClick?: (messageId: string) => void;

  build() {
    if (this.message.role === MessageRole.SYSTEM) {
      this.SystemMessageBuilder()
    } else if (this.message.role === MessageRole.USER) {
      this.UserMessageBuilder()
    } else {
      this.AssistantMessageBuilder()
    }
  }

  @Builder
  UserMessageBuilder() {
    Column() {
      // 消息气泡
      Column() {
        Text(this.message.content)
          .fontSize(16)
          .fontColor(Colors.textOnPrimary)
          .maxLines(100)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        // 附件预览（如果有）
        if (this.message.attachments && this.message.attachments.length > 0) {
          Divider().color(Colors.dividerOnPrimary).margin({ top: 8, bottom: 8 })
          Text(`附件: ${this.message.attachments.length}个`)
            .fontSize(12)
            .fontColor(Colors.textOnPrimarySecondary)
        }
      }
      .backgroundColor(Colors.primary)
      .borderRadius({
        topLeft: 16,
        topRight: 4,
        bottomLeft: 16,
        bottomRight: 16
      })
      .padding(12)
      .constraintSize({ maxWidth: '75%' })
      .alignSelf(ItemAlign.End)

      // 时间和状态
      Row() {
        Text(this.formatTimestamp(this.message.timestamp))
          .fontSize(11)
          .fontColor(Colors.textTertiary)

        SyncStatusIcon({ status: this.message.syncStatus })
          .margin({ left: 4 })
      }
      .margin({ top: 4, right: 4 })
      .alignSelf(ItemAlign.End)
    }
    .width('100%')
    .padding({ horizontal: 12, vertical: 4 })
    .alignItems(HorizontalAlign.End)
    .gesture(
      LongPressGesture({ duration: 500 })
        .onAction(() => {
          if (this.onLongPress) {
            this.onLongPress();
          }
        })
    )
  }

  @Builder
  AssistantMessageBuilder() {
    Column() {
      // 发送者名称
      if (this.message.senderName) {
        Text(this.message.senderName)
          .fontSize(12)
          .fontColor(Colors.primary)
          .margin({ left: 52, bottom: 2 })
          .alignSelf(ItemAlign.Start)
      }

      Row() {
        // 头像
        Column() {
          Text(this.getAvatarText())
            .fontSize(14)
            .fontColor(Colors.textOnSecondary)
            .fontWeight(FontWeight.Bold)
        }
        .width(36)
        .height(36)
        .backgroundColor(Colors.secondaryContainer)
        .borderRadius(18)
        .justifyContent(FlexAlign.Center)
        .margin({ right: 8 })

        // 消息气泡
        Column() {
          Text(this.message.content)
            .fontSize(16)
            .fontColor(Colors.textPrimary)
            .maxLines(100)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .backgroundColor(Colors.surfaceVariant)
        .borderRadius({
          topLeft: 4,
          topRight: 16,
          bottomLeft: 16,
          bottomRight: 16
        })
        .padding(12)
        .constraintSize({ maxWidth: '70%' })
      }
      .width('100%')
      .alignItems(VerticalAlign.Bottom)

      // 时间
      Text(this.formatTimestamp(this.message.timestamp))
        .fontSize(11)
        .fontColor(Colors.textTertiary)
        .margin({ left: 52, top: 4 })
        .alignSelf(ItemAlign.Start)
    }
    .width('100%')
    .padding({ horizontal: 12, vertical: 4 })
    .alignItems(HorizontalAlign.Start)
    .gesture(
      LongPressGesture({ duration: 500 })
        .onAction(() => {
          if (this.onLongPress) {
            this.onLongPress();
          }
        })
    )
  }

  @Builder
  SystemMessageBuilder() {
    Column() {
      Text(this.message.content)
        .fontSize(12)
        .fontColor(Colors.textSecondary)
        .backgroundColor(Colors.surfaceVariant)
        .borderRadius(12)
        .padding({ horizontal: 16, vertical: 6 })
    }
    .width('100%')
    .padding({ vertical: 8 })
    .alignItems(HorizontalAlign.Center)
  }

  /**
   * 获取头像文字
   */
  private getAvatarText(): string {
    if (this.message.senderName && this.message.senderName.length > 0) {
      return this.message.senderName.charAt(0).toUpperCase();
    }
    return 'AI';
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();

    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const isYesterday = date.getDate() === now.getDate() - 1 &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (isYesterday) {
      return `昨天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (date.getFullYear() === now.getFullYear()) {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  }
}

/**
 * 同步状态图标组件
 */
@Component
struct SyncStatusIcon {
  @Prop status: SyncStatus;

  build() {
    Row() {
      if (this.status === SyncStatus.SYNCED) {
        // 已同步 - 双勾
        Text('✓✓')
          .fontSize(10)
          .fontColor(Colors.textTertiary)
      } else if (this.status === SyncStatus.PENDING) {
        // 待同步 - 时钟
        Text('○')
          .fontSize(10)
          .fontColor(Colors.textTertiary)
      } else if (this.status === SyncStatus.SYNCING) {
        // 同步中 - 单勾
        Text('✓')
          .fontSize(10)
          .fontColor(Colors.primary)
      } else if (this.status === SyncStatus.FAILED) {
        // 失败 - 感叹号
        Text('!')
          .fontSize(10)
          .fontColor(Colors.error)
          .fontWeight(FontWeight.Bold)
      }
    }
  }
}

/**
 * 流式消息组件（用于打字机效果）
 */
@Component
export struct StreamingMessageItem {
  @Prop content: string;
  @Prop agentName: string | null = null;

  build() {
    Column() {
      // 发送者名称
      if (this.agentName) {
        Text(this.agentName)
          .fontSize(12)
          .fontColor(Colors.primary)
          .margin({ left: 52, bottom: 2 })
          .alignSelf(ItemAlign.Start)
      }

      Row() {
        // 头像
        Column() {
          Text(this.getAvatarText())
            .fontSize(14)
            .fontColor(Colors.textOnSecondary)
            .fontWeight(FontWeight.Bold)
        }
        .width(36)
        .height(36)
        .backgroundColor(Colors.secondaryContainer)
        .borderRadius(18)
        .justifyContent(FlexAlign.Center)
        .margin({ right: 8 })

        // 消息气泡
        Column() {
          Text(this.content)
            .fontSize(16)
            .fontColor(Colors.textPrimary)
            .maxLines(100)

          // 输入中指示器
          Text('输入中...')
            .fontSize(11)
            .fontColor(Colors.primary)
            .margin({ top: 4 })
        }
        .backgroundColor(Colors.surfaceVariant)
        .borderRadius({
          topLeft: 4,
          topRight: 16,
          bottomLeft: 16,
          bottomRight: 16
        })
        .padding(12)
        .constraintSize({ maxWidth: '70%' })
      }
      .width('100%')
      .alignItems(VerticalAlign.Bottom)
    }
    .width('100%')
    .padding({ horizontal: 12, vertical: 4 })
    .alignItems(HorizontalAlign.Start)
  }

  private getAvatarText(): string {
    if (this.agentName && this.agentName.length > 0) {
      return this.agentName.charAt(0).toUpperCase();
    }
    return 'AI';
  }
}

/**
 * 正在输入指示器
 */
@Component
export struct TypingIndicator {
  @State dotScale1: number = 0.6;
  @State dotScale2: number = 0.6;
  @State dotScale3: number = 0.6;

  aboutToAppear() {
    this.startAnimation();
  }

  private startAnimation() {
    // 使用定时器模拟动画
    setInterval(() => {
      this.dotScale1 = this.dotScale1 === 0.6 ? 1.0 : 0.6;
    }, 600);

    setTimeout(() => {
      setInterval(() => {
        this.dotScale2 = this.dotScale2 === 0.6 ? 1.0 : 0.6;
      }, 600);
    }, 200);

    setTimeout(() => {
      setInterval(() => {
        this.dotScale3 = this.dotScale3 === 0.6 ? 1.0 : 0.6;
      }, 600);
    }, 400);
  }

  build() {
    Row() {
      // 头像
      Column() {
        Text('AI')
          .fontSize(14)
          .fontColor(Colors.textOnSecondary)
          .fontWeight(FontWeight.Bold)
      }
      .width(36)
      .height(36)
      .backgroundColor(Colors.secondaryContainer)
      .borderRadius(18)
      .justifyContent(FlexAlign.Center)
      .margin({ right: 8 })

      // 输入动画
      Row() {
        this.DotBuilder(this.dotScale1)
        this.DotBuilder(this.dotScale2)
          .margin({ left: 4 })
        this.DotBuilder(this.dotScale3)
          .margin({ left: 4 })
      }
      .backgroundColor(Colors.surfaceVariant)
      .borderRadius(16)
      .padding({ horizontal: 16, vertical: 12 })
    }
    .width('100%')
    .padding({ horizontal: 12, vertical: 4 })
    .alignItems(VerticalAlign.Bottom)
  }

  @Builder
  DotBuilder(scale: number) {
    Column()
      .width(8)
      .height(8)
      .backgroundColor(Colors.textSecondary)
      .borderRadius(4)
      .scale({ x: scale, y: scale })
  }
}
