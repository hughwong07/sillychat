/**
 * AI代理选择屏幕
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AgentCard, Agent, AgentStatus } from '../components/agent/AgentCard';
import { Header } from '../components/layout/Header';
import { COLORS } from '../constants/colors';

// 模拟代理数据
const mockAgents: Agent[] = [
  {
    id: '1',
    name: '小傻瓜',
    description: '你的智能助手，擅长日常对话、问答和任务协助',
    status: 'online',
    skills: ['对话', '问答', '提醒'],
    isDefault: true,
  },
  {
    id: '2',
    name: '代码助手',
    description: '专注于编程问题解答，支持多种编程语言',
    status: 'online',
    skills: ['编程', 'Debug', '代码审查'],
  },
  {
    id: '3',
    name: '翻译专家',
    description: '专业的多语言翻译服务，支持中英日法等语言',
    status: 'busy',
    skills: ['翻译', '语言学习'],
  },
  {
    id: '4',
    name: '创意写手',
    description: '帮助你撰写文章、故事、诗歌等创意内容',
    status: 'online',
    skills: ['写作', '创意', '文案'],
  },
  {
    id: '5',
    name: '数据分析师',
    description: '协助数据处理和可视化分析',
    status: 'offline',
    skills: ['数据分析', '可视化', 'Excel'],
  },
];

export const AgentScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedAgentId, setSelectedAgentId] = useState('1');

  const handleAgentPress = useCallback((agent: Agent) => {
    setSelectedAgentId(agent.id);
    // 切换到该代理并返回聊天界面
    setTimeout(() => {
      navigation.goBack();
    }, 300);
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderAgent = useCallback(({ item }: { item: Agent }) => (
    <AgentCard
      agent={item}
      isSelected={item.id === selectedAgentId}
      onPress={handleAgentPress}
    />
  ), [selectedAgentId, handleAgentPress]);

  return (
    <View style={styles.container}>
      <Header
        title="选择AI代理"
        onLeftPress={handleBack}
        leftIcon="arrow-left"
        showBack
      />

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          选择不同的AI代理来获得更专业的服务
        </Text>
      </View>

      <FlatList
        data={mockAgents}
        renderItem={renderAgent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  infoContainer: {
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.primary.dark,
    textAlign: 'center',
  },
  list: {
    paddingVertical: 8,
  },
});

export default AgentScreen;
