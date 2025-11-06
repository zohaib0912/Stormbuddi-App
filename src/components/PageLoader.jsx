import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

/**
 * Global Page Loader Component
 * Shows a full-screen loading overlay with minimum display time
 */
const PageLoader = ({ 
  visible = false,
  message = 'Loading...', 
  size = 'large',
  color = colors.primary,
  backgroundColor = 'rgba(255, 255, 255, 0.95)',
  overlayColor = 'rgba(0, 0, 0, 0.3)'
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      statusBarTranslucent={true}
    >
      <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
        <View style={[styles.container, { backgroundColor }]}>
          <ActivityIndicator size={size} color={color} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: height,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    borderRadius: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 150,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default PageLoader;
