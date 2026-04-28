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

const { width } = Dimensions.get('window');

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
      duration: 250,
      easing: Easing.out(Easing.ease),
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
      <Pressable style={styles.detailsModalOverlay} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={styles.detailsModalPressable}
          pointerEvents="auto"
        >
          <Animated.View style={[styles.detailsModalCard, { transform: [{ translateX: slideAnim }] }]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {showImpactHistory ? (
                <>
                  <View style={styles.customerModalHeader}>
                    <TouchableOpacity
                      style={styles.historyBackButton}
                      onPress={onBackToSummary}
                      activeOpacity={0.85}
                    >
                      <Icon name="arrow-back" size={18} color={colors.white} />
                      <Text style={styles.historyBackText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose}>
                      <Icon name="close" size={20} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.historyTitle}>Hail Impact History</Text>
                  {impactHistoryLoading ? (
                    <View style={styles.historyLoading}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.historyLoadingText}>Loading impact history...</Text>
                    </View>
                  ) : null}
                  {impactHistoryError ? (
                    <Text style={styles.historyErrorText}>{impactHistoryError}</Text>
                  ) : null}
                  {!impactHistoryLoading && !impactHistoryError && historyRows.length === 0 ? (
                    <Text style={styles.historyEmptyText}>No hail impact history found.</Text>
                  ) : null}
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
                        <Text style={[styles.historyCell, styles.historyDateCell]}>{row.displayDate}</Text>
                        <Text style={styles.historyCell}>{row.atLocation}</Text>
                        <Text style={styles.historyCell}>{row.mi1}</Text>
                        <Text style={styles.historyCell}>{row.mi3}</Text>
                        <Text style={styles.historyCell}>{row.mi10}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.customerModalHeader}>
                    <Text style={styles.customerModalTitle}>Customer Info</Text>
                    <TouchableOpacity onPress={onClose}>
                      <Icon name="close" size={20} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.customerActionRow}>
                    <TouchableOpacity
                      style={styles.customerActionButton}
                      onPress={onShowImpactHistory}
                      activeOpacity={0.85}
                    >
                      <Icon name="timeline" size={16} color={colors.white} />
                      <Text style={styles.customerActionText}>Show Impact History</Text>
                    </TouchableOpacity>
                  </View>
                  {markerOptions.length > 0 && onSelectMarker && (
                    <View style={styles.markerPickerSection}>
                      <Text style={styles.markerPickerTitle}>Custom Marker</Text>
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
                                  <Icon name="check" size={14} color="#007AFF" />
                                </View>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                  <View style={styles.customerCard}>
                    <View style={styles.customerBadge}>
                      <Icon name="person-pin-circle" size={28} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerLabel}>Current Marker:</Text>
                      <Text style={styles.customerValue}>{customer.displayName || 'New'}</Text>
                    </View>
                  </View>
                  <View style={styles.customerSection}>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerFieldLabel}>Street:</Text>
                      <Text style={styles.customerFieldValue}>{street}</Text>
                      <TouchableOpacity
                        style={[styles.streetViewButton, !canLaunchStreetView && styles.buttonDisabled]}
                        onPress={onStreetViewPress}
                        disabled={!canLaunchStreetView}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.streetViewButtonText}>Street View</Text>
                        <Icon name="chevron-right" size={16} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerFieldLabel}>City / State / Zip:</Text>
                      <Text style={styles.customerFieldValue}>{`${city}, ${state} ${zip}`}</Text>
                    </View>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerFieldLabel}>Name:</Text>
                      <Text style={styles.customerFieldValue}>{name}</Text>
                    </View>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerFieldLabel}>Email:</Text>
                      <Text style={styles.customerFieldValue}>{email}</Text>
                    </View>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerFieldLabel}>Phone:</Text>
                      <Text style={styles.customerFieldValue}>{phone}</Text>
                    </View>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerFieldLabel}>Address:</Text>
                      <Text style={styles.customerFieldValue}>{street}</Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  detailsModalPressable: {
    width: '100%',
    alignItems: 'flex-end',
  },
  detailsModalCard: {
    width: Math.min(width * 0.9, 420),
    height: '100%',
    backgroundColor: colors.primaryDark,
    padding: 20,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  customerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerModalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  customerActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  customerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1fcac5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  customerActionText: {
    color: colors.white,
    fontWeight: '600',
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
    gap: 12,
  },
  customerBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  customerValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  customerSection: {
    gap: 12,
  },
  markerPickerSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  markerPickerTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  markerPickerScrollContent: {
    paddingRight: 16,
  },
  markerOptionCard: {
    width: 80,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  markerOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  markerOptionImage: {
    width: 32,
    height: 32,
    marginBottom: 6,
    resizeMode: 'contain',
  },
  markerOptionLabel: {
    fontSize: 10,
    textAlign: 'center',
    color: colors.white,
    marginBottom: 4,
  },
  checkCircleContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerRow: {
    gap: 6,
  },
  customerFieldLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  customerFieldValue: {
    color: colors.white,
    fontSize: 14,
  },
  historyBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  historyBackText: {
    color: colors.white,
    fontWeight: '600',
  },
  historyTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 12,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historyLoadingText: {
    color: colors.white,
  },
  historyErrorText: {
    color: colors.error,
    marginBottom: 12,
    fontWeight: '600',
  },
  historyEmptyText: {
    color: colors.white,
    marginBottom: 12,
    opacity: 0.8,
  },
  historyTable: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: colors.white,
    fontSize: 12,
    textAlign: 'center',
  },
  historyDateCell: {
    flex: 1.4,
    textAlign: 'left',
  },
  streetViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    columnGap: 6,
    alignSelf: 'flex-start',
  },
  streetViewButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default CustomerInfoModal;

