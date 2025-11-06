import { useState, useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import NotificationService from '../services/NotificationService';

const useNotifications = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      setLoading(true);
      
      // Get FCM token
      const token = await NotificationService.getFCMToken();
      setFcmToken(token);

      // Check if permission is granted
      const authStatus = await messaging().hasPermission();
      const granted = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                     authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      setIsPermissionGranted(granted);

    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      const granted = await NotificationService.requestPermission();
      setIsPermissionGranted(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  const subscribeToTopic = async (topic) => {
    try {
      await NotificationService.subscribeToTopic(topic);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
    }
  };

  const unsubscribeFromTopic = async (topic) => {
    try {
      await NotificationService.unsubscribeFromTopic(topic);
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
    }
  };

  return {
    fcmToken,
    isPermissionGranted,
    loading,
    requestPermission,
    subscribeToTopic,
    unsubscribeFromTopic,
  };
};

export default useNotifications;
