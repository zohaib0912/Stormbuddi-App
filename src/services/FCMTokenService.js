import axios from 'axios';
import { Platform } from 'react-native';
import { getToken } from '../utils/tokenStorage';

class FCMTokenService {
  constructor() {
    this.baseURL = 'https://app.stormbuddi.com/api/mobile';
  }

  async updateFCMToken(fcmToken) {
    try {
      const authToken = await getToken();
      
      if (!authToken) {
        console.log('No auth token found, skipping FCM token update');
        return false;
      }

      console.log('Sending FCM token to backend:', fcmToken);
      console.log('Device type:', Platform.OS);
      console.log('FCM token length:', fcmToken ? fcmToken.length : 0);
      
      if (!fcmToken || fcmToken.length === 0) {
        console.error('❌ FCM token is empty or null!');
        return false;
      }
      
      const requestData = {
        fcm_token: fcmToken,
        device_type: Platform.OS, // 'android' or 'ios'
      };
      
      console.log('Request data:', requestData);
      console.log('Sending to notificationToken table with user_id from auth token');

      const response = await axios.post(
        `${this.baseURL}/fcm-token`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-Requested-With': 'XMLHttpRequest', // Add this for Laravel
          },
        }
      );

      if (response.data.success) {
        console.log('FCM token updated successfully:', response.data);
        return true;
      } else {
        console.error('Failed to update FCM token:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('Error updating FCM token:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        // Handle specific error cases
        if (error.response.status === 404) {
          console.error('❌ Backend endpoint not found. Please add the route to your Laravel backend.');
          console.error('Required route: POST /api/mobile/fcm-token');
        } else if (error.response.status === 401) {
          console.error('❌ Authentication failed. Token may be expired.');
        } else if (error.response.status === 422) {
          console.error('❌ Validation error:', error.response.data.errors);
        }
      }
      
      return false;
    }
  }

  async removeFCMToken() {
    try {
      const authToken = await getToken();
      
      if (!authToken) {
        console.log('No auth token found, skipping FCM token removal');
        return false;
      }

      const response = await axios.delete(
        `${this.baseURL}/fcm-token`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-Requested-With': 'XMLHttpRequest', // Add this for Laravel
          },
        }
      );

      if (response.data.success) {
        console.log('FCM token removed successfully:', response.data);
        return true;
      } else {
        console.error('Failed to remove FCM token:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('Error removing FCM token:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        // Handle specific error cases
        if (error.response.status === 404) {
          console.error('❌ Backend endpoint not found. Please add the route to your Laravel backend.');
          console.error('Required route: DELETE /api/mobile/fcm-token');
        } else if (error.response.status === 401) {
          console.error('❌ Authentication failed. Token may be expired.');
        }
      }
      
      return false;
    }
  }
}

export default new FCMTokenService();
