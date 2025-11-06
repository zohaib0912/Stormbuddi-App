import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'user_token';
const USER_DATA_KEY = 'user_data';
const NOTIFICATION_PERMISSION_REQUESTED_KEY = 'notification_permission_requested';

// Store authentication token
export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    console.log('Token stored successfully');
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
};

// Retrieve authentication token
export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

// Store user data
export const storeUserData = async (userData) => {
  try {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    console.log('User data stored successfully');
  } catch (error) {
    console.error('Error storing user data:', error);
    throw error;
  }
};

// Retrieve user data
export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return null;
  }
};

// Check if notification permission has been requested before
export const hasNotificationPermissionBeenRequested = async () => {
  try {
    const requested = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_REQUESTED_KEY);
    return requested === 'true';
  } catch (error) {
    console.error('Error checking notification permission status:', error);
    return false;
  }
};

// Mark notification permission as requested
export const setNotificationPermissionRequested = async () => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_REQUESTED_KEY, 'true');
    console.log('Notification permission requested flag set');
  } catch (error) {
    console.error('Error setting notification permission flag:', error);
  }
};

// Clear all stored authentication data
// Note: Notification permission flag is NOT cleared so permission is only asked once ever
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_DATA_KEY]);
    console.log('Authentication data cleared successfully');
  } catch (error) {
    console.error('Error clearing authentication data:', error);
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const token = await getToken();
    return token !== null;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};
