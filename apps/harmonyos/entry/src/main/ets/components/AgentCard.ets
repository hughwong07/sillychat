import { Agent, AgentCategory, AgentStatus } from '../model/Agent';
import { Colors } from '../constants/Colors';

/**
 * 代理卡片组件
 * 用于在列表中显示AI代理信息
 */
@Component
export struct AgentCard {
  @Prop agent: Agent;
  @Prop isSelected: boolean = false;

  // 回调事件
  onClick?: () => void;
  onToggleActive?: (isActive: boolean) => void;

  build() {
    Column() {
      Row() {
        // 头像
        AgentAvatar({
          name: this.agent.name,
          isActive: this.agent.isActive
        })

        // 信息
        Column() {
          Row() {
            Text(this.agent.getDisplayName())
              .fontSize(16)
              .fontWeight(FontWeight.Medium)
              .fontColor(Colors.textPrimary)
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .layoutWeight(1)

            if (this.agent.isDefault) {
              Text('默认')
                .fontSize(10)
                .fontColor(Colors.textOnPrimary)
                .backgroundColor(Colors.primary)
                .borderRadius(4)
                .padding({ horizontal: 6, vertical: 2 })
                .margin({ left: 8 })
            }
          }
          .width('100%')

          Text(this.agent.getRoleDescription())
            .fontSize(14)
            .fontColor(Colors.textSecondary)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ top: 4 })

          // 类别标签
          AgentCategoryChip({ category: this.agent.category })
            .margin({ top: 4 })
        }
        .layoutWeight(1)
        .margin({ left: 16 })
        .alignItems(HorizontalAlign.Start)

        // 激活开关
        if (this.onToggleActive) {
          Toggle({ type: ToggleType.Switch, isOn: this.agent.isActive })
            .selectedColor(Colors.primary)
            .onChange((isOn: boolean) => {
              if (this.onToggleActive) {
                this.onToggleActive(isOn);
              }
            })
        }
      }
      .width('100%')
      .padding(16)
      .backgroundColor(this.isSelected ? Colors.primaryContainer : Colors.surface)
      .borderRadius(12)
      .shadow({
        radius: this.isSelected ? 4 : 1,
        color: Colors.shadow
      })
    }
    .width('100%')
    .onClick(() => {
      if (this.onClick) {
        this.onClick();
      }
    })
  }
}

/**
 * 代理头像组件
 */
@Component
struct AgentAvatar {
  @Prop name: string;
  @Prop isActive: boolean;

  build() {
    Stack({ alignContent: Alignment.BottomEnd }) {
      Column() {
        Image($r('app.media.ic_smart_toy'))
          .width(28)
          .height(28)
          .fillColor(this.isActive ? Colors.textOnPrimaryContainer : Colors.textDisabled)
      }
      .width(56)
      .height(56)
      .backgroundColor(this.isActive ? Colors.primaryContainer : Colors.surfaceVariant)
      .borderRadius(28)
      .justifyContent(FlexAlign.Center)

      // 状态指示器
      if (this.isActive) {
        Column() {
          Image($r('app.media.ic_check'))
            .width(10)
            .height(10)
            .fillColor(Colors.textOnPrimary)
        }
        .width(16)
        .height(16)
        .backgroundColor(Colors.primary)
        .borderRadius(8)
        .border({ width: 2, color: Colors.surface })
        .justifyContent(FlexAlign.Center)
      }
    }
    .width(56)
    .height(56)
  }
}

/**
 * 代理类别标签组件
 */
@Component
struct AgentCategoryChip {
  @Prop category: AgentCategory;

  build() {
    Text(this.getCategoryLabel())
      .fontSize(11)
      .fontColor(this.getCategoryColor())
      .backgroundColor(this.getCategoryColor() + '1F') // 添加透明度
      .borderRadius(12)
      .padding({ horizontal: 8, vertical: 2 })
  }

