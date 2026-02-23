import { AgentViewModel, AgentActionResultType } from '../../viewmodel/AgentViewModel';
import { AgentCard, AgentDetailCard, CreateAgentForm } from '../../components/AgentCard';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { Agent, AgentCategory } from '../../model/Agent';
import { Colors } from '../../constants/Colors';
import { promptAction, router } from '@kit.ArkUI';
import { Logger } from '../../utils/Logger';

const TAG = 'AgentPage';

/**
 * 代理管理页面
 * 显示、创建、编辑和删除AI代理
 */
@Entry
@Component
struct AgentPage {
  @State viewModel: AgentViewModel = AgentViewModel.getInstance();
  @State isRefreshing: boolean = false;
  @State isSearchMode: boolean = false;
  @State searchQuery: string = '';

  // 表单数据
  @State formName: string = '';
  @State formRole: string = '';
  @State formDescription: string = '';
  @State formSystemPrompt: string = '';
  @State formCategory: AgentCategory = AgentCategory.GENERAL;
  @State formTemperature: number = 0.7;
  @State formMaxTokens: number = 2000;

  // 对话框显示状态
  @State showCreateDialog: boolean = false;
  @State showEditDialog: boolean = false;
  @State showDeleteDialog: boolean = false;
  @State showDetailDialog: boolean = false;

  aboutToAppear() {
    Logger.info(TAG, 'AgentPage appearing');
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
    Logger.info(TAG, 'AgentPage disappearing');
    this.viewModel.destroy();
  }

  build() {
    Stack() {
      Column() {
        // 顶部导航栏
        if (this.isSearchMode) {
          this.SearchBarBuilder()
        } else {
          this.TopBarBuilder()
        }

        // 类别筛选栏（非搜索模式下显示）
        if (!this.isSearchMode) {
          this.CategoryFilterBuilder()
        }

        // 代理列表
        this.AgentListBuilder()
          .layoutWeight(1)

        // 新建按钮（非搜索模式下显示）
        if (!this.isSearchMode) {
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
            this.resetForm();
            this.showCreateDialog = true;
          })
        }
      }
      .width('100%')
      .height('100%')
      .backgroundColor(Colors.background)

      // 创建代理对话框
      if (this.showCreateDialog) {
        this.CreateAgentDialogBuilder()
      }

      // 编辑代理对话框
      if (this.showEditDialog) {
        this.EditAgentDialogBuilder()
      }

      // 删除确认对话框
      if (this.showDeleteDialog) {
        this.DeleteConfirmDialogBuilder()
      }

