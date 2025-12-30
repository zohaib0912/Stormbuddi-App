import messaging from '@react-native-firebase/messaging';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import FCMTokenService from './FCMTokenService';

class NotificationService {
  constructor() {
    // Don't automatically setup handlers in constructor
    // This will be called manually when needed
  }

  async setupNotificationHandlers() {
    try {
      // Don't request permission here - it should only be requested after login on Dashboard
      // Just set up message handlers for when permission is granted
      
      // Get FCM token (this will only work if permission was already granted)
      try {
        const token = await this.getFCMToken();
        if (token) {
          console.log('FCM Token:', token);
          // Store FCM token in backend (if user is logged in)
          await this.storeFCMTokenInBackend(token);
        }
      } catch (error) {
        // Token might not be available if permission not granted yet - that's okay
        console.log('FCM token not available (permission may not be granted yet)');
      }

      // Set up message handlers
      this.setupMessageHandlers();
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  }

  async storeFCMTokenInBackend(token) {
    try {
      const success = await FCMTokenService.updateFCMToken(token);
      if (success) {
        console.log('FCM token stored in backend successfully');
      } else {
        console.log('Failed to store FCM token in backend (user might not be logged in)');
      }
    } catch (error) {
      console.error('Error storing FCM token in backend:', error);
    }
  }

  async requestPermission() {
    console.log('[NotificationService] requestPermission called');
    
    if (Platform.OS === 'android') {
      console.log('[NotificationService] Android platform detected, requesting POST_NOTIFICATIONS permission');
      // Request Android notification permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'This app needs notification permission to send you updates.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      console.log('[NotificationService] Android permission result:', granted);
      
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[NotificationService] Notification permission denied on Android');
        return false;
      }
      
      // Android permission granted
      console.log('[NotificationService] Permission granted successfully on Android');
      return true;
    }

    // iOS permission handling
    console.log('[NotificationService] Requesting iOS permission via Firebase messaging');
    const authStatus = await messaging().requestPermission();
    console.log('[NotificationService] iOS permission status:', authStatus);
    
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[NotificationService] Notification permission denied on iOS');
      return false;
    }

    // Register device for remote messages on iOS after permission is granted
    try {
      await messaging().registerDeviceForRemoteMessages();
      console.log('[NotificationService] Device registered for remote messages on iOS');
    } catch (error) {
      console.error('[NotificationService] Error registering device for remote messages:', error);
    }

    console.log('[NotificationService] Permission granted successfully on iOS');
    return true;
  }

  async getFCMToken() {
    try {
      // On iOS, we must register for remote messages before getting the token
      if (Platform.OS === 'ios') {
        // Register device for remote messages (don't check permission first - try it)
        try {
          await messaging().registerDeviceForRemoteMessages();
          console.log('[NotificationService] Device registered for remote messages before getting token');
          // Small delay to ensure registration completes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          // Check if error is because already registered
          if (error.code === 'messaging/already-registered' || error.message?.includes('already registered')) {
            console.log('[NotificationService] Device already registered for remote messages');
          } else {
            // If it's a different error, log it but continue - might still work
            console.warn('[NotificationService] Registration warning:', error.message);
          }
        }
      }
      
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      // If it's the unregistered error, provide more helpful message
      if (error.code === 'messaging/unregistered' || error.message?.includes('registered for remote messages')) {
        console.error('[NotificationService] Device not registered. Make sure to call requestPermission() first on iOS.');
      }
      return null;
    }
  }

  setupMessageHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Message handled in the background!', remoteMessage);
    });

    // Handle foreground messages
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('A new FCM message arrived!', remoteMessage);
      
      // Show alert for foreground messages
      Alert.alert(
        remoteMessage.notification?.title || 'New Message',
        remoteMessage.notification?.body || 'You have a new message',
        [
          { text: 'OK', onPress: () => console.log('OK Pressed') },
        ]
      );
    });

    // Handle notification tap when app is in background/quit
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Handle notification tap when app is quit
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        }
      });

    return unsubscribe;
  }

  handleNotificationTap(remoteMessage) {
    // Handle navigation based on notification data
    const { data } = remoteMessage;
    
    if (data) {
      // You can navigate to specific screens based on notification data
      console.log('Notification data:', data);
      
      // Example: Navigate to specific screen based on notification type
      if (data.type === 'appointment') {
        // Navigate to appointment screen
        console.log('Navigate to appointment screen');
      } else if (data.type === 'job') {
        // Navigate to job screen
        console.log('Navigate to job screen');
      }
    }
  }

  // Method to manually update FCM token (call this after login)
  async updateFCMTokenAfterLogin() {
    try {
      const token = await this.getFCMToken();
      if (token) {
        await this.storeFCMTokenInBackend(token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error updating FCM token after login:', error);
      return null;
    }
  }

  // Method to subscribe to topics
  async subscribeToTopic(topic) {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
    }
  }

  // Method to unsubscribe from topics
  async unsubscribeFromTopic(topic) {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
    }
  }
}

export default new NotificationService();
