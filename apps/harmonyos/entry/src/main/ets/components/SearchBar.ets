import { Colors } from '../constants/Colors';

/**
 * 搜索栏组件
 * 用于页面内的搜索功能
 */
@Component
export struct SearchBar {
  @State searchText: string = '';
  @State isFocused: boolean = false;

  // 配置属性
  placeholder: string = '搜索';
  showClearButton: boolean = true;
  showSearchIcon: boolean = true;
  backgroundColor: ResourceColor = Colors.surfaceVariant;
  borderRadius: number = 24;
  height: number = 48;

  // 回调事件
  onSearch?: (text: string) => void;
  onTextChange?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;

  build() {
    Row() {
      // 搜索图标
      if (this.showSearchIcon) {
        Image($r('app.media.ic_search'))
          .width(20)
          .height(20)
          .fillColor(this.isFocused ? Colors.primary : Colors.textTertiary)
          .margin({ left: 12, right: 8 })
      }

      // 输入框
      TextInput({ placeholder: this.placeholder, text: $$this.searchText })
        .placeholderColor(Colors.textTertiary)
        .fontSize(16)
        .fontColor(Colors.textPrimary)
        .backgroundColor(Color.Transparent)
        .height('100%')
        .layoutWeight(1)
        .onChange((value: string) => {
          this.searchText = value;
          if (this.onTextChange) {
            this.onTextChange(value);
          }
        })
        .onFocus(() => {
          this.isFocused = true;
          if (this.onFocus) {
            this.onFocus();
          }
        })
        .onBlur(() => {
          this.isFocused = false;
          if (this.onBlur) {
            this.onBlur();
          }
        })
        .onSubmit((enterKey: EnterKeyType) => {
          if (this.onSearch) {
            this.onSearch(this.searchText);
          }
        })

      // 清除按钮
      if (this.showClearButton && this.searchText.length > 0) {
        Button() {
          Image($r('app.media.ic_close'))
            .width(16)
            .height(16)
            .fillColor(Colors.textTertiary)
        }
        .type(ButtonType.Circle)
        .backgroundColor(Color.Transparent)
        .width(32)
        .height(32)
        .margin({ right: 8 })
        .onClick(() => {
          this.searchText = '';
          if (this.onClear) {
            this.onClear();
          }
          if (this.onTextChange) {
            this.onTextChange('');
          }
        })
      }

      // 搜索按钮（当有文字时显示）
      if (this.searchText.length > 0) {
        Button('搜索')
          .type(ButtonType.Capsule)
          .backgroundColor(Colors.primary)
          .fontSize(14)
          .fontColor(Colors.textOnPrimary)
          .height(36)
          .margin({ right: 8 })
          .onClick(() => {
            if (this.onSearch) {
              this.onSearch(this.searchText);
            }
          })
      }
    }
    .width('100%')
    .height(this.height)
    .backgroundColor(this.backgroundColor)
    .borderRadius(this.borderRadius)
    .border({
      width: this.isFocused ? 2 : 0,
      color: Colors.primary
    })
  }
}

/**
 * 带返回按钮的搜索栏
 * 用于搜索结果页面
 */
@Component
export struct SearchBarWithBack {
  @State searchText: string = '';
  @State isFocused: boolean = false;

  placeholder: string = '搜索';

  onSearch?: (text: string) => void;
  onTextChange?: (text: string) => void;
  onBack?: () => void;
  onClear?: () => void;

  build() {
    Row() {
      // 返回按钮
      Button() {
        Image($r('app.media.ic_arrow_back'))
          .width(24)
          .height(24)
          .fillColor(Colors.textPrimary)
      }
      .type(ButtonType.Circle)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        if (this.onBack) {
          this.onBack();
        }
      })

      // 搜索输入框
      Row() {
        Image($r('app.media.ic_search'))
          .width(20)
          .height(20)
          .fillColor(this.isFocused ? Colors.primary : Colors.textTertiary)
          .margin({ left: 12, right: 8 })

        TextInput({ placeholder: this.placeholder, text: $$this.searchText })
          .placeholderColor(Colors.textTertiary)
          .fontSize(16)
          .fontColor(Colors.textPrimary)
          .backgroundColor(Color.Transparent)
          .height('100%')
          .layoutWeight(1)
          .onChange((value: string) => {
            this.searchText = value;
            if (this.onTextChange) {
              this.onTextChange(value);
            }
          })
          .onFocus(() => {
            this.isFocused = true;
          })
          .onBlur(() => {
            this.isFocused = false;
          })
          .onSubmit(() => {
            if (this.onSearch) {
              this.onSearch(this.searchText);
            }
          })

        if (this.searchText.length > 0) {
          Button() {
            Image($r('app.media.ic_close'))
              .width(16)
              .height(16)
              .fillColor(Colors.textTertiary)
          }
          .type(ButtonType.Circle)
          .backgroundColor(Color.Transparent)
          .width(32)
          .height(32)
          .margin({ right: 8 })
          .onClick(() => {
            this.searchText = '';
            if (this.onClear) {
              this.onClear();
            }
            if (this.onTextChange) {
              this.onTextChange('');
            }
          })
        }
      }
      .height(44)
      .layoutWeight(1)
      .backgroundColor(Colors.surfaceVariant)
      .borderRadius(22)
      .margin({ left: 8 })
    }
    .width('100%')
    .height(56)
    .padding({ horizontal: 8 })
    .backgroundColor(Colors.surface)
  }
}

/**
 * 搜索历史标签组件
 */
@Component
export struct SearchHistoryTags {
  @Prop historyList: string[] = [];

  onTagClick?: (text: string) => void;
  onClearHistory?: () => void;

  build() {
    Column() {
      // 标题栏
      Row() {
        Text('搜索历史')
          .fontSize(14)
          .fontColor(Colors.textSecondary)
          .fontWeight(FontWeight.Medium)

        Blank()

        Button() {
          Image($r('app.media.ic_delete'))
            .width(18)
            .height(18)
            .fillColor(Colors.textTertiary)
        }
        .type(ButtonType.Circle)
        .backgroundColor(Color.Transparent)
        .width(32)
        .height(32)
        .onClick(() => {
          if (this.onClearHistory) {
            this.onClearHistory();
          }
        })
      }
      .width('100%')
      .padding({ horizontal: 16, vertical: 12 })

      // 历史标签
      if (this.historyList.length === 0) {
        Text('暂无搜索历史')
          .fontSize(14)
          .fontColor(Colors.textTertiary)
          .padding({ bottom: 16 })
      } else {
        Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Start }) {
          ForEach(this.historyList, (item: string, index: number) => {
            Text(item)
              .fontSize(14)
              .fontColor(Colors.textSecondary)
              .backgroundColor(Colors.surfaceVariant)
              .borderRadius(16)
              .padding({ horizontal: 12, vertical: 6 })
              .margin({ right: 8, bottom: 8 })
              .onClick(() => {
                if (this.onTagClick) {
                  this.onTagClick(item);
                }
              })
          })
        }
        .width('100%')
        .padding({ horizontal: 16, bottom: 16 })
      }
    }
    .width('100%')
    .backgroundColor(Colors.surface)
  }
}
