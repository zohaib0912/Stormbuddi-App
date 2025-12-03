import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const formatHailValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '---';
  }
  return `${numeric.toFixed(2)}"`;
};

const formatHistoryDate = (date) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date || '--';
  }
  return parsed.toLocaleDateString('en-US');
};

const normalizeTableValue = (value) => {
  if (value === null || value === undefined || value === '' || value === '---') {
    return '---';
  }
  return String(value);
};

const buildImpactHistoryRows = (entries = []) => {
  const rowsMap = new Map();

  entries.forEach((entry) => {
    if (entry && (entry.at_location !== undefined || entry.one_mi !== undefined)) {
      const dateKey = entry.date_key || entry.date;
      if (!dateKey) {
        return;
      }
      if (!rowsMap.has(dateKey)) {
        rowsMap.set(dateKey, {
          date: dateKey,
          displayDate: formatHistoryDate(dateKey),
          atLocation: '---',
          mi1: '---',
          mi3: '---',
          mi10: '---',
        });
      }
      const row = rowsMap.get(dateKey);
      row.atLocation = normalizeTableValue(entry.at_location);
      row.mi1 = normalizeTableValue(entry.one_mi);
      row.mi3 = normalizeTableValue(entry.three_mi);
      row.mi10 = normalizeTableValue(entry.ten_mi);
      return;
    }

    const dateKey = entry?.date || entry?.report?.dateTimeISO?.split('T')[0];
    if (!dateKey) return;
    if (!rowsMap.has(dateKey)) {
      rowsMap.set(dateKey, {
        date: dateKey,
        displayDate: formatHistoryDate(dateKey),
        atLocation: '---',
        mi1: '---',
        mi3: '---',
        mi10: '---',
      });
    }
    const row = rowsMap.get(dateKey);
    const hailValue = formatHailValue(
      entry?.report?.detail?.hailIN ||
        entry?.report?.detail?.hailIn ||
        entry?.report?.hailIN ||
        entry?.hailIN ||
        entry?.detail?.hailIN,
    );
    const distance = Number(entry?.relativeTo?.distanceMI);
    if (Number.isFinite(distance)) {
      if (distance === 0) row.atLocation = hailValue;
      if (distance <= 1) row.mi1 = hailValue;
      if (distance <= 3) row.mi3 = hailValue;
      if (distance <= 10) row.mi10 = hailValue;
    } else if (hailValue !== '---') {
      row.mi10 = hailValue;
    }
  });

  return Array.from(rowsMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

const CustomerInfoModal = ({
  visible,
  onClose,
  customer,
  onStreetViewPress,
  onShowImpactHistory,
  onBackToSummary,
  showImpactHistory,
  impactHistory,
  impactHistoryLoading,
  impactHistoryError,
  markerOptions = [],
  selectedMarkerKey = 'default',
  onSelectMarker,
  updatingMarkerIcon = false,
  pendingMarkerIcon = null,
}) => {
  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : width,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim, visible]);

  if (!visible || !customer) {
    return null;
  }

  const city =
    customer.city ||
    customer.mailing_city ||
    customer.City ||
    customer.MailingCity ||
    '--';
  const state =
    customer.state ||
    customer.mailing_state ||
    customer.State ||
    customer.MailingState ||
    '--';
  const zip = customer.zip_code || customer.postal_code || customer.zip || '--';
  const name =
    customer.name ||
    customer.Owner_Full_Name ||
    customer.owner ||
    customer.business_name ||
    'N/A';
  const email = customer.email || customer.customer_email || 'N/A';
  const phone = customer.phone || customer.customer_phone || 'N/A';
  const street = customer.address || customer.street || 'N/A';
  const canLaunchStreetView =
    Number.isFinite(parseFloat(customer.latitude)) &&
    Number.isFinite(parseFloat(customer.longitude));

  const historyRows = buildImpactHistoryRows(impactHistory);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[styles.modalContainer, { transform: [{ translateX: slideAnim }] }]}
        >
          {showImpactHistory ? (
            <>
              {/* Impact History Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={onBackToSummary}
                    activeOpacity={0.8}
                  >
                    <Icon name="arrow-back" size={20} color={colors.white} />
                  </TouchableOpacity>
                  <View style={styles.headerIconContainer}>
                    <Icon name="timeline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerSubtitle}>Impact History</Text>
                    <Text style={styles.headerTitle}>Hail Records</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Icon name="close" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Impact History Content */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                bounces={true}
              >
                {impactHistoryLoading ? (
                  <View style={styles.statusCard}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={styles.statusText}>Loading impact history...</Text>
                  </View>
                ) : null}

                {impactHistoryError ? (
                  <View style={[styles.statusCard, styles.errorCard]}>
                    <Icon name="error-outline" size={20} color={colors.error} />
                    <Text style={[styles.statusText, styles.errorText]}>{impactHistoryError}</Text>
                  </View>
                ) : null}

                {!impactHistoryLoading && !impactHistoryError && historyRows.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Icon name="info-outline" size={48} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyStateText}>No hail impact history found.</Text>
                  </View>
                ) : null}

                {historyRows.length > 0 && (
                  <View style={styles.historyTable}>
                    <View style={[styles.historyRow, styles.historyHeaderRow]}>
                      <Text style={[styles.historyCell, styles.historyDateCell]}>Date</Text>
                      <Text style={styles.historyCell}>at location</Text>
                      <Text style={styles.historyCell}>1 mi</Text>
                      <Text style={styles.historyCell}>3 mi</Text>
                      <Text style={styles.historyCell}>10 mi</Text>
                    </View>
                    {historyRows.map((row) => (
                      <View key={row.date} style={styles.historyRow}>
                        <Text style={[styles.historyCell, styles.historyDateCell]}>
                          {row.displayDate}
                        </Text>
                        <Text style={styles.historyCell}>{row.atLocation}</Text>
                        <Text style={styles.historyCell}>{row.mi1}</Text>
                        <Text style={styles.historyCell}>{row.mi3}</Text>
                        <Text style={styles.historyCell}>{row.mi10}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </>
          ) : (
            <>
              {/* Customer Info Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <View style={styles.headerIconContainer}>
                    <Icon name="person-pin-circle" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerSubtitle}>Customer</Text>
                    <Text style={styles.headerTitle}>
                      {customer.displayName || 'Customer Info'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Icon name="close" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Customer Info Content */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                bounces={true}
              >
                {/* Action Button */}
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={onShowImpactHistory}
                    activeOpacity={0.8}
                  >
                    <Icon name="timeline" size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>View Impact History</Text>
                  </TouchableOpacity>
                </View>

                {/* Marker Picker */}
                {markerOptions.length > 0 && onSelectMarker && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Icon name="place" size={18} color={colors.primary} />
                      <Text style={styles.sectionTitle}>Marker Type</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.markerPickerScrollContent}
                    >
                      {markerOptions.map((option) => {
                        const isSelected = selectedMarkerKey === option.value;
                        const isPending = pendingMarkerIcon === option.value && updatingMarkerIcon;
                        return (
                          <TouchableOpacity
                            key={option.id}
                            style={[
                              styles.markerOptionCard,
                              isSelected && styles.markerOptionCardSelected,
                            ]}
                            activeOpacity={0.85}
                            onPress={() => onSelectMarker(option.value)}
                            disabled={updatingMarkerIcon && !isSelected && isPending}
                          >
                            <Image source={option.image} style={styles.markerOptionImage} />
                            <Text style={styles.markerOptionLabel}>{option.label}</Text>
                            {isPending ? (
                              <ActivityIndicator color={colors.primary} size="small" />
                            ) : isSelected ? (
                              <View style={styles.checkCircleContainer}>
                                <Icon name="check" size={14} color={colors.primary} />
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Customer Card
                <View style={styles.section}>
                  <View style={styles.customerCard}>
                    <View style={styles.customerBadge}>
                      <Icon name="person" size={28} color={colors.primary} />
                    </View>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerLabel}>Current Marker</Text>
                      <Text style={styles.customerValue}>{customer.displayName || 'New'}</Text>
                    </View>
                  </View>
                </View> */}

                {/* Customer Details */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="info" size={18} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                  </View>
                  <View style={styles.detailsCard}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowHeader}>
                        <Icon name="home" size={16} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.detailRowLabel}>Street Address</Text>
                      </View>
                      <View style={styles.detailRowValueContainer}>
                        <Text style={styles.detailRowValue}>{street}</Text>
                        <TouchableOpacity
                          style={[
                            styles.streetViewButton,
                            !canLaunchStreetView && styles.buttonDisabled,
                          ]}
                          onPress={onStreetViewPress}
                          disabled={!canLaunchStreetView}
                          activeOpacity={0.8}
                        >
                          <Icon name="streetview" size={16} color={colors.white} />
                          <Text style={styles.streetViewButtonText}>View</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowHeader}>
                        <Icon name="location-city" size={16} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.detailRowLabel}>Location</Text>
                      </View>
                      <Text style={styles.detailRowValue}>{`${city}, ${state} ${zip}`}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowHeader}>
                        <Icon name="person" size={16} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.detailRowLabel}>Name</Text>
                      </View>
                      <Text style={styles.detailRowValue}>{name}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowHeader}>
                        <Icon name="email" size={16} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.detailRowLabel}>Email</Text>
                      </View>
                      <Text style={styles.detailRowValue}>{email}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowHeader}>
                        <Icon name="phone" size={16} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.detailRowLabel}>Phone</Text>
                      </View>
                      <Text style={styles.detailRowValue}>{phone}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: Math.min(width * 0.92, 440),
    height: height * 0.95,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 16,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 15,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 202, 197, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    marginTop: 10,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  markerPickerScrollContent: {
    paddingRight: 16,
  },
  markerOptionCard: {
    width: 85,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  markerOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(31, 202, 197, 0.15)',
  },
  markerOptionImage: {
    width: 36,
    height: 36,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  markerOptionLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: colors.white,
    fontWeight: '600',
    marginBottom: 6,
  },
  checkCircleContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 16,
  },
  customerBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(31, 202, 197, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  detailRow: {
    marginBottom: 16,
  },
  detailRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailRowLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRowValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailRowValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  streetViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  streetViewButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 202, 197, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(31, 202, 197, 0.2)',
  },
  errorCard: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderColor: 'rgba(211, 47, 47, 0.2)',
  },
  statusText: {
    color: colors.white,
    fontSize: 13,
    flex: 1,
  },
  errorText: {
    color: colors.error,
  },
  emptyStateCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  historyTable: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  historyRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  historyHeaderRow: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  historyCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: colors.white,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  historyDateCell: {
    flex: 1.4,
    textAlign: 'left',
    fontWeight: '600',
  },
});

export default CustomerInfoModal;
