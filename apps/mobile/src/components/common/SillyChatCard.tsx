/**
 * 卡片容器组件
 * 提供统一的卡片样式和阴影效果
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { PRIMARY } from '../../constants/colors';

export type CardVariant = 'default' | 'outlined' | 'elevated';

interface SillyChatCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

/**
 * 获取内边距样式
 */
const getPaddingStyles = (padding: 'none' | 'small' | 'medium' | 'large') => {
  switch (padding) {
    case 'none':
      return 0;
    case 'small':
      return 12;
    case 'large':
      return 24;
    case 'medium':
    default:
      return 16;
  }
};

export const SillyChatCard: React.FC<SillyChatCardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  onPress,
  style,
  testID,
}) => {
  const paddingValue = getPaddingStyles(padding);

  const cardStyles = [
    styles.card,
    {
      padding: paddingValue,
    },
    variant === 'outlined' && styles.outlined,
    variant === 'elevated' && styles.elevated,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={cardStyles}
        activeOpacity={0.9}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  outlined: {
    borderWidth: 1,
    borderColor: PRIMARY.main,
    elevation: 0,
    shadowOpacity: 0,
  },
  elevated: {
    borderWidth: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
});

export default SillyChatCard;
