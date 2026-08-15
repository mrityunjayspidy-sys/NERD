import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { NerdLogo } from './NerdLogo';
import { PillButton } from './PillButton';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export type TabView = 'home' | 'space' | 'agenda' | 'chat';

interface DesktopHeaderProps {
  activeTab: TabView;
  onSelectTab: (tab: TabView) => void;
  onOpenSettings: () => void;
  onAddTask: () => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onAddTask,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { totalUnreadCount } = useChat();

  const [copiedCodeToast, setCopiedCodeToast] = useState(false);

  const myCode = user?.nerd_code || 'NERD-0000';

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(myCode);
      setCopiedCodeToast(true);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
      }
      setTimeout(() => setCopiedCodeToast(false), 2200);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  };

  const navItems: { tab: TabView; label: string; icon: any; activeIcon: any; shortcut: string }[] = [
    { tab: 'home', label: 'Tasks', icon: 'checkbox-outline', activeIcon: 'checkbox', shortcut: '1' },
    { tab: 'space', label: 'Moving Space', icon: 'planet-outline', activeIcon: 'planet', shortcut: '2' },
    { tab: 'agenda', label: 'Agenda', icon: 'calendar-outline', activeIcon: 'calendar', shortcut: '3' },
    { tab: 'chat', label: 'Chat', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', shortcut: '4' },
  ];

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.headerInner}>
        {/* Brand Left */}
        <View style={styles.brandGroup}>
          <NerdLogo size={32} color={theme.colors.textPrimary} bgColor="transparent" />
          <View style={styles.brandTextGroup}>
            <Text style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>Nerd</Text>
            <Text style={[styles.brandTagline, { color: theme.colors.textMuted }]}>
              Spatial Task & Chat Companion
            </Text>
          </View>
        </View>

        {/* Center Desktop Nav Tabs */}
        <View
          style={[
            styles.navDeck,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.full,
            },
          ]}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <Pressable
                key={item.tab}
                onPress={() => onSelectTab(item.tab)}
                style={[
                  styles.navItem,
                  isActive && {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={15}
                  color={isActive ? theme.colors.textInverse : theme.colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: isActive ? theme.colors.textInverse : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {item.label}
                </Text>

                {item.tab === 'chat' && totalUnreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{totalUnreadCount}</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.shortcutKey,
                      {
                        backgroundColor: isActive
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'rgba(128, 128, 128, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.shortcutText,
                        {
                          color: isActive ? theme.colors.textInverse : theme.colors.textMuted,
                        },
                      ]}
                    >
                      {item.shortcut}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Right Action Tools */}
        <View style={styles.rightTools}>
          {/* New Task Button */}
          <PillButton
            label="New Task"
            icon="add"
            variant="accent"
            size="sm"
            onPress={onAddTask}
          />

          {/* Unique Nerd Code Copy Pill */}
          <Pressable
            onPress={handleCopyCode}
            style={[
              styles.codeChip,
              {
                backgroundColor: copiedCodeToast
                  ? 'rgba(78, 159, 118, 0.15)'
                  : theme.colors.surfaceInput,
                borderColor: copiedCodeToast ? theme.colors.donePill : theme.colors.border,
                borderRadius: theme.radii.full,
              },
            ]}
          >
            <Ionicons
              name={copiedCodeToast ? 'checkmark-circle' : 'key-outline'}
              size={13}
              color={copiedCodeToast ? theme.colors.donePill : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.codeText,
                { color: copiedCodeToast ? theme.colors.donePill : theme.colors.textPrimary },
              ]}
            >
              {myCode}
            </Text>
          </Pressable>

          {/* Theme Switcher */}
          <Pressable
            onPress={toggleTheme}
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.colors.surfaceInput,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.full,
              },
            ]}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={16}
              color={theme.colors.textPrimary}
            />
          </Pressable>

          {/* Settings Button */}
          <Pressable
            onPress={onOpenSettings}
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.colors.surfaceInput,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.full,
              },
            ]}
          >
            <Ionicons name="settings-outline" size={16} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    height: 64,
    borderBottomWidth: 1,
    zIndex: 40,
    justifyContent: 'center',
  },
  headerInner: {
    width: '100%',
    maxWidth: 1300,
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '500',
  },
  navDeck: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  shortcutKey: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  shortcutText: {
    fontSize: 10,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#D9534F',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  rightTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 5,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