      // 详情对话框
      if (this.showDetailDialog) {
        this.AgentDetailDialogBuilder()
      }
    }
    .width('100%')
    .height('100%')
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
        this.isSearchMode = true;
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
        this.viewModel.updateSearchQuery('');
      })

      // 搜索输入框
      Row() {
        Image($r('app.media.ic_search'))
          .width(20)
          .height(20)
          .fillColor(Colors.textOnPrimarySecondary)
          .margin({ left: 12, right: 8 })

        TextInput({ placeholder: '搜索代理...', text: $$this.searchQuery })
          .placeholderColor(Colors.textOnPrimarySecondary)
          .fontSize(16)
          .fontColor(Colors.textOnPrimary)
          .backgroundColor(Color.Transparent)
          .height('100%')
          .layoutWeight(1)
          .onChange((value: string) => {
            this.searchQuery = value;
            this.viewModel.updateSearchQuery(value);
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
            this.viewModel.updateSearchQuery('');
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
        EmptyState({
          icon: $r('app.media.ic_smart_toy'),
          title: this.isSearchMode ? '未找到代理' : '暂无代理',
          description: this.isSearchMode
            ? '尝试其他搜索关键词'
            : '点击右下角按钮创建你的第一个AI代理',
          buttonText: this.isSearchMode ? '' : '创建代理',
          onButtonClick: () => {
            this.resetForm();
            this.showCreateDialog = true;
          }
        })
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
                  this.showDetailDialog = true;
                },
                onToggleActive: (isActive: boolean) => {
                  this.viewModel.toggleAgentActive(agent.id, isActive);
                }
              })
            }
            .padding({ horizontal: 16, vertical: 6 })
            .swipeAction({ end: this.DeleteSwipeBuilder(agent) })
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

  @Builder
  DeleteSwipeBuilder(agent: Agent) {
    Row() {
      Button() {
        Image($r('app.media.ic_delete'))
          .width(24)
          .height(24)
          .fillColor(Colors.textOnError)
      }
      .type(ButtonType.Circle)
      .backgroundColor(Colors.error)
      .width(48)
      .height(48)
      .onClick(() => {
        this.viewModel.selectAgent(agent);
        this.showDeleteDialog = true;
      })
    }
    .padding({ right: 16 })
  }

  @Builder
  CreateAgentDialogBuilder() {
    Column() {
      // 遮罩层
      Column()
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0, 0, 0, 0.5)')
        .onClick(() => {
          this.showCreateDialog = false;
        })

      // 对话框内容
      Column() {
        // 标题栏
        Row() {
          Text('创建新代理')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor(Colors.textPrimary)

          Blank()

          Button() {
            Image($r('app.media.ic_close'))
              .width(24)
              .height(24)
              .fillColor(Colors.textSecondary)
          }
          .type(ButtonType.Circle)
          .backgroundColor(Color.Transparent)
          .onClick(() => {
            this.showCreateDialog = false;
          })
        }
        .width('100%')
        .padding(16)

        // 表单内容
        Scroll() {
          Column() {
            // 名称输入
            Text('名称 *')
              .fontSize(14)
              .fontColor(Colors.textSecondary)
              .alignSelf(ItemAlign.Start)
              .margin({ bottom: 8 })

            TextInput({ placeholder: '输入代理名称', text: $$this.formName })
              .placeholderColor(Colors.textTertiary)
              .fontSize(16)
              .height(48)
              .backgroundColor(Colors.surfaceVariant)
              .borderRadius(8)

            // 角色输入
            Text('角色 *')
              .fontSize(14)
              .fontColor(Colors.textSecondary)
              .alignSelf(ItemAlign.Start)
              .margin({ top: 16, bottom: 8 })

            TextInput({ placeholder: '输入代理角色', text: $$this.formRole })
              .placeholderColor(Colors.textTertiary)
              .fontSize(16)
              .height(48)
              .backgroundColor(Colors.surfaceVariant)
              .borderRadius(8)

            // 类别选择
            Text('类别')
              .fontSize(14)
              .fontColor(Colors.textSecondary)
              .alignSelf(ItemAlign.Start)
              .margin({ top: 16, bottom: 8 })

            this.CategorySelectorBuilder()

            // 描述输入
            Text('描述')
              .fontSize(14)
              .fontColor(Colors.textSecondary)
              .alignSelf(ItemAlign.Start)
              .margin({ top: 16, bottom: 8 })

            TextArea({ placeholder: '输入代理描述（可选）', text: $$this.formDescription })
              .placeholderColor(Colors.textTertiary)
              .fontSize(16)
              .height(80)
              .backgroundColor(Colors.surfaceVariant)
              .borderRadius(8)

            // 系统提示词
            Text('系统提示词')
              .fontSize(14)
              .fontColor(Colors.textSecondary)
              .alignSelf(ItemAlign.Start)
              .margin({ top: 16, bottom: 8 })

            TextArea({ placeholder: '输入系统提示词（可选）', text: $$this.formSystemPrompt })
              .placeholderColor(Colors.textTertiary)
              .fontSize(16)
              .height(120)
              .backgroundColor(Colors.surfaceVariant)
              .borderRadius(8)

            // 高级设置
            Text('高级设置')
              .fontSize(14)
              .fontColor(Colors.textSecondary)
              .alignSelf(ItemAlign.Start)
              .margin({ top: 16, bottom: 8 })

            // 温度设置
            Row() {
              Text('温度')
                .fontSize(14)
                .fontColor(Colors.textPrimary)

              Text(`${this.formTemperature.toFixed(1)}`)
                .fontSize(14)
                .fontColor(Colors.primary)

              Slider({
                value: this.formTemperature,
                min: 0,
                max: 2,
                step: 0.1
              })
                .width(150)
                .onChange((value: number) => {
                  this.formTemperature = value;
                })
            }
            .width('100%')
            .justifyContent(FlexAlign.SpaceBetween)

            // 最大令牌数
            Row() {
              Text('最大令牌数')
                .fontSize(14)
                .fontColor(Colors.textPrimary)

              Text(`${this.formMaxTokens}`)
                .fontSize(14)
                .fontColor(Colors.primary)

              Slider({
                value: this.formMaxTokens,
                min: 500,
                max: 4000,
                step: 100
              })
                .width(150)
                .onChange((value: number) => {
                  this.formMaxTokens = value;
                })
            }
            .width('100%')
            .justifyContent(FlexAlign.SpaceBetween)
            .margin({ top: 8 })
          }
          .width('100%')
          .padding({ horizontal: 16, bottom: 16 })
        }
        .layoutWeight(1)

        // 按钮栏
        Row() {
          Button('取消')
            .type(ButtonType.Capsule)
            .backgroundColor(Colors.surfaceVariant)
            .fontColor(Colors.textPrimary)
            .onClick(() => {
              this.showCreateDialog = false;
            })

          Button('创建')
            .type(ButtonType.Capsule)
            .backgroundColor(Colors.primary)
            .fontColor(Colors.textOnPrimary)
            .margin({ left: 12 })
            .enabled(this.isFormValid())
            .onClick(() => {
              this.createAgent();
            })
        }
        .width('100%')
        .padding(16)
        .justifyContent(FlexAlign.End)
      }
      .width('90%')
      .height('80%')
      .backgroundColor(Colors.surface)
      .borderRadius(16)
    }
    .width('100%')
    .height('100%')
    .position({ x: 0, y: 0 })
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }

  @Builder
  EditAgentDialogBuilder() {
    Column() {
      // 遮罩层
      Column()
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0, 0, 0, 0.5)')
        .onClick(() => {
          this.showEditDialog = false;
        })

      // 对话框内容
      Column() {
        // 标题栏
        Row() {
          Text('编辑代理')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor(Colors.textPrimary)

          Blank()

          Button() {
            Image($r('app.media.ic_close'))
              .width(24)
              .height(24)
              .fillColor(Colors.textSecondary)
          }
          .type(ButtonType.Circle)
          .backgroundColor(Color.Transparent)
          .onClick(() => {
            this.showEditDialog = false;
          })
        }
        .width('100%')
        .padding(16)

        // 表单内容（复用创建表单的布局）
        Scroll() {
          Column() {
            if (this.viewModel.uiState.selectedAgent) {
              // 名称输入
              Text('名称 *')
                .fontSize(14)
                .fontColor(Colors.textSecondary)
                .alignSelf(ItemAlign.Start)
                .margin({ bottom: 8 })

              TextInput({ placeholder: '输入代理名称', text: $$this.formName })
                .placeholderColor(Colors.textTertiary)
                .fontSize(16)
                .height(48)
                .backgroundColor(Colors.surfaceVariant)
                .borderRadius(8)

              // 角色输入
              Text('角色 *')
                .fontSize(14)
                .fontColor(Colors.textSecondary)
                .alignSelf(ItemAlign.Start)
                .margin({ top: 16, bottom: 8 })

              TextInput({ placeholder: '输入代理角色', text: $$this.formRole })
                .placeholderColor(Colors.textTertiary)
                .fontSize(16)
                .height(48)
                .backgroundColor(Colors.surfaceVariant)
                .borderRadius(8)

              // 类别选择
              Text('类别')
                .fontSize(14)
                .fontColor(Colors.textSecondary)
                .alignSelf(ItemAlign.Start)
                .margin({ top: 16, bottom: 8 })

              this.CategorySelectorBuilder()

              // 描述输入
              Text('描述')
                .fontSize(14)
                .fontColor(Colors.textSecondary)
                .alignSelf(ItemAlign.Start)
                .margin({ top: 16, bottom: 8 })

              TextArea({ placeholder: '输入代理描述（可选）', text: $$this.formDescription })
                .placeholderColor(Colors.textTertiary)
                .fontSize(16)
                .height(80)
                .backgroundColor(Colors.surfaceVariant)
                .borderRadius(8)

              // 系统提示词
              Text('系统提示词')
                .fontSize(14)
                .fontColor(Colors.textSecondary)
                .alignSelf(ItemAlign.Start)
                .margin({ top: 16, bottom: 8 })

              TextArea({ placeholder: '输入系统提示词（可选）', text: $$this.formSystemPrompt })
                .placeholderColor(Colors.textTertiary)
                .fontSize(16)
                .height(120)
                .backgroundColor(Colors.surfaceVariant)
                .borderRadius(8)
            }
          }
          .width('100%')
          .padding({ horizontal: 16, bottom: 16 })
        }
        .layoutWeight(1)

        // 按钮栏
        Row() {
          Button('删除')
            .type(ButtonType.Capsule)
            .backgroundColor(Colors.errorContainer)
            .fontColor(Colors.error)
            .onClick(() => {
              this.showEditDialog = false;
              this.showDeleteDialog = true;
            })

          Blank()

          Button('取消')
            .type(ButtonType.Capsule)
            .backgroundColor(Colors.surfaceVariant)
            .fontColor(Colors.textPrimary)
            .onClick(() => {
              this.showEditDialog = false;
            })

          Button('保存')
            .type(ButtonType.Capsule)
            .backgroundColor(Colors.primary)
            .fontColor(Colors.textOnPrimary)
            .margin({ left: 12 })
            .enabled(this.isFormValid())
            .onClick(() => {
              this.updateAgent();
            })
        }
        .width('100%')
        .padding(16)
      }
      .width('90%')
      .height('80%')
      .backgroundColor(Colors.surface)
      .borderRadius(16)
    }
    .width('100%')
    .height('100%')
    .position({ x: 0, y: 0 })
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }

  @Builder
  DeleteConfirmDialogBuilder() {
    Column() {
      // 遮罩层
      Column()
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0, 0, 0, 0.5)')
        .onClick(() => {
          this.showDeleteDialog = false;
        })

      // 对话框内容
      Column() {
        // 警告图标
        Column() {
          Image($r('app.media.ic_warning'))
            .width(48)
            .height(48)
            .fillColor(Colors.error)
        }
        .width(80)
        .height(80)
        .backgroundColor(Colors.errorContainer)
        .borderRadius(40)
        .justifyContent(FlexAlign.Center)
        .margin({ top: 24 })

        Text('确认删除')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(Colors.textPrimary)
          .margin({ top: 16 })

        Text(`确定要删除代理 "${this.viewModel.uiState.selectedAgent?.name}" 吗？此操作不可恢复。`)
          .fontSize(14)
          .fontColor(Colors.textSecondary)
          .textAlign(TextAlign.Center)
          .padding({ horizontal: 24, vertical: 12 })

        // 按钮栏
        Row() {
          Button('取消')
            .type(ButtonType.Capsule)
            .backgroundColor(Colors.surfaceVariant)
            .fontColor(Colors.textPrimary)
            .width(100)
            .onClick(() => {
              this.showDeleteDialog = false;
            })

          Button('删除')
            .type(ButtonType.Capsule)
            .backgroundColor(Colors.error)
            .fontColor(Colors.textOnError)
            .margin({ left: 16 })
            .width(100)
            .onClick(() => {
              this.deleteAgent();
            })
        }
        .width('100%')
        .padding({ horizontal: 24, vertical: 16 })
        .justifyContent(FlexAlign.Center)
        .margin({ top: 8 })
      }
      .width('80%')
      .backgroundColor(Colors.surface)
      .borderRadius(16)
      .padding({ bottom: 16 })
    }
    .width('100%')
    .height('100%')
    .position({ x: 0, y: 0 })
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }

  @Builder
  AgentDetailDialogBuilder() {
    Column() {
      // 遮罩层
      Column()
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0, 0, 0, 0.5)')
        .onClick(() => {
          this.showDetailDialog = false;
        })

      // 详情内容
      Column() {
        if (this.viewModel.uiState.selectedAgent) {
          AgentDetailCard({
            agent: this.viewModel.uiState.selectedAgent
          })

          // 操作按钮
          Row() {
            Button('编辑')
              .type(ButtonType.Capsule)
              .backgroundColor(Colors.primary)
              .fontColor(Colors.textOnPrimary)
              .layoutWeight(1)
              .onClick(() => {
                this.loadAgentToForm(this.viewModel.uiState.selectedAgent!);
                this.showDetailDialog = false;
                this.showEditDialog = true;
              })

            Button('删除')
              .type(ButtonType.Capsule)
              .backgroundColor(Colors.error)
              .fontColor(Colors.textOnError)
              .layoutWeight(1)
              .margin({ left: 12 })
              .onClick(() => {
                this.showDetailDialog = false;
                this.showDeleteDialog = true;
              })
          }
          .width('100%')
          .padding(16)
        }
      }
      .width('90%')
      .backgroundColor(Colors.surface)
      .borderRadius(16)
      .margin({ vertical: 40 })
    }
    .width('100%')
    .height('100%')
    .position({ x: 0, y: 0 })
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }

  @Builder
  CategorySelectorBuilder() {
    Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Start }) {
      ForEach(this.viewModel.getAllCategories(), (category: AgentCategory) => {
        Text(this.getCategoryName(category))
          .fontSize(14)
          .fontColor(this.formCategory === category ? Colors.primary : Colors.textSecondary)
          .fontWeight(this.formCategory === category ? FontWeight.Medium : FontWeight.Normal)
          .backgroundColor(this.formCategory === category ? Colors.primaryContainer : Colors.surfaceVariant)
          .borderRadius(16)
          .padding({ horizontal: 12, vertical: 6 })
          .margin({ right: 8, bottom: 8 })
          .onClick(() => {
            this.formCategory = category;
          })
      })
    }
    .width('100%')
  }

  /**
   * 重置表单
   */
  private resetForm(): void {
    this.formName = '';
    this.formRole = '';
    this.formDescription = '';
    this.formSystemPrompt = '';
    this.formCategory = AgentCategory.GENERAL;
    this.formTemperature = 0.7;
    this.formMaxTokens = 2000;
  }

  /**
   * 加载代理数据到表单
   */
  private loadAgentToForm(agent: Agent): void {
    this.formName = agent.name;
    this.formRole = agent.role || '';
    this.formDescription = agent.description || '';
    this.formSystemPrompt = agent.systemPrompt || '';
    this.formCategory = agent.category || AgentCategory.GENERAL;
    this.formTemperature = agent.temperature || 0.7;
    this.formMaxTokens = agent.maxTokens || 2000;
  }

  /**
   * 检查表单是否有效
   */
  private isFormValid(): boolean {
    return this.formName.trim().length > 0 && this.formRole.trim().length > 0;
  }

  /**
   * 创建代理
   */
  private createAgent(): void {
    const agent = new Agent(
      this.formName.trim(),
      this.formDescription.trim(),
      ''
    );
    agent.role = this.formRole.trim();
    agent.systemPrompt = this.formSystemPrompt.trim();
    agent.category = this.formCategory;
    agent.temperature = this.formTemperature;
    agent.maxTokens = this.formMaxTokens;

    this.viewModel.createAgent(agent);
    this.showCreateDialog = false;
    this.resetForm();
  }

  /**
   * 更新代理
   */
  private updateAgent(): void {
    if (!this.viewModel.uiState.selectedAgent) return;

    const agent = this.viewModel.uiState.selectedAgent;
    agent.name = this.formName.trim();
    agent.role = this.formRole.trim();
    agent.description = this.formDescription.trim();
    agent.systemPrompt = this.formSystemPrompt.trim();
    agent.category = this.formCategory;
    agent.temperature = this.formTemperature;
    agent.maxTokens = this.formMaxTokens;

    this.viewModel.updateAgent(agent);
    this.showEditDialog = false;
  }

  /**
   * 删除代理
   */
  private deleteAgent(): void {
    if (this.viewModel.uiState.selectedAgent) {
      this.viewModel.deleteAgent(this.viewModel.uiState.selectedAgent.id);
      this.showDeleteDialog = false;
      this.viewModel.clearSelection();
    }
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
