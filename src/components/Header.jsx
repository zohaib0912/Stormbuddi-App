import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../utils/tokenStorage';
import { subscribe } from '../utils/eventBus';
import { getUserProfile, updateUserProfile } from '../utils/userProfileStorage';
import { colors } from '../theme/colors';

const Header = ({ 
  title, 
  onMenuPress, 
  onNotificationPress, 
  onBackPress,
  showNotification = true,
  showMenu = true,
  showBack = false,
  userName: userNameProp,
  userAvatar: userAvatarProp,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState(userNameProp || '');
  const [userAvatar, setUserAvatar] = useState(userAvatarProp || '');

  useEffect(() => {
    if (userNameProp) setUserName(userNameProp);
    if (userAvatarProp) setUserAvatar(userAvatarProp);
  }, [userNameProp, userAvatarProp]);

  useEffect(() => {
    // Listen for profile updates to refresh header info
    const unsubscribe = subscribe('profile:updated', (payload) => {
      if (payload?.name) setUserName(payload.name);
      if (payload?.avatarUrl) setUserAvatar(payload.avatarUrl);
    });

    // Fetch only if not provided via props
    if (userNameProp && userAvatarProp) return;
    let cancelled = false;
    (async () => {
      try {
        // Init from local storage immediately for snappy UI
        const cached = await getUserProfile();
        if (cached && !cancelled) {
          if (cached.name) setUserName(cached.name);
          if (cached.avatarUrl) setUserAvatar(cached.avatarUrl);
        }
        const token = await getToken();
        if (!token) return;
        // Try users endpoint first, then fallback to profile
        const endpoints = [
          'https://app.stormbuddi.com/api/mobile/user',
          'https://app.stormbuddi.com/api/mobile/profile',
        ];
        let fetched = null;
        for (let i = 0; i < endpoints.length; i++) {
          try {
            const res = await fetch(endpoints[i], {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Authorization': `Bearer ${token}`,
              },
            });
            if (!res.ok) continue;
            const json = await res.json();
            fetched = json;
            break;
          } catch (_) {
            // continue to next endpoint
          }
        }
        if (!fetched) return;
        // Common shapes: {data: {...}}, {user: {...}}, {...}
        const root = fetched?.data || fetched?.user || fetched || {};
        const name = root?.name || root?.username || '';
        const avatar = root?.avatar_url || root?.avatar || root?.profile_photo_url || '';
        if (!cancelled) {
          if (name) setUserName(name);
          if (avatar) setUserAvatar(avatar);
          // Only update stored fields we actually received (avoid overwriting with empty)
          const partial = {};
          if (name) partial.name = name;
          if (avatar) partial.avatarUrl = avatar;
          if (partial.name || partial.avatarUrl) {
            try { await updateUserProfile(partial); } catch (_) {}
          }
        }
      } catch (e) {
        console.warn('Header: failed to fetch profile for header info', e);
      }
    })();
    return () => { cancelled = true; unsubscribe && unsubscribe(); };
  }, [userNameProp, userAvatarProp]);

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else {
      // Default behavior: open drawer
      navigation.openDrawer();
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      // Default behavior: go back
      navigation.goBack();
    }
  };
  return (
    <View style={[styles.navigationBar, { paddingTop: insets.top + 12 }]}>
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : showMenu ? (
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Icon name="menu" size={24} color="#333" />
          </TouchableOpacity>
        ) : null}
        
        {userName ? (
          <View style={styles.userInfo}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {userName?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
          </View>
        ) : null}
        
        {/* <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>LOREM</Text>
          </View>
          <Text style={styles.appName}>Maddock</Text>
        </View> */}
      </View>
      
      <View style={styles.rightSection}>
        {showNotification && (
          <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
            <Icon name="notifications" size={24} color="#333" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerBorder,
    // Add shadow at the bottom
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8, // For Android
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backIcon: {
    fontSize: 20,
    color: colors.headerText,
    fontWeight: 'bold',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary, // Dark blue
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    // Add gradient-like effect with multiple colors
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  logoText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.textOnPrimary,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 1,
    maxWidth: 180,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.border,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  userName: {
    maxWidth: 140,
    color: colors.headerText,
    fontSize: 14,
    fontWeight: '500',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.notificationBadge,
  },
});

export default Header;
