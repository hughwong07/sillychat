/**
 * 消息气泡组件
 * 显示单条消息，支持不同发送者类型和消息状态
 */

import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Message, MessageSenderType, MessageStatus } from '../../types';
import { CHAT_COLORS, PRIMARY, ACCENT } from '../../constants/colors';
import { formatTime } from '../../utils/format';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser?: boolean;
  showAvatar?: boolean;
  avatarUrl?: string;
  senderName?: string;
  onPress?: (message: Message) => void;
  onLongPress?: (message: Message) => void;
}

/**
 * 获取消息状态图标
 */
const getStatusIcon = (status: MessageStatus): string => {
  switch (status) {
    case 'sending':
      return 'clock-outline';
    case 'sent':
      return 'check';
    case 'delivered':
      return 'check-all';
    case 'read':
      return 'check-all';
    case 'failed':
      return 'alert-circle';
    default:
      return '';
  }
};

/**
 * 获取消息状态颜色
 */
const getStatusColor = (status: MessageStatus): string => {
  switch (status) {
    case 'read':
      return ACCENT.main;
    case 'failed':
      return '#F44336';
    default:
      return '#999999';
  }
};

/**
 * 获取气泡样式
 */
const getBubbleStyle = (senderType: MessageSenderType, isCurrentUser: boolean) => {
  if (isCurrentUser) {
    return {
      backgroundColor: CHAT_COLORS.userBubble,
      alignSelf: 'flex-end' as const,
      borderBottomRightRadius: 4,
    };
  }

  switch (senderType) {
    case 'agent':
      return {
        backgroundColor: CHAT_COLORS.agentBubble,
        alignSelf: 'flex-start' as const,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: CHAT_COLORS.agentBubbleBorder,
      };
    case 'system':
      return {
        backgroundColor: CHAT_COLORS.systemBackground,
        alignSelf: 'center' as const,
      };
    default:
      return {
        backgroundColor: CHAT_COLORS.otherBubble,
        alignSelf: 'flex-start' as const,
        borderBottomLeftRadius: 4,
      };
  }
};

/**
 * 获取文字颜色
 */
const getTextColor = (senderType: MessageSenderType, isCurrentUser: boolean): string => {
  if (isCurrentUser) {
    return CHAT_COLORS.userBubbleText;
  }

  switch (senderType) {
    case 'agent':
      return CHAT_COLORS.agentBubbleText;
    case 'system':
      return CHAT_COLORS.systemText;
    default:
      return CHAT_COLORS.otherBubbleText;
  }
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser = false,
  showAvatar = true,
  avatarUrl,
  senderName,
  onPress,
  onLongPress,
}) => {
  const bubbleStyle = getBubbleStyle(message.senderType, isCurrentUser);
  const textColor = getTextColor(message.senderType, isCurrentUser);
  const isSystem = message.senderType === 'system';

  const renderAvatar = () => {
    if (isCurrentUser || isSystem || !showAvatar) return null;

    if (avatarUrl) {
      return <Avatar.Image size={36} source={{ uri: avatarUrl }} style={styles.avatar} />;
    }

    return (
      <Avatar.Text
        size={36}
        label={senderName?.charAt(0).toUpperCase() || '?'}
        style={[styles.avatar, { backgroundColor: PRIMARY.light }]}
        labelStyle={{ color: PRIMARY.dark, fontSize: 14 }}
      />
    );
  };

  const renderStatus = () => {
    if (!isCurrentUser || isSystem) return null;

    return (
      <View style={styles.statusContainer}>
        <Icon
          name={getStatusIcon(message.status)}
          size={14}
          color={getStatusColor(message.status)}
        />
      </View>
    );
  };

  const renderTime = () => {
    if (isSystem) return null;

    return (
      <Text style={[styles.time, { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : '#999999' }]}>
        {formatTime(message.timestamp)}
      </Text>
    );
  };

  return (
    <View
      style={[
        styles.container,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}
    >
      {!isCurrentUser && renderAvatar()}

      <View style={styles.contentContainer}>
        {!isCurrentUser && senderName && !isSystem && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}

        <TouchableOpacity
          onPress={() => onPress?.(message)}
          onLongPress={() => onLongPress?.(message)}
          activeOpacity={0.8}
          disabled={!onPress && !onLongPress}
        >
          <View style={[styles.bubble, bubbleStyle]}>
            <Text style={[styles.text, { color: textColor }]}>{message.content}</Text>
            {renderTime()}
          </View>
        </TouchableOpacity>

        {isCurrentUser && renderStatus()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
    maxWidth: '85%',
  },
  currentUserContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherUserContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  contentContainer: {
    flexDirection: 'column',
    maxWidth: '80%',
  },
  senderName: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
    marginRight: 4,
  },
});

export default MessageBubble;
