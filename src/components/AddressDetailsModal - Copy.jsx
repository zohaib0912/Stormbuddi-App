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

const { width } = Dimensions.get('window');

const DetailRow = ({ label, value }) => (
  <View style={styles.detailsRow}>
    <Text style={styles.detailsRowLabel}>{label}</Text>
    <Text style={styles.detailsRowValue}>{value || '--'}</Text>
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
      duration: 250,
      easing: Easing.out(Easing.ease),
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
      <Pressable style={styles.detailsModalOverlay} onPress={onClose} pointerEvents="box-none">
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={styles.detailsModalPressable}
          pointerEvents="auto"
        >
          <Animated.View style={[styles.detailsModalCard, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.detailsModalHeader}>
              <View>
                <Text style={styles.detailsModalEyebrow}>Property Insights</Text>
                <Text style={styles.detailsModalTitle}>Enter Address</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Icon name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={true}
            >
              <View style={styles.detailsInputSection}>
                <Text style={styles.detailsInputLabel}>Enter Address Manually</Text>
                <TextInput
                  style={styles.detailsTextInput}
                  placeholder="452G+6C Randado, TX, USA"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={manualAddress}
                  onChangeText={onManualAddressChange}
                  autoCorrect={false}
                />
                <Text style={styles.detailsHelperText}>
                  We'll use this address when saving the marker. You can fine tune it before submitting.
                </Text>
              </View>

              {loading ? (
                <View style={styles.detailsLoading}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={styles.detailsLoadingText}>Fetching property details...</Text>
                </View>
              ) : null}

              {error ? <Text style={styles.detailsErrorText}>{error}</Text> : null}

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Location Preview</Text>
                <View style={styles.detailsPreviewCard}>
                  {streetViewImageLoading ? (
                    <View style={styles.detailsImagePlaceholder}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.detailsImagePlaceholderText}>
                        Loading Street View...
                      </Text>
                    </View>
                  ) : streetViewImageUrl && !streetViewImageError ? (
                    <Image
                      source={{ uri: streetViewImageUrl }}
                      style={styles.detailsStreetViewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.detailsImagePlaceholder}>
                      <Icon name="streetview" size={32} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.detailsImagePlaceholderText}>
                        {streetViewImageError 
                          ? 'Street View not available for this location' 
                          : 'Street View will load automatically'}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.streetViewButton,
                      (!pendingMarker || streetViewImageLoading) && styles.buttonDisabled
                    ]}
                    onPress={() => {
                      if (pendingMarker) {
                        onFetchStreetView(pendingMarker);
                        onStreetViewPress(pendingMarker);
                      }
                    }}
                    disabled={!pendingMarker || streetViewImageLoading}
                    activeOpacity={0.85}
                  >
                    <Icon name="explore" color={colors.white} size={16} />
                    <Text style={styles.streetViewButtonText}>
                      {streetViewImageLoading ? 'Loading...' : 'Refresh & Open Street View'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Property Snapshot</Text>
                <View style={styles.detailsInfoCard}>
                  <DetailRow label="Street" value={manualAddress || propertyDetails?.street} />
                  <View style={styles.detailsDivider} />
                  <DetailRow
                    label="City / State / Zip"
                    value={`${city || '--'}, ${state || '--'} ${manualZipCode || propertyDetails?.zip_code || '--'}`}
                  />
                  <View style={styles.detailsDivider} />
                  <DetailRow label="Owner" value={owner} />
                  <View style={styles.detailsDivider} />
                  <DetailRow
                    label="Property Type"
                    value={
                      propertyDetails?.PropertyType ||
                      propertyDetails?.property_type ||
                      propertyDetails?.UseCode ||
                      '--'
                    }
                  />
                  <View style={styles.detailsDivider} />
                  <DetailRow
                    label="Year Built"
                    value={propertyDetails?.YearBuilt || propertyDetails?.year_built || '--'}
                  />
                  <View style={styles.detailsDivider} />
                  <DetailRow
                    label="Lot Size"
                    value={propertyDetails?.LotSize || propertyDetails?.lot_size || '--'}
                  />
                  <View style={styles.detailsDivider} />
                  <DetailRow
                    label="Structure Size"
                    value={propertyDetails?.StructureSize || propertyDetails?.building_area || '--'}
                  />
                  <View style={styles.detailsDivider} />
                  <DetailRow
                    label="Last Sale Date"
                    value={propertyDetails?.LastSaleDate || propertyDetails?.sale_date || '--'}
                  />
                  <View style={styles.detailsDivider} />
                  <DetailRow
                    label="Sale Price"
                    value={propertyDetails?.SalePrice || propertyDetails?.sale_price || '--'}
                  />
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Zip Code (optional)</Text>
                <TextInput
                  style={styles.detailsTextInput}
                  placeholder="Enter zip code"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  keyboardType="number-pad"
                  value={manualZipCode}
                  onChangeText={onManualZipChange}
                  maxLength={10}
                />
              </View>

              <TouchableOpacity
                style={[styles.addMarkerButton, saving && styles.addMarkerButtonDisabled]}
                onPress={onAddMarker}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Icon name="place" size={18} color={colors.white} />
                    <Text style={styles.addMarkerButtonText}>Add Address Marker</Text>
                  </>
                )}
              </TouchableOpacity>
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
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsModalEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailsModalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  detailsInputSection: {
    marginBottom: 20,
  },
  detailsInputLabel: {
    color: colors.white,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  detailsTextInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 14,
  },
  detailsHelperText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 6,
  },
  detailsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 12,
  },
  detailsLoadingText: {
    color: colors.white,
    fontSize: 13,
  },
  detailsErrorText: {
    color: colors.error,
    marginBottom: 12,
    fontWeight: '600',
  },
  detailsSection: {
    marginTop: 18,
  },
  detailsSectionTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  detailsPreviewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  detailsImagePlaceholder: {
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  detailsImagePlaceholderText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    fontSize: 12,
  },
  detailsStreetViewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  detailsInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  detailsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 10,
  },
  detailsRow: {
    marginBottom: 10,
  },
  detailsRowLabel: {
    color: colors.white,
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
  },
  detailsRowValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  addMarkerButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    columnGap: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addMarkerButtonDisabled: {
    opacity: 0.7,
  },
  addMarkerButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AddressDetailsModal;

