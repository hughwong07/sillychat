import { Colors } from '../constants/Colors';

/**
 * 消息输入组件
 * 包含文本输入框、发送按钮和附件按钮
 */
@Component
export struct MessageInput {
  @State inputText: string = '';
  @Prop enabled: boolean = true;
  @Prop isSending: boolean = false;
  @Prop placeholder: string = '输入消息...';

  // 回调事件
  onSend?: (text: string) => void;
  onAttachClick?: () => void;
  onVoiceClick?: () => void;

  build() {
    Column() {
      Row() {
        // 附件按钮
        if (this.onAttachClick) {
          Button() {
            Image($r('app.media.ic_attach_file'))
              .width(24)
              .height(24)
              .fillColor(Colors.textSecondary)
          }
          .type(ButtonType.Circle)
          .backgroundColor(Color.Transparent)
          .enabled(this.enabled && !this.isSending)
          .onClick(() => {
            if (this.onAttachClick) {
              this.onAttachClick();
            }
          })
          .margin({ right: 8 })
        }

        // 语音按钮（当输入为空时显示）
        if (this.onVoiceClick && this.inputText.length === 0) {
          Button() {
            Image($r('app.media.ic_mic'))
              .width(24)
              .height(24)
              .fillColor(Colors.textSecondary)
          }
          .type(ButtonType.Circle)
          .backgroundColor(Color.Transparent)
          .enabled(this.enabled)
          .onClick(() => {
            if (this.onVoiceClick) {
              this.onVoiceClick();
            }
          })
          .margin({ right: 8 })
        }

        // 输入框
        TextInput({ placeholder: this.placeholder, text: $$this.inputText })
          .placeholderColor(Colors.textTertiary)
          .fontSize(16)
          .height(48)
          .backgroundColor(Colors.surface)
          .borderRadius(24)
          .padding({ left: 16, right: 16 })
          .layoutWeight(1)
          .enabled(this.enabled && !this.isSending)
          .maxLines(5)
          .enterKeyType(EnterKeyType.Send)
          .onSubmit(() => {
            this.handleSend();
          })

        // 发送按钮
        Button() {
          if (this.isSending) {
            LoadingProgress()
              .width(20)
              .height(20)
              .color(Colors.textOnPrimary)
          } else {
            Image($r('app.media.ic_send'))
              .width(24)
              .height(24)
              .fillColor(Colors.textOnPrimary)
          }
        }
        .type(ButtonType.Circle)
        .width(48)
        .height(48)
        .backgroundColor(this.canSend() ? Colors.primary : Colors.primaryDisabled)
        .enabled(this.canSend())
        .margin({ left: 8 })
        .onClick(() => {
          this.handleSend();
        })
      }
      .width('100%')
      .padding({ horizontal: 12, vertical: 8 })
      .alignItems(VerticalAlign.Bottom)
    }
    .width('100%')
    .backgroundColor(Colors.surface)
    .shadow({
      radius: 4,
      color: Colors.shadow,
      offsetY: -2
    })
  }

  /**
   * 处理发送
   */
  private handleSend(): void {
    const text = this.inputText.trim();
    if (text.length > 0 && this.enabled && !this.isSending) {
      if (this.onSend) {
        this.onSend(text);
      }
      this.inputText = '';
    }
  }

  /**
   * 是否可以发送
   */
  private canSend(): boolean {
    return this.inputText.trim().length > 0 && this.enabled && !this.isSending;
  }
}

/**
 * 扩展输入栏
 * 包含更多功能按钮
 */
@Component
export struct ExtendedMessageInput {
  @State inputText: string = '';
  @State showAttachmentMenu: boolean = false;
  @Prop enabled: boolean = true;
  @Prop isSending: boolean = false;

  // 回调事件
  onSend?: (text: string) => void;
  onImageClick?: () => void;
  onCameraClick?: () => void;
  onFileClick?: () => void;
  onVoiceClick?: () => void;

