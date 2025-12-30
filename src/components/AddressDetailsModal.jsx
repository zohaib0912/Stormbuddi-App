import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
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

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text style={styles.detailRowValue}>{value || '--'}</Text>
  </View>
);

const AddressDetailsModal = ({
  visible,
  onClose,
  loading,
  error,
  propertyDetails,
  manualAddress,
  manualZipCode,
  onManualAddressChange,
  onManualZipChange,
  onStreetViewPress,
  onAddMarker,
  saving,
  pendingMarker,
  streetViewImageUrl,
  streetViewImageLoading,
  streetViewImageError,
  onFetchStreetView,
}) => {
  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : width,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim, visible]);

  if (!visible) {
    return null;
  }

  const city =
    propertyDetails?.city ||
    propertyDetails?.City ||
    propertyDetails?.mailing_city ||
    propertyDetails?.MailingCity ||
    '';
  const state =
    propertyDetails?.state ||
    propertyDetails?.State ||
    propertyDetails?.mailing_state ||
    propertyDetails?.MailingState ||
    '';

  const owner =
    propertyDetails?.Owner_Full_Name ||
    propertyDetails?.owner ||
    propertyDetails?.ownerName ||
    propertyDetails?.owner_name ||
    'No Primary Contact';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[styles.modalContainer, { transform: [{ translateX: slideAnim }] }]}
        >
          {/* Modern Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerIconContainer}>
                <Icon name="location-on" size={24} color={colors.primary} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerSubtitle}>New Address</Text>
                <Text style={styles.headerTitle}>Property Details</Text>
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

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            bounces={true}
          >
            {/* Address Input Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="edit-location" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Address Information</Text>
              </View>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full address"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={manualAddress}
                  onChangeText={onManualAddressChange}
                  autoCorrect={false}
                />
                <View style={styles.helperContainer}>
                  <Icon name="info-outline" size={14} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.helperText}>
                    This address will be saved with the marker
                  </Text>
                </View>
              </View>
            </View>

            {/* Loading State */}
            {loading && (
              <View style={styles.statusCard}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.statusText}>Fetching property details...</Text>
              </View>
            )}

            {/* Error State */}
            {error && (
              <View style={[styles.statusCard, styles.errorCard]}>
                <Icon name="error-outline" size={20} color={colors.error} />
                <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
              </View>
            )}

            {/* Street View Preview */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="streetview" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Street View</Text>
              </View>
              <View style={styles.streetViewCard}>
                {streetViewImageLoading ? (
                  <View style={styles.imagePlaceholder}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.placeholderText}>Loading Street View...</Text>
                  </View>
                ) : streetViewImageUrl && !streetViewImageError ? (
                  <Image
                    source={{ uri: streetViewImageUrl }}
                    style={styles.streetViewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Icon name="streetview" size={48} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.placeholderText}>
                      {streetViewImageError
                        ? 'Street View unavailable'
                        : 'Street View will load here'}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.primaryButton,
                    (!pendingMarker || streetViewImageLoading) && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    if (pendingMarker) {
                      onFetchStreetView(pendingMarker);
                      onStreetViewPress(pendingMarker);
                    }
                  }}
                  disabled={!pendingMarker || streetViewImageLoading}
                  activeOpacity={0.8}
                >
                  <Icon name="explore" color={colors.white} size={18} />
                  <Text style={styles.actionButtonText}>
                    {streetViewImageLoading ? 'Loading...' : 'Open Street View'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Property Details */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="home" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Property Information</Text>
              </View>
              <View style={styles.detailsCard}>
                <DetailRow label="Street" value={manualAddress || propertyDetails?.street} />
                <View style={styles.divider} />
                <DetailRow
                  label="Location"
                  value={`${city || '--'}, ${state || '--'} ${manualZipCode || propertyDetails?.zip_code || '--'}`}
                />
                <View style={styles.divider} />
                <DetailRow label="Owner" value={owner} />
                <View style={styles.divider} />
                <DetailRow
                  label="Property Type"
                  value={
                    propertyDetails?.PropertyType ||
                    propertyDetails?.property_type ||
                    propertyDetails?.UseCode ||
                    '--'
                  }
                />
                <View style={styles.divider} />
                <DetailRow
                  label="Year Built"
                  value={propertyDetails?.YearBuilt || propertyDetails?.year_built || '--'}
                />
                <View style={styles.divider} />
                <DetailRow
                  label="Lot Size"
                  value={propertyDetails?.LotSize || propertyDetails?.lot_size || '--'}
                />
                <View style={styles.divider} />
                <DetailRow
                  label="Structure Size"
                  value={propertyDetails?.StructureSize || propertyDetails?.building_area || '--'}
                />
                <View style={styles.divider} />
                <DetailRow
                  label="Last Sale Date"
                  value={propertyDetails?.LastSaleDate || propertyDetails?.sale_date || '--'}
                />
                <View style={styles.divider} />
                <DetailRow
                  label="Sale Price"
                  value={propertyDetails?.SalePrice || propertyDetails?.sale_price || '--'}
                />
              </View>
            </View>

            {/* Zip Code Input */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="markunread-mailbox" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Zip Code (Optional)</Text>
              </View>
              <View style={styles.inputCard}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter zip code"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="number-pad"
                  value={manualZipCode}
                  onChangeText={onManualZipChange}
                  maxLength={10}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={onAddMarker}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Icon name="add-location" size={20} color={colors.white} />
                  <Text style={styles.saveButtonText}>Save Address Marker</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 202, 197, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop : 10,
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
    marginTop : 10,
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
    marginTop : 10,
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
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.white,
    fontSize: 15,
    marginBottom: 8,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  helperText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    flex: 1,
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
  streetViewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    height: 220,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 13,
  },
  streetViewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
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
  detailRowLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRowValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AddressDetailsModal;
