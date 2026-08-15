import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { ChatMessage, ChatChannel } from '../types';
import { getDirectChannelId } from '../services/userCode';
import { scheduleTaskReminder } from '../services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface ChatContextType {
  channels: ChatChannel[];
  activeChannelId: string;
  setActiveChannelId: (channelId: string) => void;
  activeMessages: ChatMessage[];
  sendMessage: (content: string, imageUri?: string) => Promise<void>;
  joinDirectChannel: (otherUserCode: string, otherUserName?: string) => string;
  isLoading: boolean;
  totalUnreadCount: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const CHAT_STORAGE_KEY = '@nerd_chat_messages_v1';
const CHANNELS_STORAGE_KEY = '@nerd_chat_channels_v1';

const GLOBAL_CHANNEL: ChatChannel = {
  id: 'global',
  name: '🌐 Community Hub',
  is_direct: false,
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([GLOBAL_CHANNEL]);
  const [activeChannelId, setActiveChannelId] = useState<string>('global');
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>({
    global: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load cached messages and custom channels
  useEffect(() => {
    async function loadCache() {
      try {
        const cachedChannels = await AsyncStorage.getItem(CHANNELS_STORAGE_KEY);
        if (cachedChannels) {
          const parsed: ChatChannel[] = JSON.parse(cachedChannels);
          setChannels((prev) => {
            const map = new Map<string, ChatChannel>();
            map.set('global', GLOBAL_CHANNEL);
            parsed.forEach((c) => map.set(c.id, c));
            return Array.from(map.values());
          });
        }

        const cachedMessages = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (cachedMessages) {
          setMessagesByChannel((prev) => ({
            ...prev,
            ...JSON.parse(cachedMessages),
          }));
        }
      } catch (err) {
        console.warn('Error loading chat cache:', err);
      }
    }
    loadCache();
  }, []);

  // Fetch messages from Supabase for the active channel
  const fetchChannelMessages = useCallback(async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data && !error) {
        setMessagesByChannel((prev) => ({
          ...prev,
          [channelId]: data as ChatMessage[],
        }));
      }
    } catch (err) {
      console.warn(`Error fetching messages for channel ${channelId}:`, err);
    }
  }, []);

  useEffect(() => {
    fetchChannelMessages(activeChannelId);
  }, [activeChannelId, fetchChannelMessages]);

  // Real-time Supabase channel subscription
  useEffect(() => {
    const channel = supabase
      .channel('realtime:all_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (!newMsg || !newMsg.channel_id) return;

          // Append message to channel list
          setMessagesByChannel((prev) => {
            const list = prev[newMsg.channel_id] || [];
            if (list.some((m) => m.id === newMsg.id)) return prev;
            const updated = { ...prev, [newMsg.channel_id]: [...list, newMsg] };
            AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
            return updated;
          });

          // If message is from another user
          if (user && newMsg.sender_id !== user.id) {
            // Trigger haptic feedback
            if (Platform.OS !== 'web') {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (_) {}
            }

            // If user is not currently in this channel or app is in background
            if (newMsg.channel_id !== activeChannelId) {
              setChannels((prev) =>
                prev.map((c) =>
                  c.id === newMsg.channel_id
                    ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: newMsg }
                    : c
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeChannelId]);

  // Send a message to the active channel
  const sendMessage = async (content: string, imageUri?: string) => {
    if (!user || !content.trim()) return;

    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }

    const optimisticId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newMsg: ChatMessage = {
      id: optimisticId,
      channel_id: activeChannelId,
      sender_id: user.id,
      sender_name: user.name || 'Nerd Explorer',
      sender_email: user.email,
      content: content.trim(),
      image_uri: imageUri || null,
      created_at: new Date().toISOString(),
    };

    // Optimistically update state
    setMessagesByChannel((prev) => {
      const list = prev[activeChannelId] || [];
      const updated = { ...prev, [activeChannelId]: [...list, newMsg] };
      AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    try {
      const { data, error } = await supabase.from('messages').insert({
        channel_id: activeChannelId,
        sender_id: user.id,
        sender_name: user.name || 'Nerd Explorer',
        sender_email: user.email,
        content: content.trim(),
        image_uri: imageUri || null,
      }).select().single();

      if (data && !error) {
        // Replace optimistic message with real server message
        setMessagesByChannel((prev) => {
          const list = prev[activeChannelId] || [];
          return {
            ...prev,
            [activeChannelId]: list.map((m) => (m.id === optimisticId ? (data as ChatMessage) : m)),
          };
        });
      }
    } catch (err) {
      console.warn('Error inserting message to Supabase:', err);
    }
  };

  // Join or start a Direct Channel with a friend using their Unique Nerd Code
  const joinDirectChannel = (otherUserCode: string, otherUserName?: string): string => {
    if (!user) return 'global';
    const myCode = user.nerd_code || 'NERD-0000';
    const cleanOtherCode = otherUserCode.trim().toUpperCase();
    const channelId = getDirectChannelId(myCode, cleanOtherCode);

    const displayName = otherUserName ? `${otherUserName} (${cleanOtherCode})` : `Direct: ${cleanOtherCode}`;

    const newChannel: ChatChannel = {
      id: channelId,
      name: displayName,
      is_direct: true,
      other_user_code: cleanOtherCode,
      other_user_name: otherUserName,
    };

    setChannels((prev) => {
      if (prev.some((c) => c.id === channelId)) return prev;
      const updated = [...prev, newChannel];
      AsyncStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    setActiveChannelId(channelId);
    return channelId;
  };

  // Clear unread count when switching to channel
  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, unread_count: 0 } : c))
    );
  };

  const activeMessages = messagesByChannel[activeChannelId] || [];
  const totalUnreadCount = channels.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <ChatContext.Provider
      value={{
        channels,
        activeChannelId,
        setActiveChannelId: handleSelectChannel,
        activeMessages,
        sendMessage,
        joinDirectChannel,
        isLoading,
        totalUnreadCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
