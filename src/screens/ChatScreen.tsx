import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { ChatMessage, Friend, FriendRequest } from '../types';
import { PillButton } from '../components/common/PillButton';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

type ChatTabMode = 'friends' | 'requests' | 'community';

export const ChatScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    channels,
    activeChannelId,
    setActiveChannelId,
    activeMessages,
    sendMessage,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    openDirectChatWithFriend,
  } = useChat();

  // Navigation State: 'home' (directory) vs 'chat' (active conversation)
  const [currentView, setCurrentView] = useState<'home' | 'conversation'>('home');
  const [activeTabMode, setActiveTabMode] = useState<ChatTabMode>('friends');

  // Input & Modal States
  const [inputContent, setInputContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeToast, setCopiedCodeToast] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const myCode = user?.nerd_code || 'NERD-0000';

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  useEffect(() => {
    if (currentView === 'conversation') {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeMessages.length, currentView]);

  const handleCopyMyCode = async () => {
    try {
      await Clipboard.setStringAsync(myCode);
      setCopiedCodeToast(true);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
      }
      setTimeout(() => setCopiedCodeToast(false), 2500);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access photos is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleSend = async () => {
    if (!inputContent.trim() && !selectedImage) return;
    const content = inputContent.trim() || 'Attached an image';
    const imageUri = selectedImage || undefined;

    setInputContent('');
    setSelectedImage(null);

    await sendMessage(content, imageUri);
  };

  const handleSendRequest = async () => {
    setRequestError(null);
    setRequestSuccess(null);
    if (!friendCodeInput.trim()) return;

    const res = await sendFriendRequest(friendCodeInput.trim());
    if (res.error) {
      setRequestError(res.error);
    } else {
      setRequestSuccess(`Friend request sent to ${friendCodeInput.trim().toUpperCase()}!`);
      setFriendCodeInput('');
      setTimeout(() => {
        setIsAddFriendModalOpen(false);
        setRequestSuccess(null);
      }, 1800);
    }
  };

  const handleOpenFriendConversation = (friend: Friend) => {
    openDirectChatWithFriend(friend);
    setCurrentView('conversation');
  };

  const handleOpenCommunityHub = () => {
    setActiveChannelId('global');
    setCurrentView('conversation');
  };

  const formatMessageTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.friend_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.friend_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeFriendName = activeChannel?.other_user_name || activeChannel?.name || 'Friend';

  // Render a Single Message Item
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = user ? item.sender_id === user.id : false;

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        {!isMe && (
          <View
            style={[
              styles.senderAvatar,
              { backgroundColor: theme.colors.accent, borderRadius: theme.radii.full },
            ]}
          >
            <Text style={[styles.avatarInitial, { color: theme.colors.textInverse }]}>
              {item.sender_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isMe
              ? [styles.bubbleMe, { backgroundColor: theme.colors.accent }]
              : [
                  styles.bubbleOther,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ],
            { borderRadius: theme.radii.lg },
          ]}
        >
          {!isMe && (
            <Text style={[styles.senderNameLabel, { color: theme.colors.textSecondary }]}>
              {item.sender_name}
            </Text>
          )}

          {item.image_uri && (
            <View style={styles.bubbleImageWrapper}>
              <Image source={{ uri: item.image_uri }} style={styles.bubbleImage} resizeMode="cover" />
            </View>
          )}

          <Text
            style={[
              styles.messageContentText,
              { color: isMe ? theme.colors.textInverse : theme.colors.textPrimary },
            ]}
          >
            {item.content}
          </Text>

          <View style={styles.bubbleFooter}>
            <Text
              style={[
                styles.messageTimestamp,
                { color: isMe ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textMuted },
              ]}
            >
              {formatMessageTime(item.created_at)}
            </Text>
            {isMe && (
              <Ionicons
                name="checkmark-done"
                size={13}
                color="rgba(255, 255, 255, 0.85)"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      {/* ========================================================================= */}
      {/* VIEW 1: HOME PAGE / FRIENDS DIRECTORY & REQUESTS */}
      {/* ========================================================================= */}
      {currentView === 'home' ? (
        <View style={styles.homeContainer}>
          {/* Top Bar Header */}
          <View style={[styles.topHeader, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View>
                <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
                  Nerd Chat
                </Text>
                <Text style={[styles.screenSubtitle, { color: theme.colors.textMuted }]}>
                  Friends & real-time messaging
                </Text>
              </View>

              {/* My Unique Code Pill */}
              <Pressable
                onPress={handleCopyMyCode}
                style={[
                  styles.myCodeChip,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.borderActive,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons name="key-outline" size={13} color={theme.colors.textPrimary} />
                <Text style={[styles.myCodeText, { color: theme.colors.textPrimary }]}>
                  {myCode}
                </Text>
                <Ionicons
                  name={copiedCodeToast ? 'checkmark-circle' : 'copy-outline'}
                  size={13}
                  color={copiedCodeToast ? theme.colors.donePill : theme.colors.textMuted}
                />
              </Pressable>
            </View>

            {copiedCodeToast && (
              <View style={[styles.toastBanner, { backgroundColor: 'rgba(78, 159, 118, 0.15)' }]}>
                <Text style={[styles.toastText, { color: theme.colors.donePill }]}>
                  Your Unique Code ({myCode}) copied to clipboard!
                </Text>
              </View>
            )}

            {/* Sub-Tab Navigation Bar */}
            <View style={styles.tabSwitcherRow}>
              {/* Friends Tab */}
              <Pressable
                onPress={() => setActiveTabMode('friends')}
                style={[
                  styles.modeTabBtn,
                  activeTabMode === 'friends' && {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons
                  name="people"
                  size={15}
                  color={activeTabMode === 'friends' ? theme.colors.textInverse : theme.colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    {
                      color:
                        activeTabMode === 'friends'
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Friends ({friends.length})
                </Text>
              </Pressable>

              {/* Friend Requests Tab */}
              <Pressable
                onPress={() => setActiveTabMode('requests')}
                style={[
                  styles.modeTabBtn,
                  activeTabMode === 'requests' && {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons
                  name="mail"
                  size={15}
                  color={activeTabMode === 'requests' ? theme.colors.textInverse : theme.colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    {
                      color:
                        activeTabMode === 'requests'
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Requests
                </Text>
                {incomingRequests.length > 0 && (
                  <View style={styles.requestsBadgePill}>
                    <Text style={styles.requestsBadgeText}>{incomingRequests.length}</Text>
                  </View>
                )}
              </Pressable>

              {/* Community Hub Tab */}
              <Pressable
                onPress={() => setActiveTabMode('community')}
                style={[
                  styles.modeTabBtn,
                  activeTabMode === 'community' && {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons
                  name="globe-outline"
                  size={15}
                  color={activeTabMode === 'community' ? theme.colors.textInverse : theme.colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    {
                      color:
                        activeTabMode === 'community'
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Community Hub
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ================= FRIENDS TAB ================= */}
          {activeTabMode === 'friends' && (
            <View style={styles.tabContentContainer}>
              {/* Search & Add Friend Action Bar */}
              <View style={styles.friendActionBar}>
                <View
                  style={[
                    styles.searchWrap,
                    {
                      backgroundColor: theme.colors.surfaceInput,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.full,
                    },
                  ]}
                >
                  <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                    placeholder="Search friends by name or code..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <Pressable
                  onPress={() => setIsAddFriendModalOpen(true)}
                  style={[
                    styles.addFriendActionBtn,
                    {
                      backgroundColor: theme.colors.accent,
                      borderRadius: theme.radii.full,
                    },
                  ]}
                >
                  <Ionicons name="person-add" size={16} color={theme.colors.textInverse} style={{ marginRight: 4 }} />
                  <Text style={[styles.addFriendActionBtnText, { color: theme.colors.textInverse }]}>
                    + Add Friend
                  </Text>
                </Pressable>
              </View>

              {/* Friends List */}
              {friends.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View
                    style={[
                      styles.emptyIconCircle,
                      { backgroundColor: theme.colors.surfaceInput },
                    ]}
                  >
                    <Ionicons name="people-outline" size={36} color={theme.colors.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    No Friends Added Yet
                  </Text>
                  <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                    Connect with your friends using their Unique Nerd Code to start chatting!
                  </Text>
                  <PillButton
                    label="Add Your First Friend"
                    variant="accent"
                    size="md"
                    icon={<Ionicons name="person-add" size={16} color={theme.colors.textInverse} />}
                    onPress={() => setIsAddFriendModalOpen(true)}
                    style={{ marginTop: 14 }}
                  />
                </View>
              ) : (
                <FlatList
                  data={filteredFriends}
                  keyExtractor={(f) => f.id}
                  contentContainerStyle={styles.friendsListContent}
                  renderItem={({ item: f }) => (
                    <Pressable
                      onPress={() => handleOpenFriendConversation(f)}
                      style={[
                        styles.friendCard,
                        {
                          backgroundColor: theme.colors.surfaceElevated,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radii.lg,
                        },
                      ]}
                    >
                      {/* Avatar */}
                      <View
                        style={[
                          styles.friendAvatar,
                          {
                            backgroundColor: theme.colors.accent,
                            borderRadius: theme.radii.full,
                          },
                        ]}
                      >
                        <Text style={[styles.friendAvatarInitial, { color: theme.colors.textInverse }]}>
                          {f.friend_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      {/* Friend Info */}
                      <View style={styles.friendDetailsCol}>
                        <View style={styles.friendNameRow}>
                          <Text style={[styles.friendRealName, { color: theme.colors.textPrimary }]}>
                            {f.friend_name}
                          </Text>
                          <View
                            style={[
                              styles.friendCodeBadge,
                              {
                                backgroundColor: theme.colors.surfaceInput,
                                borderColor: theme.colors.border,
                                borderRadius: theme.radii.full,
                              },
                            ]}
                          >
                            <Text style={[styles.friendCodeBadgeText, { color: theme.colors.textSecondary }]}>
                              {f.friend_code}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.friendLastMsg, { color: theme.colors.textMuted }]}>
                          Tap to open conversation
                        </Text>
                      </View>

                      {/* Chat Action Icon */}
                      <View style={styles.chatActionOrb}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.accent} />
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}

          {/* ================= REQUESTS TAB ================= */}
          {activeTabMode === 'requests' && (
            <ScrollView
              contentContainerStyle={styles.requestsContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Incoming Requests Section */}
              <View style={styles.requestSectionHeader}>
                <Text style={[styles.requestSectionTitle, { color: theme.colors.textPrimary }]}>
                  Incoming Friend Requests ({incomingRequests.length})
                </Text>
                <Text style={[styles.requestSectionSub, { color: theme.colors.textMuted }]}>
                  Users who want to connect with you
                </Text>
              </View>

              {incomingRequests.length === 0 ? (
                <View
                  style={[
                    styles.emptyReqBox,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.lg,
                    },
                  ]}
                >
                  <Ionicons name="mail-open-outline" size={28} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyReqText, { color: theme.colors.textSecondary }]}>
                    No incoming requests right now.
                  </Text>
                </View>
              ) : (
                incomingRequests.map((req) => (
                  <View
                    key={req.id}
                    style={[
                      styles.requestCard,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.borderActive,
                        borderRadius: theme.radii.lg,
                      },
                    ]}
                  >
                    <View style={styles.reqSenderInfo}>
                      <View
                        style={[
                          styles.reqAvatar,
                          {
                            backgroundColor: theme.colors.accent,
                            borderRadius: theme.radii.full,
                          },
                        ]}
                      >
                        <Text style={[styles.reqAvatarText, { color: theme.colors.textInverse }]}>
                          {req.sender_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.reqSenderName, { color: theme.colors.textPrimary }]}>
                          {req.sender_name}
                        </Text>
                        <Text style={[styles.reqSenderCode, { color: theme.colors.textMuted }]}>
                          Code: {req.sender_code}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.reqActionRow}>
                      <Pressable
                        onPress={() => acceptFriendRequest(req.id)}
                        style={[
                          styles.acceptBtn,
                          {
                            backgroundColor: theme.colors.donePill,
                            borderRadius: theme.radii.full,
                          },
                        ]}
                      >
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => declineFriendRequest(req.id)}
                        style={[
                          styles.declineBtn,
                          {
                            backgroundColor: theme.colors.surfaceInput,
                            borderColor: theme.colors.border,
                            borderRadius: theme.radii.full,
                          },
                        ]}
                      >
                        <Ionicons name="close" size={16} color={theme.colors.priorityHigh} />
                        <Text style={[styles.declineBtnText, { color: theme.colors.priorityHigh }]}>
                          Decline
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              {/* Outgoing Requests Section */}
              <View style={[styles.requestSectionHeader, { marginTop: 24 }]}>
                <Text style={[styles.requestSectionTitle, { color: theme.colors.textPrimary }]}>
                  Sent Requests ({outgoingRequests.length})
                </Text>
                <Text style={[styles.requestSectionSub, { color: theme.colors.textMuted }]}>
                  Requests you have sent awaiting acceptance
                </Text>
              </View>

              {outgoingRequests.length === 0 ? (
                <View
                  style={[
                    styles.emptyReqBox,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.lg,
                    },
                  ]}
                >
                  <Ionicons name="paper-plane-outline" size={24} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyReqText, { color: theme.colors.textSecondary }]}>
                    No pending sent requests.
                  </Text>
                </View>
              ) : (
                outgoingRequests.map((req) => (
                  <View
                    key={req.id}
                    style={[
                      styles.requestCard,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radii.lg,
                      },
                    ]}
                  >
                    <View style={styles.reqSenderInfo}>
                      <Ionicons name="time-outline" size={20} color={theme.colors.accent} style={{ marginRight: 10 }} />
                      <View>
                        <Text style={[styles.reqSenderName, { color: theme.colors.textPrimary }]}>
                          Sent to {req.receiver_code}
                        </Text>
                        <Text style={[styles.reqSenderCode, { color: theme.colors.textMuted }]}>
                          Waiting for friend to accept
                        </Text>
                      </View>
                    </View>
                    <View style={styles.pendingPill}>
                      <Text style={styles.pendingPillText}>Pending</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* ================= COMMUNITY HUB TAB ================= */}
          {activeTabMode === 'community' && (
            <View style={styles.communityHubPreviewWrap}>
              <View
                style={[
                  styles.communityHeroCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.xl,
                  },
                ]}
              >
                <View style={[styles.communityGlobeOrb, { backgroundColor: theme.colors.surfaceInput }]}>
                  <Ionicons name="globe" size={40} color={theme.colors.accent} />
                </View>
                <Text style={[styles.communityHeroTitle, { color: theme.colors.textPrimary }]}>
                  Nerd Community Hub
                </Text>
                <Text style={[styles.communityHeroSub, { color: theme.colors.textSecondary }]}>
                  Join all fellow Nerd creators and task masters in one open global room in real time!
                </Text>
                <PillButton
                  label="Enter Community Hub"
                  variant="accent"
                  size="lg"
                  icon={<Ionicons name="chatbubbles" size={18} color={theme.colors.textInverse} />}
                  onPress={handleOpenCommunityHub}
                  style={{ marginTop: 18 }}
                />
              </View>
            </View>
          )}
        </View>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: ACTIVE CONVERSATION STREAM */
        /* ========================================================================= */
        <View style={styles.conversationContainer}>
          {/* Top Conversation Header */}
          <View
            style={[
              styles.conversationHeader,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.convHeaderLeft}>
              {/* Back to Friends Button */}
              <Pressable
                onPress={() => setCurrentView('home')}
                style={[
                  styles.backBtn,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
              </Pressable>

              {/* Friend Info */}
              <View style={styles.convHeaderInfo}>
                <Text style={[styles.convFriendName, { color: theme.colors.textPrimary }]}>
                  {activeFriendName}
                </Text>
                <Text style={[styles.convFriendSub, { color: theme.colors.textMuted }]}>
                  {activeChannel.is_direct
                    ? `Friend Code: ${activeChannel.other_user_code}`
                    : 'Global Community Chat Room'}
                </Text>
              </View>
            </View>

            <View style={styles.convOnlineBadge}>
              <View style={styles.convOnlineDot} />
              <Text style={[styles.convOnlineText, { color: theme.colors.donePill }]}>Connected</Text>
            </View>
          </View>

          {/* Messages Stream */}
          <View style={styles.messagesContainer}>
            {activeMessages.length === 0 ? (
              <View style={styles.emptyMessagesWrap}>
                <Ionicons name="chatbubbles-outline" size={42} color={theme.colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  {activeChannel.is_direct ? `Chat with ${activeFriendName}` : 'Welcome to Nerd Community Hub'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
                  {activeChannel.is_direct
                    ? `Send a message to ${activeFriendName} to start your conversation!`
                    : 'Say hello to all fellow Nerd explorers in real-time!'}
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={activeMessages}
                keyExtractor={(m) => m.id}
                renderItem={renderMessageItem}
                contentContainerStyle={styles.messagesListContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Image Preview Banner */}
          {selectedImage && (
            <View
              style={[
                styles.imagePreviewBanner,
                { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
              ]}
            >
              <Image source={{ uri: selectedImage }} style={styles.attachedThumb} />
              <Text style={[styles.imagePreviewText, { color: theme.colors.textPrimary }]}>
                Photo attached
              </Text>
              <Pressable onPress={() => setSelectedImage(null)} style={styles.removeImageBtn}>
                <Ionicons name="close-circle" size={20} color={theme.colors.priorityHigh} />
              </Pressable>
            </View>
          )}

          {/* Message Input Bar */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <Pressable
              onPress={handlePickImage}
              style={[
                styles.attachBtn,
                {
                  backgroundColor: theme.colors.surfaceInput,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons name="camera-outline" size={20} color={theme.colors.textSecondary} />
            </Pressable>

            <View
              style={[
                styles.textInputWrapper,
                {
                  backgroundColor: theme.colors.surfaceInput,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <TextInput
                style={[styles.textInputField, { color: theme.colors.textPrimary }]}
                value={inputContent}
                onChangeText={setInputContent}
                placeholder={`Message ${activeFriendName}...`}
                placeholderTextColor={theme.colors.textMuted}
                multiline={false}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
            </View>

            <Pressable
              onPress={handleSend}
              disabled={!inputContent.trim() && !selectedImage}
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    inputContent.trim() || selectedImage ? theme.colors.accent : theme.colors.surfaceInput,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={
                  inputContent.trim() || selectedImage ? theme.colors.textInverse : theme.colors.textMuted
                }
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD FRIEND BY UNIQUE CODE */}
      {/* ========================================================================= */}
      <Modal
        visible={isAddFriendModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddFriendModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.xl,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Add Friend by Unique Code
              </Text>
              <Pressable onPress={() => setIsAddFriendModalOpen(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={[styles.modalSub, { color: theme.colors.textMuted }]}>
              Enter your friend's Unique Nerd Code (e.g. NERD-8400) to send a friend request. Once they accept, you can chat with their real username!
            </Text>

            {/* Error or Success Feedback */}
            {requestError && (
              <View style={[styles.feedbackBanner, { backgroundColor: 'rgba(217, 83, 79, 0.15)' }]}>
                <Text style={[styles.feedbackText, { color: theme.colors.priorityHigh }]}>
                  {requestError}
                </Text>
              </View>
            )}

            {requestSuccess && (
              <View style={[styles.feedbackBanner, { backgroundColor: 'rgba(78, 159, 118, 0.15)' }]}>
                <Text style={[styles.feedbackText, { color: theme.colors.donePill }]}>
                  {requestSuccess}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.modalInputWrap,
                {
                  backgroundColor: theme.colors.surfaceInput,
                  borderColor: theme.colors.borderActive,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <Ionicons name="key-outline" size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.modalTextInput, { color: theme.colors.textPrimary }]}
                value={friendCodeInput}
                onChangeText={setFriendCodeInput}
                placeholder="NERD-XXXX"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="characters"
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <PillButton
                label="Send Friend Request"
                variant="accent"
                size="md"
                onPress={handleSendRequest}
                disabled={!friendCodeInput.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  /* Home View Styles */
  homeContainer: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  myCodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    gap: 6,
  },
  myCodeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toastBanner: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  toastText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabSwitcherRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  modeTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  requestsBadgePill: {
    backgroundColor: '#D9534F',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  requestsBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  tabContentContainer: {
    flex: 1,
  },
  friendActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    borderWidth: 0,
  },
  addFriendActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
  },
  addFriendActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  friendsListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 8,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  friendDetailsCol: {
    flex: 1,
    gap: 2,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendRealName: {
    fontSize: 15,
    fontWeight: '800',
  },
  friendCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
  },
  friendCodeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  friendLastMsg: {
    fontSize: 12,
    fontWeight: '500',
  },
  chatActionOrb: {
    padding: 6,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  requestsContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 8,
  },
  requestSectionHeader: {
    marginBottom: 8,
  },
  requestSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  requestSectionSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  emptyReqBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyReqText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestCard: {
    padding: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  reqSenderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reqAvatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqAvatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  reqSenderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  reqSenderCode: {
    fontSize: 11,
    fontWeight: '500',
  },
  reqActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 4,
  },
  acceptBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    gap: 4,
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pendingPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(230, 160, 50, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingPillText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  communityHubPreviewWrap: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  communityHeroCard: {
    width: '100%',
    maxWidth: 440,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
  },
  communityGlobeOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  communityHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  communityHeroSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  /* Conversation View Styles */
  conversationContainer: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  convHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convHeaderInfo: {
    gap: 1,
  },
  convFriendName: {
    fontSize: 16,
    fontWeight: '800',
  },
  convFriendSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  convOnlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  convOnlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4E9F76',
  },
  convOnlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  messagesContainer: {
    flex: 1,
  },
  emptyMessagesWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  messagesListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  senderAvatar: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '800',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {},
  bubbleOther: {
    borderWidth: 1,
  },
  senderNameLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  bubbleImageWrapper: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  bubbleImage: {
    width: '100%',
    height: '100%',
  },
  messageContentText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTimestamp: {
    fontSize: 10,
    fontWeight: '600',
  },
  imagePreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 4,
  },
  attachedThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  imagePreviewText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  removeImageBtn: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 90,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textInputWrapper: {
    flex: 1,
    height: 42,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
  },
  textInputField: {
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 0,
  },
  sendBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderWidth: 1,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  feedbackBanner: {
    padding: 8,
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 0,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 6,
  },
});
