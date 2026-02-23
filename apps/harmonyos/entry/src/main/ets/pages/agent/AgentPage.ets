import { AgentViewModel, AgentActionResultType } from '../../viewmodel/AgentViewModel';
import { AgentCard, AgentDetailCard, CreateAgentForm } from '../../components/AgentCard';
import { Agent, AgentCategory } from '../../model/Agent';
import { Colors } from '../../constants/Colors';
import { promptAction, router } from '@kit.ArkUI';

/**
 * 代理管理页面
 * 显示、创建、编辑和删除AI代理
 */
@Entry
@Component
struct AgentPage {
  @State viewModel: AgentViewModel = AgentViewModel.getInstance();
  @State isRefreshing: boolean = false;

  // 表单数据
  @State formName: string = '';
  @State formRole: string = '';
  @State formDescription: string = '';
  @State formSystemPrompt: string = '';
  @State formCategory: AgentCategory = AgentCategory.GENERAL;

  aboutToAppear() {
    // 设置操作结果回调
    this.viewModel.setActionResultCallback((result) => {
      if (result.type === AgentActionResultType.SUCCESS) {
        promptAction.showToast({ message: result.message || '操作成功' });
      } else if (result.type === AgentActionResultType.ERROR) {
        promptAction.showToast({ message: result.message || '操作失败' });
      }
    });
  }

  aboutToDisappear() {
    this.viewModel.destroy();
  }

  build() {
    Column() {
      // 顶部导航栏
      this.TopBarBuilder()

      // 类别筛选栏
      this.CategoryFilterBuilder()

      // 代理列表
      this.AgentListBuilder()
        .layoutWeight(1)

      // 新建按钮
      Button() {
        Row() {
          Image($r('app.media.ic_add'))
            .width(20)
            .height(20)
            .fillColor(Colors.textOnPrimary)

          Text('新建代理')
            .fontSize(14)
            .fontColor(Colors.textOnPrimary)
            .margin({ left: 4 })
        }
      }
      .type(ButtonType.Capsule)
      .backgroundColor(Colors.primary)
      .padding({ horizontal: 16, vertical: 8 })
      .margin(16)
      .onClick(() => {
        this.viewModel.showCreateDialog();
      })
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

      Text('AI代理管理')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor(Colors.textOnPrimary)
        .layoutWeight(1)

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
        promptAction.showToast({ message: '搜索功能开发中' });
      })

      // 同步按钮
      Button() {
        Image($r('app.media.ic_sync'))
          .width(24)
          .height(24)
          .fillColor(Colors.textOnPrimary)
      }
      .type(ButtonType.Circle)
      .backgroundColor(Color.Transparent)
      .margin({ left: 8 })
      .onClick(() => {
        this.viewModel.syncAgentsFromServer();
      })
    }
    .width('100%')
    .height(56)
    .padding({ horizontal: 8 })
    .backgroundColor(Colors.primary)
    .justifyContent(FlexAlign.SpaceBetween)
  }

  @Builder
  CategoryFilterBuilder() {
    Scroll() {
      Row() {
        this.CategoryTabBuilder('全部', this.viewModel.uiState.selectedCategory === null, () => {
          this.viewModel.filterByCategory(null);
        });

        ForEach(this.viewModel.getAllCategories(), (category: AgentCategory) => {
          this.CategoryTabBuilder(
            this.getCategoryName(category),
            this.viewModel.uiState.selectedCategory === category,
            () => {
              this.viewModel.filterByCategory(category);
            }
          );
        })
      }
      .padding({ horizontal: 16, vertical: 8 })
    }
    .width('100%')
    .scrollable(ScrollDirection.Horizontal)
    .backgroundColor(Colors.surface)
  }

  @Builder
  CategoryTabBuilder(label: string, isSelected: boolean, onClick: () => void) {
    Text(label)
      .fontSize(14)
      .fontColor(isSelected ? Colors.primary : Colors.textSecondary)
      .fontWeight(isSelected ? FontWeight.Medium : FontWeight.Normal)
      .backgroundColor(isSelected ? Colors.primaryContainer : Color.Transparent)
      .borderRadius(16)
      .padding({ horizontal: 12, vertical: 6 })
      .margin({ right: 8 })
      .onClick(onClick)
  }

  @Builder
  AgentListBuilder() {
    Refresh({ refreshing: $$this.isRefreshing }) {
      if (this.viewModel.uiState.isLoading && this.viewModel.uiState.agents.length === 0) {
        // 加载中
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
            .color(Colors.primary)

          Text('加载代理中...')
            .fontSize(14)
            .fontColor(Colors.textSecondary)
            .margin({ top: 12 })
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
      } else if (this.viewModel.uiState.agents.length === 0) {
        // 空状态
        Column() {
          Image($r('app.media.ic_smart_toy'))
            .width(64)
            .height(64)
            .fillColor(Colors.primary)
            .opacity(0.5)

          Text('暂无代理')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
            .fontColor(Colors.textPrimary)
            .margin({ top: 16 })

          Text('点击右下角按钮创建你的第一个AI代理')
            .fontSize(14)
            .fontColor(Colors.textSecondary)
            .margin({ top: 8 })

          Button('创建代理')
            .type(ButtonType.Capsule)
            .backgroundColor(Colors.primary)
            .margin({ top: 16 })
            .onClick(() => {
              this.viewModel.showCreateDialog();
            })
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
      } else {
        // 代理列表
        List() {
          ForEach(this.viewModel.uiState.agents, (agent: Agent) => {
            ListItem() {
              AgentCard({
                agent: agent,
                isSelected: this.viewModel.uiState.selectedAgent?.id === agent.id,
                onClick: () => {
                  this.viewModel.selectAgent(agent);
                  this.viewModel.showEditDialog();
                },
                onToggleActive: (isActive: boolean) => {
                  this.viewModel.toggleAgentActive(agent.id, isActive);
                }
              })
            }
            .padding({ horizontal: 16, vertical: 6 })
          }, (agent: Agent) => agent.id)
        }
        .width('100%')
        .height('100%')
        .padding({ vertical: 8 })
        .edgeEffect(EdgeEffect.Spring)
        .scrollBar(BarState.Auto)
      }
    }
    .onRefreshing(() => {
      this.viewModel.syncAgentsFromServer().then(() => {
        this.isRefreshing = false;
      });
    })
  }

  private getCategoryName(category: AgentCategory): string {
    switch (category) {
      case AgentCategory.GENERAL:
        return '通用';
      case AgentCategory.CODING:
        return '编程';
      case AgentCategory.WRITING:
        return '写作';
      case AgentCategory.TRANSLATION:
        return '翻译';
      case AgentCategory.ANALYSIS:
        return '分析';
      case AgentCategory.CUSTOM:
        return '自定义';
      default:
        return '通用';
    }
  }
}
