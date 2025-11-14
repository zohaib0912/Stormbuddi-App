import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { clearAuthData } from '../utils/tokenStorage';
import { getToken } from '../utils/tokenStorage';
import { getUserProfile, updateUserProfile } from '../utils/userProfileStorage';
import { subscribe, emit } from '../utils/eventBus';
import FCMTokenService from '../services/FCMTokenService';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';

const DrawerContent = ({ navigation, state }) => {
  const insets = useSafeAreaInsets();
  const { showSuccess } = useToast();
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const buildAvatarUri = (uri) => {
    if (!uri) return null;
    const separator = uri.includes('?') ? '&' : '?';
    return `${uri}${separator}cb=${avatarVersion}`;
  };
  const updateAvatar = (uri) => {
    setUserAvatar(uri || '');
    setAvatarVersion(Date.now());
  };
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const unsub = subscribe('profile:updated', (payload) => {
      if (payload?.name) setUserName(payload.name);
      if (payload?.avatarUrl) updateAvatar(payload.avatarUrl);
    });
    (async () => {
      try {
        const cached = await getUserProfile();
        if (cached) {
          if (cached.name) setUserName(cached.name);
          if (cached.avatarUrl) updateAvatar(cached.avatarUrl);
        }
        const token = await getToken();
        if (!token) return;
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
            fetched = await res.json();
            break;
          } catch (_) {}
        }
        const root = fetched?.data || fetched?.user || fetched || {};
        const name = root?.name || root?.username || '';
        const avatar = root?.avatar_url || root?.avatar || root?.profile_photo_url || '';
        if (name) setUserName(name);
        if (avatar) updateAvatar(avatar);
        const partial = {};
        if (name) partial.name = name;
          if (avatar) partial.avatarUrl = avatar;
        if (partial.name || partial.avatarUrl) {
          try { await updateUserProfile(partial); } catch (_) {}
        }
      } catch (e) {}
    })();
    return () => { unsub && unsub(); };
  }, []);
  const navigationItems = [
    
    {
      key: 'Dashboard',
      label: 'DASHBOARD',
      icon: 'dashboard',
      screen: 'Dashboard',
    },
    {
      key: 'Leads',
      label: 'LEADS',
      icon: 'group',
      screen: 'Leads',
    },
    {
      key: 'Jobs',
      label: 'JOBS',
      icon: 'work',
      screen: 'Jobs',
    },
    {
      key: 'Customers',
      label: 'CUSTOMERS',
      icon: 'people',
      screen: 'Customers',
    },
    {
      key: 'InspectionReport',
      label: 'INSPECTION REPORTS',
      icon: 'description',
      screen: 'InspectionReport',
    },
    {
      key: 'Appointment',
      label: 'APPOINTMENTS',
      icon: 'event',
      screen: 'Appointment',
    },
  
    {
      key: 'Invoice',
      label: 'INVOICING & PAYMENTS',
      icon: 'payment',
      screen: 'Invoice',
    },
    
    {
      key: 'Profile',
      label: 'PROFILE',
      icon: 'person',
      screen: 'Profile',
    },
    {
      key: 'Settings',
      label: 'SETTINGS',
      icon: 'settings',
      screen: 'Settings',
    },
  ];

  const footerItems = [
    {
      key: 'Logout',
      label: 'LOGOUT',
      icon: 'logout',
      action: 'logout',
    },
  ];

  const handleNavigation = (screen) => {
    // Navigate to MainStack first, then to the specific screen
    navigation.navigate('MainStack', { screen: screen });
  };

  const handleAction = (action) => {
    if (action === 'logout') {
      setShowLogoutConfirm(true);
    }
  };

  const performLogout = async () => {
    try {
      const token = await getToken();
      const response = await fetch('https://app.stormbuddi.com/api/mobile/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        console.warn('Logout response could not be parsed as JSON:', parseError);
      }

      if (response.ok && data?.success) {
        // Remove FCM token from backend before clearing local data
        try {
          await FCMTokenService.removeFCMToken();
          console.log('FCM token removed from backend');
        } catch (error) {
          console.error('Failed to remove FCM token from backend:', error);
          // Don't fail logout if FCM token removal fails
        }

        // Clear stored tokens and user data
        await clearAuthData();
        emit('auth:logout');
        
        // Show success toast
        showSuccess('Logged out successfully');
        
        // Reset navigation stack to prevent going back to main app
        // Small delay to allow toast to show
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }, 500);
      } else {
        // Even if API fails, clear local data
        await clearAuthData();
        emit('auth:logout');
        // Show success toast
        showSuccess('Logged out successfully');
        // Reset navigation stack
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }, 500);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local data even if network fails
      await clearAuthData();
      emit('auth:logout');
      // Show success toast
      showSuccess('Logged out successfully');
      // Reset navigation stack
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 500);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* User Header */}
      <View style={styles.userHeader}>
        <View style={styles.avatarContainer}>
          {userAvatar ? (
            <Image source={{ uri: buildAvatarUri(userAvatar) }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
              <Text style={styles.userInitial}>{userName?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
        </View>
        <Text style={styles.userName} numberOfLines={1}>{userName || 'User'}</Text>
      </View>

      {/* Navigation Items */}
      <ScrollView style={styles.navigationContainer}>
        {navigationItems.map((item) => {
          // Check if the current screen is active by looking at the nested stack state
          const mainStackState = state.routes.find(route => route.name === 'MainStack');
          const isActive = mainStackState?.state?.routes[mainStackState.state.index]?.name === item.screen;
          
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && styles.navItemActive
              ]}
              onPress={() => handleNavigation(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon 
                  name={item.icon} 
                  size={20} 
                  color={isActive ? colors.textOnPrimary : colors.text} 
                />
              </View>
              <Text style={[
                styles.navLabel,
                isActive && styles.navLabelActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {footerItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.footerItem}
            onPress={() => item.action ? handleAction(item.action) : handleNavigation(item.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Icon 
                name={item.icon} 
                size={20} 
                color={colors.text} 
              />
            </View>
            <Text style={styles.footerText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModal}>
            <Text style={styles.logoutTitle}>Confirm Logout</Text>
            <Text style={styles.logoutMessage}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.logoutButtonRow}>
              <TouchableOpacity
                style={[styles.logoutButton, styles.logoutCancelButton]}
                onPress={() => setShowLogoutConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutButton, styles.logoutConfirmButton]}
                onPress={() => {
                  setShowLogoutConfirm(false);
                  performLogout();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    width: 270,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  userHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.border,
  },
  userAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    color: colors.textSecondary,
    fontWeight: '900',
  },
  userName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    // Add gradient-like effect with multiple colors
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textOnPrimary,
    textAlign: 'center',
    lineHeight: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  navigationContainer: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 10,
    borderRadius: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  navItemActive: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  navLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  navLabelActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 2,
  },
  footerText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoutModal: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  logoutMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  logoutButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logoutButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 26,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutCancelButton: {
    marginRight: 10,
    borderColor: colors.buttonSecondaryBorder,
    backgroundColor: colors.buttonSecondary,
  },
  logoutConfirmButton: {
    marginLeft: 10,
    borderColor: colors.buttonPrimary,
    backgroundColor: colors.buttonPrimary,
  },
  logoutCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonSecondaryText,
  },
  logoutConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimaryText,
  },
  confirmButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default DrawerContent;
