/**
 * 加载动画组件
 * 提供多种加载指示器样式
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  ViewStyle,
  Animated,
  Easing,
} from 'react-native';
import { PRIMARY, ACCENT } from '../../constants/colors';

export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'skeleton';
export type LoadingSize = 'small' | 'medium' | 'large';

interface SillyChatLoadingProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  color?: string;
  text?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

/**
 * 获取尺寸数值
 */
const getSizeValue = (size: LoadingSize): number => {
  switch (size) {
    case 'small':
      return 24;
    case 'large':
      return 48;
    case 'medium':
    default:
      return 36;
  }
};

/**
 * 跳动点加载动画
 */
const DotsLoading: React.FC<{ size: LoadingSize; color: string }> = ({
  size,
  color,
}) => {
  const dotSize = getSizeValue(size) / 4;
  const animations = [
    React.useRef(new Animated.Value(0)).current,
    React.useRef(new Animated.Value(0)).current,
    React.useRef(new Animated.Value(0)).current,
  ];

  React.useEffect(() => {
    const createAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]);
    };

    const animation = Animated.loop(
      Animated.parallel([
        createAnimation(animations[0], 0),
        createAnimation(animations[1], 150),
        createAnimation(animations[2], 300),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animations]);

  return (
    <View style={styles.dotsContainer}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              backgroundColor: color,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  }),
                },
              ],
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

/**
 * 脉冲加载动画
 */
const PulseLoading: React.FC<{ size: LoadingSize; color: string }> = ({
  size,
  color,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const sizeValue = getSizeValue(size);

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseAnim]);

  return (
    <View style={styles.pulseContainer}>
      <Animated.View
        style={[
          styles.pulse,
          {
            width: sizeValue,
            height: sizeValue,
            backgroundColor: color,
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 0.3],
            }),
          },
        ]}
      />
      <View
        style={[
          styles.pulseCenter,
          {
            width: sizeValue * 0.5,
            height: sizeValue * 0.5,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

/**
 * 骨架屏加载
 */
const SkeletonLoading: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmerAnim]);

  return (
    <View style={[styles.skeletonContainer, style]}>
      <Animated.View
        style={[
          styles.skeleton,
          {
            transform: [
              {
                translateX: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, 200],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
};

export const SillyChatLoading: React.FC<SillyChatLoadingProps> = ({
  variant = 'spinner',
  size = 'medium',
  color = PRIMARY.main,
  text,
  fullScreen = false,
  style,
}) => {
  const sizeValue = getSizeValue(size);

  const renderLoading = () => {
    switch (variant) {
      case 'dots':
        return <DotsLoading size={size} color={color} />;
      case 'pulse':
        return <PulseLoading size={size} color={color} />;
      case 'skeleton':
        return <SkeletonLoading style={style} />;
      case 'spinner':
      default:
        return <ActivityIndicator size={sizeValue} color={color} />;
    }
  };

  const content = (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      {renderLoading()}
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );

  return content;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 999,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    marginHorizontal: 3,
    borderRadius: 4,
  },
  pulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    borderRadius: 100,
  },
  pulseCenter: {
    position: 'absolute',
    borderRadius: 100,
  },
  skeletonContainer: {
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  skeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
});

export default SillyChatLoading;
