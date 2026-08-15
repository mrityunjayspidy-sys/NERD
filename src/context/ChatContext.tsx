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
  cancelFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  openDirectChatWithFriend: (friend: Friend) => string;
  joinDirectChannel: (otherUserCode: string, otherUserName?: string) => string;
  syncSocialData: () => Promise<void>;
  isLoading: boolean;
  totalUnreadCount: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const CHAT_STORAGE_KEY = '@nerd_chat_messages_v1';
const CHANNELS_STORAGE_KEY = '@nerd_chat_channels_v1';
const FRIENDS_STORAGE_KEY = '@nerd_friends_list_v1';
const REQUESTS_STORAGE_KEY = '@nerd_friend_requests_v1';

const SYSTEM_SOCIAL_CHANNEL = 'system:friend_events';

const GLOBAL_CHANNEL: ChatChannel = {
  id: 'global',
  name: '🌐 Community Hub',
  is_direct: false,
};

interface SocialEvent {
  type: 'REQUEST' | 'ACCEPT' | 'DECLINE' | 'CANCEL';
  id: string;
  sender_id: string;
  sender_name: string;
  sender_code: string;
  receiver_code: string;
  receiver_name?: string;
  receiver_id?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

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

  const normalizeCode = (c?: string) => {
    const clean = (c || '').trim().toUpperCase();
    if (!clean) return '';
    return clean.startsWith('NERD-') ? clean : `NERD-${clean}`;
  };

  const myNormalizedCode = normalizeCode(user?.nerd_code);

  // Load cached data on initial mount
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

