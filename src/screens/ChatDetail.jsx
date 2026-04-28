import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PermissionsAndroid,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';
import { getToken } from '../utils/tokenStorage';
import PageLoader from '../components/PageLoader';
import usePageLoader from '../hooks/usePageLoader';
import { useToast } from '../contexts/ToastContext';
import InviteMembersModal from '../components/InviteMembersModal';
import FileSourceModal from '../components/FileSourceModal';

const { width, height } = Dimensions.get('window');

// Try to import image picker
let ImageCropPicker = null;
try {
  ImageCropPicker = require('react-native-image-crop-picker').default;
} catch (error) {
  console.warn('ImageCropPicker not available:', error);
}

// Try to import document picker
let DocumentPicker = null;
try {
  const docPicker = require('@react-native-documents/picker');
  DocumentPicker = {
    pick: docPicker.pick,
    types: docPicker.types,
  };
} catch (error) {
  console.warn('DocumentPicker not available:', error);
}

// Try to import react-native-fs for downloading documents
let RNFS = null;
try {
  RNFS = require('react-native-fs');
} catch (error) {
  console.warn('RNFS not available:', error);
}

const ChatDetail = ({ route, navigation }) => {
  const { memberId, groupId, memberName, memberAvatar, isGroup } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [displayName, setDisplayName] = useState(memberName || 'Chat');
  const [displayAvatar, setDisplayAvatar] = useState(memberAvatar || null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [showFileSourceModal, setShowFileSourceModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const flatListRef = useRef(null);
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(false);
  const insets = useSafeAreaInsets();
  const { showInfo, showError, showSuccess } = useToast();
  
  // Determine chat ID based on whether it's a group or individual chat
  const chatId = isGroup ? groupId : memberId;

  // Fetch current user ID
  const fetchCurrentUserId = async () => {
    try {
      const token = await getToken();
      if (!token) return null;

      const endpoints = [
        'https://app.stormbuddi.com/api/mobile/user',
        'https://app.stormbuddi.com/api/mobile/profile',
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const user = data.data || data.user || data;
            const userId = user.id?.toString() || user.user_id?.toString();
            
            // Store user role/type
            const userRole = user.user_type || user.role || user.role_id;
            const roleId = user.role_id;
            if (userRole === 'admin' || roleId === 1) {
              setCurrentUserRole('admin');
            } else {
              setCurrentUserRole(userRole || 'customer');
            }
            
            if (userId) {
              return userId;
            }
          }
        } catch (error) {
          // Continue to next endpoint
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Fetch group members
  const fetchGroupMembers = async () => {
    if (!isGroup || !groupId) return;
    
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const group = data.group || data.data || data;
        const members = group.members || group.users || [];
        setGroupMembers(members);
        
        // Fetch pending invitations for this group
        await fetchPendingInvitations();
      }
    } catch (error) {
      // Error fetching group members
    }
  };

  const fetchPendingInvitations = async () => {
    if (!isGroup || !groupId) return;
    
    try {
      const token = await getToken();
      if (!token) return;

      // Try to fetch pending invitations for this group
      // The endpoint might be: /api/mobile/chat/groups/{groupId}/invitations
      const response = await fetch(
        `https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}/invitations`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Extract pending invitations - they might be in data.invitations, data.pending_invitations, or data.data
        const invitations = data.invitations || data.pending_invitations || data.data || [];
        // Filter only pending invitations (not accepted)
        const pending = invitations.filter(inv => 
          !inv.accepted_at && !inv.accepted && inv.status !== 'accepted'
        );
        setPendingInvitations(pending);
      } else {
        // If endpoint doesn't exist, try fetching all invitations and filter by group
        const allInvitationsResponse = await fetch(
          'https://app.stormbuddi.com/api/mobile/chat/invitations',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        
        if (allInvitationsResponse.ok) {
          const allData = await allInvitationsResponse.json();
          const allInvs = allData.invitations || allData.data || [];
          // Filter invitations for this group that are pending
          const groupPending = allInvs.filter(inv => {
            const invGroupId = inv.group_id || inv.group?.id;
            return invGroupId?.toString() === groupId?.toString() && 
                   !inv.accepted_at && 
                   !inv.accepted && 
                   inv.status !== 'accepted';
          });
          setPendingInvitations(groupPending);
        }
      }
    } catch (error) {
      // Don't show error to user, just log it
    }
  };

  // Resend invitation email to member
  const handleResendInvitation = async (memberEmail, memberName, memberData = null) => {
    if (!isGroup || !groupId) return;

    if (!memberEmail) {
      showError('Member email not found');
      return;
    }

    // Trim and validate email
    const trimmedEmail = memberEmail.trim();
    if (!trimmedEmail) {
      showError('Invalid email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showError('Please enter a valid email address');
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        showError('Authentication required');
        return;
      }

      // Get user_type from member data or use default
      const userType = memberData?.user_type || memberData?.userType || 'customer';

      const response = await fetch(
        `https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}/invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: trimmedEmail,
            user_type: userType,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        // Handle validation errors - show specific field errors
        if (errorData.errors && typeof errorData.errors === 'object') {
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          throw new Error(`Validation failed:\n${errorMessages}`);
        }
        
        throw new Error(errorData.message || 'Failed to send invitation email');
      }

      const data = await response.json();
      if (data.success) {
        showSuccess(`Invitation email sent to ${memberName}`);
      } else {
        throw new Error(data.message || 'Failed to send invitation email');
      }
    } catch (error) {
      showError('Failed to send invitation email. Please try again.');
    }
  };

  // Kick member from group
  const handleKickMember = async (memberId, memberName) => {
    if (!isGroup || !groupId) return;

    // Check if member is admin
    const member = groupMembers.find(m => (m.id || m.user_id)?.toString() === memberId?.toString());
    const memberRole = member?.user_type || member?.role;
    const memberRoleId = member?.role_id;
    
    if (memberRole === 'admin' || memberRoleId === 1) {
      showError('Cannot kick admin users');
      return;
    }

    Alert.alert(
      'Kick Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Kick',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) {
                showError('Authentication required');
                return;
              }

              // Try different possible endpoints
              const endpoints = [
                `https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}/members/${memberId}`,
                `https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}/kick`,
                `https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}/remove-member`,
              ];

              let success = false;
              for (const endpoint of endpoints) {
                try {
                  const response = await fetch(endpoint, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json',
                      'X-Requested-With': 'XMLHttpRequest',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ user_id: memberId }),
                  });

                  if (response.ok) {
                    success = true;
                    showSuccess(`${memberName} has been removed from the group`);
                    fetchGroupMembers(); // Refresh members list
                    break;
              }
            } catch (error) {
              // Try next endpoint
              continue;
            }
          }

          if (!success) {
            // Try POST method with remove/kick action
            const postEndpoints = [
              `https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}/remove`,
              `https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}/members/remove`,
            ];

            for (const endpoint of postEndpoints) {
              try {
                const response = await fetch(endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify({ user_id: memberId }),
                });

                if (response.ok) {
                  success = true;
                  showSuccess(`${memberName} has been removed from the group`);
                  fetchGroupMembers();
                  break;
                }
              } catch (error) {
                continue;
              }
            }
          }

          if (!success) {
            showError('Failed to remove member. Please check if the API endpoint exists.');
          }
        } catch (error) {
          showError('Failed to remove member. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Fetch chat participant name if not provided
  const fetchChatParticipantName = async () => {
    // Only fetch if we don't have a proper name yet
    if (displayName && displayName !== 'Chat' && displayName !== 'Group Chat') {
      return; // Already have a name
    }

    try {
      const token = await getToken();
      if (!token) {
        return;
      }

      if (isGroup && groupId) {
        // Fetch group details
        const response = await fetch(
          `https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const group = data.group || data.data || data;
          const groupName = group.name || group.group_name || 'Group Chat';
          setDisplayName(groupName);
          // Set group avatar if available
          if (group.avatar || group.group_avatar) {
            const avatarUrl = (group.avatar || group.group_avatar).startsWith('http')
              ? (group.avatar || group.group_avatar)
              : `https://app.stormbuddi.com/storage/${group.avatar || group.group_avatar}`;
            setDisplayAvatar(avatarUrl);
          }
        }
      } else if (memberId) {
        // Fetch user details from users endpoint
        const response = await fetch(
          'https://app.stormbuddi.com/api/mobile/chat/users',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const users = data.users || data.data || [];
          const user = users.find(u => (u.id?.toString() || u.user_id?.toString()) === memberId);
          
          if (user) {
            const fullName = user.firstname && user.lastname 
              ? `${user.firstname} ${user.lastname}`.trim()
              : user.firstname || user.lastname || user.username || user.email || 'Unknown User';
            setDisplayName(fullName);
            // Set user avatar if available
            if (user.avatar && user.avatar !== 'no_avatar.png') {
              const avatarUrl = user.avatar.startsWith('http')
                ? user.avatar
                : `https://app.stormbuddi.com/storage/${user.avatar}`;
              setDisplayAvatar(avatarUrl);
            }
          }
        }
      }
    } catch (error) {
      // Error fetching participant name
    }
  };

  // Fetch messages from API
  const fetchMessages = async () => {
    if (!chatId) {
      return;
    }

    startLoading();
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch current user ID if not already fetched
      if (!currentUserId) {
        const userId = await fetchCurrentUserId();
        if (userId) {
          setCurrentUserId(userId);
        }
      }

      // Use different endpoint for group chats
      const endpoint = isGroup 
        ? `https://app.stormbuddi.com/api/mobile/chat/groups/${chatId}/messages`
        : `https://app.stormbuddi.com/api/mobile/chat/messages/${chatId}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      const data = await response.json();
      
      // Try multiple possible response structures
      const messagesArray = data.messages || data.data || (Array.isArray(data) ? data : []);
      
      if (data.success && messagesArray && messagesArray.length > 0) {
        // Get current user ID for comparison
        const userId = currentUserId || await fetchCurrentUserId();
        if (userId) {
          setCurrentUserId(userId);
        }

        // Extract participant name from messages if not already set (for direct messages)
        if (!isGroup && (!displayName || displayName === 'Chat')) {
          // Find first message from the other person (not current user)
          const otherPersonMessage = messagesArray.find(message => {
            const messageSenderId = message.sender_id?.toString() || 
                            message.user_id?.toString() || 
                            message.from_user_id?.toString() ||
                            message.sender?.id?.toString();
            return userId && messageSenderId !== userId;
          });

          if (otherPersonMessage && otherPersonMessage.sender) {
            const sender = otherPersonMessage.sender;
            const fullName = sender.firstname && sender.lastname 
              ? `${sender.firstname} ${sender.lastname}`.trim()
              : sender.firstname || sender.lastname || sender.username || sender.email || null;
            if (fullName) {
              setDisplayName(fullName);
            }
            // Also set avatar if available
            if (sender.avatar && sender.avatar !== 'no_avatar.png') {
              const avatarUrl = sender.avatar.startsWith('http') 
                ? sender.avatar 
                : `https://app.stormbuddi.com/storage/${sender.avatar}`;
              setDisplayAvatar(avatarUrl);
            }
          }
        }

        // Map API response to expected format
        const mappedMessages = messagesArray.map((message, index) => {
          // Determine if message is from current user
          // Compare sender_id with current user ID
          const messageSenderId = message.sender_id?.toString() || 
                          message.user_id?.toString() || 
                          message.from_user_id?.toString() ||
                          message.sender?.id?.toString();
          const isCurrentUser = userId && messageSenderId === userId;

          // Determine message type and content based on backend structure
          const messageType = message.message_type || message.type || 'text';
          
          // Check if message has an attachment
          const hasAttachment = !!(message.attachment_path || message.attachment_name);
          
          // Determine if attachment is an image based on attachment_type or file extension
          const isImageAttachment = hasAttachment && (
            message.attachment_type?.startsWith('image/') ||
            /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(message.attachment_path || message.attachment_name || '')
          );
          
          // Determine if attachment is a document
          const isDocumentAttachment = hasAttachment && !isImageAttachment;
          
          // Get image URL from attachment_path
          let imageUrl = null;
          if (isImageAttachment && message.attachment_path) {
            // Construct full URL if it's a relative path
            if (message.attachment_path.startsWith('http')) {
              imageUrl = message.attachment_path;
            } else if (message.attachment_path.startsWith('/storage/') || message.attachment_path.startsWith('storage/')) {
              imageUrl = `https://app.stormbuddi.com/${message.attachment_path.replace(/^\/?storage\//, 'storage/')}`;
            } else {
              imageUrl = `https://app.stormbuddi.com/storage/${message.attachment_path}`;
            }
          }
          
          // Get document info
          let documentInfo = null;
          if (isDocumentAttachment && message.attachment_path) {
            let documentUrl = message.attachment_path;
            if (!documentUrl.startsWith('http')) {
              if (documentUrl.startsWith('/storage/') || documentUrl.startsWith('storage/')) {
                documentUrl = `https://app.stormbuddi.com/${documentUrl.replace(/^\/?storage\//, 'storage/')}`;
              } else {
                documentUrl = `https://app.stormbuddi.com/storage/${documentUrl}`;
              }
            }
            
            documentInfo = {
              uri: documentUrl,
              name: message.attachment_name || 'document',
              type: message.attachment_type || 'application/octet-stream',
              size: message.attachment_size || 0,
            };
          }
          
          // Get sender ID - for group chats, use sender_id from message, for individual chats use memberId
          const finalSenderId = isGroup 
            ? (isCurrentUser ? 'current-user' : message.sender_id?.toString() || 'unknown')
            : (isCurrentUser ? 'current-user' : memberId);
          
          // Extract sender name for group chats - check multiple possible fields
          let senderName = null;
          if (isGroup && !isCurrentUser) {
            const sender = message.sender || {};
            // Build full name from firstname and lastname (like in ChatList)
            if (sender.firstname || sender.lastname) {
              senderName = sender.firstname && sender.lastname 
                ? `${sender.firstname} ${sender.lastname}`.trim()
                : sender.firstname || sender.lastname || sender.username || sender.email || 'Unknown';
            } else if (sender.username) {
              senderName = sender.username;
            } else if (sender.name) {
              senderName = sender.name;
            } else if (message.sender_name) {
              senderName = message.sender_name;
            } else if (sender.email) {
              senderName = sender.email;
            } else {
              senderName = 'Unknown';
            }
          }
          
          const mappedMessage = {
            id: message.id?.toString() || message.message_id?.toString(),
            text: message.message || message.text || message.content || '',
            senderId: finalSenderId,
            senderName: senderName,
            timestamp: message.created_at || message.timestamp || message.sent_at || new Date().toISOString(),
            type: isImageAttachment ? 'image' : (isDocumentAttachment ? 'document' : messageType),
            image: imageUrl,
            document: documentInfo,
          };
          
          return mappedMessage;
        });

        // Sort messages by timestamp (oldest first) so newest appear at bottom
        const sortedMessages = mappedMessages.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB; // Ascending order (oldest first)
        });

        // Merge with existing messages to preserve optimistic messages that might have images
        // This prevents images from disappearing when API response doesn't include image URL immediately
        setMessages((prevMessages) => {
          // Create a map of existing messages by ID
          const existingMap = new Map();
          prevMessages.forEach(msg => {
            // Preserve optimistic messages (those with local file paths) that aren't in API response yet
            if (msg.image && msg.image.startsWith('file://')) {
              existingMap.set(msg.id, msg);
            }
          });
          
          // Merge API messages with existing optimistic messages
          const merged = [...sortedMessages];
          existingMap.forEach((msg, id) => {
            // Only keep optimistic message if API doesn't have a message with same timestamp (within 5 seconds)
            const hasSimilarMessage = sortedMessages.some(apiMsg => {
              const timeDiff = Math.abs(new Date(apiMsg.timestamp).getTime() - new Date(msg.timestamp).getTime());
              return timeDiff < 5000; // 5 seconds tolerance
            });
            if (!hasSimilarMessage) {
              merged.push(msg);
            }
          });
          
          // Re-sort after merge
          return merged.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
          });
        });
      } else {
        // If no messages, set empty array
        setMessages([]);
      }
    } catch (error) {
      setMessages([]);
    } finally {
      stopLoading();
    }
  };

  // Update display name and avatar when route params change
  useEffect(() => {
    if (memberName) {
      setDisplayName(memberName);
    }
    if (memberAvatar) {
      setDisplayAvatar(memberAvatar);
    }
  }, [memberName, memberAvatar]);

  // Fetch messages when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchChatParticipantName(); // Fetch name if missing
      fetchMessages();
      if (isGroup) {
        fetchGroupMembers(); // Fetch group members
      }
    }, [chatId, isGroup])
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderId: 'current-user',
      timestamp: new Date().toISOString(),
      type: 'text',
    };

        // Optimistically add message (it will be sorted correctly)
        setMessages((prev) => {
          const updated = [...prev, newMessage];
          // Sort by timestamp to ensure correct order (oldest first)
          return updated.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
          });
        });
        setInputText('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const requestBody = isGroup
        ? {
            group_id: groupId,
            message: inputText.trim(),
          }
        : {
            receiver_id: memberId,
            message: inputText.trim(),
          };

      // Use different endpoint for group chats
      const sendEndpoint = isGroup
        ? 'https://app.stormbuddi.com/api/mobile/chat/groups/send'
        : 'https://app.stormbuddi.com/api/mobile/chat/send';

      const response = await fetch(sendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        // Handle validation errors - show specific field errors
        if (errorData.errors && typeof errorData.errors === 'object') {
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          throw new Error(`Validation failed:\n${errorMessages}`);
        }
        
        throw new Error(errorData.message || 'Failed to send message');
      }

      const responseData = await response.json();
      
      // Refresh messages after sending to get the actual message from server
      await fetchMessages();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send message. Please try again.');
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const sendAttachment = async (fileUri, fileName, fileType, fileSize) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      if (isGroup) {
        formData.append('group_id', groupId);
      } else {
        formData.append('receiver_id', memberId);
      }
      formData.append('file', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      });

      const response = await fetch(
        'https://app.stormbuddi.com/api/mobile/chat/attachment',
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        // Handle validation errors - show specific field errors
        if (errorData.errors && typeof errorData.errors === 'object') {
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          throw new Error(`Validation failed:\n${errorMessages}`);
        }
        
        throw new Error(errorData.message || 'Failed to send attachment');
      }

      // Don't refresh immediately - let optimistic message stay
      // The message will be refreshed when screen is focused again
      // This prevents the image from disappearing if API response doesn't include image URL immediately
      // The optimistic message with local file path will remain visible
    } catch (error) {
      throw error;
    }
  };

  const handlePickImage = async () => {
    if (!ImageCropPicker) {
      Alert.alert('Error', 'Image picker is not available');
      return;
    }

    let newMessage = null;
    try {
      const image = await ImageCropPicker.openPicker({
        width: 2000,
        height: 2000,
        cropping: false,
        includeBase64: false,
        compressImageQuality: 0.8,
        androidPhotoPicker: true,
      });

      newMessage = {
        id: Date.now().toString(),
        image: image.path,
        senderId: 'current-user',
        timestamp: new Date().toISOString(),
        type: 'image',
      };

      // Optimistically add message
      setMessages((prev) => {
        const updated = [...prev, newMessage];
        return updated.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
      });

      // Upload and send attachment
      await sendAttachment(
        image.path,
        image.filename || `image_${Date.now()}.jpg`,
        image.mime || 'image/jpeg',
        image.size || 0
      );
    } catch (error) {
      if (error.message !== 'User cancelled image selection') {
        Alert.alert('Error', error.message || 'Failed to pick image. Please try again.');
        // Remove optimistic message on error
        if (newMessage) {
          setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
        }
      }
    }
  };

  const handleTakePhoto = async () => {
    if (!ImageCropPicker) {
      Alert.alert('Error', 'Camera is not available');
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    let newMessage = null;
    try {
      const image = await ImageCropPicker.openCamera({
        width: 2000,
        height: 2000,
        cropping: false,
        includeBase64: false,
        compressImageQuality: 0.8,
      });

      newMessage = {
        id: Date.now().toString(),
        image: image.path,
        senderId: 'current-user',
        timestamp: new Date().toISOString(),
        type: 'image',
      };

      // Optimistically add message
      setMessages((prev) => {
        const updated = [...prev, newMessage];
        return updated.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
      });

      // Upload and send attachment
      await sendAttachment(
        image.path,
        image.filename || `photo_${Date.now()}.jpg`,
        image.mime || 'image/jpeg',
        image.size || 0
      );
    } catch (error) {
      if (error.message !== 'User cancelled image selection') {
        Alert.alert('Error', error.message || 'Failed to take photo. Please try again.');
        // Remove optimistic message on error
        if (newMessage) {
          setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
        }
      }
    }
  };

  const handlePickDocument = async () => {
    if (!DocumentPicker) {
      Alert.alert('Error', 'Document picker is not available');
      return;
    }

    let newMessage = null;
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });

      const file = result[0];
      newMessage = {
        id: Date.now().toString(),
        document: {
          uri: file.uri,
          name: file.name,
          type: file.type,
          size: file.size,
        },
        senderId: 'current-user',
        timestamp: new Date().toISOString(),
        type: 'document',
      };

      // Optimistically add message
      setMessages((prev) => {
        const updated = [...prev, newMessage];
        return updated.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
      });

      // Upload and send attachment
      await sendAttachment(
        file.uri,
        file.name || `document_${Date.now()}`,
        file.type || 'application/octet-stream',
        file.size || 0
      );
    } catch (error) {
      if (error.name !== 'DocumentPickerCancel') {
        Alert.alert('Error', error.message || 'Failed to pick document. Please try again.');
        // Remove optimistic message on error
        if (newMessage) {
          setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
        }
      }
    }
  };

  const showAttachmentOptions = () => {
    setShowFileSourceModal(true);
  };

  const handleFileSourceSelect = (source) => {
    if (source === 'camera') {
      handleTakePhoto();
    } else if (source === 'gallery') {
      handlePickImage();
    } else if (source === 'document') {
      handlePickDocument();
    }
    setShowFileSourceModal(false);
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Handle image press - open full screen viewer
  const handleImagePress = (imageUri) => {
    setSelectedImage(imageUri);
    setImageViewerVisible(true);
  };

  // Handle document press - open document directly
  const handleDocumentPress = async (document) => {
    try {
      let fileUrl = document.uri;
      
      if (!fileUrl) {
        showError('Document URL not available');
        return;
      }

      // Construct full URL if it's a relative path
      if (fileUrl && !fileUrl.startsWith('http')) {
        fileUrl = `https://app.stormbuddi.com/${fileUrl}`;
      }

      // Try to open the document directly
      try {
        const canOpen = await Linking.canOpenURL(fileUrl);
        if (canOpen) {
          await Linking.openURL(fileUrl);
        } else {
          // Try opening anyway - some URLs might work even if canOpenURL returns false
          await Linking.openURL(fileUrl);
        }
      } catch (linkError) {
        showError('Unable to open document. Please check if you have an app installed to view this file type.');
      }
    } catch (error) {
      showError(`Unable to open document: ${error.message || 'Please try again.'}`);
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === 'current-user';
    const showSenderName = isGroup && !isCurrentUser && item.senderName;

    if (item.type === 'image') {
      return (
        <View
          style={[
            styles.messageContainer,
            isCurrentUser ? styles.messageRight : styles.messageLeft,
          ]}
        >
          {showSenderName && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <View
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
            ]}
          >
            <TouchableOpacity
              onPress={() => handleImagePress(item.image)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: item.image }} style={styles.messageImage} />
            </TouchableOpacity>
            <Text style={[styles.messageTime, isCurrentUser && styles.messageTimeRight]}>
              {formatMessageTime(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    if (item.type === 'document') {
      return (
        <View
          style={[
            styles.messageContainer,
            isCurrentUser ? styles.messageRight : styles.messageLeft,
          ]}
        >
          {showSenderName && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <View
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
            ]}
          >
            <TouchableOpacity
              onPress={() => handleDocumentPress(item.document)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.documentContainer,
                isCurrentUser && styles.documentContainerRight
              ]}>
                <Icon 
                  name="description" 
                  size={32} 
                  color={isCurrentUser ? colors.textOnPrimary : colors.primary} 
                />
                <View style={styles.documentInfo}>
                  <Text style={[
                    styles.documentName,
                    isCurrentUser && styles.documentNameRight
                  ]} numberOfLines={1}>
                    {item.document.name}
                  </Text>
                  <Text style={[
                    styles.documentSize,
                    isCurrentUser && styles.documentSizeRight
                  ]}>
                    {(item.document.size / 1024).toFixed(2)} KB
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={[styles.messageTime, isCurrentUser && styles.messageTimeRight]}>
              {formatMessageTime(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.messageRight : styles.messageLeft,
        ]}
      >
        {showSenderName && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.messageTextRight : styles.messageTextLeft,
            ]}
          >
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isCurrentUser && styles.messageTimeRight]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.headerBackground} />

      <PageLoader visible={shouldShowLoader} message="Loading messages..." />

      {/* Custom Chat Header */}
      <View style={[styles.chatHeader, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerUserInfo}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.headerUserName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>

        {/* Group Action Buttons */}
        {isGroup && (
          <View style={styles.groupActionsContainer}>
            <TouchableOpacity 
              style={styles.groupActionButton} 
              onPress={() => {
                fetchGroupMembers();
                setInviteModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Icon name="person-add" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.groupActionButton} 
              onPress={() => {
                fetchGroupMembers();
                setMembersModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Icon name="group" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) =>
          `msg-${String(item.id ?? 'local')}-${index}`
        }
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }}
        onLayout={() => {
          if (flatListRef.current && messages.length > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachmentButton}
          onPress={showAttachmentOptions}
          activeOpacity={0.7}
        >
          <Icon name="attach-file" size={24} color={colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={colors.textLight}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
          activeOpacity={0.7}
        >
          <Icon
            name="send"
            size={24}
            color={inputText.trim() ? colors.textOnPrimary : colors.textLight}
          />
        </TouchableOpacity>
      </View>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
          
          {/* Header */}
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.imageViewerCloseButton}
              onPress={() => setImageViewerVisible(false)}
            >
              <Icon name="close" size={28} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>

          {/* Image Container */}
          <ScrollView
            contentContainerStyle={styles.imageViewerContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Group Members Modal */}
      {isGroup && (
        <Modal
          visible={membersModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setMembersModalVisible(false)}
        >
          <View style={styles.membersModalOverlay}>
            <View style={styles.membersModalContainer}>
              <View style={styles.membersModalHeader}>
                <Text style={styles.membersModalTitle}>Group Members</Text>
                <TouchableOpacity
                  style={styles.membersModalCloseButton}
                  onPress={() => setMembersModalVisible(false)}
                >
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.membersModalContent}>
                {groupMembers.length === 0 && pendingInvitations.length === 0 ? (
                  <View style={styles.membersEmptyContainer}>
                    <Text style={styles.membersEmptyText}>No members found</Text>
                  </View>
                ) : (
                  <>
                    {/* Active Members */}
                    {groupMembers.map((member) => {
                    const memberId = (member.id || member.user_id)?.toString();
                    const memberRole = member.user_type || member.role;
                    const memberRoleId = member.role_id;
                    const isAdmin = memberRole === 'admin' || memberRoleId === 1;
                    const isCurrentUser = memberId === currentUserId?.toString();
                    
                    const memberName = member.firstname && member.lastname
                      ? `${member.firstname} ${member.lastname}`.trim()
                      : member.firstname || member.lastname || member.username || member.email || 'Unknown';
                    
                    const memberAvatar = member.avatar && member.avatar !== 'no_avatar.png'
                      ? (member.avatar.startsWith('http')
                          ? member.avatar
                          : `https://app.stormbuddi.com/storage/${member.avatar}`)
                      : null;

                    return (
                      <View key={memberId} style={styles.memberItem}>
                        <View style={styles.memberItemLeft}>
                          {memberAvatar ? (
                            <Image source={{ uri: memberAvatar }} style={styles.memberAvatar} />
                          ) : (
                            <View style={styles.memberAvatarPlaceholder}>
                              <Text style={styles.memberAvatarText}>
                                {memberName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.memberInfo}>
                            <Text style={styles.memberName}>{memberName}</Text>
                            {isAdmin && (
                              <Text style={styles.memberRole}>Admin</Text>
                            )}
                            {isCurrentUser && (
                              <Text style={styles.memberRole}>You</Text>
                            )}
                          </View>
                        </View>
                        {!isAdmin && !isCurrentUser && (
                          <View style={styles.memberActions}>
                            {member.email && (
                              <TouchableOpacity
                                style={styles.sendEmailButton}
                                onPress={() => handleResendInvitation(member.email, memberName, member)}
                                activeOpacity={0.7}
                              >
                                <Icon name="email" size={20} color={colors.primary || '#007AFF'} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.kickButton}
                              onPress={() => handleKickMember(memberId, memberName)}
                              activeOpacity={0.7}
                            >
                              <Icon name="person-remove" size={20} color={colors.error || '#F44336'} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                    
                    {/* Pending Invitations */}
                    {pendingInvitations.length > 0 && (
                      <>
                        <View style={styles.sectionDivider}>
                          <View style={styles.dividerLine} />
                          <Text style={styles.sectionTitle}>Pending Invitations</Text>
                          <View style={styles.dividerLine} />
                        </View>
                        {pendingInvitations.map((invitation) => {
                          const invitationId = invitation.id || invitation.invitation_id;
                          const inviteeEmail = invitation.email || invitation.invitee_email || invitation.user?.email;
                          const inviteeName = invitation.user?.firstname && invitation.user?.lastname
                            ? `${invitation.user.firstname} ${invitation.user.lastname}`.trim()
                            : invitation.user?.firstname || invitation.user?.lastname || invitation.user?.username || inviteeEmail || 'Unknown';
                          
                          const inviteeAvatar = invitation.user?.avatar && invitation.user.avatar !== 'no_avatar.png'
                            ? (invitation.user.avatar.startsWith('http')
                                ? invitation.user.avatar
                                : `https://app.stormbuddi.com/storage/${invitation.user.avatar}`)
                            : null;

                          return (
                            <View key={invitationId} style={styles.memberItem}>
                              <View style={styles.memberItemLeft}>
                                {inviteeAvatar ? (
                                  <Image source={{ uri: inviteeAvatar }} style={styles.memberAvatar} />
                                ) : (
                                  <View style={styles.memberAvatarPlaceholder}>
                                    <Text style={styles.memberAvatarText}>
                                      {inviteeName.charAt(0).toUpperCase()}
                                    </Text>
                                  </View>
                                )}
                                <View style={styles.memberInfo}>
                                  <Text style={styles.memberName}>{inviteeName}</Text>
                                  <Text style={styles.pendingStatus}>Pending Invitation</Text>
                                  {inviteeEmail && (
                                    <Text style={styles.memberEmail}>{inviteeEmail}</Text>
                                  )}
                                </View>
                              </View>
                              {inviteeEmail && (
                                <View style={styles.memberActions}>
                                  <TouchableOpacity
                                    style={styles.sendEmailButton}
                                    onPress={() => handleResendInvitation(inviteeEmail, inviteeName, invitation.user || invitation)}
                                    activeOpacity={0.7}
                                  >
                                    <Icon name="email" size={20} color={colors.primary || '#007AFF'} />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Invite Members Modal */}
      {isGroup && (
        <InviteMembersModal
          visible={inviteModalVisible}
          onClose={() => setInviteModalVisible(false)}
          groupId={groupId}
          existingMembers={groupMembers}
          onMembersAdded={() => {
            fetchGroupMembers();
            showSuccess('Members invited successfully!');
          }}
        />
      )}

      {/* File Source Modal */}
      <FileSourceModal
        visible={showFileSourceModal}
        onClose={() => setShowFileSourceModal(false)}
        onSelectSource={handleFileSourceSelect}
        title="Select File Source"
        subtitle="How would you like to add a file?"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.headerBackground,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: colors.border,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  headerUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'column',
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginLeft: 0,
    paddingLeft: 4,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    padding: 12,
    borderRadius: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageBubbleLeft: {
    backgroundColor: colors.cardBackground,
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: colors.text,
  },
  messageTextRight: {
    color: colors.textOnPrimary,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    color: colors.textSecondary,
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageImage: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 12,
    marginBottom: 4,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  documentContainerRight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  documentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  documentNameRight: {
    color: colors.textOnPrimary,
  },
  documentSize: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  documentSizeRight: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.borderLight,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
  },
  imageViewerCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  fullScreenImage: {
    width: width,
    height: height * 0.8,
  },
  groupActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  groupActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  membersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  membersModalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  membersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  membersModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  membersModalCloseButton: {
    padding: 4,
  },
  membersModalContent: {
    padding: 20,
  },
  membersEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  membersEmptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.inputBackground,
  },
  memberItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  memberEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pendingStatus: {
    fontSize: 12,
    color: colors.warning || '#FF9800',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    marginTop: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginHorizontal: 12,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendEmailButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
  },
  kickButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.error + '20' || '#F4433620',
  },
});

export default ChatDetail;

