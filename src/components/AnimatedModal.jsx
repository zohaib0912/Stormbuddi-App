import React, { useEffect, useRef } from 'react';
import { Modal, Animated, View, TouchableOpacity, StyleSheet, Easing } from 'react-native';

/**
 * AnimatedModal with slide-left-right animation
 * Duration: 300ms
 * Adds a semi-transparent background wrapper
 */
const AnimatedModal = ({ 
  visible, 
  onClose, 
  children,
  animationType = 'slide', // 'slide' or 'fade'
  duration = 300
}) => {
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entry animation
      if (animationType === 'slide') {
        Animated.timing(slideAnimation, {
          toValue: 1,
          duration,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }).start();
      } else {
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }).start();
      }
    } else {
      // Exit animation
      if (animationType === 'slide') {
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }).start();
      } else {
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }).start();
      }
    }
  }, [visible, animationType, duration]);

  if (animationType === 'slide') {
    const slideX = slideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [500, 0], // Slide from right to left
    });

    const opacity = slideAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.5, 1],
    });

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{ translateX: slideX }],
                opacity,
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              {children}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnimation,
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            {children}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  container: {
    width: '85%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default AnimatedModal;

