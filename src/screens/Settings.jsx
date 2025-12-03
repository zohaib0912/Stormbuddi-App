import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../components/Header';
import NotificationSettingsModal from '../components/NotificationSettingsModal';
import NotificationListModal from '../components/NotificationListModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import HelpFAQModal from '../components/HelpFAQModal';
import { clearAuthData } from '../utils/tokenStorage';
import { useToast } from '../contexts/ToastContext';

const Settings = () => {
  const { showError } = useToast();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showNotificationListModal, setShowNotificationListModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAuthData();
              // Navigate to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              showError('Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
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
});

export default Settings;