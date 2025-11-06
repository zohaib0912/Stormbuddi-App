import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import FCMTokenService from '../services/FCMTokenService';
import { useToast } from '../contexts/ToastContext';

const FCMDebugTest = () => {
  const { showSuccess, showError, showInfo } = useToast();
  const [debugInfo, setDebugInfo] = useState('');
  const [fcmToken, setFcmToken] = useState('');

  const getFCMToken = async () => {
    try {
      const token = await messaging().getToken();
      setFcmToken(token);
      setDebugInfo(`FCM Token: ${token}\nLength: ${token ? token.length : 0}`);
    } catch (error) {
      setDebugInfo(`Error getting FCM token: ${error.message}`);
    }
  };

  const testBackendCall = async () => {
    if (!fcmToken) {
      showError('Please get FCM token first');
      return;
    }

    try {
      setDebugInfo('Testing backend call...');
      const success = await FCMTokenService.updateFCMToken(fcmToken);
      
      if (success) {
        setDebugInfo(prev => prev + '\n✅ Backend call successful!');
        showSuccess('FCM token sent to backend successfully!');
      } else {
        setDebugInfo(prev => prev + '\n❌ Backend call failed!');
        showError('Failed to send FCM token to backend');
      }
    } catch (error) {
      setDebugInfo(prev => prev + `\n❌ Error: ${error.message}`);
      showError(`Failed to send FCM token: ${error.message}`);
    }
  };

  const checkDatabase = () => {
    showInfo('Please check your database directly:\n\n1. Open your database management tool\n2. Check the users table\n3. Look for fcm_token column\n4. Verify the token was saved for your user ID');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>FCM Debug Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1: Get FCM Token</Text>
        <TouchableOpacity style={styles.button} onPress={getFCMToken}>
          <Text style={styles.buttonText}>Get FCM Token</Text>
        </TouchableOpacity>
        
        {fcmToken && (
          <View style={styles.tokenContainer}>
            <Text style={styles.tokenLabel}>FCM Token:</Text>
            <Text style={styles.tokenText} numberOfLines={3}>
              {fcmToken}
            </Text>
            <Text style={styles.tokenLength}>
              Length: {fcmToken.length} characters
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 2: Test Backend Call</Text>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={testBackendCall}
          disabled={!fcmToken}
        >
          <Text style={styles.buttonText}>Test Backend Call</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 3: Check Database</Text>
        <TouchableOpacity 
          style={[styles.button, styles.checkButton]} 
          onPress={checkDatabase}
        >
          <Text style={styles.buttonText}>Check Database</Text>
        </TouchableOpacity>
      </View>

      {debugInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Info</Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Endpoint Info</Text>
        <Text style={styles.endpointText}>
          URL: https://app.stormbuddi.com/api/mobile/fcm-token
        </Text>
        <Text style={styles.endpointText}>
          Method: POST
        </Text>
        <Text style={styles.endpointText}>
          Headers: Authorization: Bearer [token]
        </Text>
        <Text style={styles.endpointText}>
          Body: {"{"}fcm_token: "...", device_type: "android"{"}"}
        </Text>
        <Text style={styles.endpointText}>
          Table: notificationToken (with user_id column)
        </Text>
      </View>
    </ScrollView>
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
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#28a745',
  },
  checkButton: {
    backgroundColor: '#ffc107',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tokenContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  tokenText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  tokenLength: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  endpointText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 5,
  },
});

export default FCMDebugTest;
