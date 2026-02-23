/**
 * 小傻瓜聊天工具 - Android 移动端主入口
 * Phase 4 Android 开发
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/colors';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar
          backgroundColor={COLORS.light.background}
          barStyle="dark-content"
        />
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;
