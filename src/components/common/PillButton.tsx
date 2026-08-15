import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PillButtonProps {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  active?: boolean;
}

export const PillButton: React.FC<PillButtonProps> = ({
  label,
  icon,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  textStyle,
  active = false,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.95, { damping: 12, stiffness: 200 });
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.colors.accentLight;
    if (active) return theme.colors.borderActive;
    switch (variant) {
      case 'primary':
        return theme.colors.surfaceElevated;
      case 'secondary':
        return theme.colors.surface;
      case 'accent':
        return theme.colors.accent;
      case 'danger':
        return theme.colors.priorityHigh;
      case 'ghost':
        return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textMuted;
    if (active) return theme.colors.textInverse;
    switch (variant) {
      case 'accent':
      case 'danger':
        return theme.colors.textInverse;
      case 'primary':
      case 'secondary':
      case 'ghost':
        return theme.colors.textPrimary;
    }
  };

  const sizeStyles: Record<string, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
    sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13 },
    md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 15 },
    lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 17 },
  };

  const currentSize = sizeStyles[size];

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          borderRadius: theme.radii.full,
          borderWidth: variant === 'ghost' ? 0 : 1,
          borderColor: active ? theme.colors.borderActive : theme.colors.border,
        },
        animatedStyle,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {icon && <View style={[styles.iconWrap, label ? { marginRight: 8 } : null]}>{icon}</View>}
        {label &&
          (typeof label === 'string' ? (
            <Text
              style={[
                styles.label,
                {
                  color: getTextColor(),
                  fontSize: currentSize.fontSize,
                },
                textStyle,
              ]}
            >
              {label}
            </Text>
          ) : (
            label
          ))}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
