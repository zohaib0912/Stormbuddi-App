import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import useNotifications from '../hooks/useNotifications';
import { useToast } from '../contexts/ToastContext';

const NotificationSettings = () => {
  const { showError } = useToast();
  const { 
    fcmToken, 
    isPermissionGranted, 
    loading, 
    requestPermission,
    subscribeToTopic,
    unsubscribeFromTopic 
  } = useNotifications();

  const handlePermissionToggle = async (value) => {
    if (value) {
      const granted = await requestPermission();
      if (!granted) {
        showError('Permission Denied. Notification permission is required to receive push notifications.');
      }
    }
  };

  const handleTopicSubscription = async (topic, subscribed) => {
    if (subscribed) {
      await subscribeToTopic(topic);
    } else {
      await unsubscribeFromTopic(topic);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Push Notifications</Text>
      
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Enable Notifications</Text>
        <Switch
          value={isPermissionGranted}
          onValueChange={handlePermissionToggle}
        />
      </View>

      {fcmToken && (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>FCM Token:</Text>
          <Text style={styles.tokenText} numberOfLines={3}>
            {fcmToken}
          </Text>
        </View>
      )}

      <View style={styles.topicContainer}>
        <Text style={styles.topicTitle}>Notification Topics</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Appointment Reminders</Text>
          <Switch
            value={false} // You can manage this state
            onValueChange={(value) => handleTopicSubscription('appointments', value)}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Job Updates</Text>
          <Switch
            value={false} // You can manage this state
            onValueChange={(value) => handleTopicSubscription('jobs', value)}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Invoice Notifications</Text>
          <Switch
            value={false} // You can manage this state
            onValueChange={(value) => handleTopicSubscription('invoices', value)}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: 'white',
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  tokenContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  tokenText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  topicContainer: {
    marginTop: 20,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
});

export default NotificationSettings;
