import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors } from '../theme/colors';

const LeadCard = ({ 
  lead,
  onPress,
  onCreateJob,
  onViewJob,
  hasJob = false,
  style 
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const splitDate = (dateString) => {
    const formatted = formatDate(dateString);
    // Split by comma - first part is date, second part is time
    const parts = formatted.split(',');
    if (parts.length >= 2) {
      return {
        datePart: parts[0] + ',',
        timePart: parts.slice(1).join(',').trim(),
      };
    }
    // Fallback if format is different
    const spaceIndex = formatted.lastIndexOf(' ');
    if (spaceIndex > 0) {
      return {
        datePart: formatted.substring(0, spaceIndex),
        timePart: formatted.substring(spaceIndex + 1),
      };
    }
    return {
      datePart: formatted,
      timePart: '',
    };
  };

  const formatTimeInStage = (timeInStage) => {
    // If it's already formatted, return as is
    if (typeof timeInStage === 'string' && timeInStage.includes(':')) {
      return timeInStage;
    }
    return timeInStage;
  };

  const getStatusColor = (status) => {
    const normalized = (status || '').toLowerCase().replace(/\s+/g, '-');
    
    // Status color mapping based on the provided color scheme
    const statusColors = {
      // Job statuses
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
      
      // Lead statuses (keeping legacy support)
      'unactioned': '#4DA3FF',       // Light Blue (new)
      'new': '#4DA3FF',               // Light Blue (new)
      'pending': '#FFC107',           // Amber (proposal-sent)
      'contacted': '#26A69A',        // Teal (appointment-scheduled)
      'qualified': '#28A745',         // Medium Green (in-progress)
      'open': '#0D47A1',              // Navy Blue (work-order)
      'signed': '#FF9800',            // Orange (proposal-signed)
      'proposal-viewed': '#FFC107',   // Amber (proposal-sent)
    };
    
    return statusColors[normalized] || colors.primary;
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
        {/* Header with date/time and Job button */}
        <View style={styles.header}>
          <View style={styles.dateContainer}>
            {(() => {
              const { datePart, timePart } = splitDate(lead.lastUpdated);
              return (
                <>
                  <Text style={styles.dateTime}>{datePart}</Text>
                  {timePart ? <Text style={styles.dateTime}>{timePart}</Text> : null}
                </>
              );
            })()}
          </View>
          <TouchableOpacity 
            style={hasJob ? styles.viewJobButton : styles.createJobButton}
            onPress={hasJob ? onViewJob : onCreateJob}
            activeOpacity={0.8}
          >
            <Icon 
              name={hasJob ? 'eye' : 'briefcase'} 
              size={14} 
              color={hasJob ? '#ffffff' : '#fff'} 
              style={styles.iconStyle}
            />
            <Text style={hasJob ? styles.jobText : styles.createJobText}>{hasJob ? 'View Job' : 'Create Job'}</Text>
          </TouchableOpacity>
        </View>

        {/* Details section */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated:</Text>
            <Text style={styles.detailValue}>{formatDate(lead.lastUpdated)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time In Stage:</Text>
            <Text style={styles.detailValue}>{formatTimeInStage(lead.timeInStage)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>{lead.address}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, { color: getStatusColor(lead.status) }]}>
              {lead.status}
            </Text>
          </View>
          
          {/* Workflow removed as requested */}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lead Source:</Text>
            <Text style={styles.detailValue}>{lead.source || 'Unknown'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assignee:</Text>
            <Text style={styles.detailValue}>None</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assigned To:</Text>
            <Text style={styles.detailValue}>None</Text>
          </View>
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
    flexWrap: 'wrap',
  },
  dateContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    marginRight: 8,
  },
  dateTime: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  createJobButton: {
    backgroundColor: '#4CAF50', // Light green
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 110,
  },
  viewJobButton: {
    backgroundColor: '#03A9F4', // Light blue
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 110,
  },
  iconStyle: {
    marginRight: 6,
  },
  jobText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  createJobText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  detailsContainer: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
  },
});

export default LeadCard;
