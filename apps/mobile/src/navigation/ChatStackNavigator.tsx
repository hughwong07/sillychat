/**
 * 聊天页面栈导航器
 * 管理聊天相关的页面导航
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatScreen } from '../screens/ChatScreen';
import { AgentsScreen } from '../screens/AgentsScreen';
import { MainStackParamList } from '../types';
import { COLORS, PRIMARY } from '../constants/colors';

const Stack = createNativeStackNavigator<MainStackParamList>();

interface ChatStackNavigatorProps {
  route?: {
    params?: {
      conversationId?: string;
      title?: string;
    };
  };
}

export const ChatStackNavigator: React.FC<ChatStackNavigatorProps> = ({
  route,
}) => {
  const conversationId = route?.params?.conversationId;
  const title = route?.params?.title || '聊天';

  return (
    <Stack.Navigator
      initialRouteName="Chat"
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.light.background,
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: COLORS.light.text,
        },
        headerTintColor: PRIMARY.main,
        headerBackTitle: '返回',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        initialParams={
          conversationId
            ? { conversationId, title }
            : undefined
        }
        options={{
          title: title,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="AgentDetail"
        component={AgentsScreen}
        options={{
          title: '代理详情',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default ChatStackNavigator;
