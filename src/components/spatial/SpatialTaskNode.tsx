import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Image, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useTheme } from '../../context/ThemeContext';
import { Task } from '../../types';
import { getEffectivePriority } from '../../context/TaskContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface SpatialTaskNodeProps {
  task: Task;
  x: number;
  y: number;
  zoomScale: number;
  isSelectedForConnection?: boolean;
  onPress: (task: Task) => void;
  onComplete: (taskId: string) => void;
  onDrag?: (taskId: string, newX: number, newY: number) => void;
  onDragEnd?: (taskId: string, finalX: number, finalY: number) => void;
}

export const SpatialTaskNode: React.FC<SpatialTaskNodeProps> = ({
  task,
  x,
  y,
  zoomScale,
  isSelectedForConnection = false,
  onPress,
  onComplete,
  onDrag,
  onDragEnd,
}) => {
  const { theme } = useTheme();

  // Gentle idle floating micro-motion
  const floatOffset = useSharedValue(0);
  const baseX = useSharedValue(x);
  const baseY = useSharedValue(y);
  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const cardScale = useSharedValue(1);

  const isDone = task.status === 'done';

  // Determine urgency & zone
  const now = new Date();
  const dueDate = new Date(task.due_date);
  const isToday =
    dueDate.getDate() === now.getDate() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getFullYear() === now.getFullYear();
  const isOverdue = dueDate.getTime() < now.getTime() && !isDone;

  useEffect(() => {
    if (!isDragging.value) {
      baseX.value = x;
      baseY.value = y;
      dragOffsetX.value = 0;
      dragOffsetY.value = 0;
    }
  }, [x, y, isDragging]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const randomDuration = 3200 + ((x * y) % 1200);
      const randomDelta = 4 + ((x + y) % 4);

      floatOffset.value = withRepeat(
        withSequence(
          withTiming(-randomDelta, { duration: randomDuration / 2 }),
          withTiming(randomDelta, { duration: randomDuration / 2 })
        ),
        -1,
        true
      );
    }
  }, [x, y, floatOffset]);

  const panGesture = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      isDragging.value = true;
      cardScale.value = withSpring(1.06);
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (_) {}
      }
    })
    .onUpdate((event) => {
      const scaleVal = zoomScale > 0 ? zoomScale : 1;
      dragOffsetX.value = event.translationX / scaleVal;
      dragOffsetY.value = event.translationY / scaleVal;

      if (onDrag) {
        runOnJS(onDrag)(
          task.id,
          Math.round(baseX.value + dragOffsetX.value),
          Math.round(baseY.value + dragOffsetY.value)
        );
      }
    })
    .onEnd(() => {
      isDragging.value = false;
      cardScale.value = withSpring(1);
      const finalX = Math.round(baseX.value + dragOffsetX.value);
      const finalY = Math.round(baseY.value + dragOffsetY.value);
      baseX.value = finalX;
      baseY.value = finalY;
      dragOffsetX.value = 0;
      dragOffsetY.value = 0;

      if (onDragEnd) {
        runOnJS(onDragEnd)(task.id, finalX, finalY);
      }
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onPress)(task);
    });

  const nodeGestures = Gesture.Exclusive(panGesture, tapGesture);

  const nodeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: baseX.value + dragOffsetX.value },
        { translateY: baseY.value + dragOffsetY.value + floatOffset.value },
        { scale: cardScale.value },
      ],
      opacity: isDone ? 0.45 : 1,
      zIndex: isDragging.value ? 50 : 10,
    };
  });

  const effectivePriority = getEffectivePriority(task);

  const getPriorityColor = () => {
    if (effectivePriority === 'high') return theme.colors.priorityHigh;
    if (effectivePriority === 'medium') return theme.colors.accent;
    return theme.colors.priorityLow;
  };

  const formatDueBadge = () => {
    const timeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Today • ${timeStr}`;
    }
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      return `Tomorrow • ${timeStr}`;
    }
    const dateFormatted = dueDate.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return `${dateFormatted} • ${timeStr}`;
  };

  const isZoomedOut = zoomScale < 0.75;
  const isZoomedIn = zoomScale > 1.25;
  const connectionCount = task.connected_task_ids?.length || 0;
  const isHead = Boolean(task.is_head_node);

  return (
    <Animated.View style={[styles.nodeAbsoluteContainer, nodeAnimatedStyle]}>
      <GestureDetector gesture={nodeGestures}>
        <Animated.View
          style={[
            styles.cardBase,
            {
              backgroundColor: isToday
                ? theme.colors.surfaceElevated
                : theme.colors.surface,
              borderColor: isSelectedForConnection
                ? theme.colors.accent
                : isHead
                ? '#FFB800'
                : isOverdue
                ? theme.colors.overduePill
                : isToday
                ? theme.colors.borderActive
                : theme.colors.border,
              borderRadius: isZoomedOut ? theme.radii.full : theme.radii.lg,
              borderWidth: isSelectedForConnection || isHead ? 2.5 : isToday || isOverdue ? 1.5 : 1,
            },
            isHead && styles.headNodeAura,
            isToday && !isHead && styles.todayAura,
            isSelectedForConnection && styles.selectedConnectionAura,
            isZoomedOut ? styles.cardCompact : styles.cardStandard,
          ]}
        >
          {/* Level of Detail: Compact Chip */}
          {isZoomedOut ? (
            <View style={styles.compactRow}>
              {task.image_uri ? (
                <Image source={{ uri: task.image_uri }} style={styles.compactThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: getPriorityColor() }]} />
              )}
              <Text
                numberOfLines={1}
                style={[styles.compactTitle, { color: theme.colors.textPrimary }]}
              >
                {isHead ? '👑 ' : ''}{task.title}
              </Text>
              {isDone && <Ionicons name="checkmark-circle" size={14} color={theme.colors.donePill} />}
            </View>
          ) : (
            /* Level of Detail: Standard & High Detail Card */
            <View style={styles.standardContent}>
              {/* Attached Task Photo */}
              {task.image_uri ? (
                <View style={[styles.nodePhotoWrapper, { borderRadius: theme.radii.md }]}>
                  <Image
                    source={{ uri: task.image_uri }}
                    style={[styles.nodePhoto, { borderRadius: theme.radii.md }]}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {/* Head Node Badge Bar */}
              {isHead && (
                <View style={styles.headNodeBadgeRow}>
                  <View style={[styles.headNodePill, { backgroundColor: 'rgba(255, 184, 0, 0.16)', borderColor: '#FFB800' }]}>
                    <Ionicons name="star" size={11} color="#FFB800" style={{ marginRight: 4 }} />
                    <Text style={[styles.headNodePillText, { color: '#FFB800' }]}>
                      HEAD NODE
                    </Text>
                  </View>
                </View>
              )}

              {/* Header Bar with Priority Dot & Due Pill */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.priorityIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: getPriorityColor() }]} />
                  <Text style={[styles.priorityLabel, { color: theme.colors.textMuted }]}>
                    {effectivePriority.toUpperCase()}
                  </Text>
                </View>

                <View
                  style={[
                    styles.dueBadge,
                    {
                      backgroundColor: isOverdue
                        ? 'rgba(217, 83, 79, 0.12)'
                        : isToday
                        ? theme.colors.accentLight
                        : theme.colors.surfaceInput,
                      borderColor: isOverdue ? theme.colors.overduePill : theme.colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={task.reminder_time ? 'alarm-outline' : 'time-outline'}
                    size={11}
                    color={isOverdue ? theme.colors.overduePill : theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.dueBadgeText,
                      {
                        color: isOverdue ? theme.colors.overduePill : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {formatDueBadge()}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text
                numberOfLines={isZoomedIn ? 3 : 2}
                style={[
                  styles.cardTitle,
                  {
                    color: theme.colors.textPrimary,
                    textDecorationLine: isDone ? 'line-through' : 'none',
                  },
                ]}
              >
                {task.title}
              </Text>

              {/* High Detail Extra: Description preview */}
              {isZoomedIn && task.description ? (
                <Text
                  numberOfLines={2}
                  style={[styles.cardDescription, { color: theme.colors.textMuted }]}
                >
                  {task.description}
                </Text>
              ) : null}

              {/* Footer Tactile Cue */}
              <View style={styles.cardFooter}>
                <View style={styles.gestureHint}>
                  {connectionCount > 0 ? (
                    <View style={styles.linkCountBadge}>
                      <Ionicons name="git-network" size={10} color={theme.colors.accent} />
                      <Text style={[styles.linkCountText, { color: theme.colors.accent }]}>
                        {connectionCount} {connectionCount === 1 ? 'link' : 'links'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="move" size={11} color={theme.colors.textMuted} />
                      <Text style={[styles.gestureText, { color: theme.colors.textMuted }]}>
                        {isDone ? 'Completed' : 'Drag to arrange'}
                      </Text>
                    </>
                  )}
                </View>

                {isDone ? (
                  <View style={[styles.doneTag, { backgroundColor: 'rgba(78, 159, 118, 0.15)' }]}>
                    <Ionicons name="checkmark" size={12} color={theme.colors.donePill} />
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  nodeAbsoluteContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: 10,
  },
  cardBase: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardStandard: {
    width: 210,
    padding: 14,
    marginLeft: -105,
    marginTop: -60,
  },
  cardCompact: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: -70,
    marginTop: -18,
    minWidth: 140,
  },
  todayAura: {
    shadowColor: '#808080',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  selectedConnectionAura: {
    shadowColor: '#171717',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  linkCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  linkCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  compactTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  nodePhotoWrapper: {
    width: '100%',
    height: 85,
    overflow: 'hidden',
    marginBottom: 4,
  },
  nodePhoto: {
    width: '100%',
    height: '100%',
  },
  standardContent: {
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  priorityLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  cardDescription: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.15)',
  },
  gestureHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gestureText: {
    fontSize: 9,
    fontWeight: '500',
  },
  doneTag: {
    padding: 2,
    borderRadius: 999,
  },
  headNodeAura: {
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  headNodeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headNodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  headNodePillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
