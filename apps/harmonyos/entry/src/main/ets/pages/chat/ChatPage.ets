import { ChatViewModel } from '../../viewmodel/ChatViewModel';
import { MessageItem, StreamingMessageItem, TypingIndicator } from '../../components/MessageItem';
import { MessageInput } from '../../components/MessageInput';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { LoadingMore } from '../../components/LoadingMore';
import { Agent } from '../../model/Agent';
import { Message, MessageRole } from '../../model/Message';
import { Colors } from '../../constants/Colors';
import { promptAction, router, clipboard } from '@kit.ArkUI';
import { Logger } from '../../utils/Logger';

const TAG = 'ChatPage';

/**
 * 聊天页面（主页面）
 * 显示消息列表和输入框
 */
@Entry
@Component
struct ChatPage {
  @State viewModel: ChatViewModel = ChatViewModel.getInstance();
  @State scrollOffset: number = 0;
  @State isSearchMode: boolean = false;
  @State searchQuery: string = '';
  @State searchResults: Message[] = [];
  @State showScrollToBottom: boolean = false;
  @State streamingText: string = '';
  @State typingAnimationId: number = -1;

  private listScroller: ListScroller = new ListScroller();
  private streamingInterval: number = -1;

  aboutToAppear() {
    Logger.info(TAG, 'ChatPage appearing');
    // 页面加载时滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  aboutToDisappear() {
    Logger.info(TAG, 'ChatPage disappearing');
    this.clearTypingAnimation();
    this.viewModel.destroy();
  }

  /**
   * 清除打字机动画
   */
  private clearTypingAnimation(): void {
    if (this.typingAnimationId !== -1) {
      clearInterval(this.typingAnimationId);
      this.typingAnimationId = -1;
    }
  }

  /**
   * 启动打字机效果
   */
  private startTypingAnimation(fullText: string): void {
    this.clearTypingAnimation();
    this.streamingText = '';
    let index = 0;

    this.typingAnimationId = setInterval(() => {
      if (index < fullText.length) {
        this.streamingText += fullText.charAt(index);
        index++;
      } else {
        this.clearTypingAnimation();
      }
    }, 30); // 每个字符30ms
  }

