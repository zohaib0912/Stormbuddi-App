import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { colors } from '../theme/colors';

const SubscriptionExpiredModal = ({ visible, onRenew }) => {
  const handleRenew = () => {
    if (typeof onRenew === 'function') {
      onRenew();
      return;
    }

    Linking.openURL('https://app.stormbuddi.com/login').catch((error) => {
      console.error('Failed to open renew URL:', error);
    });
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Subscription Required</Text>
          <Text style={styles.message}>
            Your StormBuddi subscription has ended or is inactive. Renew now to keep using the app.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleRenew}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Renew Subscription</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 28, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: colors.white,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    minWidth: 180,
    borderRadius: 28,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default SubscriptionExpiredModal;


