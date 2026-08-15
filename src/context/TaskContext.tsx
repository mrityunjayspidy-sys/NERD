import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { Task, TaskPriority, TaskStatus } from '../types';
import { scheduleTaskReminder, cancelTaskReminder } from '../services/notifications';
import { syncTaskToCalendar } from '../services/calendar';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type TaskFilter = 'all' | 'today' | 'upcoming' | 'high' | 'done';

/**
 * Calculates effective priority: If task is active and due within <= 3 days (<= 72h) or overdue,
 * it automatically escalates to 'high' priority.
 */
export const getEffectivePriority = (task: Task): TaskPriority => {
  if (task.status === 'done') return task.priority;
  const now = new Date();
  const dueDate = new Date(task.due_date);
  const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // If due within 3 days (72 hours) or overdue, escalate to high priority
  if (diffHours <= 72) {
    return 'high';
  }
  return task.priority;
};

interface TaskContextType {
  tasks: Task[];
  filteredTasks: Task[];
  isLoading: boolean;
  activeFilter: TaskFilter;
  setActiveFilter: (filter: TaskFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createTask: (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskConnection: (taskAId: string, taskBId: string) => Promise<void>;
  toggleHeadNode: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  getSpatialTaskPosition: (task: Task, index: number, total: number) => { x: number; y: number };
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, settings } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const computeSpatialPosition = useCallback((task: Task, index: number, total: number) => {
    // If task has explicit coordinates from manual movement
    if (
      typeof task.spatial_x === 'number' &&
      typeof task.spatial_y === 'number' &&
      !isNaN(task.spatial_x) &&
      !isNaN(task.spatial_y)
    ) {
      return { x: task.spatial_x, y: task.spatial_y };
    }

    const now = new Date();
    const dueDate = new Date(task.due_date);
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let baseRadius = 240;
    if (task.is_head_node) {
      baseRadius = 180;
    } else if (task.status === 'done') {
      baseRadius = 520;
    } else if (diffHours <= 24) {
      baseRadius = 240 + (index % 2) * 80;
    } else if (diffHours <= 72) {
      baseRadius = 360 + (index % 3) * 70;
    } else {
      baseRadius = 480 + (index % 3) * 80;
    }

    // Golden angle distribution ensures non-colliding positions for all nodes in 2D space
    const goldenAngle = 2.399963;
    const angle = index * goldenAngle + (task.is_head_node ? 0 : 0.4);
    const x = Math.round(Math.cos(angle) * baseRadius);
    const y = Math.round(Math.sin(angle) * baseRadius);

    return { x, y };
  }, []);

  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.warn('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Real-time Supabase subscription & sync
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`realtime:tasks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            setTasks((prev) => (prev.some((t) => t.id === newTask.id) ? prev : [newTask, ...prev]));
            if (settings?.device_calendar_sync) {
              syncTaskToCalendar(newTask);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Task;
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            if (settings?.device_calendar_sync) {
              syncTaskToCalendar(updated);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string })?.id;
            if (deletedId) {
              setTasks((prev) => prev.filter((t) => t.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, settings?.device_calendar_sync]);

  const createTask = async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Task> => {
    if (!user) throw new Error('User not logged in');

    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (_) {}
    }

    const payload: any = {
      title: taskData.title,
      description: taskData.description || null,
      due_date: taskData.due_date,
      reminder_time: taskData.reminder_time || null,
      priority: taskData.priority,
      status: taskData.status || 'pending',
      user_id: user.id,
      spatial_x: taskData.spatial_x ?? undefined,
      spatial_y: taskData.spatial_y ?? undefined,
    };

    if (taskData.image_uri) {
      payload.image_uri = taskData.image_uri;
    }

    if (taskData.connected_task_ids && taskData.connected_task_ids.length > 0) {
      payload.connected_task_ids = taskData.connected_task_ids;
    }

    try {
      let { data, error } = await supabase.from('tasks').insert(payload).select().single();

      // If connected_task_ids column isn't in database yet, retry without it
      if (error && error.message?.includes('connected_task_ids')) {
        delete payload.connected_task_ids;
        const retry = await supabase.from('tasks').insert(payload).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      const created = data as Task;
      setTasks((prev) => [created, ...prev]);

      // Schedule reminder
      if (created.reminder_time) {
        scheduleTaskReminder(created.id, created.title, created.reminder_time);
      }

      // Sync to device calendar if enabled
      if (settings?.device_calendar_sync) {
        syncTaskToCalendar(created);
      }

      return created;
    } catch (err) {
      console.warn('Error inserting task to Supabase:', err);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    );

    const target = tasks.find((t) => t.id === id);
    if (target && updates.reminder_time !== undefined) {
      if (updates.reminder_time) {
        scheduleTaskReminder(id, target.title, updates.reminder_time);
      }
    }

    try {
      const payload = { ...updates };
      const { error } = await supabase.from('tasks').update(payload).eq('id', id);
      if (error && error.message?.includes('connected_task_ids')) {
        delete (payload as any).connected_task_ids;
        await supabase.from('tasks').update(payload).eq('id', id);
      }
    } catch (err) {
      console.warn('Error updating task in Supabase:', err);
    }
  };

  const toggleTaskConnection = async (taskAId: string, taskBId: string) => {
    if (taskAId === taskBId) return;

    const taskA = tasks.find((t) => t.id === taskAId);
    const taskB = tasks.find((t) => t.id === taskBId);
    if (!taskA || !taskB) return;

    const currentLinksA = taskA.connected_task_ids || [];
    const currentLinksB = taskB.connected_task_ids || [];

    const isConnected = currentLinksA.includes(taskBId);

    const nextLinksA = isConnected
      ? currentLinksA.filter((id) => id !== taskBId)
      : [...currentLinksA, taskBId];

    const nextLinksB = isConnected
      ? currentLinksB.filter((id) => id !== taskAId)
      : [...currentLinksB, taskAId];

    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (_) {}
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskAId) return { ...t, connected_task_ids: nextLinksA };
        if (t.id === taskBId) return { ...t, connected_task_ids: nextLinksB };
        return t;
      })
    );

    try {
      await Promise.all([
        supabase.from('tasks').update({ connected_task_ids: nextLinksA }).eq('id', taskAId),
        supabase.from('tasks').update({ connected_task_ids: nextLinksB }).eq('id', taskBId),
      ]);
    } catch (err) {
      console.warn('Error updating task connections in Supabase:', err);
    }
  };

  const toggleHeadNode = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const nextIsHead = !target.is_head_node;

    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (_) {}
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_head_node: nextIsHead } : t))
    );

    try {
      await supabase.from('tasks').update({ is_head_node: nextIsHead }).eq('id', id);
    } catch (err) {
      console.warn('Error updating head node status in Supabase:', err);
    }
  };

  const toggleTaskStatus = async (id: string) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;

    const nextStatus: TaskStatus = current.status === 'done' ? 'pending' : 'done';

    if (Platform.OS !== 'web') {
      try {
        if (nextStatus === 'done') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (_) {}
    }

    await updateTask(id, { status: nextStatus });
  };

  const deleteTask = async (id: string) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (_) {}
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await supabase.from('tasks').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting task in Supabase:', err);
    }
  };

  // Filter & Search Logic with dynamic priority elevation
  const filteredTasks = tasks.filter((task) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    // Category filter
    const now = new Date();
    const taskDate = new Date(task.due_date);
    const isToday =
      taskDate.getFullYear() === now.getFullYear() &&
      taskDate.getMonth() === now.getMonth() &&
      taskDate.getDate() === now.getDate();

    const effectivePriority = getEffectivePriority(task);

    if (activeFilter === 'today') {
      return isToday && task.status !== 'done';
    }
    if (activeFilter === 'upcoming') {
      return taskDate > now && !isToday && task.status !== 'done';
    }
    if (activeFilter === 'high') {
      return effectivePriority === 'high' && task.status !== 'done';
    }
    if (activeFilter === 'done') {
      return task.status === 'done';
    }

    return true; // 'all'
  });

  return (
    <TaskContext.Provider
      value={{
        tasks,
        filteredTasks,
        isLoading,
        activeFilter,
        setActiveFilter,
        searchQuery,
        setSearchQuery,
        createTask,
        updateTask,
        toggleTaskStatus,
        deleteTask,
        toggleTaskConnection,
        toggleHeadNode,
        refreshTasks: loadTasks,
        getSpatialTaskPosition: computeSpatialPosition,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
