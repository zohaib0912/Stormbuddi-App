import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AppointmentCard = ({ 
  appointment, 
  onPress,
  showUploadButton = false,
  onUploadPress
}) => {
  const getStatusColor = (status) => {
    if (!status) return { backgroundColor: '#757575', textColor: '#ffffff' }; // Gray for no status
    
    const normalized = (status || '').toLowerCase().replace(/\s+/g, '-');
    
    // Status color mapping for appointments (matching CreateAppointmentModal)
    const statusColors = {
      'pending': { backgroundColor: '#FFC107', textColor: '#000000' },        // Amber - waiting
      'confirm': { backgroundColor: '#4DA3FF', textColor: '#ffffff' },        // Light Blue - confirmed
      'confirmed': { backgroundColor: '#4DA3FF', textColor: '#ffffff' },     // Light Blue - confirmed (alias)
      'cancel': { backgroundColor: '#E53935', textColor: '#ffffff' },         // Red - cancelled
      'canceled': { backgroundColor: '#E53935', textColor: '#ffffff' },     // Red - cancelled (alias)
      'cancelled': { backgroundColor: '#E53935', textColor: '#ffffff' },   // Red - cancelled (alias)
      'completed': { backgroundColor: '#2E7D32', textColor: '#ffffff' },     // Dark Green - done
      'in-progress': { backgroundColor: '#28A745', textColor: '#ffffff' },   // Medium Green - active
      'in progress': { backgroundColor: '#28A745', textColor: '#ffffff' },   // Medium Green - active (alias)
      'scheduled': { backgroundColor: '#26A69A', textColor: '#ffffff' },       // Teal - scheduled
    };
    
    // Check for exact matches or contains
    if (normalized === 'pending') return statusColors.pending;
    if (normalized.includes('confirm')) return statusColors.confirmed || statusColors.confirm;
    if (normalized.includes('cancel')) return statusColors.cancel;
    if (normalized.includes('completed') || normalized === 'complete') return statusColors.completed;
    if (normalized.includes('in-progress') || normalized.includes('in progress')) return statusColors['in-progress'];
    if (normalized.includes('scheduled')) return statusColors.scheduled;
    
    // Default to gray
    return { backgroundColor: '#757575', textColor: '#ffffff' };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTime = (timeString) => {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // If showUploadButton is true, card is not tappable (inspection report page)
  // If onPress is provided and showUploadButton is false, card is tappable (appointment page)
  const CardWrapper = showUploadButton ? View : (onPress ? TouchableOpacity : View);
  const cardProps = showUploadButton ? {} : (onPress ? { onPress, activeOpacity: 0.7 } : {});

  return (
    <CardWrapper style={styles.card} {...cardProps}>
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(appointment.status).backgroundColor }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(appointment.status).textColor }
          ]}>
            {appointment.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.type}>Type: <Text style={styles.typeValue}>{appointment.type}</Text></Text>
        <Text style={styles.title}>{appointment.title}</Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date: <Text style={styles.detailValue}>{formatDate(appointment.date)}</Text></Text>
            <Text style={styles.detailLabel}>Start Time: <Text style={styles.detailValue}>{formatTime(appointment.startTime)}</Text></Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Day: <Text style={styles.detailValue}>{getDayName(appointment.date)}</Text></Text>
            <Text style={styles.detailLabel}>End Time: <Text style={styles.detailValue}>{formatTime(appointment.endTime)}</Text></Text>
          </View>
        </View>
        
        {/* Upload Button - Only show when showUploadButton is true */}
        {showUploadButton && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent triggering the card's onPress
              if (onUploadPress) {
                onUploadPress(appointment);
              }
            }}
            activeOpacity={0.7}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>Upload Report</Text>
          </TouchableOpacity>
        )}
      </View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  statusContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  type: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
    fontWeight: '400',
  },
  typeValue: {
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
    lineHeight: 22,
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '400',
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppointmentCard;
