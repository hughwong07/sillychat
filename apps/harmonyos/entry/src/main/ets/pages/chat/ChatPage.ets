import { ChatViewModel } from '../../viewmodel/ChatViewModel';
import { MessageItem, StreamingMessageItem, TypingIndicator } from '../../components/MessageItem';
import { MessageInput } from '../../components/MessageInput';
import { Agent } from '../../model/Agent';
import { Colors } from '../../constants/Colors';
import { promptAction, router } from '@kit.ArkUI';

/**
 * 聊天页面（主页面）
 * 显示消息列表和输入框
 */
@Entry
@Component
struct ChatPage {
  @State viewModel: ChatViewModel = ChatViewModel.getInstance();
  @State scrollOffset: number = 0;
  private listScroller: ListScroller = new ListScroller();

  aboutToAppear() {
    // 页面加载时滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  aboutToDisappear() {
    this.viewModel.destroy();
  }

  build() {
    Column() {
      // 顶部导航栏
      this.TopBarBuilder()

      // 消息列表
      this.MessageListBuilder()
        .layoutWeight(1)

      // 错误提示
      if (this.viewModel.uiState.error) {
        this.ErrorBarBuilder(this.viewModel.uiState.error)
      }

      // 输入框
      MessageInput({
        enabled: !this.viewModel.uiState.isLoading,
        isSending: this.viewModel.uiState.isSending,
        onSend: (text: string) => {
          this.viewModel.onInputChange(text);
          this.viewModel.sendMessage();
          this.scrollToBottom();
        },
        onAttachClick: () => {
          promptAction.showToast({ message: '附件功能开发中' });
        }
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Colors.background)
  }

  @Builder
  TopBarBuilder() {
    Row() {
      // 个人资料按钮
      Button() {
        Image($r('app.media.ic_person'))
          .width(24)
          .height(24)
          .fillColor(Colors.textOnPrimary)
      }
      .type(ButtonType.Circle)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        router.pushUrl({ url: 'pages/profile/ProfilePage' });
      })

      // 标题和代理选择
      Column() {
        Text(this.viewModel.uiState.selectedAgent?.name ?? 'SillyChat')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor(Colors.textOnPrimary)

        if (this.viewModel.uiState.availableAgents.length > 1) {
          Text('点击切换代理')
            .fontSize(12)
            .fontColor(Colors.textOnPrimarySecondary)
        }
      }
      .layoutWeight(1)
      .onClick(() => {
        this.showAgentSelector();
      })

      // AI代理按钮
      Button() {
        Image($r('app.media.ic_smart_toy'))
          .width(24)
          .height(24)
          .fillColor(Colors.textOnPrimary)
      }
      .type(ButtonType.Circle)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        router.pushUrl({ url: 'pages/agent/AgentPage' });
      })

