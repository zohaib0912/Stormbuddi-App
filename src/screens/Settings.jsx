import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../components/Header';
import NotificationSettingsModal from '../components/NotificationSettingsModal';
import NotificationListModal from '../components/NotificationListModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import HelpFAQModal from '../components/HelpFAQModal';
import { clearAuthData, getToken } from '../utils/tokenStorage';
import { useToast } from '../contexts/ToastContext';
import { emit } from '../utils/eventBus';
import FCMTokenService from '../services/FCMTokenService';

const Settings = () => {
  const { showError, showSuccess } = useToast();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showNotificationListModal, setShowNotificationListModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  const handleNotificationPress = () => {
    setShowNotificationListModal(true);
  };

  const handleSettingPress = (setting) => {
    console.log(`${setting} pressed`);
    if (setting === 'Account') {
      navigation.navigate('Profile');
    } else if (setting === 'Notifications') {
      setShowNotificationModal(true);
    } else if (setting === 'Privacy') {
      setShowPrivacyModal(true);
    } else if (setting === 'Help') {
      setShowHelpModal(true);
    } else if (setting === 'Logout') {
      handleLogout();
    } else {
      // Add navigation logic for other settings
    }
  };

  const handleCloseNotificationModal = () => {
    setShowNotificationModal(false);
  };

  const handleClosePrivacyModal = () => {
    setShowPrivacyModal(false);
  };

  const handleCloseHelpModal = () => {
    setShowHelpModal(false);
  };

  const executeLogout = async () => {
    try {
      const token = await getToken();

      const response = await fetch('https://app.stormbuddi.com/api/mobile/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        console.warn('Settings logout response parse error:', parseError);
      }

      if (response.ok && data?.success) {
        try {
          await FCMTokenService.removeFCMToken();
          console.log('FCM token removed from backend (settings)');
        } catch (fcmError) {
          console.error('Failed to remove FCM token during settings logout:', fcmError);
        }
      } else {
        console.warn('Settings logout API returned non-success result:', {
          status: response.status,
          data,
        });
      }
    } catch (apiError) {
      console.error('Settings logout API error:', apiError);
    } finally {
      try {
        await clearAuthData();
      } catch (clearError) {
        console.error('Failed to clear auth data during settings logout:', clearError);
      }
      emit('auth:logout');
      showSuccess('Logged out successfully');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    try {
      await executeLogout();
    } catch (error) {
      console.error('Unexpected logout error:', error);
      showError('Failed to logout. Please try again.');
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const SettingOption = ({ iconName, title, onPress, showChevron = true }) => (
    <TouchableOpacity style={styles.settingOption} onPress={onPress}>
      <View style={styles.settingContent}>
        <Icon name={iconName} size={24} color="#333" style={styles.settingIcon} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {showChevron && (
        <Icon name="chevron-right" size={24} color="#333" style={styles.chevronIcon} />
      )}
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
        {/* Header */}
        <Header
          title="Maddock"
          onMenuPress={handleMenuPress}
          onNotificationPress={handleNotificationPress}
          showNotification={true}
          showMenu={true}
          showBack={false}
        />

        {/* Main Content */}
        <View style={styles.content}>
        <Text style={styles.settingsHeading}>Settings</Text>
        
        <View style={styles.settingsList}>
          <SettingOption
            iconName="person"
            title="Account"
            onPress={() => handleSettingPress('Account')}
          />
          <SettingOption
            iconName="notifications"
            title="Notifications"
            onPress={() => handleSettingPress('Notifications')}
          />
          <SettingOption
            iconName="lock"
            title="Privacy"
            onPress={() => handleSettingPress('Privacy')}
          />
          <SettingOption
            iconName="help"
            title="Help"
            onPress={() => handleSettingPress('Help')}
          />
          <SettingOption
            iconName="logout"
            title="Logout"
            onPress={() => handleSettingPress('Logout')}
          />
        </View>
      </View>

      {/* App Version */}
      <View style={[styles.versionContainer, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.versionText}>App version 1.0.0</Text>
      </View>

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        visible={showNotificationModal}
        onClose={handleCloseNotificationModal}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={showPrivacyModal}
        onClose={handleClosePrivacyModal}
      />

      {/* Help FAQ Modal */}
      <HelpFAQModal
        visible={showHelpModal}
        onClose={handleCloseHelpModal}
      />

      {/* Notification List Modal */}
      <NotificationListModal
        visible={showNotificationListModal}
        onClose={() => setShowNotificationListModal(false)}
      />

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
                onPress={handleLogoutConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  settingsHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  settingsList: {
    gap: 12,
  },
  settingOption: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  chevronIcon: {
    // Icon styling is handled by the Icon component props
  },
  versionContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoutModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    elevation: 16,
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2A34',
    textAlign: 'center',
    marginBottom: 12,
  },
  logoutMessage: {
    fontSize: 15,
    color: '#666666',
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
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutCancelButton: {
    marginRight: 10,
    borderColor: '#003366',
    backgroundColor: '#ffffff',
  },
  logoutConfirmButton: {
    marginLeft: 10,
    borderColor: '#003366',
    backgroundColor: '#003366',
  },
  logoutCancelText: {
    color: '#003366',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default Settings;