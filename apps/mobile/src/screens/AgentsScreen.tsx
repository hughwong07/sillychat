/**
 * 代理选择页面
 * 展示可用的AI代理列表，支持选择和搜索
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Appbar, Chip, Badge } from 'react-native-paper';
import { Agent, AgentStatus } from '../types';
import { SillyChatAvatar } from '../components/common/SillyChatAvatar';
import { SillyChatCard } from '../components/common/SillyChatCard';
import { COLORS, PRIMARY, ACCENT } from '../constants/colors';

// 模拟代理数据
const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent_001',
    name: 'Silly助手',
    description: '通用AI助手，可以回答各种问题，提供日常帮助',
    status: 'idle',
    capabilities: [
      { id: 'chat', name: '对话', description: '自然语言对话', enabled: true },
      { id: 'search', name: '搜索', description: '信息检索', enabled: true },
    ],
    personality: '友好、耐心、专业',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'agent_002',
    name: '代码助手',
    description: '专注于编程问题解答和代码审查',
    status: 'busy',
    capabilities: [
      { id: 'code', name: '编程', description: '代码相关', enabled: true },
      { id: 'review', name: '审查', description: '代码审查', enabled: true },
    ],
    personality: '严谨、高效',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'agent_003',
    name: '创意写手',
    description: '帮助写作、创意构思和内容创作',
    status: 'idle',
    capabilities: [
      { id: 'write', name: '写作', description: '内容创作', enabled: true },
      { id: 'creative', name: '创意', description: '创意思维', enabled: true },
    ],
    personality: '富有创意、灵感充沛',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'agent_004',
    name: '学习导师',
    description: '辅助学习，解答学术问题',
    status: 'offline',
    capabilities: [
      { id: 'teach', name: '教学', description: '知识讲解', enabled: true },
      { id: 'quiz', name: '测验', description: '出题测试', enabled: true },
    ],
    personality: '耐心、博学',
    isActive: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

/**
 * 获取状态颜色
 */
const getStatusColor = (status: AgentStatus): string => {
  switch (status) {
    case 'idle':
      return '#4CAF50';
    case 'busy':
      return '#FF9800';
    case 'offline':
      return '#9E9E9E';
    case 'error':
      return '#F44336';
    default:
      return '#9E9E9E';
  }
};

/**
 * 获取状态文本
 */
const getStatusText = (status: AgentStatus): string => {
  switch (status) {
    case 'idle':
      return '空闲';
    case 'busy':
      return '忙碌';
    case 'offline':
      return '离线';
    case 'error':
      return '异常';
    default:
      return '未知';
  }
};

interface AgentCardProps {
  agent: Agent;
  onPress: (agent: Agent) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onPress }) => {
  return (
    <SillyChatCard style={styles.agentCard} onPress={() => onPress(agent)}>
      <View style={styles.agentHeader}>
        <SillyChatAvatar
          name={agent.name}
          size="large"
          showStatus={true}
          status={agent.status === 'idle' ? 'online' : agent.status === 'busy' ? 'busy' : 'offline'}
        />
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{agent.name}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(agent.status) },
              ]}
            />
            <Text style={styles.statusText}>{getStatusText(agent.status)}</Text>
          </View>
        </View>

        {!agent.isActive && (
          <Badge style={styles.inactiveBadge}>未激活</Badge>
        )}
      </View>

      <Text style={styles.agentDescription} numberOfLines={2}>
        {agent.description}
      </Text>

      {agent.personality && (
        <Text style={styles.personality}>性格: {agent.personality}</Text>
      )}

      <View style={styles.capabilitiesContainer}>
        {agent.capabilities.slice(0, 3).map((cap) => (
          <Chip
            key={cap.id}
            style={styles.capabilityChip}
            textStyle={styles.capabilityText}
            compact
          >
            {cap.name}
          </Chip>
        ))}
        {agent.capabilities.length > 3 && (
          <Chip style={styles.capabilityChip} textStyle={styles.capabilityText} compact>
            +{agent.capabilities.length - 3}
          </Chip>
        )}
      </View>
    </SillyChatCard>
  );
};

export const AgentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 分类数据
  const categories = [
    { id: 'all', name: '全部', icon: 'view-grid' },
    { id: 'chat', name: '对话', icon: 'chat' },
    { id: 'code', name: '编程', icon: 'code-tags' },
    { id: 'write', name: '写作', icon: 'pencil' },
    { id: 'learn', name: '学习', icon: 'school' },
  ];

  // 过滤代理
  const filteredAgents = MOCK_AGENTS.filter((agent) => {
    const matchesSearch =
      !searchQuery ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory ||
      selectedCategory === 'all' ||
      agent.capabilities.some((cap) => cap.id === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  // 选择代理
  const handleAgentPress = useCallback((agent: Agent) => {
    console.log('选择代理:', agent.name);
    // 导航到聊天页面或代理详情页
    // navigation.navigate('Chat', { agentId: agent.id });
  }, [navigation]);

  // 渲染分类项
  const renderCategory = useCallback(
    ({ item }: { item: typeof categories[0] }) => (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          selectedCategory === item.id && styles.categoryItemActive,
        ]}
        onPress={() => setSelectedCategory(item.id === 'all' ? null : item.id)}
      >
        <Icon
          name={item.icon}
          size={20}
          color={selectedCategory === item.id ? '#FFFFFF' : PRIMARY.main}
        />
        <Text
          style={[
            styles.categoryText,
            selectedCategory === item.id && styles.categoryTextActive,
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    ),
    [selectedCategory]
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="AI 代理" />
        <Appbar.Action icon="refresh" onPress={() => {}} />
      </Appbar.Header>

      {/* 搜索栏 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="magnify" size={20} color="#999999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索代理..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#999999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 分类列表 */}
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      />

      {/* 代理列表 */}
      <FlatList
        data={filteredAgents}
        renderItem={({ item }) => (
          <AgentCard agent={item} onPress={handleAgentPress} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.agentsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="robot-off" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>没有找到代理</Text>
          </View>
        }
      />
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
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.light.text,
  },
  categoriesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  categoryItemActive: {
    backgroundColor: PRIMARY.main,
  },
  categoryText: {
    marginLeft: 4,
    fontSize: 13,
    color: PRIMARY.main,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  agentsList: {
    padding: 16,
  },
  agentCard: {
    marginBottom: 12,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  agentName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.light.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: COLORS.light.textSecondary,
  },
  inactiveBadge: {
    backgroundColor: '#9E9E9E',
  },
  agentDescription: {
    fontSize: 14,
    color: COLORS.light.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  personality: {
    fontSize: 12,
    color: ACCENT.main,
    marginBottom: 12,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  capabilityChip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: PRIMARY[50],
  },
  capabilityText: {
    color: PRIMARY.main,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.light.textSecondary,
  },
});

export default AgentsScreen;
