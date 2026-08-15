import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { ChatMessage, ChatChannel, Friend, FriendRequest } from '../types';
import { getDirectChannelId } from '../services/userCode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface ChatContextType {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  channels: ChatChannel[];
  activeChannelId: string;
  setActiveChannelId: (channelId: string) => void;
  activeMessages: ChatMessage[];
  sendMessage: (content: string, imageUri?: string) => Promise<void>;
  sendFriendRequest: (targetCode: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  openDirectChatWithFriend: (friend: Friend) => string;
  joinDirectChannel: (otherUserCode: string, otherUserName?: string) => string;
  isLoading: boolean;
  totalUnreadCount: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const CHAT_STORAGE_KEY = '@nerd_chat_messages_v1';
const CHANNELS_STORAGE_KEY = '@nerd_chat_channels_v1';
const FRIENDS_STORAGE_KEY = '@nerd_friends_list_v1';
const REQUESTS_STORAGE_KEY = '@nerd_friend_requests_v1';

const GLOBAL_CHANNEL: ChatChannel = {
  id: 'global',
  name: '🌐 Community Hub',
  is_direct: false,
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([GLOBAL_CHANNEL]);
  const [activeChannelId, setActiveChannelId] = useState<string>('global');
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>({
    global: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load cached friends, requests, channels, and messages
  useEffect(() => {
    async function loadCache() {
      try {
        const cachedFriends = await AsyncStorage.getItem(FRIENDS_STORAGE_KEY);
        if (cachedFriends) {
          setFriends(JSON.parse(cachedFriends));
        }

        const cachedRequests = await AsyncStorage.getItem(REQUESTS_STORAGE_KEY);
        if (cachedRequests) {
          setFriendRequests(JSON.parse(cachedRequests));
        }

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

  // Fetch remote friends and requests from Supabase
  const syncSocialData = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch Friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id);

      if (friendsData && friendsData.length > 0) {
        setFriends(friendsData as Friend[]);
        AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(friendsData)).catch(() => {});
      }

      // 2. Fetch Friend Requests (incoming & outgoing)
      const myCode = user.nerd_code || '';
      const { data: requestsData } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`receiver_code.eq.${myCode},sender_id.eq.${user.id}`);

      if (requestsData) {
        setFriendRequests(requestsData as FriendRequest[]);
        AsyncStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requestsData)).catch(() => {});
      }
    } catch (err) {
      console.warn('Error syncing social data:', err);
    }
  }, [user]);

  useEffect(() => {
    syncSocialData();
  }, [syncSocialData]);

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

  // Real-time Subscriptions: Messages & Friend Requests
  useEffect(() => {
    const messagesChannel = supabase
      .channel('realtime:messages_hub')
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

          setMessagesByChannel((prev) => {
            const list = prev[newMsg.channel_id] || [];
            if (list.some((m) => m.id === newMsg.id)) return prev;
            const updated = { ...prev, [newMsg.channel_id]: [...list, newMsg] };
            AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
            return updated;
          });

          if (user && newMsg.sender_id !== user.id) {
            if (Platform.OS !== 'web') {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (_) {}
            }

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

    // Friend Requests Realtime
    const requestsChannel = supabase
      .channel('realtime:friend_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
        },
        () => {
          syncSocialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [user, activeChannelId, syncSocialData]);

  // Send a Friend Request using friend's Unique Nerd Code
  const sendFriendRequest = async (targetCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const myCode = user.nerd_code || 'NERD-0000';
    const cleanTargetCode = targetCode.trim().toUpperCase();

    if (cleanTargetCode === myCode) {
      return { success: false, error: 'You cannot send a friend request to your own code.' };
    }

    // Check if already friends
    if (friends.some((f) => f.friend_code === cleanTargetCode)) {
      return { success: false, error: `You are already friends with ${cleanTargetCode}.` };
    }

    // Check if request already pending
    const existing = friendRequests.find(
      (r) =>
        (r.sender_id === user.id && r.receiver_code === cleanTargetCode && r.status === 'pending') ||
        (r.sender_code === cleanTargetCode && r.receiver_code === myCode && r.status === 'pending')
    );
    if (existing) {
      return { success: false, error: 'A friend request is already pending between you two.' };
    }

    const newRequest: FriendRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sender_id: user.id,
      sender_name: user.name || 'Nerd Explorer',
      sender_code: myCode,
      receiver_code: cleanTargetCode,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Optimistically add to state
    const updatedRequests = [newRequest, ...friendRequests];
    setFriendRequests(updatedRequests);
    AsyncStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updatedRequests)).catch(() => {});

    try {
      await supabase.from('friend_requests').insert({
        sender_id: user.id,
        sender_name: user.name || 'Nerd Explorer',
        sender_code: myCode,
        receiver_code: cleanTargetCode,
        status: 'pending',
      });
    } catch (err) {
      console.warn('Error inserting friend request to Supabase:', err);
    }

    return { success: true };
  };

  // Accept a Friend Request
  const acceptFriendRequest = async (requestId: string) => {
    if (!user) return;
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    }

    // Update request state
    const updatedRequests: FriendRequest[] = friendRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'accepted' as const } : r
    );
    setFriendRequests(updatedRequests);
    AsyncStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updatedRequests)).catch(() => {});

    // Create Friend Object
    const newFriend: Friend = {
      id: `friend-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: user.id,
      friend_id: req.sender_id,
      friend_name: req.sender_name,
      friend_code: req.sender_code,
      created_at: new Date().toISOString(),
    };

    const updatedFriends = [newFriend, ...friends.filter((f) => f.friend_code !== req.sender_code)];
    setFriends(updatedFriends);
    AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(updatedFriends)).catch(() => {});

    // Automatically create direct chat channel with Friend's Real Name
    openDirectChatWithFriend(newFriend);

    try {
      await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
      await supabase.from('friends').insert({
        user_id: user.id,
        friend_id: req.sender_id,
        friend_name: req.sender_name,
        friend_code: req.sender_code,
      });
    } catch (err) {
      console.warn('Error updating accepted friend request in Supabase:', err);
    }
  };

  // Decline a Friend Request
  const declineFriendRequest = async (requestId: string) => {
    const updatedRequests: FriendRequest[] = friendRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'declined' as const } : r
    );
    setFriendRequests(updatedRequests);
    AsyncStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updatedRequests)).catch(() => {});

    try {
      await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', requestId);
    } catch (err) {
      console.warn('Error declining friend request in Supabase:', err);
    }
  };

  // Remove a Friend
  const removeFriend = async (friendId: string) => {
    const updatedFriends = friends.filter((f) => f.id !== friendId);
    setFriends(updatedFriends);
    AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(updatedFriends)).catch(() => {});

    try {
      await supabase.from('friends').delete().eq('id', friendId);
    } catch (err) {
      console.warn('Error removing friend from Supabase:', err);
    }
  };

  // Open Direct Chat with a Friend using their Real Name
  const openDirectChatWithFriend = (friend: Friend): string => {
    if (!user) return 'global';
    const myCode = user.nerd_code || 'NERD-0000';
    const channelId = getDirectChannelId(myCode, friend.friend_code);

    const directChannel: ChatChannel = {
      id: channelId,
      name: friend.friend_name, // Real User Name!
      is_direct: true,
      other_user_code: friend.friend_code,
      other_user_name: friend.friend_name,
    };

    setChannels((prev) => {
      const filtered = prev.filter((c) => c.id !== channelId);
      const updated = [...filtered, directChannel];
      AsyncStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    setActiveChannelId(channelId);
    return channelId;
  };

  // Join or start a Direct Channel with a friend using their Unique Nerd Code
  const joinDirectChannel = (otherUserCode: string, otherUserName?: string): string => {
    if (!user) return 'global';
    const myCode = user.nerd_code || 'NERD-0000';
    const cleanOtherCode = otherUserCode.trim().toUpperCase();
    const channelId = getDirectChannelId(myCode, cleanOtherCode);

    // Look up friend's real name if already added
    const matchedFriend = friends.find((f) => f.friend_code === cleanOtherCode);
    const resolvedName = matchedFriend ? matchedFriend.friend_name : otherUserName || cleanOtherCode;

    const newChannel: ChatChannel = {
      id: channelId,
      name: resolvedName,
      is_direct: true,
      other_user_code: cleanOtherCode,
      other_user_name: resolvedName,
    };

    setChannels((prev) => {
      const filtered = prev.filter((c) => c.id !== channelId);
      const updated = [...filtered, newChannel];
      AsyncStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    setActiveChannelId(channelId);
    return channelId;
  };

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

  // Clear unread count when switching to channel
  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, unread_count: 0 } : c))
    );
  };

  const myCode = user?.nerd_code || '';
  const incomingRequests = friendRequests.filter(
    (r) => r.receiver_code === myCode && r.status === 'pending'
  );
  const outgoingRequests = friendRequests.filter(
    (r) => r.sender_id === user?.id && r.status === 'pending'
  );

  const activeMessages = messagesByChannel[activeChannelId] || [];
  const totalUnreadCount =
    channels.reduce((sum, c) => sum + (c.unread_count || 0), 0) + incomingRequests.length;

  return (
    <ChatContext.Provider
      value={{
        friends,
        incomingRequests,
        outgoingRequests,
        channels,
        activeChannelId,
        setActiveChannelId: handleSelectChannel,
        activeMessages,
        sendMessage,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        removeFriend,
        openDirectChatWithFriend,
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
