import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

import { PillButton } from '../components/common/PillButton';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

interface SettingsScreenProps {
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { user, settings, updateSettings, updateProfile, logout } = useAuth();

  const [isDigestTimePickerOpen, setIsDigestTimePickerOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameStatusMsg, setNameStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const digestEnabled = settings?.morning_digest_enabled ?? true;
  const digestTime = settings?.morning_digest_time ?? '08:00';
  const calendarSync = settings?.device_calendar_sync ?? true;

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    setNameStatusMsg(null);
    try {
      const res = await updateProfile({ name: nameInput.trim() });
      if (res.error) {
        setNameStatusMsg({ type: 'error', text: res.error });
      } else {
        setNameStatusMsg({ type: 'success', text: 'Username updated successfully!' });
        setIsEditingName(false);
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (_) {}
        }
      }
    } catch (e: any) {
      setNameStatusMsg({ type: 'error', text: e.message || 'Failed to update username.' });
    } finally {
      setSavingName(false);
    }
  };

  const handleToggleDigest = async (val: boolean) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    await updateSettings({ morning_digest_enabled: val });
  };

  const handleToggleCalendar = async (val: boolean) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    await updateSettings({ device_calendar_sync: val });
  };

  const handleSelectDigestTime = async (iso: string) => {
    const d = new Date(iso);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    await updateSettings({ morning_digest_time: timeStr });
  };

  const digestTimes = ['07:00', '08:00', '09:00', '10:00'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Settings Header */}
      <View style={[styles.headerRow, { borderBottomColor: theme.colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Nerd Settings
          </Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>
            Preferences, orbits, and digests
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          style={[
            styles.closeBtn,
            { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.full },
          ]}
        >
          <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Identity Card */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={styles.userRow}>
            <View
              style={[
                styles.userAvatar,
                { backgroundColor: theme.colors.accent, borderRadius: theme.radii.full },
              ]}
            >
              <Ionicons name="person" size={20} color={theme.colors.textInverse} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
                {user?.name || 'Nerd Explorer'}
              </Text>
              <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                {user?.email || 'Offline'}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: 'rgba(78, 159, 118, 0.15)',
                  borderColor: theme.colors.donePill,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: theme.colors.donePill },
                ]}
              >
                Supabase Auth
              </Text>
            </View>
          </View>

          {/* Unique Nerd Code for Direct Chat */}
          <View style={[styles.nerdCodeRow, { borderTopColor: 'rgba(128, 128, 128, 0.15)' }]}>
            <View>
              <Text style={[styles.nerdCodeLabel, { color: theme.colors.textMuted }]}>
                Your Unique Chat Code:
              </Text>
              <Text style={[styles.nerdCodeHint, { color: theme.colors.textSecondary }]}>
                Share this with friends to chat directly
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                if (user?.nerd_code) {
                  await Clipboard.setStringAsync(user.nerd_code);
                  setNameStatusMsg({
                    type: 'success',
                    text: `Unique Code (${user.nerd_code}) copied to clipboard!`,
                  });
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (_) {}
                  }
                }
              }}
              style={[
                styles.nerdCodeBadge,
                {
                  backgroundColor: theme.colors.surfaceInput,
                  borderColor: theme.colors.borderActive,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons name="key-outline" size={13} color={theme.colors.textPrimary} />
              <Text style={[styles.nerdCodeBadgeText, { color: theme.colors.textPrimary }]}>
                {user?.nerd_code || 'NERD-0000'}
              </Text>
              <Ionicons name="copy-outline" size={13} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          {/* Status Message Banner */}
          {nameStatusMsg && (
            <View
              style={[
                styles.nameStatusBanner,
                {
                  backgroundColor:
                    nameStatusMsg.type === 'success'
                      ? 'rgba(78, 159, 118, 0.15)'
                      : 'rgba(217, 83, 79, 0.12)',
                },
              ]}
            >
              <Ionicons
                name={nameStatusMsg.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={nameStatusMsg.type === 'success' ? theme.colors.donePill : theme.colors.priorityHigh}
              />
              <Text
                style={[
                  styles.nameStatusText,
                  {
                    color:
                      nameStatusMsg.type === 'success'
                        ? theme.colors.donePill
                        : theme.colors.priorityHigh,
                  },
                ]}
              >
                {nameStatusMsg.text}
              </Text>
            </View>
          )}

          {/* Edit Username Row */}
          {!isEditingName ? (
            <Pressable
              onPress={() => {
                setNameInput(user?.name || '');
                setIsEditingName(true);
                setNameStatusMsg(null);
              }}
              style={[
                styles.editNameBtn,
                {
                  backgroundColor: theme.colors.surfaceInput,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <Ionicons name="create-outline" size={16} color={theme.colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.editNameBtnText, { color: theme.colors.textPrimary }]}>
                Change Username
              </Text>
            </Pressable>
          ) : (
            <View style={styles.nameEditForm}>
              <Text style={[styles.inputLabelSmall, { color: theme.colors.textSecondary }]}>
                Update Your Display Name:
              </Text>
              <View
                style={[
                  styles.nameInputWrap,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.borderActive,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <TextInput
                  style={[styles.nameTextInput, { color: theme.colors.textPrimary }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.textMuted}
                  autoFocus
                />
              </View>
              <View style={styles.nameEditActionRow}>
                <Pressable
                  onPress={handleSaveName}
                  disabled={savingName || !nameInput.trim()}
                  style={[
                    styles.nameSaveBtn,
                    {
                      backgroundColor: theme.colors.accent,
                      borderRadius: theme.radii.md,
                      opacity: savingName || !nameInput.trim() ? 0.6 : 1,
                    },
                  ]}
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color={theme.colors.textInverse} />
                  ) : (
                    <Text style={[styles.nameSaveBtnText, { color: theme.colors.textInverse }]}>
                      Save Changes
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setIsEditingName(false);
                    setNameStatusMsg(null);
                  }}
                  style={[
                    styles.nameCancelBtn,
                    {
                      backgroundColor: theme.colors.surfaceInput,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.md,
                    },
                  ]}
                >
                  <Text style={[styles.nameCancelBtnText, { color: theme.colors.textSecondary }]}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Theme Section */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Theme & Appearance
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
            Strict two-grey minimalist palette
          </Text>

          <View style={styles.themeRow}>
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isActive = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.themePill,
                    {
                      backgroundColor: isActive ? theme.colors.accent : theme.colors.surfaceInput,
                      borderColor: isActive ? theme.colors.borderActive : theme.colors.border,
                      borderRadius: theme.radii.full,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      mode === 'light'
                        ? 'sunny-outline'
                        : mode === 'dark'
                        ? 'moon-outline'
                        : 'phone-portrait-outline'
                    }
                    size={14}
                    color={isActive ? theme.colors.textInverse : theme.colors.textPrimary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.themePillText,
                      { color: isActive ? theme.colors.textInverse : theme.colors.textPrimary },
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Daily Morning Digest Push Notifications */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Daily Morning Digest
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                Summarizes today’s top tasks each morning via Supabase Edge Function & Expo Push.
              </Text>
            </View>
            <Switch
              value={digestEnabled}
              onValueChange={handleToggleDigest}
              trackColor={{ false: theme.colors.surfaceInput, true: theme.colors.accent }}
              thumbColor={digestEnabled ? theme.colors.textInverse : theme.colors.textMuted}
            />
          </View>

          {digestEnabled && (
            <View style={styles.digestTimeSection}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                Digest Delivery Time:
              </Text>
              <View style={styles.timePillsRow}>
                {digestTimes.map((t) => {
                  const isSelected = digestTime === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => updateSettings({ morning_digest_time: t })}
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
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Native Calendar Sync Preference */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Auto Calendar Sync
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                Sync newly scheduled tasks automatically to your native device calendar (`expo-calendar`).
              </Text>
            </View>
            <Switch
              value={calendarSync}
              onValueChange={handleToggleCalendar}
              trackColor={{ false: theme.colors.surfaceInput, true: theme.colors.accent }}
              thumbColor={calendarSync ? theme.colors.textInverse : theme.colors.textMuted}
            />
          </View>
        </View>

        {/* Cloud & Supabase Status */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Supabase Connection
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusLight,
                {
                  backgroundColor: theme.colors.donePill,
                },
              ]}
            />
            <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
              Connected to Supabase Cloud Database
            </Text>
          </View>
          <Text style={[styles.statusDetails, { color: theme.colors.textMuted }]}>
            Row Level Security active • Realtime sync enabled
          </Text>
        </View>

        {/* Logout Button */}
        <PillButton
          label="Log Out of Nerd"
          variant="danger"
          size="lg"
          icon={<Ionicons name="log-out-outline" size={18} color={theme.colors.textInverse} />}
          onPress={async () => {
            await logout();
            onClose();
          }}
          style={styles.logoutBtn}
        />
      </ScrollView>

      <CustomDatePicker
        visible={isDigestTimePickerOpen}
        title="Pick Morning Digest Time"
        onClose={() => setIsDigestTimePickerOpen(false)}
        onSelectDate={handleSelectDigestTime}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  sectionCard: {
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },
  themePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTextCol: {
    flex: 1,
  },
  digestTimeSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  timePillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  timePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusLight: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusDetails: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  logoutBtn: {
    marginTop: 8,
    marginBottom: 20,
  },
  nameStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  nameStatusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  editNameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  editNameBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nameEditForm: {
    marginTop: 14,
    gap: 8,
  },
  inputLabelSmall: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  nameInputWrap: {
    paddingHorizontal: 14,
    height: 42,
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  nameTextInput: {
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 0,
  },
  nameEditActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  nameSaveBtn: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  nameSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nameCancelBtn: {
    paddingHorizontal: 14,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nameCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nerdCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  nerdCodeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  nerdCodeHint: {
    fontSize: 10,
    marginTop: 2,
  },
  nerdCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    gap: 6,
  },
  nerdCodeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
