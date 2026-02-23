/**
 * 统一按钮组件
 * 提供一致的品牌风格按钮样式
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { PRIMARY, ACCENT } from '../../constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface SillyChatButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * 获取按钮背景色
 */
const getBackgroundColor = (variant: ButtonVariant, disabled: boolean): string => {
  if (disabled) {
    return '#E5E5E5';
  }

  switch (variant) {
    case 'primary':
      return PRIMARY.main;
    case 'secondary':
      return ACCENT.main;
    case 'outline':
    case 'ghost':
      return 'transparent';
    case 'danger':
      return '#F44336';
    default:
      return PRIMARY.main;
  }
};

/**
 * 获取按钮文字颜色
 */
const getTextColor = (variant: ButtonVariant, disabled: boolean): string => {
  if (disabled) {
    return '#999999';
  }

  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'danger':
      return '#FFFFFF';
    case 'outline':
    case 'ghost':
      return PRIMARY.main;
    default:
      return '#FFFFFF';
  }
};

/**
 * 获取按钮尺寸样式
 */
const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'small':
      return {
        paddingVertical: 8,
        paddingHorizontal: 16,
        fontSize: 14,
      };
    case 'large':
      return {
        paddingVertical: 16,
        paddingHorizontal: 32,
        fontSize: 18,
      };
    case 'medium':
    default:
      return {
        paddingVertical: 12,
        paddingHorizontal: 24,
        fontSize: 16,
      };
  }
};

export const SillyChatButton: React.FC<SillyChatButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const backgroundColor = getBackgroundColor(variant, disabled || loading);
  const textColor = getTextColor(variant, disabled || loading);
  const sizeStyles = getSizeStyles(size);

  const buttonStyles = [
    styles.button,
    {
      backgroundColor,
      paddingVertical: sizeStyles.paddingVertical,
      paddingHorizontal: sizeStyles.paddingHorizontal,
    },
    variant === 'outline' && styles.outline,
    style,
  ];

  const titleStyles = [
    styles.text,
    {
      color: textColor,
      fontSize: sizeStyles.fontSize,
    },
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyles}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={titleStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  outline: {
    borderWidth: 2,
    borderColor: PRIMARY.main,
  },
  text: {
    fontWeight: '600',
  },
});

export default SillyChatButton;
