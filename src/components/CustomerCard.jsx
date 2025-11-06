import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';

const CustomerCard = ({ 
  customer,
  onPress,
  style 
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  const getCustomerName = () => {
    return customer.full_name || 
           customer.name || 
           `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
           'Unknown Customer';
  };

  const getCustomerEmail = () => {
    return customer.email || customer.email_address || 'N/A';
  };

  const getCustomerPhone = () => {
    return customer.phone || customer.phone_number || 'N/A';
  };

  const getCustomerAddress = () => {
    return customer.address || customer.street_address || 'N/A';
  };

  const getCustomerZip = () => {
    return customer.zip_code || customer.zip || customer.postal_code || 'N/A';
  };

  const getSubscriptionPackage = () => {
    // Check multiple possible field names for subscription package
    const packageName = customer.SubscriptionsPlan || 
           customer.subscriptions_plan ||
           customer.subscription_package || 
           customer.package || 
           customer.subscription ||
           customer.subscription_plan?.name ||
           customer.subscription_plan?.plan_name ||
           null;
    
    // Return package name or 'No Package' if null/undefined
    return packageName || 'No Package';
  };

  const getPackageColor = (packageName) => {
    if (!packageName) return '#757575'; // Gray for no package
    
    const normalized = (packageName || '').toLowerCase();
    
    // Package color mapping with authentic metallic colors
    const packageColors = {
      'bronze': '#CD7F32',           // Bronze color
      'silver': '#C0C0C0',           // Silver color
      'gold': '#FFD700',             // Gold color
      'platinum': '#E5E4E2',         // Platinum color
      'no package': '#757575',       // Gray for no package
      'no-package': '#757575',       // Gray for no package (with hyphen)
    };
    
    // Check for package name matches
    if (normalized.includes('bronze')) return packageColors.bronze;
    if (normalized.includes('silver')) return packageColors.silver;
    if (normalized.includes('gold')) return packageColors.gold;
    if (normalized.includes('platinum')) return packageColors.platinum;
    if (normalized.includes('no package') || normalized.includes('no-package')) return packageColors['no package'];
    
    // Default to gray if no match
    return '#757575';
  };

  const getPackageTextColor = (packageName) => {
    if (!packageName) return '#ffffff';
    
    const normalized = (packageName || '').toLowerCase();
    
    // Light colors need dark text for readability
    if (normalized.includes('silver') || normalized.includes('gold') || normalized.includes('platinum')) {
      return '#000000'; // Dark text for light backgrounds
    }
    
    // Darker colors use white text
    return '#ffffff';
  };

  return (
    <TouchableOpacity 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Blue left border */}
      <View style={styles.leftBorder} />
      
      <View style={styles.cardContent}>
        {/* Header with customer name */}
        <View style={styles.header}>
          <Text style={styles.customerName}>{getCustomerName()}</Text>
          <View style={[
            styles.packageBadge,
            { backgroundColor: getPackageColor(getSubscriptionPackage()) }
          ]}>
            <Text style={[
              styles.packageText,
              { color: getPackageTextColor(getSubscriptionPackage()) }
            ]}>
              {getSubscriptionPackage()}
            </Text>
          </View>
        </View>

        {/* Details section */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Icon name="email" size={14} color={colors.textSecondary} style={styles.icon} />
            <Text style={styles.detailValue} numberOfLines={1}>{getCustomerEmail()}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="phone" size={14} color={colors.textSecondary} style={styles.icon} />
            <Text style={styles.detailValue}>{getCustomerPhone()}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="location-on" size={14} color={colors.textSecondary} style={styles.icon} />
            <Text style={styles.detailValue} numberOfLines={2}>{getCustomerAddress()}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Zip Code:</Text>
            <Text style={styles.detailValue}>{getCustomerZip()}</Text>
          </View>
          
          {customer.created_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>{formatDate(customer.created_at)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: 0,
    marginVertical: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  leftBorder: {
    width: 4,
    backgroundColor: colors.primary,
  },
  cardContent: {
    flex: 1,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  packageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  packageText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsContainer: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    minWidth: 70,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
});

export default CustomerCard;

