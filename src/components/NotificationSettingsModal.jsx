import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import useNotifications from '../hooks/useNotifications';
import { getToken } from '../utils/tokenStorage';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';

const NotificationSettingsModal = ({ visible, onClose }) => {
  const { showSuccess, showError } = useToast();
  const { 
    fcmToken, 
    isPermissionGranted, 
    loading, 
    requestPermission
  } = useNotifications();

  const [notificationStatus, setNotificationStatus] = useState('active');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchNotificationStatus();
    }
  }, [visible]);

  const fetchNotificationStatus = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch('https://app.stormbuddi.com/api/mobile/notifications/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Backend returns notifications_enabled boolean, convert to status string
          const enabled = data.data.notifications_enabled === true || data.data.notifications_enabled === 1;
          setNotificationStatus(enabled ? 'active' : 'inactive');
        }
      }
    } catch (error) {
      console.error('Error fetching notification status:', error);
    }
  };

  const updateNotificationStatus = async (status) => {
    setUpdating(true);
    try {
      const token = await getToken();
      if (!token) {
        showError('Authentication token not found');
        return;
      }

      // Convert status string to boolean for backend API
      // 'active' -> true, 'inactive' -> false
      const enabled = status === 'active';

      const response = await fetch('https://app.stormbuddi.com/api/mobile/notifications/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: enabled,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotificationStatus(status);
          showSuccess(data.message || `Notifications ${enabled ? 'enabled' : 'disabled'} successfully`);
        } else {
          throw new Error(data.message || 'Failed to update notification status');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating notification status:', error);
      showError(error.message || 'Failed to update notification status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePermissionToggle = async (value) => {
    if (value) {
      const granted = await requestPermission();
      if (granted) {
        await updateNotificationStatus('active');
      } else {
        showError('Permission Denied. Notification permission is required to receive push notifications.');
      }
    } else {
      await updateNotificationStatus('inactive');
    }
  };

  const isNotificationEnabled = notificationStatus === 'active' && isPermissionGranted;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Notification Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading notification settings...</Text>
            </View>
          ) : (
            <>
              {/* Main Notification Toggle */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Push Notifications</Text>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Enable Notifications</Text>
                    <Text style={styles.settingDescription}>
                      Receive push notifications for important updates
                    </Text>
                  </View>
                  <Switch
                    value={isNotificationEnabled}
                    onValueChange={handlePermissionToggle}
                    disabled={updating}
                  />
                </View>
              </View>

              {/* FCM Token Display */}
              {fcmToken && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Device Information</Text>
                  <View style={styles.tokenContainer}>
                    <Text style={styles.tokenLabel}>FCM Token:</Text>
                    <Text style={styles.tokenText} numberOfLines={3}>
                      {fcmToken}
                    </Text>
                  </View>
                </View>
              )}

              {/* Status Information */}
              <View style={styles.section}>
                <View style={styles.statusContainer}>
                  <Text style={styles.statusLabel}>Current Status:</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: notificationStatus === 'active' ? '#34C759' : '#FF3B30' }
                  ]}>
                    <Text style={styles.statusText}>
                      {notificationStatus === 'active' ? 'Active' : 'Disabled'}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  tokenContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  tokenText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default NotificationSettingsModal;
