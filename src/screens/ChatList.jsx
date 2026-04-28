import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { getToken } from '../utils/tokenStorage';
import PageLoader from '../components/PageLoader';
import usePageLoader from '../hooks/usePageLoader';
import CreateGroupChatModal from '../components/CreateGroupChatModal';
import ChatInvitationsModal from '../components/ChatInvitationsModal';

const { width } = Dimensions.get('window');

const ChatList = ({ navigation }) => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'users', 'groups'
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [invitationsCount, setInvitationsCount] = useState(0);
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(true);

  // Fetch invitations count
  const fetchInvitationsCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;

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
        setInvitationsCount(invs.length);
      }
    } catch (error) {
      // Error fetching invitations count
    }
  };

  // Fetch chat users and groups from API
  const fetchChatMembers = async () => {
    startLoading();
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch users, groups, and invitations count in parallel
      const [usersResponse, groupsResponse] = await Promise.all([
        fetch('https://app.stormbuddi.com/api/mobile/chat/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch('https://app.stormbuddi.com/api/mobile/chat/groups', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
        }),
      ]);

      if (!usersResponse.ok) {
        const errorText = await usersResponse.text();
        throw new Error(`Failed to fetch chat users: ${usersResponse.status} - ${errorText}`);
      }

      const usersData = await usersResponse.json();
      const users = usersData.users || usersData.data || [];
      
      // Groups response might fail if no groups exist, so handle gracefully
      let groups = [];
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        groups = groupsData.groups || groupsData.data || [];
      }
      
      // Map individual users
      const mappedUsers = users.map((user) => {
        // Format last message time
        let lastMessageTime = 'No messages';
        if (user.last_message_time || user.last_message_at) {
          const date = new Date(user.last_message_time || user.last_message_at);
          const now = new Date();
          const diff = now - date;
          const minutes = Math.floor(diff / 60000);
          const hours = Math.floor(diff / 3600000);
          const days = Math.floor(diff / 86400000);

          if (minutes < 1) lastMessageTime = 'Just now';
          else if (minutes < 60) lastMessageTime = `${minutes}m ago`;
          else if (hours < 24) lastMessageTime = `${hours}h ago`;
          else if (days === 1) lastMessageTime = 'Yesterday';
          else if (days < 7) lastMessageTime = `${days}d ago`;
          else {
            lastMessageTime = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          }
        }

        // Build full name from firstname and lastname
        const fullName = user.firstname && user.lastname 
          ? `${user.firstname} ${user.lastname}`.trim()
          : user.firstname || user.lastname || user.username || user.email || 'Unknown User';

        // Determine if last message is an image or document
        const lastMessageType = user.last_message_type || user.message_type;
        const hasAttachment = !!(user.last_message_attachment_path || user.attachment_path || user.last_message_attachment_name);
        const attachmentType = user.last_message_attachment_type || user.attachment_type;
        const attachmentPath = user.last_message_attachment_path || user.attachment_path || '';
        const attachmentName = user.last_message_attachment_name || user.attachment_name || '';
        
        let lastMessageDisplay = user.last_message || '';
        let lastMessageIcon = null;
        
        // Check if it's an image attachment
        // Backend sets last_message_type to 'image' or 'document', so check that first
        const isImage = lastMessageType === 'image' || (
          hasAttachment && (
            attachmentType?.startsWith('image/') ||
            /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(attachmentPath || attachmentName)
          )
        );
        
        // Check if it's a document attachment
        const isDocument = lastMessageType === 'document' || (hasAttachment && !isImage);
        
        if (isImage) {
          lastMessageDisplay = 'Image';
          lastMessageIcon = 'image';
        } else if (isDocument) {
          lastMessageDisplay = 'Document';
          lastMessageIcon = 'description';
        }

        const rawId = user.id?.toString() || user.user_id?.toString();
        return {
          id: rawId,
          name: fullName,
          avatar: user.avatar && user.avatar !== 'no_avatar.png' 
            ? (user.avatar.startsWith('http') ? user.avatar : `https://app.stormbuddi.com/storage/${user.avatar}`)
            : null,
          lastMessage: lastMessageDisplay,
          lastMessageIcon: lastMessageIcon,
          lastMessageTime: lastMessageTime,
          unreadCount: user.unread_count || user.unread_messages || 0,
          isOnline: user.is_online || user.online || false,
          isGroup: false,
        };
      });

      // Map group chats
      const mappedGroups = groups.map((group) => {
        // Format last message time
        let lastMessageTime = 'No messages';
        if (group.last_message_time || group.last_message_at) {
          const date = new Date(group.last_message_time || group.last_message_at);
          const now = new Date();
          const diff = now - date;
          const minutes = Math.floor(diff / 60000);
          const hours = Math.floor(diff / 3600000);
          const days = Math.floor(diff / 86400000);

          if (minutes < 1) lastMessageTime = 'Just now';
          else if (minutes < 60) lastMessageTime = `${minutes}m ago`;
          else if (hours < 24) lastMessageTime = `${hours}h ago`;
          else if (days === 1) lastMessageTime = 'Yesterday';
          else if (days < 7) lastMessageTime = `${days}d ago`;
          else {
            lastMessageTime = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          }
        }

        // Determine if last message is an image or document
        const groupLastMessageType = group.last_message_type || group.message_type;
        const groupHasAttachment = !!(group.last_message_attachment_path || group.attachment_path || group.last_message_attachment_name);
        const groupAttachmentType = group.last_message_attachment_type || group.attachment_type;
        const groupAttachmentPath = group.last_message_attachment_path || group.attachment_path || '';
        const groupAttachmentName = group.last_message_attachment_name || group.attachment_name || '';
        
        let groupLastMessageDisplay = group.last_message || '';
        let groupLastMessageIcon = null;
        
        // Check if it's an image attachment
        // Backend sets last_message_type to 'image' or 'document', so check that first
        const groupIsImage = groupLastMessageType === 'image' || (
          groupHasAttachment && (
            groupAttachmentType?.startsWith('image/') ||
            /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(groupAttachmentPath || groupAttachmentName)
          )
        );
        
        // Check if it's a document attachment
        const groupIsDocument = groupLastMessageType === 'document' || (groupHasAttachment && !groupIsImage);
        
        if (groupIsImage) {
          groupLastMessageDisplay = 'Image';
          groupLastMessageIcon = 'image';
        } else if (groupIsDocument) {
          groupLastMessageDisplay = 'Document';
          groupLastMessageIcon = 'description';
        }

        const groupRawId = group.id?.toString() || group.group_id?.toString();
        return {
          id: groupRawId,
          name: group.name || group.group_name || 'Group Chat',
          avatar: group.avatar || group.group_avatar || null,
          lastMessage: groupLastMessageDisplay,
          lastMessageIcon: groupLastMessageIcon,
          lastMessageTime: lastMessageTime,
          unreadCount: group.unread_count || group.unread_messages || 0,
          isOnline: false, // Groups don't have online status
          isGroup: true,
          memberCount: group.member_count || group.members_count || 0,
        };
      });

      // Combine users and groups, sort by last message time
      // Store original timestamp for sorting
      const allChats = [...mappedUsers, ...mappedGroups].map((chat) => {
        let timestamp = null;
        if (chat.isGroup) {
          const group = groups.find(g => (g.id?.toString() || g.group_id?.toString()) === chat.id);
          timestamp = group?.last_message_time || group?.last_message_at;
        } else {
          const user = users.find(u => (u.id?.toString() || u.user_id?.toString()) === chat.id);
          timestamp = user?.last_message_time || user?.last_message_at;
        }
        return { ...chat, _sortTimestamp: timestamp };
      }).sort((a, b) => {
        const timeA = a._sortTimestamp ? new Date(a._sortTimestamp).getTime() : 0;
        const timeB = b._sortTimestamp ? new Date(b._sortTimestamp).getTime() : 0;
        return timeB - timeA; // Most recent first
      }).map(({ _sortTimestamp, ...chat }) => chat); // Remove temporary sort field

      const seenKeys = new Set();
      const uniqueChats = allChats.filter((chat) => {
        const key = `${chat.isGroup ? 'group' : 'user'}-${chat.id ?? ''}`;
        if (seenKeys.has(key)) {
          return false;
        }
        seenKeys.add(key);
        return true;
      });

      setMembers(uniqueChats);
      setFilteredMembers(uniqueChats);
      
      // Fetch invitations count
      fetchInvitationsCount();
    } catch (error) {
      // Set empty arrays on error
      setMembers([]);
      setFilteredMembers([]);
    } finally {
      stopLoading();
    }
  };

  // Filter members based on search query and active tab
  useEffect(() => {
    let filtered = members;

    // Filter by tab (all, users, groups)
    if (activeTab === 'users') {
      filtered = filtered.filter((member) => !member.isGroup);
    } else if (activeTab === 'groups') {
      filtered = filtered.filter((member) => member.isGroup);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredMembers(filtered);
  }, [searchQuery, members, activeTab]);

  // Fetch members when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchChatMembers();
      fetchInvitationsCount();
    }, [])
  );

  const handleGroupCreated = () => {
    fetchChatMembers();
    fetchInvitationsCount();
  };

  const handleInvitationUpdated = () => {
    fetchChatMembers();
    fetchInvitationsCount();
  };

  const handleMemberPress = (member) => {
    if (member.isGroup) {
      navigation.navigate('ChatDetail', {
        groupId: member.id,
        memberName: member.name,
        memberAvatar: member.avatar,
        isGroup: true,
      });
    } else {
      navigation.navigate('ChatDetail', {
        memberId: member.id,
        memberName: member.name,
        memberAvatar: member.avatar,
        isGroup: false,
      });
    }
  };

  const formatTime = (timeString) => {
    // Simple time formatting - can be enhanced
    return timeString;
  };

  const renderMemberItem = ({ item }) => {
    const initials = item.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.memberItem}
        onPress={() => handleMemberPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, item.isGroup && styles.groupAvatarPlaceholder]}>
              {item.isGroup ? (
                <Icon name="group" size={24} color={colors.primary} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
          )}
          {!item.isGroup && item.isOnline && <View style={styles.onlineIndicator} />}
          {item.isGroup && (
            <View style={styles.groupBadge}>
              <Icon name="group" size={12} color={colors.textOnPrimary} />
            </View>
          )}
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberHeader}>
            <View style={styles.nameContainer}>
              <Text style={styles.memberName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isGroup && item.memberCount > 0 && (
                <Text style={styles.memberCount}>{item.memberCount} members</Text>
              )}
            </View>
            <Text style={styles.memberTime}>{formatTime(item.lastMessageTime)}</Text>
          </View>
          <View style={styles.memberFooter}>
            <View style={styles.lastMessageContainer}>
              {item.lastMessageIcon && (
                <Icon 
                  name={item.lastMessageIcon} 
                  size={16} 
                  color={colors.textSecondary} 
                  style={styles.lastMessageIcon}
                />
              )}
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.headerBackground} />
      
      <PageLoader visible={shouldShowLoader} message="Loading chats..." />

      <Header title="Messages" showBack={false} showNotification={true} />

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowInvitationsModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.actionButtonContent}>
            <Icon name="mail" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Invitations</Text>
            {invitationsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{invitationsCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.createGroupButton]}
          onPress={() => setShowCreateGroupModal(true)}
          activeOpacity={0.7}
        >
          <Icon name="add" size={20} color="#fff" />
          <Text style={styles.createGroupButtonText}>Create Group</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.7}
        >
          <Icon 
            name="person" 
            size={18} 
            color={activeTab === 'users' ? colors.primary : colors.textSecondary}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
          activeOpacity={0.7}
        >
          <Icon 
            name="group" 
            size={18} 
            color={activeTab === 'groups' ? colors.primary : colors.textSecondary}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Icon name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Members List */}
      {filteredMembers.length > 0 ? (
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberItem}
          keyExtractor={(item, index) =>
            `${item.isGroup ? 'group' : 'user'}-${
              item.id != null && item.id !== '' ? String(item.id) : `idx-${index}`
            }`
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="chat-bubble-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>
            {searchQuery 
              ? 'No chats found' 
              : activeTab === 'users' 
                ? 'No user chats yet'
                : activeTab === 'groups'
                  ? 'No group chats yet'
                  : 'No chats yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? 'Try a different search term'
              : activeTab === 'users'
                ? 'Start a conversation with a team member'
                : activeTab === 'groups'
                  ? 'Join or create a group chat'
                  : 'Start a conversation with a team member'}
          </Text>
        </View>
      )}

      {/* Modals */}
      <CreateGroupChatModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
        navigation={navigation}
      />
      <ChatInvitationsModal
        visible={showInvitationsModal}
        onClose={() => setShowInvitationsModal(false)}
        onInvitationUpdated={handleInvitationUpdated}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  createGroupButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  createGroupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  badge: {
    backgroundColor: colors.error || '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.primaryBackground,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.border,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  memberCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  groupAvatarPlaceholder: {
    backgroundColor: colors.primaryBackground,
  },
  groupBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  memberTime: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  memberFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  lastMessageIcon: {
    marginRight: 6,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ChatList;