  build() {
    Column() {
      // 附件菜单
      if (this.showAttachmentMenu) {
        this.AttachmentMenuBuilder()
      }

      // 输入栏
      MessageInput({
        inputText: this.inputText,
        enabled: this.enabled,
        isSending: this.isSending,
        onSend: this.onSend,
        onAttachClick: () => {
          this.showAttachmentMenu = !this.showAttachmentMenu;
        },
        onVoiceClick: this.onVoiceClick
      })
    }
    .width('100%')
  }

  @Builder
  AttachmentMenuBuilder() {
    Row() {
      this.AttachmentMenuItemBuilder(
        $r('app.media.ic_image'),
        '图片',
        () => {
          if (this.onImageClick) {
            this.onImageClick();
          }
          this.showAttachmentMenu = false;
        }
      )

      this.AttachmentMenuItemBuilder(
        $r('app.media.ic_camera'),
        '相机',
        () => {
          if (this.onCameraClick) {
            this.onCameraClick();
          }
          this.showAttachmentMenu = false;
        }
      )

      this.AttachmentMenuItemBuilder(
        $r('app.media.ic_folder'),
        '文件',
        () => {
          if (this.onFileClick) {
            this.onFileClick();
          }
          this.showAttachmentMenu = false;
        }
      )
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Colors.surface)
    .borderRadius({ topLeft: 16, topRight: 16 })
    .shadow({ radius: 4, color: Colors.shadow })
    .justifyContent(FlexAlign.SpaceEvenly)
  }

  @Builder
  AttachmentMenuItemBuilder(icon: Resource, label: string, onClick: () => void) {
    Column() {
      Button() {
        Image(icon)
          .width(28)
          .height(28)
          .fillColor(Colors.textOnPrimary)
      }
      .type(ButtonType.Circle)
      .width(56)
      .height(56)
      .backgroundColor(Colors.primary)
      .onClick(onClick)

      Text(label)
        .fontSize(12)
        .fontColor(Colors.textSecondary)
        .margin({ top: 4 })
    }
  }
}

/**
 * 语音输入面板
 */
@Component
export struct VoiceInputPanel {
  @Prop isRecording: boolean = false;

  // 回调事件
  onStartRecording?: () => void;
  onStopRecording?: () => void;

  build() {
    Column() {
      // 录音按钮
      Button() {
        Image($r('app.media.ic_mic'))
          .width(36)
          .height(36)
          .fillColor(this.isRecording ? Colors.textOnError : Colors.textOnPrimary)
      }
      .type(ButtonType.Circle)
      .width(72)
      .height(72)
      .backgroundColor(this.isRecording ? Colors.error : Colors.primary)
      .onClick(() => {
        if (this.isRecording) {
          if (this.onStopRecording) {
            this.onStopRecording();
          }
        } else {
          if (this.onStartRecording) {
            this.onStartRecording();
          }
        }
      })

      Text(this.isRecording ? '录音中...' : '按住说话')
        .fontSize(16)
        .fontColor(this.isRecording ? Colors.error : Colors.textPrimary)
        .margin({ top: 16 })

      if (this.isRecording) {
        // 录音波形动画
        this.RecordingWaveformBuilder()
          .margin({ top: 8 })
      }
    }
    .width('100%')
    .padding(24)
    .backgroundColor(Colors.surface)
    .alignItems(HorizontalAlign.Center)
  }

  @Builder
  RecordingWaveformBuilder() {
    Row() {
      this.WaveformBarBuilder()
      this.WaveformBarBuilder()
        .margin({ left: 4 })
      this.WaveformBarBuilder()
        .margin({ left: 4 })
      this.WaveformBarBuilder()
        .margin({ left: 4 })
      this.WaveformBarBuilder()
        .margin({ left: 4 })
    }
    .height(24)
    .alignItems(VerticalAlign.Center)
  }

  @Builder
  WaveformBarBuilder() {
    Column()
      .width(4)
      .height(Math.random() * 16 + 8)
      .backgroundColor(Colors.error)
      .borderRadius(2)
  }
}
