/**
 * 头像组件
 * 支持图片、文字、在线状态指示器
 */

import React from 'react';
import { View, StyleSheet, Image, Text, ViewStyle } from 'react-native';
import { PRIMARY, ACCENT, STATUS_COLORS } from '../../constants/colors';

export type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';
export type OnlineStatus = 'online' | 'offline' | 'away' | 'busy' | 'typing';

interface SillyChatAvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  status?: OnlineStatus;
  showStatus?: boolean;
  style?: ViewStyle;
  borderColor?: string;
}

/**
 * 获取头像尺寸
 */
const getSize = (size: AvatarSize): number => {
  switch (size) {
    case 'small':
      return 32;
    case 'large':
      return 64;
    case 'xlarge':
      return 96;
    case 'medium':
    default:
      return 48;
  }
};

/**
 * 获取状态指示器尺寸
 */
const getStatusSize = (size: AvatarSize): number => {
  switch (size) {
    case 'small':
      return 8;
    case 'large':
      return 16;
    case 'xlarge':
      return 20;
    case 'medium':
    default:
      return 12;
  }
};

/**
 * 获取状态颜色
 */
const getStatusColor = (status: OnlineStatus): string => {
  switch (status) {
    case 'online':
      return STATUS_COLORS.online;
    case 'offline':
      return STATUS_COLORS.offline;
    case 'away':
      return STATUS_COLORS.away;
    case 'busy':
      return STATUS_COLORS.busy;
    case 'typing':
      return STATUS_COLORS.typing;
    default:
      return STATUS_COLORS.offline;
  }
};

/**
 * 获取首字母
 */
const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

/**
 * 生成背景色（基于名称）
 */
const getBackgroundColor = (name: string): string => {
  if (!name) return PRIMARY.light;

  const colors = [
    PRIMARY.light,
    ACCENT.light,
    '#FFE4B5',
    '#E6E6FA',
    '#F0E68C',
    '#DDA0DD',
    '#98FB98',
    '#FFB6C1',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export const SillyChatAvatar: React.FC<SillyChatAvatarProps> = ({
  uri,
  name = '',
  size = 'medium',
  status,
  showStatus = false,
  style,
  borderColor = '#FFFFFF',
}) => {
  const avatarSize = getSize(size);
  const statusSize = getStatusSize(size);
  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);

  const containerStyle = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    borderWidth: borderColor ? 2 : 0,
    borderColor,
  };

  const statusStyle = {
    width: statusSize,
    height: statusSize,
    borderRadius: statusSize / 2,
    backgroundColor: status ? getStatusColor(status) : STATUS_COLORS.offline,
    borderWidth: 2,
    borderColor,
  };

  return (
    <View style={[styles.container, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, containerStyle]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.fallback, containerStyle, { backgroundColor }]}>
          <Text style={[styles.text, { fontSize: avatarSize * 0.4 }]}>
            {initials}
          </Text>
        </View>
      )}

      {showStatus && status && (
        <View style={[styles.status, statusStyle]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#F0F0F0',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    color: '#333333',
  },
  status: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});

export default SillyChatAvatar;
