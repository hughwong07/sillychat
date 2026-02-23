/**
 * 聊天主页面
 * 显示消息列表和输入框，支持与AI代理对话
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Appbar } from 'react-native-paper';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { Message, MessageSenderType, MessageStatus } from '../types';
import { COLORS, PRIMARY } from '../constants/colors';
import { generateId } from '../utils/format';

// 模拟当前用户ID
const CURRENT_USER_ID = 'user_001';

/**
 * 模拟消息数据
 */
const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    conversationId: 'conv_001',
    senderId: 'agent_001',
    senderType: 'agent',
    content: '你好！我是SillyChat AI助手，有什么可以帮助你的吗？',
    contentType: 'text',
    status: 'read',
    timestamp: Date.now() - 3600000,
  },
  {
    id: '2',
    conversationId: 'conv_001',
    senderId: CURRENT_USER_ID,
    senderType: 'user',
    content: '你好！我想了解一下这个应用的功能。',
    contentType: 'text',
    status: 'read',
    timestamp: Date.now() - 3500000,
  },
  {
    id: '3',
    conversationId: 'conv_001',
    senderId: 'agent_001',
    senderType: 'agent',
    content: 'SillyChat 是一个智能聊天应用，支持以下功能：\n\n1. 与AI代理对话\n2. 多轮上下文理解\n3. 语音消息\n4. 文件传输\n5. 实时同步',
    contentType: 'text',
    status: 'read',
    timestamp: Date.now() - 3400000,
  },
];

export const ChatScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // 获取路由参数
  const { conversationId, title } = route.params as { conversationId?: string; title?: string } || {};

  // 发送消息
  const handleSendMessage = useCallback((text: string) => {
    const newMessage: Message = {
      id: generateId(),
      conversationId: conversationId || 'conv_001',
      senderId: CURRENT_USER_ID,
      senderType: 'user',
      content: text,
      contentType: 'text',
      status: 'sending',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);

    // 模拟发送成功
    setTimeout(() => {
      setMessages((prev) =
        prev.map((msg) =
          msg.id === newMessage.id ? { ...msg, status: 'sent' as MessageStatus } : msg
        )
      );

      // 模拟代理正在输入
      setIsTyping(true);

      // 模拟代理回复
      setTimeout(() => {
        const replyMessage: Message = {
          id: generateId(),
          conversationId: conversationId || 'conv_001',
          senderId: 'agent_001',
          senderType: 'agent',
          content: `收到你的消息："${text}"\n\n这是一个模拟回复，实际应用中会调用AI服务生成回复内容。`,
          contentType: 'text',
          status: 'delivered',
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, replyMessage]);
        setIsTyping(false);
      }, 2000);
    }, 500);
  }, [conversationId]);

  // 加载更多消息
  const handleLoadMore = useCallback(async () => {
    // 实际应用中这里会调用API加载历史消息
    console.log('加载更多消息...');
  }, []);

  // 刷新消息
  const handleRefresh = useCallback(async () => {
    // 实际应用中这里会调用API刷新消息
    console.log('刷新消息...');
  }, []);

  // 处理消息长按
  const handleMessageLongPress = useCallback((message: Message) => {
    console.log('长按消息:', message.id);
    // 显示操作菜单：复制、删除、转发等
  }, []);

  // 获取用户信息
  const getUserInfo = useCallback((userId: string) => {
    if (userId === 'agent_001') {
      return { name: 'SillyChat AI', avatar: undefined };
    }
    return { name: '用户', avatar: undefined };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={title || '聊天'}
          subtitle={isTyping ? '正在输入...' : '在线'}
        />
        <Appbar.Action icon="dots-vertical" onPress={() => {}} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <MessageList
          messages={messages}
          currentUserId={CURRENT_USER_ID}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          hasMore={hasMore}
          getUserInfo={getUserInfo}
          onMessageLongPress={handleMessageLongPress}
          typingUsers={isTyping ? ['SillyChat AI'] : []}
        />

        <MessageInput
          onSend={handleSendMessage}
          placeholder="输入消息..."
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  header: {
    backgroundColor: COLORS.light.background,
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  content: {
    flex: 1,
  },
});

export default ChatScreen;