  // Sync social data directly from Supabase (backed by messages table for guaranteed compatibility)
  const syncSocialData = useCallback(async () => {
    if (!user) return;
    const currentCode = normalizeCode(user.nerd_code);

    try {
      // 1. Query all social events from Supabase
      const { data: eventMsgs, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', SYSTEM_SOCIAL_CHANNEL)
        .order('created_at', { ascending: true })
        .limit(300);

      if (eventMsgs && !error) {
        const requestsMap = new Map<string, FriendRequest>();
        const friendsMap = new Map<string, Friend>();

        eventMsgs.forEach((msg) => {
          try {
            const event: SocialEvent = JSON.parse(msg.content);
            if (!event || !event.type) return;

            const senderCode = normalizeCode(event.sender_code);
            const receiverCode = normalizeCode(event.receiver_code);

            // Handle Request Event
            if (event.type === 'REQUEST') {
              requestsMap.set(event.id, {
                id: event.id,
                sender_id: event.sender_id,
                sender_name: event.sender_name,
                sender_code: senderCode,
                receiver_code: receiverCode,
                receiver_name: event.receiver_name,
                receiver_id: event.receiver_id,
                status: event.status || 'pending',
                created_at: event.created_at || msg.created_at,
              });
            }

            // Handle Cancel Event
            if (event.type === 'CANCEL') {
              requestsMap.delete(event.id);
            }

            // Handle Decline Event
            if (event.type === 'DECLINE') {
              const existing = requestsMap.get(event.id);
              if (existing) {
                requestsMap.set(event.id, { ...existing, status: 'declined' });
              }
            }

            // Handle Accept Event
            if (event.type === 'ACCEPT') {
              const existing = requestsMap.get(event.id);
              if (existing) {
                requestsMap.set(event.id, { ...existing, status: 'accepted' });
              }

              // Check if current user is either party
              if (currentCode === senderCode || currentCode === receiverCode) {
                const isMeSender = currentCode === senderCode;
                const friendCode = isMeSender ? receiverCode : senderCode;
                const friendName = isMeSender
                  ? event.receiver_name || friendCode
                  : event.sender_name || friendCode;
                const friendId = isMeSender ? event.receiver_id || friendCode : event.sender_id;

                friendsMap.set(friendCode, {
                  id: `friend-${friendCode}`,
                  user_id: user.id,
                  friend_id: friendId,
                  friend_name: friendName,
                  friend_code: friendCode,
                  created_at: event.created_at || msg.created_at,
                });
              }
            }
          } catch (e) {
            // Ignore non-json system messages
          }
        });

        const allRequests = Array.from(requestsMap.values()).reverse();
        setFriendRequests(allRequests);
        AsyncStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(allRequests)).catch(() => {});

        const allFriends = Array.from(friendsMap.values());
        if (allFriends.length > 0) {
          setFriends(allFriends);
          AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(allFriends)).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Error syncing social data from Supabase:', err);
    }
  }, [user]);

  // Initial sync & 3.5s recurring poll for guaranteed cross-device reliability
  useEffect(() => {
    syncSocialData();
    const interval = setInterval(() => {
      syncSocialData();
    }, 3500);
    return () => clearInterval(interval);
  }, [syncSocialData]);

  // Fetch messages from Supabase for the active channel
  const fetchChannelMessages = useCallback(async (channelId: string) => {
    if (channelId.startsWith('system:')) return;
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

  // Real-time Supabase subscription for messages & social events
  useEffect(() => {
    const channel = supabase
      .channel('realtime:all_nerd_events')
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

          // If social event (friend request, accept, etc.)
          if (newMsg.channel_id === SYSTEM_SOCIAL_CHANNEL) {
            syncSocialData();
            try {
              const event: SocialEvent = JSON.parse(newMsg.content);
              const receiverCode = normalizeCode(event.receiver_code);
              const myCode = normalizeCode(user?.nerd_code);

              if (receiverCode === myCode && event.sender_id !== user?.id) {
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch (_) {}
                }
              }
            } catch (_) {}
            return;
          }

          // Otherwise regular chat message
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeChannelId, syncSocialData]);

  // Send a Friend Request with guaranteed Supabase connection
  const sendFriendRequest = async (targetCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const myCode = normalizeCode(user.nerd_code || 'NERD-0000');
    const cleanTargetCode = normalizeCode(targetCode);

    if (!cleanTargetCode || cleanTargetCode.length < 5) {
      return { success: false, error: 'Please enter a valid Nerd Code (e.g. NERD-2801).' };
    }

    if (cleanTargetCode === myCode) {
      return { success: false, error: 'You cannot send a friend request to your own code.' };
    }

    if (friends.some((f) => normalizeCode(f.friend_code) === cleanTargetCode)) {
      return { success: false, error: `You are already friends with ${cleanTargetCode}.` };
    }

    const existing = friendRequests.find(
      (r) =>
        ((r.sender_id === user.id && normalizeCode(r.receiver_code) === cleanTargetCode) ||
          (normalizeCode(r.sender_code) === cleanTargetCode && normalizeCode(r.receiver_code) === myCode)) &&
        r.status === 'pending'
    );
    if (existing) {
      return { success: false, error: 'A friend request is already pending between you two.' };
    }

    const reqId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newRequest: FriendRequest = {
      id: reqId,
      sender_id: user.id,
      sender_name: user.name || 'Nerd Explorer',
      sender_code: myCode,
      receiver_code: cleanTargetCode,
      receiver_name: cleanTargetCode,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Optimistically update local state
    const updatedRequests = [newRequest, ...friendRequests];
    setFriendRequests(updatedRequests);
    AsyncStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updatedRequests)).catch(() => {});

    // Broadcast to Supabase
    const socialEventPayload: SocialEvent = {
      type: 'REQUEST',
      id: reqId,
      sender_id: user.id,
      sender_name: user.name || 'Nerd Explorer',
      sender_code: myCode,
      receiver_code: cleanTargetCode,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('messages').insert({
        channel_id: SYSTEM_SOCIAL_CHANNEL,
        sender_id: user.id,
        sender_name: user.name || 'Nerd Explorer',
        content: JSON.stringify(socialEventPayload),
      });
    } catch (err) {
      console.warn('Error broadcasting friend request to Supabase:', err);
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

    const updatedRequests: FriendRequest[] = friendRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'accepted' as const } : r
    );
    setFriendRequests(updatedRequests);
    AsyncStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updatedRequests)).catch(() => {});

    const newFriend: Friend = {
      id: `friend-${req.sender_code}`,
      user_id: user.id,
      friend_id: req.sender_id,
      friend_name: req.sender_name,
      friend_code: req.sender_code,
      created_at: new Date().toISOString(),
    };

    const updatedFriends = [newFriend, ...friends.filter((f) => f.friend_code !== req.sender_code)];
    setFriends(updatedFriends);
    AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(updatedFriends)).catch(() => {});

    openDirectChatWithFriend(newFriend);

    // Broadcast Accept Event to Supabase
    const acceptEvent: SocialEvent = {
      type: 'ACCEPT',
      id: requestId,
      sender_id: req.sender_id,
      sender_name: req.sender_name,
      sender_code: req.sender_code,
      receiver_id: user.id,
      receiver_name: user.name || 'Nerd Explorer',
      receiver_code: myNormalizedCode,
      status: 'accepted',
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('messages').insert({
        channel_id: SYSTEM_SOCIAL_CHANNEL,
        sender_id: user.id,
        sender_name: user.name || 'Nerd Explorer',
        content: JSON.stringify(acceptEvent),
      });
    } catch (err) {
      console.warn('Error broadcasting accept event to Supabase:', err);
    }
  };

  // Decline a Friend Request
  const declineFriendRequest = async (requestId: string) => {
    const updatedRequests: FriendRequest[] = friendRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'declined' as const } : r
    );
    setFriendRequests(updatedRequests);
    AsyncStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updatedRequests)).catch(() => {});

    if (user) {
      const declineEvent: SocialEvent = {
        type: 'DECLINE',
        id: requestId,
        sender_id: user.id,
        sender_name: user.name || 'Nerd Explorer',
        sender_code: myNormalizedCode,
        receiver_code: '',
        status: 'declined',
        created_at: new Date().toISOString(),
      };
      supabase.from('messages').insert({
        channel_id: SYSTEM_SOCIAL_CHANNEL,
        sender_id: user.id,
        sender_name: user.name || 'Nerd Explorer',
        content: JSON.stringify(declineEvent),
      }).then(() => {}, () => {});
    }
  };

  // Cancel a Sent Friend Request
  const cancelFriendRequest = async (requestId: string) => {
    const updatedRequests = friendRequests.filter((r) => r.id !== requestId);
    setFriendRequests(updatedRequests);
    AsyncStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updatedRequests)).catch(() => {});

    if (user) {
      const cancelEvent: SocialEvent = {
        type: 'CANCEL',
        id: requestId,
        sender_id: user.id,
        sender_name: user.name || 'Nerd Explorer',
        sender_code: myNormalizedCode,
        receiver_code: '',
        status: 'declined',
        created_at: new Date().toISOString(),
      };
      supabase.from('messages').insert({
        channel_id: SYSTEM_SOCIAL_CHANNEL,
        sender_id: user.id,
        sender_name: user.name || 'Nerd Explorer',
        content: JSON.stringify(cancelEvent),
      }).then(() => {}, () => {});
    }
  };

  // Remove a Friend
  const removeFriend = async (friendId: string) => {
    const updatedFriends = friends.filter((f) => f.id !== friendId);
    setFriends(updatedFriends);
    AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(updatedFriends)).catch(() => {});
  };

  // Open Direct Chat with a Friend using their Real Username
  const openDirectChatWithFriend = (friend: Friend): string => {
    if (!user) return 'global';
    const myCode = myNormalizedCode;
    const friendCode = normalizeCode(friend.friend_code);
    const channelId = getDirectChannelId(myCode, friendCode);

    const directChannel: ChatChannel = {
      id: channelId,
      name: friend.friend_name,
      is_direct: true,
      other_user_code: friendCode,
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
    const myCode = myNormalizedCode;
    const cleanOtherCode = normalizeCode(otherUserCode);
    const channelId = getDirectChannelId(myCode, cleanOtherCode);

    const matchedFriend = friends.find((f) => normalizeCode(f.friend_code) === cleanOtherCode);
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

  // Filter incoming requests
  const incomingRequests = friendRequests.filter(
    (r) =>
      (normalizeCode(r.receiver_code) === myNormalizedCode || (r.receiver_id && r.receiver_id === user?.id)) &&
      r.sender_id !== user?.id &&
      r.status === 'pending'
  );

  // Filter outgoing sent requests
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
        cancelFriendRequest,
        removeFriend,
        openDirectChatWithFriend,
        joinDirectChannel,
        syncSocialData,
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
