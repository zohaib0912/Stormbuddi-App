import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';
import { getToken } from '../utils/tokenStorage';
import { useToast } from '../contexts/ToastContext';

const CreateGroupChatModal = ({ visible, onClose, onGroupCreated, navigation }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { showSuccess, showError, showInfo } = useToast();
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      fetchAvailableUsers();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Reset form when closing
      setGroupName('');
      setSelectedUsers([]);
      setSearchQuery('');
    }
  }, [visible]);

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/chat/users', {
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
        const users = data.users || data.data || [];
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleUserSelection = (user) => {
    const userId = user.id?.toString() || user.user_id?.toString();
    const isSelected = selectedUsers.some(u => (u.id?.toString() || u.user_id?.toString()) === userId);
    
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => (u.id?.toString() || u.user_id?.toString()) !== userId));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showError('Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get user IDs - ensure they're integers
      const userIds = selectedUsers
        .map(user => {
          const id = user.id || user.user_id || user.userId;
          return id != null ? parseInt(id) : null;
        })
        .filter(id => id != null && !isNaN(id));

      // Validate userIds directly (what we're actually sending to backend)
      if (!userIds || userIds.length === 0) {
        showError('Please add at least one member or invite at least one person by email');
        setLoading(false);
        return;
      }

      

      // Try sending members as array of user IDs
      // Backend error says "add at least one member" - so try "members" field
      const requestBody = {
        name: groupName.trim(),
        members: userIds, // Try "members" field as the error message suggests
      };

      

      const createResponse = await fetch('https://app.stormbuddi.com/api/mobile/chat/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create group');
      }

      const groupData = await createResponse.json();
      const groupId = groupData.group?.id || groupData.id || groupData.data?.id;

      if (!groupId) {
        throw new Error('Group ID not returned from server');
      }

      // If backend doesn't auto-add members, invite them separately
      // Try inviting users if they weren't added during creation
      // This is a fallback - most backends will add members during creation
      try {
        const invitePromises = userIds.map(userId =>
          fetch(`https://app.stormbuddi.com/api/mobile/chat/groups/${groupId}/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              user_id: userId,
            }),
          })
        );

        await Promise.all(invitePromises);
      } catch (inviteError) {
        // If invite fails, it's okay - members might already be added during creation
        
      }

      showSuccess('Group created successfully!');
      onGroupCreated?.();
      handleClose();
      
      // Navigate to the new group chat
      if (navigation) {
        navigation.navigate('ChatDetail', {
          groupId: groupId.toString(),
          isGroup: true,
          memberName: groupName.trim(),
        });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      showError(error.message || 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedUsers([]);
    setSearchQuery('');
    onClose();
  };

  const filteredUsers = availableUsers.filter(user => {
    const name = `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || user.email || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getUserName = (user) => {
    if (user.firstname || user.lastname) {
      return `${user.firstname || ''} ${user.lastname || ''}`.trim();
    }
    return user.username || user.email || 'Unknown';
  };

  const getUserAvatar = (user) => {
    if (user.avatar && user.avatar !== 'no_avatar.png') {
      if (user.avatar.startsWith('http')) {
        return user.avatar;
      }
      return `https://app.stormbuddi.com/storage/${user.avatar}`;
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
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
            <Text style={styles.title}>Create Group Chat</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Group Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Group Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter group name"
                placeholderTextColor={colors.textSecondary}
                value={groupName}
                onChangeText={setGroupName}
                maxLength={50}
              />
            </View>

            {/* Search Users */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Members ({selectedUsers.length} selected)</Text>
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <View style={styles.selectedContainer}>
                <Text style={styles.sectionTitle}>Selected Members</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.selectedUsersList}>
                    {selectedUsers.map((user) => {
                      const userId = user.id?.toString() || user.user_id?.toString();
                      const avatar = getUserAvatar(user);
                      return (
                        <TouchableOpacity
                          key={userId}
                          style={styles.selectedUserChip}
                          onPress={() => toggleUserSelection(user)}
                        >
                          {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.chipAvatar} />
                          ) : (
                            <View style={styles.chipAvatarPlaceholder}>
                              <Icon name="person" size={16} color={colors.textSecondary} />
                            </View>
                          )}
                          <Text style={styles.chipName} numberOfLines={1}>
                            {getUserName(user)}
                          </Text>
                          <Icon name="close" size={16} color={colors.textSecondary} style={styles.chipClose} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Available Users List */}
            <View style={styles.usersContainer}>
              <Text style={styles.sectionTitle}>Available Users</Text>
              {loadingUsers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              ) : filteredUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : (
                filteredUsers.map((user) => {
                  const userId = user.id?.toString() || user.user_id?.toString();
                  const isSelected = selectedUsers.some(u => (u.id?.toString() || u.user_id?.toString()) === userId);
                  const avatar = getUserAvatar(user);
                  return (
                    <TouchableOpacity
                      key={userId}
                      style={[styles.userItem, isSelected && styles.userItemSelected]}
                      onPress={() => toggleUserSelection(user)}
                    >
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Icon name="person" size={24} color={colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{getUserName(user)}</Text>
                        {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
                      </View>
                      {isSelected && (
                        <View style={styles.checkIcon}>
                          <Icon name="check-circle" size={24} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleCreateGroup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  selectedContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  selectedUsersList: {
    flexDirection: 'row',
    gap: 8,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  chipAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  chipName: {
    fontSize: 12,
    color: colors.text,
    marginRight: 4,
    maxWidth: 80,
  },
  chipClose: {
    marginLeft: 4,
  },
  usersContainer: {
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.inputBackground,
  },
  userItemSelected: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  checkIcon: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.inputBackground,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default CreateGroupChatModal;

