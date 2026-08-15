import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTasks, getEffectivePriority } from '../context/TaskContext';
import { Task } from '../types';
import { PillButton } from '../components/common/PillButton';
import { syncTaskToCalendar } from '../services/calendar';
import { Ionicons } from '@expo/vector-icons';

interface TaskDetailModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  visible,
  task,
  onClose,
  onEdit,
}) => {
  const { theme } = useTheme();
  const { toggleTaskStatus, deleteTask, toggleHeadNode } = useTasks();
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!task) return null;

  const isDone = task.status === 'done';
  const dueDate = new Date(task.due_date);
  const now = new Date();
  const diffHours = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  const isToday =
    dueDate.getDate() === now.getDate() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getFullYear() === now.getFullYear();
  const isOverdue = dueDate.getTime() < now.getTime() && !isDone;

  const getUrgencyText = () => {
    if (isDone) return 'Mission Completed • Drifting peacefully';
    if (isOverdue) return `Overdue by ${Math.abs(diffHours)} hours • Immediate Focus`;
    if (isToday) return 'In Center Orbit • Due Today';
    if (diffHours <= 48) return 'Approaching Horizon • Due Tomorrow';
    return `In Deep Orbit • Due in ${Math.round(diffHours / 24)} days`;
  };

  const handleSyncToCalendar = async () => {
    setSyncFeedback('Syncing with calendar...');
    const result = await syncTaskToCalendar(task);
    if (result) {
      setSyncFeedback('Added to Device Calendar!');
      setTimeout(() => setSyncFeedback(null), 3000);
    } else {
      setSyncFeedback('Calendar sync skipped or unavailable');
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const formatFullDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: theme.colors.modalOverlay }]}>
        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
            },
          ]}
        >
          {/* Top Grab Handle */}
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

          <View style={styles.headerRow}>
            <View
              style={[
                styles.zoneBadge,
                {
                  backgroundColor: isDone
                    ? 'rgba(78, 159, 118, 0.15)'
                    : isOverdue
                    ? 'rgba(217, 83, 79, 0.12)'
                    : theme.colors.accentLight,
                  borderColor: isDone
                    ? theme.colors.donePill
                    : isOverdue
                    ? theme.colors.overduePill
                    : theme.colors.borderActive,
                },
              ]}
            >
              <Ionicons
                name={isDone ? 'checkmark-circle' : isOverdue ? 'warning-outline' : 'planet'}
                size={13}
                color={
                  isDone
                    ? theme.colors.donePill
                    : isOverdue
                    ? theme.colors.overduePill
                    : theme.colors.textPrimary
                }
              />
              <Text
                style={[
                  styles.zoneText,
                  {
                    color: isDone
                      ? theme.colors.donePill
                      : isOverdue
                      ? theme.colors.overduePill
                      : theme.colors.textPrimary,
                  },
                ]}
              >
                {getUrgencyText()}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.colors.surfaceInput, borderRadius: theme.radii.full },
              ]}
            >
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentScroll}>
            {/* Title */}
            <Text
              style={[
                styles.taskTitle,
                {
                  color: theme.colors.textPrimary,
                  textDecorationLine: isDone ? 'line-through' : 'none',
                },
              ]}
            >
              {task.title}
            </Text>

            {/* Attached Photo Banner */}
            {task.image_uri ? (
              <View style={[styles.detailPhotoWrapper, { borderRadius: theme.radii.lg }]}>
                <Image
                  source={{ uri: task.image_uri }}
                  style={[styles.detailPhoto, { borderRadius: theme.radii.lg }]}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            {/* Description */}
            {task.description ? (
              <View
                style={[
                  styles.descBox,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <Text style={[styles.descText, { color: theme.colors.textSecondary }]}>
                  {task.description}
                </Text>
              </View>
            ) : null}

            {/* Metadata Chips Grid */}
            <View style={styles.metaGrid}>
              {/* Due Date Tile */}
              <View
                style={[
                  styles.metaTile,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <Ionicons name="time-outline" size={18} color={theme.colors.accent} />
                <View style={styles.metaTileContent}>
                  <Text style={[styles.metaTileLabel, { color: theme.colors.textMuted }]}>Due Date</Text>
                  <Text style={[styles.metaTileVal, { color: theme.colors.textPrimary }]}>
                    {formatFullDate(task.due_date)}
                  </Text>
                </View>
              </View>

              {/* Reminder Tile */}
              {task.reminder_time ? (
                <View
                  style={[
                    styles.metaTile,
                    {
                      backgroundColor: theme.colors.surfaceInput,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.md,
                    },
                  ]}
                >
                  <Ionicons name="alarm-outline" size={18} color={theme.colors.accent} />
                  <View style={styles.metaTileContent}>
                    <Text style={[styles.metaTileLabel, { color: theme.colors.textMuted }]}>
                      Push Reminder
                    </Text>
                    <Text style={[styles.metaTileVal, { color: theme.colors.textPrimary }]}>
                      {formatFullDate(task.reminder_time)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Priority Magnitude */}
              <View
                style={[
                  styles.metaTile,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <Ionicons name="flash-outline" size={18} color={theme.colors.accent} />
                <View style={styles.metaTileContent}>
                  <Text style={[styles.metaTileLabel, { color: theme.colors.textMuted }]}>Priority</Text>
                  <Text style={[styles.metaTileVal, { color: theme.colors.textPrimary }]}>
                    {getEffectivePriority(task).toUpperCase()} Magnitude
                    {getEffectivePriority(task) === 'high' && task.priority !== 'high' ? ' (Auto 3-Day Focus)' : ''}
                  </Text>
                </View>
              </View>

              {/* Connected Links */}
              {task.connected_task_ids && task.connected_task_ids.length > 0 && (
                <View
                  style={[
                    styles.metaTile,
                    {
                      backgroundColor: theme.colors.surfaceInput,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.md,
                    },
                  ]}
                >
                  <Ionicons name="git-network-outline" size={18} color={theme.colors.accent} />
                  <View style={styles.metaTileContent}>
                    <Text style={[styles.metaTileLabel, { color: theme.colors.textMuted }]}>
                      Moving Space Links
                    </Text>
                    <Text style={[styles.metaTileVal, { color: theme.colors.textPrimary }]}>
                      Connected to {task.connected_task_ids.length} other {task.connected_task_ids.length === 1 ? 'mission node' : 'mission nodes'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <View style={[styles.feedbackBanner, { backgroundColor: theme.colors.accentLight }]}>
                <Text style={[styles.feedbackText, { color: theme.colors.textPrimary }]}>
                  {syncFeedback}
                </Text>
              </View>
            )}

            {/* Quick Companion Actions */}
            <View style={styles.actionsContainer}>
              {/* Toggle Status Pill */}
              <PillButton
                label={isDone ? 'Reopen Task' : 'Mark Complete'}
                variant={isDone ? 'secondary' : 'accent'}
                size="lg"
                icon={
                  <Ionicons
                    name={isDone ? 'refresh-outline' : 'checkmark-done-circle'}
                    size={20}
                    color={isDone ? theme.colors.textPrimary : theme.colors.textInverse}
                  />
                }
                onPress={() => toggleTaskStatus(task.id)}
              />

              {/* Head Node Master Toggle */}
              <PillButton
                label={task.is_head_node ? '★ Designated Head Node (Tap to Demote)' : '👑 Set as Head Node (Master Mission)'}
                variant="secondary"
                size="md"
                icon={<Ionicons name="star" size={18} color="#FFB800" />}
                onPress={() => toggleHeadNode(task.id)}
                style={{
                  borderColor: task.is_head_node ? '#FFB800' : theme.colors.border,
                  backgroundColor: task.is_head_node ? 'rgba(255, 184, 0, 0.1)' : theme.colors.surfaceElevated,
                }}
              />

              {/* Native Device Calendar Sync */}
              <PillButton
                label="Sync with Device Calendar"
                variant="secondary"
                size="md"
                icon={<Ionicons name="calendar-outline" size={18} color={theme.colors.textPrimary} />}
                onPress={handleSyncToCalendar}
              />

              {/* Secondary Buttons Row */}
              <View style={styles.bottomButtonsRow}>
                <PillButton
                  label="Edit Task"
                  variant="secondary"
                  size="md"
                  icon={<Ionicons name="create-outline" size={16} color={theme.colors.textPrimary} />}
                  onPress={() => {
                    onClose();
                    onEdit(task);
                  }}
                  style={{ flex: 1 }}
                />

                <PillButton
                  label="Delete"
                  variant="danger"
                  size="md"
                  icon={<Ionicons name="trash-outline" size={16} color={theme.colors.textInverse} />}
                  onPress={handleDelete}
                  style={{ flex: 0.8 }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    maxHeight: '88%',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  zoneText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentScroll: {
    paddingBottom: 20,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
    marginBottom: 12,
  },
  detailPhotoWrapper: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailPhoto: {
    width: '100%',
    height: '100%',
  },
  descBox: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  metaGrid: {
    gap: 8,
    marginBottom: 20,
  },
  metaTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  metaTileContent: {
    flex: 1,
  },
  metaTileLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaTileVal: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  feedbackBanner: {
    padding: 10,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: 10,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
