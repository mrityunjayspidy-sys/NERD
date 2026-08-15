import React, { useState } from 'react';
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
import { useTasks, getEffectivePriority } from '../context/TaskContext';
import { Task } from '../types';
import { PillButton } from '../components/common/PillButton';
import { syncTaskToCalendar } from '../services/calendar';
import { useResponsive } from '../hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface CalendarScreenProps {
  onSelectTask: (task: Task) => void;
  onAddTask: (date?: string) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  onSelectTask,
  onAddTask,
}) => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const { tasks, toggleTaskStatus } = useTasks();

  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Generate 21 days
  const days = Array.from({ length: 21 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - 2); // Show 2 past days and 18 future days
    return {
      offset: i - 2,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      fullDate: d,
      isToday: i - 2 === 0,
    };
  });

  const selectedDateObj = new Date();
  selectedDateObj.setDate(selectedDateObj.getDate() + selectedDayOffset);

  // Filter tasks for the selected date
  const tasksForSelectedDate = tasks.filter((t) => {
    const taskDate = new Date(t.due_date);
    return (
      taskDate.getFullYear() === selectedDateObj.getFullYear() &&
      taskDate.getMonth() === selectedDateObj.getMonth() &&
      taskDate.getDate() === selectedDateObj.getDate()
    );
  });

  const handleSyncAll = async () => {
    setSyncStatus('Syncing tasks with device calendar...');
    let successCount = 0;
    for (const t of tasksForSelectedDate) {
      const res = await syncTaskToCalendar(t);
      if (res) successCount++;
    }
    setSyncStatus(`Synced ${successCount} tasks to device calendar`);
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleDaySelect = (offset: number) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    setSelectedDayOffset(offset);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.innerWrap, isDesktop && styles.desktopInnerWrap]}>
        {/* Calendar Strip Header */}
        <View style={[styles.headerSection, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.titleRow}>
            <View>
              <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
                Agenda Orbit
              </Text>
              <Text style={[styles.dateSubtitle, { color: theme.colors.textSecondary }]}>
                {selectedDateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <PillButton
              label="Sync Day"
              size="sm"
              variant="secondary"
              icon={<Ionicons name="sync" size={14} color={theme.colors.textPrimary} />}
              onPress={handleSyncAll}
              disabled={tasksForSelectedDate.length === 0}
            />
          </View>

          {/* Horizontal Day Scrubber */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrubberContent}
          >
            {days.map((d) => {
              const isSelected = selectedDayOffset === d.offset;
              return (
                <Pressable
                  key={d.offset}
                  onPress={() => handleDaySelect(d.offset)}
                  style={[
                    styles.dayCard,
                    {
                      backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceElevated,
                      borderColor: isSelected ? theme.colors.borderActive : theme.colors.border,
                      borderRadius: theme.radii.lg,
                    },
                    d.isToday && !isSelected && { borderColor: theme.colors.borderActive, borderWidth: 1.5 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayCardName,
                      { color: isSelected ? theme.colors.textInverse : theme.colors.textSecondary },
                    ]}
                  >
                    {d.isToday ? 'Today' : d.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dayCardNum,
                      { color: isSelected ? theme.colors.textInverse : theme.colors.textPrimary },
                    ]}
                  >
                    {d.dateNum}
                  </Text>
                  <Text
                    style={[
                      styles.dayCardMonth,
                      { color: isSelected ? theme.colors.textInverse : theme.colors.textMuted },
                    ]}
                  >
                    {d.month}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Sync Status Banner */}
        {syncStatus && (
          <View style={[styles.syncBanner, { backgroundColor: theme.colors.surfaceElevated }]}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.donePill} />
            <Text style={[styles.syncBannerText, { color: theme.colors.textPrimary }]}>{syncStatus}</Text>
          </View>
        )}

        {/* Agenda Task List for Selected Day */}
        <ScrollView
          contentContainerStyle={[
            styles.agendaContent,
            isDesktop && styles.desktopAgendaContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
        {tasksForSelectedDate.length === 0 ? (
          <View style={styles.emptyDayContainer}>
            <View
              style={[
                styles.emptyOrb,
                { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
              ]}
            >
              <Ionicons name="calendar-clear-outline" size={32} color={theme.colors.textMuted} />
            </View>
            <Text style={[styles.emptyDayTitle, { color: theme.colors.textPrimary }]}>
              No tasks plotted for this day
            </Text>
            <Text style={[styles.emptyDaySub, { color: theme.colors.textSecondary }]}>
              Keep your day clear or add a focused mission.
            </Text>
            <PillButton
              label="Schedule Task"
              variant="accent"
              size="md"
              icon={<Ionicons name="add-circle" size={18} color={theme.colors.textInverse} />}
              onPress={() => onAddTask(selectedDateObj.toISOString())}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          <View style={styles.tasksList}>
            {tasksForSelectedDate.map((task) => {
              const isDone = task.status === 'done';
              const d = new Date(task.due_date);
              const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <Pressable
                  key={task.id}
                  onPress={() => onSelectTask(task)}
                  style={[
                    styles.agendaCard,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.lg,
                    },
                    isDone && { opacity: 0.55 },
                  ]}
                >
                  <View style={styles.cardLeftCol}>
                    <Pressable
                      onPress={() => toggleTaskStatus(task.id)}
                      style={[
                        styles.checkCircle,
                        {
                          borderColor: isDone ? theme.colors.donePill : theme.colors.borderActive,
                          backgroundColor: isDone ? theme.colors.donePill : 'transparent',
                          borderRadius: theme.radii.full,
                        },
                      ]}
                    >
                      {isDone && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </Pressable>
                  </View>

                  <View style={styles.cardMainCol}>
                    <View style={styles.cardTopRow}>
                      <Text
                        style={[
                          styles.agendaTitle,
                          {
                            color: theme.colors.textPrimary,
                            textDecorationLine: isDone ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {task.title}
                      </Text>
                      <View
                        style={[
                          styles.priorityDot,
                          {
                            backgroundColor:
                              getEffectivePriority(task) === 'high'
                                ? theme.colors.priorityHigh
                                : getEffectivePriority(task) === 'medium'
                                ? theme.colors.accent
                                : theme.colors.priorityLow,
                          },
                        ]}
                      />
                    </View>

                    {task.description ? (
                      <Text
                        numberOfLines={2}
                        style={[styles.agendaDesc, { color: theme.colors.textSecondary }]}
                      >
                        {task.description}
                      </Text>
                    ) : null}

                    <View style={styles.agendaTimeRow}>
                      <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
                      <Text style={[styles.agendaTimeText, { color: theme.colors.textMuted }]}>
                        {timeStr}
                        {task.reminder_time ? ' • Push Reminder Active' : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Task Photo Thumbnail */}
                  {task.image_uri ? (
                    <Image
                      source={{ uri: task.image_uri }}
                      style={[styles.agendaPhotoThumb, { borderRadius: theme.radii.md }]}
                      resizeMode="cover"
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerWrap: {
    flex: 1,
  },
  desktopInnerWrap: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  desktopAgendaContent: {
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  headerSection: {
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  dateSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrubberContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayCard: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 62,
    borderWidth: 1,
  },
  dayCardName: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayCardNum: {
    fontSize: 17,
    fontWeight: '800',
    marginVertical: 2,
  },
  dayCardMonth: {
    fontSize: 10,
    fontWeight: '600',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    gap: 8,
  },
  syncBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  agendaContent: {
    padding: 20,
    flexGrow: 1,
  },
  emptyDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyOrb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 14,
  },
  emptyDayTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDaySub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  tasksList: {
    gap: 12,
  },
  agendaCard: {
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeftCol: {
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  cardMainCol: {
    flex: 1,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agendaTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  agendaDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  agendaTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  agendaTimeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  agendaPhotoThumb: {
    width: 44,
    height: 44,
    alignSelf: 'center',
  },
});
