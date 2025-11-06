import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';

const JobCard = ({ 
  title,
  address,
  createdOn,
  lastUpdated,
  assignedTo,
  status,
  onPress
}) => {
  // Debug logging to check props
  console.log('JobCard props:', {
    title,
    assignedTo,
    status
  });
  // Function to get status button style based on status
  const getStatusButtonStyle = (status) => {
    const normalizedStatus = (status || '').toLowerCase().replace(/\s+/g, '-');
    
    // Status color mapping
    const statusColors = {
      'new-job': '#4DA3FF',           // Light Blue
      'in-progress': '#28A745',        // Medium Green
      'proposal-sent': '#FFC107',      // Amber
      'proposal-signed': '#FF9800',    // Orange
      'material-ordered': '#7E57C2',   // Purple
      'work-order': '#0D47A1',         // Navy Blue
      'appointment-scheduled': '#26A69A', // Teal
      'invoicing-payment': '#C7921E',  // Deep Gold
      'job-completed': '#2E7D32',      // Dark Green
      'completed': '#2E7D32',         // Dark Green (alias)
      'lost': '#E53935',               // Red
      'unqualified': '#757575',        // Gray
    };
    
    const backgroundColor = statusColors[normalizedStatus] || colors.primary;
    
    return {
      backgroundColor,
      textColor: '#ffffff'
    };
  };

  const statusStyle = getStatusButtonStyle(status);
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.blueBar} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity style={styles.arrowButton}>
            <Icon name="chevron-right" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.address}>{address}</Text>
        
        <View style={styles.metadata}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Created On:</Text>
            <Text style={styles.metadataValue}>{createdOn}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Last Updated:</Text>
            <Text style={styles.metadataValue}>{lastUpdated}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Assigned To:</Text>
            <Text style={styles.metadataValue}>{assignedTo}</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <View style={[styles.statusButton, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.textColor }]}>{status}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    flexDirection: 'row',
  },
  blueBar: {
    width: 4,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    // Ensure perfect centering
    display: 'flex',
  },
  address: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 22,
  },
  metadata: {
    marginBottom: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metadataLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default JobCard;
