import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';
import { getToken } from '../utils/tokenStorage';
import { useToast } from '../contexts/ToastContext';

const ChatInvitationsModal = ({ visible, onClose, onInvitationUpdated, navigation }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const { showSuccess, showError } = useToast();
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      fetchInvitations();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/chat/invitations', {
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
        const invs = data.invitations || data.data || [];
        setInvitations(invs);
      } else {
        throw new Error('Failed to fetch invitations');
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      showError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    setProcessingId(invitationId);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `https://app.stormbuddi.com/api/mobile/chat/invitations/${invitationId}/accept`,
        {
          method: 'POST',
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
        showSuccess('Invitation accepted!');
        
        // Remove accepted invitation from list
        setInvitations(invitations.filter(inv => inv.id !== invitationId));
        
        // Navigate to group chat if group_id is available
        const groupId = data.group_id || data.group?.id;
        if (groupId && navigation) {
          const groupName = data.group?.name || data.group_name || 'Group Chat';
          navigation.navigate('ChatDetail', {
            groupId: groupId.toString(),
            isGroup: true,
            memberName: groupName,
          });
        }
        
        onInvitationUpdated?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showError(error.message || 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    setProcessingId(invitationId);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `https://app.stormbuddi.com/api/mobile/chat/invitations/${invitationId}/decline`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        showSuccess('Invitation declined');
        
        // Remove declined invitation from list
        setInvitations(invitations.filter(inv => inv.id !== invitationId));
        onInvitationUpdated?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      showError(error.message || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const getGroupName = (invitation) => {
    return invitation.group?.name || invitation.group_name || 'Group Chat';
  };

  const getGroupAvatar = (invitation) => {
    const avatar = invitation.group?.avatar || invitation.group_avatar;
    if (avatar && avatar !== 'no_avatar.png') {
      if (avatar.startsWith('http')) {
        return avatar;
      }
      return `https://app.stormbuddi.com/storage/${avatar}`;
    }
    return null;
  };

  const getInviterName = (invitation) => {
    const inviter = invitation.inviter || invitation.sender || invitation.user;
    if (inviter) {
      if (inviter.firstname || inviter.lastname) {
        return `${inviter.firstname || ''} ${inviter.lastname || ''}`.trim();
      }
      return inviter.username || inviter.email || inviter.name || 'Someone';
    }
    return 'Someone';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
        onStartShouldSetResponder={() => true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Group Invitations</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading invitations...</Text>
          </View>
        ) : invitations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No invitations</Text>
            <Text style={styles.emptySubtext}>You don't have any pending group invitations</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {invitations.map((invitation) => {
              const invitationId = invitation.id || invitation.invitation_id;
              const isProcessing = processingId === invitationId;
              const groupAvatar = getGroupAvatar(invitation);

              return (
                <View key={invitationId} style={styles.invitationCard}>
                  <View style={styles.invitationHeader}>
                    {groupAvatar ? (
                      <Image source={{ uri: groupAvatar }} style={styles.groupAvatar} />
                    ) : (
                      <View style={styles.groupAvatarPlaceholder}>
                        <Icon name="group" size={24} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.invitationInfo}>
                      <Text style={styles.groupName}>{getGroupName(invitation)}</Text>
                      <Text style={styles.inviterText}>
                        Invited by {getInviterName(invitation)}
                      </Text>
                      <Text style={styles.dateText}>{formatDate(invitation.created_at || invitation.createdAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.invitationActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleDecline(invitationId)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                      ) : (
                        <>
                          <Icon name="close" size={18} color={colors.textSecondary} />
                          <Text style={styles.declineButtonText}>Decline</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAccept(invitationId)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Icon name="check" size={18} color="#fff" />
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '90%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  invitationCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invitationHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  groupAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  inviterText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  declineButton: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ChatInvitationsModal;