  private getCategoryLabel(): string {
    switch (this.category) {
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

  private getCategoryColor(): ResourceColor {
    switch (this.category) {
      case AgentCategory.GENERAL:
        return Colors.primary;
      case AgentCategory.CODING:
        return Colors.success;
      case AgentCategory.WRITING:
        return Colors.purple;
      case AgentCategory.TRANSLATION:
        return Colors.info;
      case AgentCategory.ANALYSIS:
        return Colors.warning;
      case AgentCategory.CUSTOM:
        return Colors.secondary;
      default:
        return Colors.primary;
    }
  }
}

/**
 * 代理状态指示器组件
 */
@Component
export struct AgentStatusIndicator {
  @Prop status: AgentStatus;

  build() {
    Row() {
      Column()
        .width(8)
        .height(8)
        .backgroundColor(this.getStatusColor())
        .borderRadius(4)

      Text(this.getStatusLabel())
        .fontSize(12)
        .fontColor(Colors.textSecondary)
        .margin({ left: 4 })
    }
  }

  private getStatusColor(): ResourceColor {
    switch (this.status) {
      case AgentStatus.ONLINE:
        return Colors.success;
      case AgentStatus.OFFLINE:
        return Colors.textDisabled;
      case AgentStatus.BUSY:
        return Colors.warning;
      case AgentStatus.ERROR:
        return Colors.error;
      default:
        return Colors.textDisabled;
    }
  }

  private getStatusLabel(): string {
    switch (this.status) {
      case AgentStatus.ONLINE:
        return '在线';
      case AgentStatus.OFFLINE:
        return '离线';
      case AgentStatus.BUSY:
        return '忙碌';
      case AgentStatus.ERROR:
        return '错误';
      default:
        return '离线';
    }
  }
}

/**
 * 代理详情卡片组件
 */
@Component
export struct AgentDetailCard {
  @Prop agent: Agent;

  build() {
    Column() {
      // 头部
      Row() {
        AgentAvatar({
          name: this.agent.name,
          isActive: this.agent.isActive
        })

        Column() {
          Text(this.agent.getDisplayName())
            .fontSize(20)
            .fontWeight(FontWeight.Medium)
            .fontColor(Colors.textPrimary)

          AgentCategoryChip({ category: this.agent.category })
            .margin({ top: 4 })
        }
        .margin({ left: 16 })
        .alignItems(HorizontalAlign.Start)
        .layoutWeight(1)
      }
      .width('100%')

      Divider()
        .color(Colors.divider)
        .margin({ vertical: 16 })

      // 详情
      this.DetailItemBuilder('角色', this.agent.role)

      if (this.agent.description) {
        this.DetailItemBuilder('描述', this.agent.description)
      }

      this.DetailItemBuilder('模型', this.agent.model)
      this.DetailItemBuilder('温度', `${this.agent.temperature}`)
      this.DetailItemBuilder('最大令牌数', `${this.agent.maxTokens}`)

      Divider()
        .color(Colors.divider)
        .margin({ vertical: 16 })

      // 系统提示词
      if (this.agent.systemPrompt) {
        Text('系统提示词')
          .fontSize(12)
          .fontColor(Colors.textSecondary)
          .margin({ bottom: 4 })

        Text(this.agent.systemPrompt)
          .fontSize(14)
          .fontColor(Colors.textPrimary)
          .backgroundColor(Colors.surfaceVariant)
          .borderRadius(8)
          .padding(12)
          .width('100%')
      }
    }
    .width('100%')
    .padding(20)
    .backgroundColor(Colors.surface)
    .borderRadius(12)
    .shadow({ radius: 2, color: Colors.shadow })
  }

  @Builder
  DetailItemBuilder(label: string, value: string) {
    Row() {
      Text(`${label}：`)
        .fontSize(14)
        .fontColor(Colors.textSecondary)
        .width(80)

      Text(value)
        .fontSize(14)
        .fontColor(Colors.textPrimary)
        .layoutWeight(1)
    }
    .width('100%')
    .padding({ vertical: 4 })
  }
}

/**
 * 创建代理表单组件
 */
@Component
export struct CreateAgentForm {
  @State name: string = '';
  @State role: string = '';
  @State description: string = '';
  @State systemPrompt: string = '';
  @State category: AgentCategory = AgentCategory.GENERAL;

  // 回调
  onValuesChange?: (values: {
    name: string;
    role: string;
    description: string;
    systemPrompt: string;
    category: AgentCategory;
  }) => void;

  build() {
    Column() {
      TextInput({ placeholder: '名称 *', text: $$this.name })
        .placeholderColor(Colors.textTertiary)
        .fontSize(16)
        .height(48)
        .backgroundColor(Colors.surface)
        .borderRadius(8)
        .onChange((value) => {
          this.name = value;
          this.notifyChange();
        })

      TextInput({ placeholder: '角色 *', text: $$this.role })
        .placeholderColor(Colors.textTertiary)
        .fontSize(16)
        .height(48)
        .backgroundColor(Colors.surface)
        .borderRadius(8)
        .margin({ top: 12 })
        .onChange((value) => {
          this.role = value;
          this.notifyChange();
        })

      // 类别选择
      Text('类别')
        .fontSize(12)
        .fontColor(Colors.textSecondary)
        .margin({ top: 12, bottom: 8 })
        .alignSelf(ItemAlign.Start)

      AgentCategorySelector({
        selected: this.category,
        onSelect: (category) => {
          this.category = category;
          this.notifyChange();
        }
      })

      TextArea({ placeholder: '描述（可选）', text: $$this.description })
        .placeholderColor(Colors.textTertiary)
        .fontSize(16)
        .height(80)
        .backgroundColor(Colors.surface)
        .borderRadius(8)
        .margin({ top: 12 })
        .onChange((value) => {
          this.description = value;
          this.notifyChange();
        })

      TextArea({ placeholder: '系统提示词（可选）', text: $$this.systemPrompt })
        .placeholderColor(Colors.textTertiary)
        .fontSize(16)
        .height(120)
        .backgroundColor(Colors.surface)
        .borderRadius(8)
        .margin({ top: 12 })
        .onChange((value) => {
          this.systemPrompt = value;
          this.notifyChange();
        })
    }
    .width('100%')
  }

  private notifyChange(): void {
    if (this.onValuesChange) {
      this.onValuesChange({
        name: this.name,
        role: this.role,
        description: this.description,
        systemPrompt: this.systemPrompt,
        category: this.category
      });
    }
  }
}

/**
 * 代理类别选择器组件
 */
@Component
struct AgentCategorySelector {
  @Prop selected: AgentCategory;

  onSelect?: (category: AgentCategory) => void;

  private categories: AgentCategory[] = [
    AgentCategory.GENERAL,
    AgentCategory.CODING,
    AgentCategory.WRITING,
    AgentCategory.TRANSLATION,
    AgentCategory.ANALYSIS,
    AgentCategory.CUSTOM
  ];

  build() {
    Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Start }) {
      ForEach(this.categories, (category: AgentCategory) => {
        AgentCategoryChip({
          category: category
        })
          .margin({ right: 8, bottom: 8 })
          .backgroundColor(
            this.selected === category ? Colors.primaryContainer : Colors.surfaceVariant
          )
          .onClick(() => {
            if (this.onSelect) {
              this.onSelect(category);
            }
          })
      })
    }
  }
}
