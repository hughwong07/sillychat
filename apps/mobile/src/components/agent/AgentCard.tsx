/**
 * 代理卡片组件
 * 展示AI代理的信息和状态
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, STATUS_COLORS } from '../../constants/colors';

export type AgentStatus = 'online' | 'offline' | 'busy' | 'away';

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  status: AgentStatus;
  skills: string[];
  isDefault?: boolean;
}

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onPress?: (agent: Agent) => void;
  onLongPress?: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  isSelected = false,
  onPress,
  onLongPress,
}) => {
  const getStatusColor = (status: AgentStatus): string => {
    switch (status) {
      case 'online':
        return STATUS_COLORS.online;
      case 'offline':
        return STATUS_COLORS.offline;
      case 'busy':
        return STATUS_COLORS.busy;
      case 'away':
        return STATUS_COLORS.away;
      default:
        return STATUS_COLORS.offline;
    }
  };

  const getStatusText = (status: AgentStatus): string => {
    switch (status) {
      case 'online':
        return '在线';
      case 'offline':
        return '离线';
      case 'busy':
        return '忙碌';
      case 'away':
        return '离开';
      default:
        return '离线';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress?.(agent)}
      onLongPress={() => onLongPress?.(agent)}
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
      ]}
    >
      <View style={styles.avatarContainer}>
        {agent.avatar ? (
          <Image source={{ uri: agent.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Icon name="robot" size={28} color={COLORS.primary.main} />
          </View>
        )}
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(agent.status) },
          ]}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {agent.name}
          </Text>
          {agent.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>默认</Text>
            </View>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {agent.description}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.status, { color: getStatusColor(agent.status) }]}>
            {getStatusText(agent.status)}
          </Text>

          <View style={styles.skills}>
            {agent.skills.slice(0, 2).map((skill, index) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {agent.skills.length > 2 && (
              <Text style={styles.moreSkills}>+{agent.skills.length - 2}</Text>
            )}
          </View>
        </View>
      </View>

      {isSelected && (
        <View style={styles.checkmark}>
          <Icon name="check-circle" size={24} color={COLORS.primary.main} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.light.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedContainer: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary[50],
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.light.surface,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.light.card,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.light.text,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: COLORS.accent.main,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: COLORS.light.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  skills: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillBadge: {
    backgroundColor: COLORS.light.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  skillText: {
    fontSize: 10,
    color: COLORS.light.textSecondary,
  },
  moreSkills: {
    fontSize: 10,
    color: COLORS.light.textTertiary,
    marginLeft: 4,
  },
  checkmark: {
    marginLeft: 8,
    justifyContent: 'center',
  },
});

export default AgentCard;
