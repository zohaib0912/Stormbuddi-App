import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';

const Card = ({ 
  children, 
  style, 
  onPress, 
  headerColor = colors.cardHeaderDefault, // Changed from old blue to teal
  headerTitle,
  headerSubtitle,
  showHeader = false 
}) => {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {showHeader && (
        <View style={[styles.cardHeader, { backgroundColor: headerColor }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>
        </View>
      )}
      <View style={styles.cardContent}>
        {children}
      </View>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  cardContent: {
    padding: 16,
  },
});

export default Card;
