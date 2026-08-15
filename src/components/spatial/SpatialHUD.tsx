import React from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { TaskFilter, useTasks } from '../../context/TaskContext';
import { PillButton } from '../common/PillButton';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface SpatialHUDProps {
  onResetView: () => void;
  onAddTask: () => void;
  currentScale: number;
  isConnectMode: boolean;
  onToggleConnectMode: () => void;
  selectedTaskForConnection: string | null;
}

export const SpatialHUD: React.FC<SpatialHUDProps> = ({
  onResetView,
  onAddTask,
  currentScale,
  isConnectMode,
  onToggleConnectMode,
  selectedTaskForConnection,
}) => {
  const { theme } = useTheme();
  const { activeFilter, setActiveFilter, tasks } = useTasks();

  const filters: { id: TaskFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'all', label: 'All', icon: 'planet-outline' },
    { id: 'today', label: 'Today', icon: 'time-outline' },
    { id: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
    { id: 'high', label: 'Priority', icon: 'alert-circle-outline' },
    { id: 'done', label: 'Done', icon: 'checkmark-done-outline' },
  ];

  const handleFilterSelect = (id: TaskFilter) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    setActiveFilter(id);
  };

  const todayCount = tasks.filter((t) => {
    const d = new Date(t.due_date);
    const n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && t.status !== 'done';
  }).length;

  return (
    <View style={styles.hudOverlay} pointerEvents="box-none">
      {/* Top Filter Rail */}
      <View style={styles.topFilterRail} pointerEvents="box-none">
        <View
          style={[
            styles.filterPillContainer,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.full,
            },
          ]}
        >
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => handleFilterSelect(f.id)}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive ? theme.colors.accent : 'transparent',
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={isActive ? theme.colors.textInverse : theme.colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.filterTabText,
                    { color: isActive ? theme.colors.textInverse : theme.colors.textSecondary },
                  ]}
                >
                  {f.label}
                  {f.id === 'today' && todayCount > 0 ? ` (${todayCount})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Connect Mode Status Banner */}
        {isConnectMode && (
          <View
            style={[
              styles.connectBanner,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.accent,
                borderRadius: theme.radii.full,
              },
            ]}
          >
            <Ionicons name="git-network" size={14} color={theme.colors.accent} />
            <Text style={[styles.connectBannerText, { color: theme.colors.textPrimary }]}>
              {selectedTaskForConnection
                ? 'Select a 2nd task node to connect/disconnect'
                : 'Tap a task node to start connection'}
            </Text>
          </View>
        )}
      </View>

      {/* Floating Right Control Deck */}
      <View style={styles.rightControlDeck} pointerEvents="box-none">
        {/* Add Task in Orbit Button */}
        <View
          style={[
            styles.controlGroup,
            {
              backgroundColor: theme.colors.accent,
              borderColor: theme.colors.borderActive,
              borderRadius: theme.radii.full,
            },
          ]}
        >
          <Pressable
            onPress={onAddTask}
            style={styles.hudControlBtn}
            accessibilityLabel="Add Task in Orbit"
          >
            <Ionicons name="add" size={22} color={theme.colors.textInverse} />
          </Pressable>
        </View>

        {/* Reset View Button */}
        <View
          style={[
            styles.controlGroup,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.full,
            },
          ]}
        >
          <Pressable
            onPress={onResetView}
            style={styles.hudControlBtn}
            accessibilityLabel="Center View"
          >
            <Ionicons name="locate" size={18} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        {/* Connect / Link Mode Toggle Button */}
        <View
          style={[
            styles.controlGroup,
            {
              backgroundColor: isConnectMode ? theme.colors.accent : theme.colors.surfaceElevated,
              borderColor: isConnectMode ? theme.colors.borderActive : theme.colors.border,
              borderRadius: theme.radii.full,
            },
          ]}
        >
          <Pressable
            onPress={onToggleConnectMode}
            style={styles.hudControlBtn}
            accessibilityLabel="Connect Tasks"
          >
            <Ionicons
              name={isConnectMode ? 'git-network' : 'git-network-outline'}
              size={18}
              color={isConnectMode ? theme.colors.textInverse : theme.colors.textPrimary}
            />
          </Pressable>
        </View>

        {/* Zoom Scale Badge */}
        <View
          style={[
            styles.scaleBadge,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.full,
            },
          ]}
        >
          <Text style={[styles.scaleText, { color: theme.colors.textMuted }]}>
            {Math.round(currentScale * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 30,
  },
  topFilterRail: {
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  filterPillContainer: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  connectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  connectBannerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rightControlDeck: {
    position: 'absolute',
    right: 16,
    top: 70,
    alignItems: 'center',
    gap: 8,
  },
  controlGroup: {
    padding: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  hudControlBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  scaleText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
