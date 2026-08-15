import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { PillButton } from './PillButton';
import { Ionicons } from '@expo/vector-icons';

interface CustomDatePickerProps {
  visible: boolean;
  initialDate?: string;
  onClose: () => void;
  onSelectDate: (selectedIsoString: string) => void;
  title?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  visible,
  initialDate,
  onClose,
  onSelectDate,
  title = 'Select Date & Time',
}) => {
  const { theme } = useTheme();
  const baseDate = initialDate ? new Date(initialDate) : new Date();

  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedHour, setSelectedHour] = useState(baseDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(Math.round(baseDate.getMinutes() / 5) * 5 % 60);

  // Generate next 14 days
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      offset: i,
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      rawDate: d,
    };
  });

  const hours = Array.from({ length: 24 }).map((_, i) => i);
  const minutes = [0, 15, 30, 45];

  const handleConfirm = () => {
    const target = new Date();
    target.setDate(target.getDate() + selectedDayOffset);
    target.setHours(selectedHour);
    target.setMinutes(selectedMinute);
    target.setSeconds(0);
    target.setMilliseconds(0);

    onSelectDate(target.toISOString());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: theme.colors.modalOverlay }]}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.modalSub, { color: theme.colors.textMuted }]}>
                Pick companion timing
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: theme.colors.surfaceInput,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          {/* Quick Day Scroller */}
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Day</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysScroll}
          >
            {days.map((d) => {
              const isSelected = selectedDayOffset === d.offset;
              return (
                <Pressable
                  key={d.offset}
                  onPress={() => setSelectedDayOffset(d.offset)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceInput,
                      borderColor: isSelected ? theme.colors.borderActive : theme.colors.border,
                      borderRadius: theme.radii.lg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayName,
                      { color: isSelected ? theme.colors.textInverse : theme.colors.textSecondary },
                    ]}
                  >
                    {d.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dayNum,
                      { color: isSelected ? theme.colors.textInverse : theme.colors.textPrimary },
                    ]}
                  >
                    {d.dateNum}
                  </Text>
                  <Text
                    style={[
                      styles.dayMonth,
                      { color: isSelected ? theme.colors.textInverse : theme.colors.textMuted },
                    ]}
                  >
                    {d.month}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Time Picker */}
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Time (Hour & Minute)</Text>
          <View style={styles.timeSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeRow}
            >
              {hours.map((h) => {
                const isSelected = selectedHour === h;
                const formattedHour = `${h.toString().padStart(2, '0')}:00`;
                return (
                  <Pressable
                    key={h}
                    onPress={() => setSelectedHour(h)}
                    style={[
                      styles.timePill,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceInput,
                        borderColor: isSelected ? theme.colors.borderActive : theme.colors.border,
                        borderRadius: theme.radii.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timePillText,
                        { color: isSelected ? theme.colors.textInverse : theme.colors.textPrimary },
                      ]}
                    >
                      {formattedHour}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.minuteRow}>
              {minutes.map((m) => {
                const isSelected = selectedMinute === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setSelectedMinute(m)}
                    style={[
                      styles.minutePill,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceInput,
                        borderColor: isSelected ? theme.colors.borderActive : theme.colors.border,
                        borderRadius: theme.radii.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.minutePillText,
                        { color: isSelected ? theme.colors.textInverse : theme.colors.textPrimary },
                      ]}
                    >
                      +{m}m
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Confirmation Row */}
          <View style={styles.actionRow}>
            <PillButton label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <PillButton
              label="Confirm Time"
              variant="accent"
              icon={<Ionicons name="checkmark-circle" size={16} color={theme.colors.textInverse} />}
              onPress={handleConfirm}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  daysScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  dayChip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 64,
    borderWidth: 1,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayNum: {
    fontSize: 17,
    fontWeight: '800',
  },
  dayMonth: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  timeSection: {
    marginVertical: 6,
  },
  timeRow: {
    gap: 6,
    paddingBottom: 8,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  minuteRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  minutePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  minutePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    alignItems: 'center',
  },
});
