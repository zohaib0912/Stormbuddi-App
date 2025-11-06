import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const FloatingActionButton = ({ 
  onPress, 
  icon = '+',
  size = 56,
  backgroundColor = colors.primary,
  iconColor = '#ffffff'
}) => {
  const insets = useSafeAreaInsets();
  
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          bottom: insets.bottom + 20, // Dynamic bottom spacing
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.icon,
        { color: iconColor, fontSize: size * 0.4 }
      ]}>
        {icon}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    fontWeight: '700',
  },
});

export default FloatingActionButton;