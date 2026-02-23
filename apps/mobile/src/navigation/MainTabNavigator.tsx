/**
 * 底部标签导航器
 * 应用主界面的底部 Tab 导航配置
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ChatScreen } from '../screens/ChatScreen';
import { AgentsScreen } from '../screens/AgentsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { BottomTabParamList } from '../types';
import { COLORS, PRIMARY, ACCENT } from '../constants/colors';

const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * 标签栏图标组件
 */
interface TabBarIconProps {
  name: string;
  color: string;
  size: number;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ name, color, size }) => (
  <Icon name={name} size={size} color={color} />
);

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Conversations"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Conversations':
              iconName = 'chat';
              break;
            case 'Agents':
              iconName = 'robot';
              break;
            case 'Discover':
              iconName = 'compass';
              break;
            case 'Profile':
              iconName = 'account';
              break;
            default:
              iconName = 'help-circle';
          }

          return <TabBarIcon name={iconName} color={color} size={size} />;
        },
        tabBarActiveTintColor: PRIMARY.main,
        tabBarInactiveTintColor: COLORS.light.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.light.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.light.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: COLORS.light.background,
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: COLORS.light.text,
        },
        headerTintColor: PRIMARY.main,
      })}
    >
      <Tab.Screen
        name="Conversations"
        component={ChatScreen}
        options={{
          title: '聊天',
          headerShown: true,
          headerTitle: 'SillyChat',
        }}
      />
      <Tab.Screen
        name="Agents"
        component={AgentsScreen}
        options={{
          title: '代理',
          headerShown: true,
          headerTitle: 'AI 代理',
        }}
      />
      <Tab.Screen
        name="Discover"
        component={ChatScreen}
        options={{
          title: '发现',
          headerShown: true,
          headerTitle: '发现',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '我的',
          headerShown: true,
          headerTitle: '个人中心',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
