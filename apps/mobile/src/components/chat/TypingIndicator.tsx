/**
 * 正在输入指示器组件
 * 显示对方或代理正在输入的状态
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { ACCENT } from '../../constants/colors';

interface TypingIndicatorProps {
  users?: string[];
  dotColor?: string;
  dotSize?: number;
  showText?: boolean;
}

/**
 * 单个跳动点
 */
interface DotProps {
  delay: number;
  color: string;
  size: number;
}

const Dot: React.FC<DotProps> = ({ delay, color, size }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -6,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [delay, translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    />
  );
};

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  users = [],
  dotColor = ACCENT.main,
  dotSize = 8,
  showText = true,
}) => {
  // 获取显示文本
  const getTypingText = (): string => {
    if (users.length === 0) {
      return '正在输入...';
    }
    if (users.length === 1) {
      return `${users[0]} 正在输入...`;
    }
    if (users.length === 2) {
      return `${users[0]} 和 ${users[1]} 正在输入...`;
    }
    return `${users[0]} 和其他 ${users.length - 1} 人正在输入...`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <View style={styles.dotsContainer}>
          <Dot delay={0} color={dotColor} size={dotSize} />
          <Dot delay={150} color={dotColor} size={dotSize} />
          <Dot delay={300} color={dotColor} size={dotSize} />
        </View>
      </View>
      {showText && (
        <Text style={styles.text} numberOfLines={1}>
          {getTypingText()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 16,
  },
  dot: {
    marginHorizontal: 2,
  },
  text: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666666',
    maxWidth: 200,
  },
});

export default TypingIndicator;
