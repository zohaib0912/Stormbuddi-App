import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import useNotifications from '../hooks/useNotifications';
import FCMTokenService from '../services/FCMTokenService';
import { useToast } from '../contexts/ToastContext';

const FCMTokenTest = () => {
  const { showSuccess, showError } = useToast();
  const { fcmToken, isPermissionGranted, loading } = useNotifications();
  const [testResult, setTestResult] = useState('');

  const testFCMTokenUpdate = async () => {
    try {
      setTestResult('Testing FCM token update...');
      const success = await FCMTokenService.updateFCMToken(fcmToken);
      
      if (success) {
        setTestResult('✅ FCM token updated successfully in backend!');
        showSuccess('FCM token updated successfully in backend!');
      } else {
        setTestResult('❌ Failed to update FCM token in backend');
        showError('Failed to update FCM token in backend');
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error.message}`);
      showError(`Failed to update FCM token: ${error.message}`);
    }
  };

  const testFCMTokenRemoval = async () => {
    try {
      setTestResult('Testing FCM token removal...');
      const success = await FCMTokenService.removeFCMToken();
      
      if (success) {
        setTestResult('✅ FCM token removed successfully from backend!');
        showSuccess('FCM token removed successfully from backend!');
      } else {
        setTestResult('❌ Failed to remove FCM token from backend');
        showError('Failed to remove FCM token from backend');
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error.message}`);
      showError(`Failed to remove FCM token: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>FCM Token Test</Text>
        <Text>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>FCM Token Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.statusText}>
          Permission: {isPermissionGranted ? '✅ Granted' : '❌ Denied'}
        </Text>
        <Text style={styles.statusText}>
          FCM Token: {fcmToken ? '✅ Available' : '❌ Not Available'}
        </Text>
      </View>

      {fcmToken && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FCM Token</Text>
          <Text style={styles.tokenText} numberOfLines={3}>
            {fcmToken}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Integration Test</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.updateButton]} 
          onPress={testFCMTokenUpdate}
          disabled={!fcmToken}
        >
          <Text style={styles.buttonText}>Test Update FCM Token</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.removeButton]} 
          onPress={testFCMTokenRemoval}
        >
          <Text style={styles.buttonText}>Test Remove FCM Token</Text>
        </TouchableOpacity>
      </View>

      {testResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Result</Text>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Endpoint</Text>
        <Text style={styles.endpointText}>
          POST: https://app.stormbuddi.com/api/mobile/fcm-token
        </Text>
        <Text style={styles.endpointText}>
          DELETE: https://app.stormbuddi.com/api/mobile/fcm-token
        </Text>
        <Text style={styles.endpointText}>
          Fallback POST (remove): https://app.stormbuddi.com/api/mobile/fcm-token/remove
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
  statusText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  tokenText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 4,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#007bff',
  },
  removeButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultText: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 4,
  },
  endpointText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 5,
  },
});

export default FCMTokenTest;
