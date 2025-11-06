import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const DataCard = ({ 
  title,
  subtitle,
  details = [],
  status,
  onView,
  onDownload,
  onDelete,
  onEdit,
  showActions = true,
  cardType = 'default' // 'default' for Material Order, 'appointment' for Appointment Schedule
}) => {
  const renderDetail = (detail, index) => (
    <Text key={index} style={styles.detail}>
      {detail}
    </Text>
  );

  if (cardType === 'appointment') {
    return (
      <TouchableOpacity style={styles.container} onPress={onEdit}>
        <View style={styles.content}>
          {/* Top Section - Type and Status */}
          <View style={styles.topSection}>
            <Text style={styles.typeLabel}>Type: {title}</Text>
            {status && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                <Text style={styles.statusText}>{status}</Text>
              </View>
            )}
          </View>
          
          {/* Middle Section - Main Title */}
          {subtitle && (
            <Text style={styles.mainTitle}>{subtitle}</Text>
          )}
          
          {/* Bottom Section - Date and Time Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailsColumn}>
              {details.slice(0, 2).map((detail, index) => renderDetail(detail, index))}
            </View>
            <View style={styles.detailsColumn}>
              {details.slice(2, 4).map((detail, index) => renderDetail(detail, index + 2))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Default layout for Material Order cards
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          )}
        </View>
        
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
        
        {details.map((detail, index) => renderDetail(detail, index))}
      </View>
      
      {showActions && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={onView}>
            <Text style={styles.actionIcon}>👁️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDownload}>
            <Text style={styles.actionIcon}>⬇️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const getStatusColor = (status) => {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '-');
  
  // Status color mapping based on the provided color scheme
  const statusColors = {
    'new-job': '#4DA3FF',           // Light Blue
    'in-progress': '#28A745',       // Medium Green
    'proposal-sent': '#FFC107',     // Amber
    'proposal-signed': '#FF9800',   // Orange
    'material-ordered': '#7E57C2',  // Purple
    'work-order': '#0D47A1',        // Navy Blue
    'appointment-scheduled': '#26A69A', // Teal
    'invoicing-payment': '#C7921E', // Deep Gold
    'job-completed': '#2E7D32',     // Dark Green
    'completed': '#2E7D32',         // Dark Green (alias)
    'lost': '#E53935',              // Red
    'unqualified': '#757575',      // Gray
    'pending': '#FFC107',           // Amber (proposal-sent)
    'cancelled': '#E53935',         // Red (lost)
    'canceled': '#E53935',          // Red (lost)
  };
  
  return statusColors[normalized] || '#8E8E93';
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  // Default layout styles (Material Order)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  // Appointment layout styles
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'normal',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsColumn: {
    flex: 1,
  },
  detail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: 'normal',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  actionIcon: {
    fontSize: 14,
  },
});

export default DataCard;
