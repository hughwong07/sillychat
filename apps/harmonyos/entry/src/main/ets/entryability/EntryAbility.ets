import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';

const TAG = 'EntryAbility';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(0x0000, TAG, 'SillyChat EntryAbility onCreate');
  }

  onDestroy(): void {
    hilog.info(0x0000, TAG, 'SillyChat EntryAbility onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    hilog.info(0x0000, TAG, 'SillyChat EntryAbility onWindowStageCreate');

    // 加载主页面
    windowStage.loadContent('pages/chat/ChatPage', (err) => {
      if (err.code) {
        hilog.error(0x0000, TAG, 'Failed to load the content. Cause: %{public}s', JSON.stringify(err) ?? '');
        return;
      }
      hilog.info(0x0000, TAG, 'Succeeded in loading the content.');
    });
  }

  onWindowStageDestroy(): void {
    hilog.info(0x0000, TAG, 'SillyChat EntryAbility onWindowStageDestroy');
  }

  onForeground(): void {
    hilog.info(0x0000, TAG, 'SillyChat EntryAbility onForeground');
  }

  onBackground(): void {
    hilog.info(0x0000, TAG, 'SillyChat EntryAbility onBackground');
  }
}
