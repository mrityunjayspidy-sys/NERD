export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  due_date: string; // ISO 8601 string
  reminder_time?: string | null; // ISO 8601 string
  status: TaskStatus;
  priority: TaskPriority;
  image_uri?: string | null;
  spatial_x?: number;
  spatial_y?: number;
  connected_task_ids?: string[];
  is_head_node?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  user_id: string;
  morning_digest_enabled: boolean;
  morning_digest_time: string; // e.g. "08:00"
  push_token?: string | null;
  device_calendar_sync: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  nerd_code?: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  sender_email?: string;
  content: string;
  image_uri?: string | null;
  created_at: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  is_direct: boolean;
  other_user_code?: string;
  other_user_name?: string;
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface SpatialNodeState {
  task: Task;
  x: number;
  y: number;
  zone: 'overdue' | 'today' | 'upcoming' | 'someday' | 'done';
  distanceFromOrigin: number;
}