  build() {
    Column() {
      // 顶部导航栏
      if (this.isSearchMode) {
        this.SearchBarBuilder()
      } else {
        this.TopBarBuilder()
      }

      // 搜索结果列表或消息列表
      if (this.isSearchMode && this.searchQuery.length > 0) {
        this.SearchResultsBuilder()
      } else {
        this.MessageListBuilder()
          .layoutWeight(1)
      }

      // 错误提示
      if (this.viewModel.uiState.error) {
        this.ErrorBarBuilder(this.viewModel.uiState.error)
      }

      // 输入框（搜索模式下隐藏）
      if (!this.isSearchMode) {
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

      // 搜索按钮
      Button() {
        Image($r('app.media.ic_search'))
          .width(24)
          .height(24)
          .fillColor(Colors.textOnPrimary)
      }
      .type(ButtonType.Circle)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        this.isSearchMode = true;
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
      .margin({ left: 8 })
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
  SearchBarBuilder() {
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
        this.isSearchMode = false;
        this.searchQuery = '';
        this.searchResults = [];
      })

      // 搜索输入框
      Row() {
        Image($r('app.media.ic_search'))
          .width(20)
          .height(20)
          .fillColor(Colors.textOnPrimarySecondary)
          .margin({ left: 12, right: 8 })

        TextInput({ placeholder: '搜索消息...', text: $$this.searchQuery })
          .placeholderColor(Colors.textOnPrimarySecondary)
          .fontSize(16)
          .fontColor(Colors.textOnPrimary)
          .backgroundColor(Color.Transparent)
          .height('100%')
          .layoutWeight(1)
          .onChange((value: string) => {
            this.searchQuery = value;
            this.performSearch(value);
          })

        if (this.searchQuery.length > 0) {
          Button() {
            Image($r('app.media.ic_close'))
              .width(16)
              .height(16)
              .fillColor(Colors.textOnPrimarySecondary)
          }
          .type(ButtonType.Circle)
          .backgroundColor(Color.Transparent)
          .width(32)
          .height(32)
          .margin({ right: 8 })
          .onClick(() => {
            this.searchQuery = '';
            this.searchResults = [];
          })
        }
      }
      .height(44)
      .layoutWeight(1)
      .backgroundColor('rgba(255,255,255,0.2)')
      .borderRadius(22)
      .margin({ left: 8 })
    }
    .width('100%')
    .height(56)
    .padding({ horizontal: 8 })
    .backgroundColor(Colors.primary)
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
        EmptyState({
          icon: $r('app.media.ic_chat'),
          title: '开始聊天',
          description: '发送消息开始与AI助手对话',
          showIcon: true
        })
      } else {
        // 消息列表
        List({ scroller: this.listScroller }) {
          // 流式响应显示（打字机效果）
          if (this.viewModel.uiState.isSending && this.viewModel.uiState.streamingContent.length > 0) {
            ListItem() {
              StreamingMessageItem({
                content: this.viewModel.uiState.streamingContent,
                agentName: this.viewModel.uiState.selectedAgent?.name
              })
            }
          }

          // 消息列表（反转显示）
          ForEach(this.viewModel.getReversedMessages(), (message: Message, index: number) => {
            ListItem() {
              MessageItem({
                message: message,
                isLast: index === 0,
                onLongPress: () => {
                  this.showMessageActions(message);
                }
              })
            }
          }, (message: Message, index: number) => message.id)

          // 加载更多指示器
          if (this.viewModel.uiState.hasMoreMessages) {
            ListItem() {
              LoadingMore({
                isLoading: this.viewModel.uiState.isLoading,
                hasMore: true,
                onLoadMore: () => {
                  this.viewModel.loadMoreMessages();
                }
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
        .onScroll((scrollOffset: number, scrollState: ScrollState) => {
          // 检测是否显示滚动到底部按钮
          this.showScrollToBottom = scrollOffset < -100;
        })

        // 滚动到底部按钮
        if (this.showScrollToBottom) {
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
          .margin({ right: 16, bottom: 16 })
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
  SearchResultsBuilder() {
    Column() {
      if (this.searchResults.length === 0) {
        EmptyState({
          icon: $r('app.media.ic_search'),
          title: '未找到结果',
          description: `未找到包含 "${this.searchQuery}" 的消息`,
          showIcon: true
        })
      } else {
        // 搜索结果统计
        Text(`找到 ${this.searchResults.length} 条结果`)
          .fontSize(14)
          .fontColor(Colors.textSecondary)
          .padding({ horizontal: 16, vertical: 12 })
          .alignSelf(ItemAlign.Start)

        List() {
          ForEach(this.searchResults, (message: Message, index: number) => {
            ListItem() {
              MessageItem({
                message: message,
                isLast: false,
                onLongPress: () => {
                  this.showMessageActions(message);
                }
              })
            }
            .onClick(() => {
              // 点击跳转到该消息位置
              this.isSearchMode = false;
              this.searchQuery = '';
              this.searchResults = [];
              // TODO: 滚动到指定消息
            })
          }, (message: Message) => message.id)
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ vertical: 8 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Colors.background)
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
   * 执行搜索
   */
  private performSearch(query: string): void {
    if (query.length === 0) {
      this.searchResults = [];
      return;
    }
    this.searchResults = this.viewModel.searchMessages(query);
  }

  /**
   * 滚动到底部
   */
  private scrollToBottom(): void {
    this.listScroller.scrollEdge(Edge.Top);
    this.showScrollToBottom = false;
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
  private showMessageActions(message: Message): void {
    const buttons: { text: string; color: ResourceColor }[] = [
      { text: '复制', color: Colors.textPrimary },
      { text: '转发', color: Colors.textPrimary }
    ];

    // 只有用户自己的消息可以删除
    if (message.role === MessageRole.USER) {
      buttons.push({ text: '删除', color: Colors.error });
    }

    buttons.push({ text: '取消', color: Colors.textSecondary });

    promptAction.showActionMenu({
      title: '消息操作',
      buttons: buttons
    }).then((result) => {
      const buttonText = buttons[result.index]?.text;
      switch (buttonText) {
        case '复制':
          this.copyMessage(message.content);
          break;
        case '转发':
          this.forwardMessage(message);
          break;
        case '删除':
          this.confirmDeleteMessage(message.id);
          break;
      }
    });
  }

  /**
   * 复制消息到剪贴板
   */
  private copyMessage(content: string): void {
    try {
      clipboard.setText(content);
      promptAction.showToast({ message: '已复制到剪贴板' });
    } catch (error) {
      Logger.error(TAG, `Copy message error: ${JSON.stringify(error)}`);
      promptAction.showToast({ message: '复制失败' });
    }
  }

  /**
   * 转发消息
   */
  private forwardMessage(message: Message): void {
    // TODO: 实现转发功能
    promptAction.showToast({ message: '转发功能开发中' });
  }

  /**
   * 确认删除消息
   */
  private confirmDeleteMessage(messageId: string): void {
    promptAction.showDialog({
      title: '删除消息',
      message: '确定要删除这条消息吗？此操作不可恢复。',
      buttons: [
        { text: '取消', color: Colors.textSecondary },
        { text: '删除', color: Colors.error }
      ]
    }).then((result) => {
      if (result.index === 1) {
        this.viewModel.deleteMessage(messageId);
        promptAction.showToast({ message: '消息已删除' });
      }
    });
  }
}
