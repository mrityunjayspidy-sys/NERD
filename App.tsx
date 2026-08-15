import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TaskProvider } from './src/context/TaskContext';
import { ChatProvider, useChat } from './src/context/ChatContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { GeneralTasksScreen } from './src/screens/GeneralTasksScreen';
import { MovingSpaceScreen } from './src/screens/MovingSpaceScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TaskDetailModal } from './src/screens/TaskDetailModal';
import { TaskFormModal } from './src/screens/TaskFormModal';
import { Task } from './src/types';
import { NerdLogo } from './src/components/common/NerdLogo';
import { DesktopHeader } from './src/components/common/DesktopHeader';
import { useResponsive } from './src/hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import * as Haptics from 'expo-haptics';

type TabView = 'home' | 'space' | 'agenda' | 'chat';

const MainAppContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { user, isLoading } = useAuth();
  const { totalUnreadCount } = useChat();
  const { isDesktop } = useResponsive();

  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Nerd ✦ Spatial Task & Chat Companion';
    }
  }, []);

  // Web Desktop Keyboard Navigation
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.key === '1') {
        setActiveTab('home');
      } else if (e.key === '2') {
        setActiveTab('space');
      } else if (e.key === '3') {
        setActiveTab('agenda');
      } else if (e.key === '4') {
        setActiveTab('chat');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleOpenAddTask();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabSwitch = (tab: TabView) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    setActiveTab(tab);
  };

  const handleOpenAddTask = (initialDueDate?: string) => {
    setTaskToEdit(
      initialDueDate
        ? ({
            id: '',
            user_id: '',
            title: '',
            due_date: initialDueDate,
            priority: 'medium',
            status: 'pending',
          } as Task)
        : null
    );
    setIsFormModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(null);
    setTaskToEdit(task);
    setIsFormModalOpen(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View
          style={[
            styles.loadingOrb,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.borderActive },
          ]}
        >
          <NerdLogo size={36} color={theme.colors.textPrimary} bgColor="transparent" />
        </View>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Aligning Nerd Space...
        </Text>
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Main View Switcher */}
      <View style={styles.contentContainer}>
        {activeTab === 'home' && (
          <GeneralTasksScreen
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectTask={(task) => setSelectedTask(task)}
            onAddTask={() => handleOpenAddTask()}
            onNavigateToSpace={() => setActiveTab('space')}
          />
        )}
        {activeTab === 'space' && (
          <MovingSpaceScreen
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectTask={(task) => setSelectedTask(task)}
            onAddTask={() => handleOpenAddTask()}
          />
        )}
        {activeTab === 'agenda' && (
          <CalendarScreen
            onSelectTask={(task) => setSelectedTask(task)}
            onAddTask={(date) => handleOpenAddTask(date)}
          />
        )}
        {activeTab === 'chat' && <ChatScreen />}
      </View>

      {/* Floating Bottom Nav Pill Bar */}
      <View style={styles.bottomNavContainer} pointerEvents="box-none">
        <View
          style={[
            styles.navPill,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.full,
            },
          ]}
        >
            {/* Tab 1: Home (General Tasks) */}
            <Pressable
              onPress={() => handleTabSwitch('home')}
              style={[
                styles.navTab,
                activeTab === 'home' && {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons
                name={activeTab === 'home' ? 'checkbox' : 'checkbox-outline'}
                size={16}
                color={activeTab === 'home' ? theme.colors.textInverse : theme.colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  { color: activeTab === 'home' ? theme.colors.textInverse : theme.colors.textSecondary },
                ]}
              >
                Tasks
              </Text>
            </Pressable>

            {/* Tab 2: Moving Space Canvas */}
            <Pressable
              onPress={() => handleTabSwitch('space')}
              style={[
                styles.navTab,
                activeTab === 'space' && {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons
                name={activeTab === 'space' ? 'planet' : 'planet-outline'}
                size={16}
                color={activeTab === 'space' ? theme.colors.textInverse : theme.colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  { color: activeTab === 'space' ? theme.colors.textInverse : theme.colors.textSecondary },
                ]}
              >
                Space
              </Text>
            </Pressable>

            {/* Tab 3: Agenda / Calendar */}
            <Pressable
              onPress={() => handleTabSwitch('agenda')}
              style={[
                styles.navTab,
                activeTab === 'agenda' && {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons
                name={activeTab === 'agenda' ? 'calendar' : 'calendar-outline'}
                size={16}
                color={activeTab === 'agenda' ? theme.colors.textInverse : theme.colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  { color: activeTab === 'agenda' ? theme.colors.textInverse : theme.colors.textSecondary },
                ]}
              >
                Agenda
              </Text>
            </Pressable>

            {/* Tab 4: Real-time Chat */}
            <Pressable
              onPress={() => handleTabSwitch('chat')}
              style={[
                styles.navTab,
                activeTab === 'chat' && {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons
                name={activeTab === 'chat' ? 'chatbubbles' : 'chatbubbles-outline'}
                size={16}
                color={activeTab === 'chat' ? theme.colors.textInverse : theme.colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  { color: activeTab === 'chat' ? theme.colors.textInverse : theme.colors.textSecondary },
                ]}
              >
                Chat
              </Text>
              {totalUnreadCount > 0 && (
                <View style={styles.unreadNavBadge}>
                  <Text style={styles.unreadNavText}>{totalUnreadCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

      {/* Task Detail Modal */}
      <TaskDetailModal
        visible={Boolean(selectedTask)}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={handleEditTask}
      />

      {/* Task Add / Edit Modal */}
      <TaskFormModal
        visible={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit?.id ? taskToEdit : null}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <View style={StyleSheet.absoluteFillObject}>
          <SettingsScreen onClose={() => setIsSettingsOpen(false)} />
        </View>
      )}
    </SafeAreaView>
  );
};

export default function App() {
  const [fontsLoaded] = Font.useFonts({
    ...Ionicons.font,
  });

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <TaskProvider>
              <ChatProvider>
                <MainAppContent />
              </ChatProvider>
            </TaskProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  navPill: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  navTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  unreadNavBadge: {
    backgroundColor: '#D9534F',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  unreadNavText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
