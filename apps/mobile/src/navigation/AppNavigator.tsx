/**
 * 根导航器
 * 应用顶层导航配置，包含认证状态和主题配置
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { MainTabNavigator } from './MainTabNavigator';
import { ChatStackNavigator } from './ChatStackNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MainStackParamList } from '../types';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * 主题配置
 */
const getTheme = (isDark: boolean) => ({
  dark: isDark,
  colors: isDark
    ? {
        primary: COLORS.dark.primary,
        background: COLORS.dark.background,
        card: COLORS.dark.card,
        text: COLORS.dark.text,
        border: COLORS.dark.border,
        notification: COLORS.dark.notification,
      }
    : {
        primary: COLORS.light.primary,
        background: COLORS.light.background,
        card: COLORS.light.card,
        text: COLORS.light.text,
        border: COLORS.light.border,
        notification: COLORS.light.notification,
      },
});

/**
 * React Native Paper 主题
 */
const getPaperTheme = (isDark: boolean) => ({
  dark: isDark,
  mode: 'adaptive' as const,
  colors: {
    primary: isDark ? COLORS.dark.primary : COLORS.light.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: isDark ? COLORS.dark.primaryDark : COLORS.light.primaryLight,
    onPrimaryContainer: isDark ? COLORS.dark.text : COLORS.light.text,
    secondary: isDark ? COLORS.dark.accent : COLORS.light.accent,
    onSecondary: '#FFFFFF',
    secondaryContainer: isDark ? COLORS.dark.accentDark : COLORS.light.accentLight,
    onSecondaryContainer: isDark ? COLORS.dark.text : COLORS.light.text,
    background: isDark ? COLORS.dark.background : COLORS.light.background,
    onBackground: isDark ? COLORS.dark.text : COLORS.light.text,
    surface: isDark ? COLORS.dark.surface : COLORS.light.surface,
    onSurface: isDark ? COLORS.dark.text : COLORS.light.text,
    surfaceVariant: isDark ? COLORS.dark.card : COLORS.light.card,
    onSurfaceVariant: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary,
    error: isDark ? COLORS.dark.error : COLORS.light.error,
    onError: '#FFFFFF',
    outline: isDark ? COLORS.dark.border : COLORS.light.border,
    backdrop: isDark ? COLORS.dark.backdrop : COLORS.light.backdrop,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
});

export const AppNavigator: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getTheme(isDark);
  const paperTheme = getPaperTheme(isDark);

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {/* 主标签页 */}
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />

          {/* 聊天页面栈 */}
          <Stack.Screen
            name="Chat"
            component={ChatStackNavigator}
            options={{
              animation: 'slide_from_bottom',
            }}
          />

          {/* 设置页面 */}
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: true,
              title: '设置',
              headerBackTitle: '返回',
            }}
          />

          {/* 个人资料页面 */}
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerShown: true,
              title: '个人资料',
              headerBackTitle: '返回',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default AppNavigator;