      // 设置按钮
      Button() {
        Image($r('app.media.ic_settings'))
          .width(24)
          .height(24)
          .fillColor(Colors.textOnPrimary)
      }
      .type(ButtonType.Circle)
      .backgroundColor(Color.Transparent)
      .margin({ left: 8 })
      .onClick(() => {
        router.pushUrl({ url: 'pages/settings/SettingsPage' });
      })
    }
    .width('100%')
    .height(56)
    .padding({ horizontal: 8 })
    .backgroundColor(Colors.primary)
    .justifyContent(FlexAlign.SpaceBetween)
  }

  @Builder
  MessageListBuilder() {
    Stack({ alignContent: Alignment.BottomEnd }) {
      if (this.viewModel.uiState.isLoading && this.viewModel.uiState.messages.length === 0) {
        // 加载中
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
            .color(Colors.primary)

          Text('加载消息中...')
            .fontSize(14)
            .fontColor(Colors.textSecondary)
            .margin({ top: 12 })
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
      } else if (this.viewModel.uiState.messages.length === 0 && !this.viewModel.uiState.isLoading) {
        // 空状态
        Column() {
          Image($r('app.media.ic_chat'))
            .width(64)
            .height(64)
            .fillColor(Colors.primary)
            .opacity(0.5)

          Text('开始聊天')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
            .fontColor(Colors.textPrimary)
            .margin({ top: 16 })

          Text('发送消息开始与AI助手对话')
            .fontSize(14)
            .fontColor(Colors.textSecondary)
            .margin({ top: 8 })
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
      } else {
        // 消息列表
        List({ scroller: this.listScroller }) {
          // 流式响应显示
          if (this.viewModel.uiState.isSending && this.viewModel.uiState.streamingContent.length > 0) {
            ListItem() {
              StreamingMessageItem({
                content: this.viewModel.uiState.streamingContent,
                agentName: this.viewModel.uiState.selectedAgent?.name
              })
            }
          }

          // 消息列表（反转显示）
          ForEach(this.viewModel.getReversedMessages(), (message, index) => {
            ListItem() {
              MessageItem({
                message: message,
                isLast: index === 0,
                onLongPress: () => {
                  this.showMessageActions(message.id);
                }
              })
            }
          }, (message, index) => message.id)

          // 加载更多指示器
          if (this.viewModel.uiState.hasMoreMessages) {
            ListItem() {
              Row() {
                LoadingProgress()
                  .width(20)
                  .height(20)
                  .color(Colors.primary)

                Text('加载更多...')
                  .fontSize(12)
                  .fontColor(Colors.textSecondary)
                  .margin({ left: 8 })
              }
              .width('100%')
              .padding(12)
              .justifyContent(FlexAlign.Center)
              .onClick(() => {
                this.viewModel.loadMoreMessages();
              })
            }
          }
        }
        .width('100%')
        .height('100%')
        .padding({ vertical: 8 })
        .edgeEffect(EdgeEffect.Spring)
        .scrollBar(BarState.Auto)
        .reverse(true)

        // 滚动到底部按钮
        if (this.showScrollToBottomButton()) {
          Button() {
            Image($r('app.media.ic_arrow_down'))
              .width(20)
              .height(20)
              .fillColor(Colors.primary)
          }
          .type(ButtonType.Circle)
          .width(40)
          .height(40)
          .backgroundColor(Colors.surface)
          .shadow({ radius: 4, color: Colors.shadow })
          .margin({ right: 16, bottom: 80 })
          .onClick(() => {
            this.scrollToBottom();
          })
        }
      }
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  ErrorBarBuilder(error: string) {
    Row() {
      Text(error)
        .fontSize(14)
        .fontColor(Colors.textOnError)
        .layoutWeight(1)
        .maxLines(2)

      Button() {
        Text('确定')
          .fontSize(12)
          .fontColor(Colors.textOnError)
      }
      .type(ButtonType.Capsule)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        this.viewModel.clearError();
      })
    }
    .width('100%')
    .padding(12)
    .backgroundColor(Colors.error)
  }

  /**
   * 滚动到底部
   */
  private scrollToBottom(): void {
    this.listScroller.scrollEdge(Edge.Top);
  }

  /**
   * 是否显示滚动到底部按钮
   */
  private showScrollToBottomButton(): boolean {
    // 简化判断，实际应该根据滚动位置判断
    return false;
  }

  /**
   * 显示代理选择器
   */
  private showAgentSelector(): void {
    const agents = this.viewModel.uiState.availableAgents;
    if (agents.length <= 1) {
      return;
    }

    // 使用ActionSheet显示代理选择
    const options = agents.map(agent => ({
      title: agent.name + (agent.id === this.viewModel.uiState.selectedAgent?.id ? ' ✓' : ''),
      action: () => {
        this.viewModel.selectAgent(agent);
      }
    }));

    // 显示选择对话框
    promptAction.showActionMenu({
      title: '选择AI代理',
      buttons: options.map((opt, index) => ({
        text: opt.title,
        color: Colors.textPrimary
      }))
    }).then((result) => {
      if (result.index >= 0 && result.index < options.length) {
        options[result.index].action();
      }
    });
  }

  /**
   * 显示消息操作菜单
   */
  private showMessageActions(messageId: string): void {
    promptAction.showActionMenu({
      title: '消息操作',
      buttons: [
        { text: '复制', color: Colors.textPrimary },
        { text: '删除', color: Colors.error },
        { text: '取消', color: Colors.textSecondary }
      ]
    }).then((result) => {
      switch (result.index) {
        case 0:
          // 复制
          promptAction.showToast({ message: '已复制到剪贴板' });
          break;
        case 1:
          // 删除
          this.viewModel.deleteMessage(messageId);
          break;
      }
    });
  }
}
