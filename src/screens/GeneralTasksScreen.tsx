import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTasks, TaskFilter, getEffectivePriority } from '../context/TaskContext';
import { Header } from '../components/common/Header';
import { PillButton } from '../components/common/PillButton';
import { Task } from '../types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface GeneralTasksScreenProps {
  onOpenSettings: () => void;
  onSelectTask: (task: Task) => void;
  onAddTask: () => void;
  onNavigateToSpace: () => void;
}

export const GeneralTasksScreen: React.FC<GeneralTasksScreenProps> = ({
  onOpenSettings,
  onSelectTask,
  onAddTask,
  onNavigateToSpace,
}) => {
  const { theme } = useTheme();
  const {
    tasks,
    filteredTasks,
    activeFilter,
    setActiveFilter,
    toggleTaskStatus,
    searchQuery,
  } = useTasks();

  const filterOptions: { id: TaskFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'all', label: 'All Tasks', icon: 'layers-outline' },
    { id: 'today', label: 'Today', icon: 'time-outline' },
    { id: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
    { id: 'high', label: 'Priority', icon: 'alert-circle-outline' },
    { id: 'done', label: 'Done', icon: 'checkmark-done-outline' },
  ];

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const todayCount = tasks.filter((t) => {
    const d = new Date(t.due_date);
    const n = new Date();
    return (
      d.getDate() === n.getDate() &&
      d.getMonth() === n.getMonth() &&
      d.getFullYear() === n.getFullYear() &&
      t.status !== 'done'
    );
  }).length;
  const highPriorityCount = tasks.filter((t) => getEffectivePriority(t) === 'high' && t.status !== 'done').length;

  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const handleFilterSelect = (filter: TaskFilter) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    setActiveFilter(filter);
  };

  const formatDue = (dueIso: string) => {
    const d = new Date(dueIso);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return 'Tomorrow';
    if (diff > 1 && diff <= 7) {
      return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header onOpenSettings={onOpenSettings} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Companion Momentum Banner */}
        <View
          style={[
            styles.momentumCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={styles.momentumHeaderRow}>
            <View style={styles.momentumTextCol}>
              <Text style={[styles.momentumGreeting, { color: theme.colors.textPrimary }]}>
                Daily Momentum
              </Text>
              <Text style={[styles.momentumSub, { color: theme.colors.textSecondary }]}>
                {completedCount} of {totalTasks} missions accomplished ({progressPercent}%)
              </Text>
            </View>
            <View
              style={[
                styles.percentPill,
                {
                  backgroundColor: theme.colors.accentLight,
                  borderColor: theme.colors.borderActive,
                },
              ]}
            >
              <Text style={[styles.percentPillText, { color: theme.colors.textPrimary }]}>
                {progressPercent}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceInput }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: theme.colors.accent,
                },
              ]}
            />
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.colors.surfaceInput, borderRadius: theme.radii.lg },
              ]}
            >
              <Text style={[styles.metricNum, { color: theme.colors.textPrimary }]}>{todayCount}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Due Today</Text>
            </View>

            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.colors.surfaceInput, borderRadius: theme.radii.lg },
              ]}
            >
              <Text style={[styles.metricNum, { color: theme.colors.textPrimary }]}>
                {highPriorityCount}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>High Priority</Text>
            </View>

            <Pressable
              onPress={onNavigateToSpace}
              style={[
                styles.metricTile,
                styles.spaceShortcutTile,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radii.lg,
                },
              ]}
            >
              <Text style={[styles.metricNum, { color: theme.colors.textInverse }]}>2D</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textInverse }]}>Moving Space</Text>
            </Pressable>
          </View>
        </View>

        {/* Filter Pills Rail */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filterOptions.map((f) => {
              const isSelected = activeFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => handleFilterSelect(f.id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceElevated,
                      borderColor: isSelected ? theme.colors.borderActive : theme.colors.border,
                      borderRadius: theme.radii.full,
                    },
                  ]}
                >
                  <Ionicons
                    name={f.icon}
                    size={14}
                    color={isSelected ? theme.colors.textInverse : theme.colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: isSelected ? theme.colors.textInverse : theme.colors.textPrimary },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* General Tasks List */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
                {searchQuery ? `Search Results (${filteredTasks.length})` : 'All Active Tasks'}
              </Text>
              <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
                {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
              </Text>
            </View>

            <Pressable
              onPress={onAddTask}
              style={[
                styles.headerAddBtn,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons name="add" size={16} color={theme.colors.textInverse} style={{ marginRight: 4 }} />
              <Text style={[styles.headerAddBtnText, { color: theme.colors.textInverse }]}>
                Add Task
              </Text>
            </Pressable>
          </View>

          {filteredTasks.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.xl,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: theme.colors.surfaceInput },
                ]}
              >
                <Ionicons name="checkbox-outline" size={28} color={theme.colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                No tasks in this category
              </Text>
              <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                Add a new task or adjust your active filter.
              </Text>
              <PillButton
                label="Add New Task"
                variant="accent"
                size="md"
                icon={<Ionicons name="add-circle" size={16} color={theme.colors.textInverse} />}
                onPress={onAddTask}
                style={{ marginTop: 14 }}
              />
            </View>
          ) : (
            <View style={styles.cardsStack}>
              {filteredTasks.map((task) => {
                const isDone = task.status === 'done';
                const effectivePriority = getEffectivePriority(task);
                const isHigh = effectivePriority === 'high';
                const isMed = effectivePriority === 'medium';

                const priorityColor = isHigh
                  ? theme.colors.priorityHigh
                  : isMed
                  ? theme.colors.accent
                  : theme.colors.priorityLow;

                return (
                  <Pressable
                    key={task.id}
                    onPress={() => onSelectTask(task)}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: isHigh && !isDone ? theme.colors.priorityHigh : theme.colors.border,
                        borderRadius: theme.radii.lg,
                      },
                      isDone && { opacity: 0.55 },
                    ]}
                  >
                    {/* Checkbox / Complete Circle */}
                    <Pressable
                      onPress={() => toggleTaskStatus(task.id)}
                      style={[
                        styles.checkOrb,
                        {
                          borderColor: isDone ? theme.colors.donePill : theme.colors.borderActive,
                          backgroundColor: isDone ? theme.colors.donePill : 'transparent',
                          borderRadius: theme.radii.full,
                        },
                      ]}
                    >
                      {isDone && <Ionicons name="checkmark" size={13} color="#FFF" />}
                    </Pressable>

                    {/* Task Content */}
                    <View style={styles.cardContentCol}>
                      <View style={styles.cardHeaderRow}>
                        <Text
                          style={[
                            styles.taskTitleText,
                            {
                              color: theme.colors.textPrimary,
                              textDecorationLine: isDone ? 'line-through' : 'none',
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {task.title}
                        </Text>
                        <View style={[styles.priorityPill, { backgroundColor: theme.colors.surfaceInput }]}>
                          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                          <Text style={[styles.priorityText, { color: theme.colors.textSecondary }]}>
                            {effectivePriority}
                          </Text>
                        </View>
                      </View>

                      {task.description ? (
                        <Text
                          numberOfLines={2}
                          style={[styles.taskDescText, { color: theme.colors.textSecondary }]}
                        >
                          {task.description}
                        </Text>
                      ) : null}

                      {/* Footer Badge Row */}
                      <View style={styles.cardFooterRow}>
                        <View style={styles.badgeItem}>
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={theme.colors.textMuted}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.badgeItemText, { color: theme.colors.textMuted }]}>
                            {formatDue(task.due_date)}
                          </Text>
                        </View>

                        {task.reminder_time && (
                          <View style={styles.badgeItem}>
                            <Ionicons
                              name="alarm-outline"
                              size={12}
                              color={theme.colors.accent}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.badgeItemText, { color: theme.colors.accent }]}>
                              Reminder
                            </Text>
                          </View>
                        )}

                        {task.connected_task_ids && task.connected_task_ids.length > 0 && (
                          <View style={styles.badgeItem}>
                            <Ionicons
                              name="git-network"
                              size={12}
                              color={theme.colors.accent}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.badgeItemText, { color: theme.colors.accent }]}>
                              {task.connected_task_ids.length} linked
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Task Photo Thumbnail */}
                    {task.image_uri ? (
                      <Image
                        source={{ uri: task.image_uri }}
                        style={[styles.taskCardPhoto, { borderRadius: theme.radii.md }]}
                        resizeMode="cover"
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 120,
    gap: 16,
  },
  momentumCard: {
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  momentumHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  momentumTextCol: {
    flex: 1,
  },
  momentumGreeting: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  momentumSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  percentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  percentPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  spaceShortcutTile: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  filterSection: {
    marginVertical: 2,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tasksSection: {
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  cardsStack: {
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    padding: 14,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  checkOrb: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginTop: 2,
  },
  cardContentCol: {
    flex: 1,
    gap: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  taskTitleText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  taskDescText: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeItemText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskCardPhoto: {
    width: 48,
    height: 48,
    alignSelf: 'center',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
