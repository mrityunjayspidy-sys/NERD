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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { ChatMessage } from '../types';
import { PillButton } from '../components/common/PillButton';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export const ChatScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    channels,
    activeChannelId,
    setActiveChannelId,
    activeMessages,
    sendMessage,
    joinDirectChannel,
  } = useChat();

  const [inputContent, setInputContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [copiedCodeToast, setCopiedCodeToast] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const myCode = user?.nerd_code || 'NERD-0000';
  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [activeMessages.length]);

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

  const handleStartDirectChat = () => {
    if (!friendCodeInput.trim()) return;
    const code = friendCodeInput.trim().toUpperCase();
    if (code === myCode) {
      Alert.alert('Invalid Code', 'You cannot start a direct chat with your own code.');
      return;
    }

    joinDirectChannel(code);
    setFriendCodeInput('');
    setIsConnectModalOpen(false);
  };

  const formatMessageTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
              : [styles.bubbleOther, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }],
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
      {/* Top Header Card */}
      <View style={[styles.topHeader, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
              Nerd Chat
            </Text>
            <Text style={[styles.screenSubtitle, { color: theme.colors.textMuted }]}>
              Real-time multi-user & direct channels
            </Text>
          </View>

          {/* User's Unique Code Chip */}
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

        {/* Channel Switcher Rail */}
        <View style={styles.channelScrollRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={channels}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.channelsList}
            renderItem={({ item: c }) => {
              const isActive = c.id === activeChannelId;
              return (
                <Pressable
                  onPress={() => setActiveChannelId(c.id)}
                  style={[
                    styles.channelPill,
                    {
                      backgroundColor: isActive ? theme.colors.accent : theme.colors.surfaceElevated,
                      borderColor: isActive ? theme.colors.borderActive : theme.colors.border,
                      borderRadius: theme.radii.full,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.channelPillText,
                      { color: isActive ? theme.colors.textInverse : theme.colors.textPrimary },
                    ]}
                  >
                    {c.name}
                  </Text>
                  {c.unread_count && c.unread_count > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{c.unread_count}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
            ListFooterComponent={
              <Pressable
                onPress={() => setIsConnectModalOpen(true)}
                style={[
                  styles.addDirectPill,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons name="person-add-outline" size={13} color={theme.colors.textPrimary} />
                <Text style={[styles.addDirectPillText, { color: theme.colors.textPrimary }]}>
                  + Connect by Code
                </Text>
              </Pressable>
            }
          />
        </View>
      </View>

      {/* Messages List Area */}
      <View style={styles.messagesContainer}>
        {activeMessages.length === 0 ? (
          <View style={styles.emptyMessagesWrap}>
            <Ionicons name="chatbubbles-outline" size={42} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              {activeChannel.is_direct ? 'Private Direct Channel' : 'Welcome to Nerd Community Hub'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
              {activeChannel.is_direct
                ? `You are connected with ${activeChannel.name}. Send a hello!`
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
            placeholder={`Message ${activeChannel.name}...`}
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

      {/* Connect with Friend Modal */}
      <Modal
        visible={isConnectModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConnectModalOpen(false)}
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
                Connect by Unique Code
              </Text>
              <Pressable onPress={() => setIsConnectModalOpen(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={[styles.modalSub, { color: theme.colors.textMuted }]}>
              Enter a friend's unique Nerd code (e.g. NERD-8492) to start a 1-on-1 private chat channel.
            </Text>

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
                label="Start Direct Chat"
                variant="accent"
                size="md"
                onPress={handleStartDirectChat}
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
    marginBottom: 8,
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
  channelScrollRow: {
    marginTop: 4,
  },
  channelsList: {
    gap: 8,
    alignItems: 'center',
  },
  channelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 6,
  },
  channelPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#D9534F',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  addDirectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 5,
  },
  addDirectPillText: {
    fontSize: 12,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
    paddingBottom: 90, // Leave room above the floating bottom navigation bar
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
