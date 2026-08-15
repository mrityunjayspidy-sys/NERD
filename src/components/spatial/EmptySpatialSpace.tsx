import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { PillButton } from '../common/PillButton';
import { Ionicons } from '@expo/vector-icons';

interface EmptySpatialSpaceProps {
  onAddTask: () => void;
}

export const EmptySpatialSpace: React.FC<EmptySpatialSpaceProps> = ({ onAddTask }) => {
  const { theme } = useTheme();

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 2400 }),
          withTiming(1, { duration: 2400 })
        ),
        -1,
        true
      );

      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 2400 }),
          withTiming(0.45, { duration: 2400 })
        ),
        -1,
        true
      );
    }
  }, [pulseScale, pulseOpacity]);

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.centerAnchor}>
      <View style={styles.orbContainer}>
        <Animated.View
          style={[
            styles.outerRipple,
            { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentLight },
            rippleAnimatedStyle,
          ]}
        />
        <View
          style={[
            styles.coreCompanionOrb,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.borderActive,
            },
          ]}
        >
          <Ionicons name="sparkles" size={28} color={theme.colors.textPrimary} />
        </View>
      </View>

      <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
        Your Space is Clear
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Every great journey begins with a single thought in orbit.
      </Text>

      <PillButton
        label="Add First Task"
        variant="accent"
        size="md"
        icon={<Ionicons name="add-circle" size={18} color={theme.colors.textInverse} />}
        onPress={onAddTask}
        style={styles.addBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  centerAnchor: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -140,
    marginTop: -140,
    width: 280,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  orbContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  outerRipple: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
  },
  coreCompanionOrb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  addBtn: {
    paddingHorizontal: 22,
  },
});
