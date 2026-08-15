import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useTasks } from '../context/TaskContext';
import { Task, TaskPriority, TaskStatus } from '../types';
import { PillButton } from '../components/common/PillButton';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import { Ionicons } from '@expo/vector-icons';

interface TaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  visible,
  onClose,
  taskToEdit,
}) => {
  const { theme } = useTheme();
  const { createTask, updateTask } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString());
  const [reminderTime, setReminderTime] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');

  const [isDuePickerOpen, setIsDuePickerOpen] = useState(false);
  const [isReminderPickerOpen, setIsReminderPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setImageUri(taskToEdit.image_uri || null);
      setDueDate(taskToEdit.due_date);
      setReminderTime(taskToEdit.reminder_time || null);
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
    } else {
      // Default new task
      setTitle('');
      setDescription('');
      setImageUri(null);
      const defaultDue = new Date();
      defaultDue.setHours(defaultDue.getHours() + 4);
      setDueDate(defaultDue.toISOString());
      setReminderTime(null);
      setPriority('medium');
      setStatus('pending');
    }
  }, [taskToEdit, visible]);

  const handlePickFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery permissions are needed to attach photos to tasks.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error picking image:', err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to capture photos for tasks.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error taking photo:', err);
    }
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) return;

    setErrorMsg(null);
    setSubmitting(true);
    try {
      if (taskToEdit) {
        await updateTask(taskToEdit.id, {
          title: title.trim(),
          description: description.trim() || null,
          image_uri: imageUri,
          due_date: dueDate,
          reminder_time: reminderTime,
          priority,
          status,
        });
      } else {
        await createTask({
          title: title.trim(),
          description: description.trim() || null,
          image_uri: imageUri,
          due_date: dueDate,
          reminder_time: reminderTime,
          priority,
          status: 'pending',
        });
      }
      onClose();
    } catch (e: any) {
      console.error('Error saving task:', e);
      const msg = e?.message || e?.details || 'Failed to save task to Supabase.';
      setErrorMsg(msg);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error saving task:\n${msg}\n\nPlease make sure your Supabase SQL migration has been run in the Supabase dashboard.`);
      } else {
        Alert.alert('Save Failed', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'Not set';
    const d = new Date(isoString);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const priorities: { id: TaskPriority; label: string; color: string }[] = [
    { id: 'low', label: 'Low', color: theme.colors.priorityLow },
    { id: 'medium', label: 'Medium', color: theme.colors.priorityMedium },
    { id: 'high', label: 'High', color: theme.colors.priorityHigh },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.modalOverlay, { backgroundColor: theme.colors.modalOverlay }]}
      >
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
            },
          ]}
        >
          {/* Top Handle Bar */}
          <View style={[styles.handleBar, { backgroundColor: theme.colors.border }]} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                {taskToEdit ? 'Adjust Spatial Task' : 'Place Task in Orbit'}
              </Text>
              <Text style={[styles.sheetSub, { color: theme.colors.textMuted }]}>
                {taskToEdit ? 'Update timing and priority in space' : 'Set due horizon and reminders'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeIconBtn,
                { backgroundColor: theme.colors.surfaceInput, borderRadius: theme.radii.full },
              ]}
            >
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          {errorMsg ? (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(217, 83, 79, 0.12)' }]}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.priorityHigh} />
              <Text style={[styles.errorBannerText, { color: theme.colors.priorityHigh }]}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Title Input */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Task Title</Text>
              <View
                style={[
                  styles.titleInputWrap,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.lg,
                  },
                ]}
              >
                <TextInput
                  style={[styles.titleInput, { color: theme.colors.textPrimary }]}
                  placeholder="What needs attention?"
                  placeholderTextColor={theme.colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  autoFocus={!taskToEdit}
                />
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Notes / Companion Context</Text>
              <View
                style={[
                  styles.descInputWrap,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.lg,
                  },
                ]}
              >
                <TextInput
                  style={[styles.descInput, { color: theme.colors.textPrimary }]}
                  placeholder="Optional details, links, or notes..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Task Photo / Visual Identifier */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Task Photo / Visual Identifier</Text>
              {imageUri ? (
                <View
                  style={[
                    styles.imagePreviewContainer,
                    {
                      backgroundColor: theme.colors.surfaceInput,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.lg,
                    },
                  ]}
                >
                  <Image source={{ uri: imageUri }} style={[styles.previewImage, { borderRadius: theme.radii.md }]} resizeMode="cover" />
                  <View style={styles.imageActionButtonsRow}>
                    <Pressable
                      onPress={handlePickFromLibrary}
                      style={[
                        styles.photoBtnSmall,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radii.full,
                        },
                      ]}
                    >
                      <Ionicons name="images-outline" size={14} color={theme.colors.textPrimary} />
                      <Text style={[styles.photoBtnSmallText, { color: theme.colors.textPrimary }]}>Change</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleTakePhoto}
                      style={[
                        styles.photoBtnSmall,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radii.full,
                        },
                      ]}
                    >
                      <Ionicons name="camera-outline" size={14} color={theme.colors.textPrimary} />
                      <Text style={[styles.photoBtnSmallText, { color: theme.colors.textPrimary }]}>Camera</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setImageUri(null)}
                      style={[
                        styles.photoBtnSmall,
                        styles.photoBtnDanger,
                        { borderRadius: theme.radii.full },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.colors.priorityHigh} />
                      <Text style={[styles.photoBtnSmallText, { color: theme.colors.priorityHigh }]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.addPhotoButtonsRow}>
                  <Pressable
                    onPress={handlePickFromLibrary}
                    style={[
                      styles.addPhotoCard,
                      {
                        backgroundColor: theme.colors.surfaceInput,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radii.md,
                      },
                    ]}
                  >
                    <Ionicons name="image-outline" size={18} color={theme.colors.accent} />
                    <Text style={[styles.addPhotoCardText, { color: theme.colors.textPrimary }]}>Choose Photo</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleTakePhoto}
                    style={[
                      styles.addPhotoCard,
                      {
                        backgroundColor: theme.colors.surfaceInput,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radii.md,
                      },
                    ]}
                  >
                    <Ionicons name="camera-outline" size={18} color={theme.colors.accent} />
                    <Text style={[styles.addPhotoCardText, { color: theme.colors.textPrimary }]}>Take Photo</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Timing Pickers */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Horizons & Reminders</Text>

              {/* Due Date Trigger */}
              <Pressable
                onPress={() => setIsDuePickerOpen(true)}
                style={[
                  styles.timingCard,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <View style={styles.timingLeft}>
                  <View
                    style={[
                      styles.timingIconWrap,
                      { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.full },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={18} color={theme.colors.textPrimary} />
                  </View>
                  <View>
                    <Text style={[styles.timingLabel, { color: theme.colors.textPrimary }]}>Due Date</Text>
                    <Text style={[styles.timingValue, { color: theme.colors.textSecondary }]}>
                      {formatDateTime(dueDate)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Pressable>

              {/* Reminder Time Trigger */}
              <Pressable
                onPress={() => setIsReminderPickerOpen(true)}
                style={[
                  styles.timingCard,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                    marginTop: 8,
                  },
                ]}
              >
                <View style={styles.timingLeft}>
                  <View
                    style={[
                      styles.timingIconWrap,
                      { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.full },
                    ]}
                  >
                    <Ionicons name="alarm-outline" size={18} color={theme.colors.textPrimary} />
                  </View>
                  <View>
                    <Text style={[styles.timingLabel, { color: theme.colors.textPrimary }]}>Push Reminder</Text>
                    <Text style={[styles.timingValue, { color: theme.colors.textSecondary }]}>
                      {reminderTime ? formatDateTime(reminderTime) : 'No reminder scheduled'}
                    </Text>
                  </View>
                </View>
                {reminderTime ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setReminderTime(null);
                    }}
                    style={styles.removeReminderBtn}
                  >
                    <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                )}
              </Pressable>
            </View>

            {/* Priority Selector */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Priority Magnitude</Text>
              <View style={styles.priorityRow}>
                {priorities.map((p) => {
                  const isSelected = priority === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setPriority(p.id)}
                      style={[
                        styles.priorityChip,
                        {
                          backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceInput,
                          borderColor: isSelected ? theme.colors.borderActive : theme.colors.border,
                          borderRadius: theme.radii.full,
                        },
                      ]}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                      <Text
                        style={[
                          styles.priorityChipText,
                          { color: isSelected ? theme.colors.textInverse : theme.colors.textPrimary },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <PillButton label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <PillButton
                label={taskToEdit ? 'Update Task' : 'Place into Space'}
                variant="accent"
                size="lg"
                icon={<Ionicons name="checkmark-circle" size={18} color={theme.colors.textInverse} />}
                onPress={handleSave}
                disabled={!title.trim() || submitting}
                style={{ flex: 1.8 }}
              />
            </View>
          </ScrollView>
        </View>

        {/* Date Pickers */}
        <CustomDatePicker
          visible={isDuePickerOpen}
          initialDate={dueDate}
          title="Select Due Date & Time"
          onClose={() => setIsDuePickerOpen(false)}
          onSelectDate={(iso) => setDueDate(iso)}
        />

        <CustomDatePicker
          visible={isReminderPickerOpen}
          initialDate={reminderTime || dueDate}
          title="Select Reminder Time"
          onClose={() => setIsReminderPickerOpen(false)}
          onSelectDate={(iso) => setReminderTime(iso)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '90%',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  titleInputWrap: {
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleInput: {
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 0,
  },
  descInputWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
    borderWidth: 1,
  },
  descInput: {
    fontSize: 14,
    fontWeight: '400',
    textAlignVertical: 'top',
    borderWidth: 0,
  },
  imagePreviewContainer: {
    padding: 10,
    borderWidth: 1,
    gap: 10,
  },
  previewImage: {
    width: '100%',
    height: 140,
  },
  imageActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  photoBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 4,
  },
  photoBtnSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  photoBtnDanger: {
    backgroundColor: 'rgba(217, 83, 79, 0.1)',
    borderColor: 'rgba(217, 83, 79, 0.3)',
  },
  addPhotoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addPhotoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    gap: 8,
  },
  addPhotoCardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  timingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timingIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timingLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  timingValue: {
    fontSize: 12,
    marginTop: 2,
  },
  removeReminderBtn: {
    padding: 6,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
});
