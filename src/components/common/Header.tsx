import React from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { NerdLogo } from './NerdLogo';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { tasks, searchQuery, setSearchQuery } = useTasks();

  const activeCount = tasks.filter((t) => t.status !== 'done').length;
  const todayCount = tasks.filter((t) => {
    const now = new Date();
    const d = new Date(t.due_date);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear() &&
      t.status !== 'done'
    );
  }).length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleSection}>
          <View style={styles.appNameRow}>
            <View style={{ marginRight: 8 }}>
              <NerdLogo size={24} color={theme.colors.textPrimary} bgColor="transparent" />
            </View>
            <Text style={[styles.appName, { color: theme.colors.textPrimary }]}>Nerd</Text>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                {todayCount > 0 ? `${todayCount} Today` : `${activeCount} Active`}
              </Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {todayCount > 0 ? 'Urgency centered in space' : 'All systems calm & in orbit'}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            onPress={toggleTheme}
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.full,
              },
            ]}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={theme.colors.textPrimary}
            />
          </Pressable>

          <Pressable
            onPress={onOpenSettings}
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.full,
              },
            ]}
          >
            <Ionicons name="settings-outline" size={18} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Tactile Rounded Search Input */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.colors.surfaceInput,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.full,
          },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Search spatial nodes..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearch}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companionOrb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  badgePill: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
    borderWidth: 0,
  },
  clearSearch: {
    padding: 4,
  },
});
