/**
 * Canvassing Screen
 * 
 * Displays a full-screen Google Map for canvassing activities
 */

import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Linking,
  Image,
} from 'react-native';
import Header from '../components/Header';
import AddressDetailsModal from '../components/AddressDetailsModal';
import CustomerInfoModal from '../components/CustomerInfoModal';
import PageLoader from '../components/PageLoader';
import { colors } from '../theme/colors';
import { getToken } from '../utils/tokenStorage';
import usePageLoader from '../hooks/usePageLoader';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const { width, height } = Dimensions.get('window');

const HAIL_SIZE_COLORS = [
  { threshold: 0.5, color: '#F9E604', label: '0.5' },
  { threshold: 1.0, color: '#F99F04', label: '1' },
  { threshold: 1.25, color: '#F94B04', label: '1.25' },
  { threshold: 1.5, color: '#FF0099', label: '1.5' },
  { threshold: 1.75, color: '#D600FF', label: '1.75' },
  { threshold: 2.0, color: '#9500FF', label: '2' },
  { threshold: 2.25, color: '#6A00FF', label: '2.25' },
  { threshold: 2.5, color: '#3300FF', label: '2.5' },
  { threshold: 2.75, color: '#0094FF', label: '2.75' },
  { threshold: 3.0, color: '#00C8FF', label: '3' },
  { threshold: Infinity, color: '#FFFFFF', label: '3+' },
];

const HAIL_LEGEND_ITEMS = [
  { label: '0.5', color: '#F9E604' },
  { label: '1', color: '#F99F04' },
  { label: '1.25', color: '#F94B04' },
  { label: '1.5', color: '#FF0099' },
  { label: '1.75', color: '#D600FF' },
  { label: '2', color: '#9500FF' },
  { label: '2.25', color: '#6A00FF' },
  { label: '2.5', color: '#3300FF' },
  { label: '2.75', color: '#0094FF' },
  { label: '3', color: '#00C8FF' },
  { label: '3+', color: '#FFFFFF' },
];

const GOOGLE_PLACES_API_KEY = 'AIzaSyAOaDH4S6rmAAxVplU8Qc_KfbWVWUxeGxE'; // TODO: move to secure config

const MARKER_ICON_OPTIONS = [
  { id: 'default', label: 'Default', value: 'default', image: require('../assets/images/Pull-Contact-Data.png') },
  { id: 'monitoring', label: 'Monitoring', value: 'monitoring', image: require('../assets/images/Monitoring.png') },
  { id: 'inbound', label: 'Inbound Lead', value: 'inbound-lead', image: require('../assets/images/Inbound-Lead.png') },
  { id: 'outbound', label: 'Outbound Lead', value: 'outbound-lead', image: require('../assets/images/Outbound-Lead.png') },
  { id: 'lead', label: 'Lead', value: 'lead', image: require('../assets/images/Lead.png') },
  { id: 'major', label: 'Major Damage', value: 'major-damage', image: require('../assets/images/Major-Damage.png') },
  { id: 'very-severe', label: 'Very Severe', value: 'very-severe', image: require('../assets/images/Very-Severe.png') },
  { id: 'severe', label: 'Severe', value: 'severe', image: require('../assets/images/Severe.png') },
  { id: 'slightly-severe', label: 'Slightly Severe', value: 'slightly-severe', image: require('../assets/images/Slightly-Severe.png') },
  { id: 'not-severe', label: 'Not Severe', value: 'not-severe', image: require('../assets/images/Not-Severe.png') },
  { id: 'no-status', label: 'No Status', value: 'no-status', image: require('../assets/images/No-Status.png') },
  { id: 'warranty', label: 'Warranty', value: 'warranty', image: require('../assets/images/Warranty.png') },
];

const getMarkerIconSource = (markerKey) => {
  const match = MARKER_ICON_OPTIONS.find((opt) => opt.value === markerKey);
  return match ? match.image : MARKER_ICON_OPTIONS[0].image;
};

// Map marker types to lead status values for API
const mapMarkerTypeToLeadStatus = (markerType) => {
  const mapping = {
    'default': 'Monitoring',
    'monitoring': 'Monitoring',
    'inbound-lead': 'Inbound Lead',
    'outbound-lead': 'Outbound Lead',
    'lead': 'Lead',
    'major-damage': 'Major Damage',
    'very-severe': 'Very Severe',
    'severe': 'Severe',
    'slightly-severe': 'Slightly Severe',
    'not-severe': 'Not Severe',
    'no-status': 'No Status',
    'warranty': 'Warranty',
  };
  
  return mapping[markerType] || markerType;
};

// Map lead status (from database) to marker key (for icon display)
const mapLeadStatusToMarkerKey = (leadStatus) => {
  if (!leadStatus) return 'default';
  
  const mapping = {
    'Monitoring': 'monitoring',
    'Inbound Lead': 'inbound-lead',
    'Outbound Lead': 'outbound-lead',
    'Lead': 'lead',
    'Major Damage': 'major-damage',
    'Very Severe': 'very-severe',
    'Severe': 'severe',
    'Slightly Severe': 'slightly-severe',
    'Not Severe': 'not-severe',
    'No Status': 'no-status',
    'Warranty': 'warranty',
  };
  
  return mapping[leadStatus] || 'default';
};

const getColorForHailSize = (size) => {
  const defaultColor = 'rgba(255, 255, 255, 0.3)';
  if (!size && size !== 0) {
    return defaultColor;
  }
  const numericSize = typeof size === 'number' ? size : parseFloat(size);
  if (Number.isNaN(numericSize)) {
    return defaultColor;
  }
  const entry = HAIL_SIZE_COLORS.find(({ threshold }) => numericSize <= threshold);
  if (!entry) {
    return defaultColor;
  }

  const hex = entry.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.3)`;
};

// Try to import MapView, handle if it fails
let MapView = null;
let Polygon = null;
let Marker = null;
let Callout = null;
let PROVIDER_GOOGLE = null;
let ClusteredMapView = null;
try {
  const mapsModule = require('react-native-maps');
  MapView = mapsModule.default;
  Polygon = mapsModule.Polygon;
  Marker = mapsModule.Marker;
  Callout = mapsModule.Callout;
  PROVIDER_GOOGLE = mapsModule.PROVIDER_GOOGLE;
  
  // Try to import clustering
  try {
    const clusteringModule = require('react-native-map-clustering');
    ClusteredMapView = clusteringModule.default;
  } catch (clusteringError) {
    console.warn('react-native-map-clustering not available:', clusteringError);
  }
} catch (error) {
  console.warn('react-native-maps not available:', error);
}

const Canvassing = ({ navigation }) => {
  const [region, setRegion] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [mapError, setMapError] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [mapPressLocation, setMapPressLocation] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customersError, setCustomersError] = useState(null);
  const mapRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const pendingMarkerRef = useRef(null);
  const placesSearchRef = useRef(null);
  const polygonClickRef = useRef(false);
  const [hailDates, setHailDates] = useState([]);
  const [isHailDateModalVisible, setIsHailDateModalVisible] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const [pendingMarker, setPendingMarker] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [manualAddress, setManualAddress] = useState('');
  const [manualZipCode, setManualZipCode] = useState('');
  const [savingMarker, setSavingMarker] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showImpactHistory, setShowImpactHistory] = useState(false);
  const [impactHistory, setImpactHistory] = useState([]);
  const [impactHistoryLoading, setImpactHistoryLoading] = useState(false);
  const [impactHistoryError, setImpactHistoryError] = useState(null);
  const [isUpdatingMarkerIcon, setIsUpdatingMarkerIcon] = useState(false);
  const [pendingMarkerIcon, setPendingMarkerIcon] = useState(null);
  const [streetViewImageUrl, setStreetViewImageUrl] = useState(null);
  const [streetViewImageLoading, setStreetViewImageLoading] = useState(false);
  const [streetViewImageError, setStreetViewImageError] = useState(false);
  const [showPlacesList, setShowPlacesList] = useState('auto');
  const [forceClosePlacesList, setForceClosePlacesList] = useState(false);
  const [searchAddressText, setSearchAddressText] = useState('');

  // Use the page loader hook - start with false, only show when screen is focused
  const { shouldShowLoader, startLoading, stopLoading, resetLoader } = usePageLoader(false);

  const handleNotificationPress = () => {
    // Handle notification press if needed
  };

  const resolvePlaceDetails = async (placeData, placeDetails) => {
    if (placeDetails?.geometry?.location) {
      return placeDetails;
    }

    if (placeData?.place_id && placesSearchRef.current?.getDetailsByPlaceId) {
      try {
        const fetchedDetails = await placesSearchRef.current.getDetailsByPlaceId(placeData.place_id);
        return fetchedDetails;
      } catch (error) {
        console.warn('Failed to fetch place details by place_id:', error);
      }
    }

    return null;
  };

  const handleAddressSelect = async (placeData, placeDetails) => {
    const resolvedDetails = await resolvePlaceDetails(placeData, placeDetails);
    const location = resolvedDetails?.geometry?.location;
    if (!location) {
      console.warn('Selected place is missing geometry data');
      return;
    }

    // Reset street view when selecting new address
    setStreetViewImageUrl(null);
    setStreetViewImageError(false);
    setStreetViewImageLoading(false);

    const nextRegion = {
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setSelectedPolygon(null);
    setRegion((prev) => ({
      ...prev,
      ...nextRegion,
    }));
    
    // Only create pendingMarker if there's no customer at this location
    if (!hasCustomerAtLocation(nextRegion.latitude, nextRegion.longitude)) {
      setPendingMarker({
        latitude: nextRegion.latitude,
        longitude: nextRegion.longitude,
        address: placeData?.description || '',
        zipCode: null,
        attomData: null,
      });
    } else {
      // Clear pendingMarker if customer exists at this location
      setPendingMarker(null);
    }
    setManualAddress(placeData?.description || '');
    setManualZipCode('');
    setPropertyDetails(null);
    setDetailsError(null);

    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(nextRegion, 600);
    }

    const addressText = placeData?.description || '';
    placesSearchRef.current?.setAddressText?.(addressText);
    setSearchAddressText(addressText);
    // Close the dropdown after selection
    setShowPlacesList(false);
    setForceClosePlacesList(true);
    setTimeout(() => {
      placesSearchRef.current?.blur?.();
    }, 100);
  };

  const handleClearAddress = () => {
    // Close the dropdown first
    setShowPlacesList(false);
    setForceClosePlacesList(true);
    
    // Clear the address text
    placesSearchRef.current?.setAddressText?.('');
    setSearchAddressText('');
    
    // Blur the input immediately to close dropdown
    placesSearchRef.current?.blur?.();
    
    // Clear all related state
    setPendingMarker(null);
    setManualAddress('');
    setManualZipCode('');
    setPropertyDetails(null);
    setDetailsError(null);
    setSelectedPolygon(null);
    setStreetViewImageUrl(null);
    setStreetViewImageError(false);
    setStreetViewImageLoading(false);
  };

  const handleMapPress = (event) => {
    // Close the suggested address dropdown when map is clicked
    setShowPlacesList(false);
    setForceClosePlacesList(true);
    // Blur the input to ensure dropdown closes
    placesSearchRef.current?.blur?.();
    
    // If a polygon was just clicked, don't clear it or create a marker
    if (polygonClickRef.current) {
      return; // Exit early, don't create marker or clear polygon
    }
    
    const coordinate = event?.nativeEvent?.coordinate;
    if (!coordinate) {
      return;
    }
    setMapPressLocation(coordinate);
    
    // Reset street view when selecting new location
    setStreetViewImageUrl(null);
    setStreetViewImageError(false);
    setStreetViewImageLoading(false);
    
    const nextRegion = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    // Don't set region state here - let animation handle it via onRegionChangeComplete
    // This prevents double updates that cause blinking
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(nextRegion, 400);
    }
    setSelectedPolygon(null);
    
    // Only create pendingMarker if there's no customer at this location
    if (!hasCustomerAtLocation(coordinate.latitude, coordinate.longitude)) {
      setPendingMarker({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: '',
        zipCode: null,
        attomData: null,
      });
    } else {
      // Clear pendingMarker if customer exists at this location
      setPendingMarker(null);
    }
    setManualAddress('');
    setManualZipCode('');
    setPropertyDetails(null);
    setDetailsError(null);
  };

  const handleViewDetailsPress = () => {
    if (!pendingMarker) {
      Alert.alert('Select Location', 'Tap on the map to pick a location first.');
      return;
    }
    setDetailsModalVisible(true);
    setSelectedCustomer(null);
    setCustomerModalVisible(false);
    setShowImpactHistory(false);
    setImpactHistory([]);
  };
  
  const handleStreetViewPress = (coords = pendingMarker) => {
    if (!coords || !coords.latitude || !coords.longitude) {
      Alert.alert('Unavailable', 'Missing coordinates for Street View.');
      return;
    }
    // Refresh the street view image
    fetchStreetViewImage(coords);
    // Also open in external Maps app for full interactive experience
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coords.latitude},${coords.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Unavailable', 'Street View is not available for this location.');
    });
  };

  // Fetch Street View image using Google Street View Static API
  const fetchStreetViewImage = async (coords = pendingMarker) => {
    if (!coords || !coords.latitude || !coords.longitude) {
      setStreetViewImageUrl(null);
      setStreetViewImageError(true);
      return;
    }

    const lat = coords.latitude;
    const lng = coords.longitude;
    
    // Google Street View Static API URL
    // Documentation: https://developers.google.com/maps/documentation/streetview/request-streetview
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&fov=90&heading=0&pitch=0&key=${GOOGLE_PLACES_API_KEY}`;
    
    setStreetViewImageLoading(true);
    setStreetViewImageError(false);
    
    // Verify the image exists by fetching it
    try {
      const response = await fetch(streetViewUrl);
      
      if (response.ok && response.status === 200) {
        const contentType = response.headers.get('content-type');
        // Google returns image/jpeg for valid Street View, or HTML error page for unavailable
        if (contentType && contentType.startsWith('image/')) {
          setStreetViewImageUrl(streetViewUrl);
          setStreetViewImageError(false);
        } else {
          // Google returned an error page (HTML)
          setStreetViewImageUrl(null);
          setStreetViewImageError(true);
        }
      } else {
        setStreetViewImageUrl(null);
        setStreetViewImageError(true);
      }
    } catch (error) {
      console.warn('Street View fetch error:', error);
      setStreetViewImageUrl(null);
      setStreetViewImageError(true);
    } finally {
      setStreetViewImageLoading(false);
    }
  };

  const fetchAttomData = async ({ latitude, longitude }) => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required.');
    }
    const response = await fetch('https://app.stormbuddi.com/api/fetch-attom-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ lat: latitude, lng: longitude }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to contact Attom API');
      throw new Error(errorText || 'Failed to contact Attom API');
    }

    return response.json();
  };

  const fetchGoogleAddress = async ({ latitude, longitude }) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Unable to reach Google Geocoding API');
    }
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error('No address found for this location');
    }

    const primary = data.results[0];
    const postalComponent = primary.address_components?.find((component) =>
      component.types?.includes('postal_code'),
    );

    return {
      address: primary.formatted_address,
      zipCode: postalComponent?.long_name ?? null,
    };
  };

  const addAddressMarker = async ({ latitude, longitude, address, attomData, zipCode }) => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required.');
    }
    const response = await fetch('https://app.stormbuddi.com/api/mobile/dashboard/add-address-marker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        lat: latitude,
        lng: longitude,
        address,
        attom_data: attomData,
        zip_code: zipCode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to save marker');
      throw new Error(errorText || 'Failed to save marker');
    }

    return response.json();
  };

  const fetchHailImpactHistory = async ({ latitude, longitude, fromDateISO, toDateISO }) => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required.');
    }

    const url = new URL('https://app.stormbuddi.com/api/nexrad/hail-impact-history-table');
    url.searchParams.append('lat', latitude);
    url.searchParams.append('lng', longitude);
    url.searchParams.append('from_date', fromDateISO);
    url.searchParams.append('to_date', toDateISO);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Failed to load hail impact history');
      throw new Error(text || 'Failed to load hail impact history');
    }

    const data = await response.json();
    return data;
  };

  const updateCustomerMarkerIcon = async ({ customerId, markerKey }) => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required.');
    }

    const leadStatus = mapMarkerTypeToLeadStatus(markerKey);
    
    const requestBody = {
      customer_id: customerId,
      lead_status: leadStatus,
    };

    console.log('Calling update-customer-marker API:', {
      url: 'https://app.stormbuddi.com/api/mobile/dashboard/update-customer-marker',
      method: 'POST',
      body: requestBody,
      markerKey: markerKey,
      leadStatus: leadStatus,
    });

    const response = await fetch('https://app.stormbuddi.com/api/mobile/dashboard/update-customer-marker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('API Response status:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text().catch(() => 'Failed to update customer marker');
      console.error('API Error response:', text);
      throw new Error(text || 'Failed to update customer marker');
    }

    const responseData = await response.json();
    console.log('API Success response:', responseData);
    return responseData;
  };

  const handleSelectCustomMarker = async (markerKey) => {
    console.log('handleSelectCustomMarker called:', {
      markerKey,
      selectedCustomer: selectedCustomer ? { id: selectedCustomer.id, lead_status: selectedCustomer.lead_status } : null,
    });

    if (!selectedCustomer) {
      console.warn('No selected customer, aborting marker update');
      return;
    }

    const newLeadStatus = mapMarkerTypeToLeadStatus(markerKey);
    if (newLeadStatus === selectedCustomer.lead_status) {
      console.log('Lead status unchanged, skipping API call');
      return;
    }

    console.log('Updating marker:', {
      customerId: selectedCustomer.id,
      from: selectedCustomer.lead_status,
      to: newLeadStatus,
    });

    setPendingMarkerIcon(markerKey);
    setIsUpdatingMarkerIcon(true);
    try {
      const response = await updateCustomerMarkerIcon({ customerId: selectedCustomer.id, markerKey });
      
      // Use the lead_status from API response if available, otherwise use the one we mapped
      const updatedLeadStatus = response?.lead_status || 
                               response?.data?.lead_status || 
                               response?.customer?.lead_status ||
                               newLeadStatus;

      console.log('Marker updated successfully:', {
        customerId: selectedCustomer.id,
        leadStatus: updatedLeadStatus,
        apiResponse: response,
      });

      setCustomers((prev) => {
        const updated = prev.map((customer) => {
          // Compare IDs as strings to handle type mismatches
          const customerIdStr = String(customer.id);
          const selectedIdStr = String(selectedCustomer.id);
          
          if (customerIdStr === selectedIdStr) {
            return { ...customer, lead_status: updatedLeadStatus };
          }
          return customer;
        });
        
        // Remove any duplicates (in case the update somehow created one)
        const unique = updated.reduce((acc, customer) => {
          const customerIdStr = String(customer.id);
          if (!acc.find(c => String(c.id) === customerIdStr)) {
            acc.push(customer);
          }
          return acc;
        }, []);
        
        return unique;
      });
      setSelectedCustomer((prev) => (prev ? { ...prev, lead_status: updatedLeadStatus } : null));
    } catch (error) {
      console.error('Failed to update marker:', error);
      Alert.alert('Unable to update marker', error.message || 'Please try again.');
    } finally {
      setIsUpdatingMarkerIcon(false);
      setPendingMarkerIcon(null);
    }
  };

  const handleAddAddressMarker = async () => {
    if (!pendingMarker) {
      return;
    }
    const addressToPersist = manualAddress || pendingMarker.address;
    if (!addressToPersist) {
      Alert.alert('Address Required', 'Please provide an address before saving.');
      return;
    }

    setSavingMarker(true);
    try {
      const response = await addAddressMarker({
        latitude: pendingMarker.latitude,
        longitude: pendingMarker.longitude,
        address: addressToPersist,
        attomData: propertyDetails ?? pendingMarker.attomData ?? null,
        zipCode: manualZipCode || pendingMarker.zipCode || null,
      });

      if (!response?.success || !response?.customer) {
        throw new Error('Unexpected response while saving marker.');
      }

      const savedCustomer = response.customer;
      const newCustomerId = savedCustomer.id?.toString() ?? `customer-${Date.now()}`;
      
      setCustomers((prev) => {
        // Check if customer already exists (by ID)
        const existingIndex = prev.findIndex(c => String(c.id) === newCustomerId);
        
        if (existingIndex >= 0) {
          // Update existing customer
          return prev.map((customer, index) =>
            index === existingIndex
              ? {
                  ...customer,
                  ...savedCustomer,
                  id: newCustomerId,
                  latitude: parseFloat(savedCustomer.latitude),
                  longitude: parseFloat(savedCustomer.longitude),
                  displayName: savedCustomer.address || savedCustomer.name || 'Customer',
                  lead_status: savedCustomer.lead_status || customer.lead_status || 'Monitoring',
                }
              : customer
          );
        }
        
        // Add new customer
        return [
          ...prev,
          {
            ...savedCustomer,
            id: newCustomerId,
            latitude: parseFloat(savedCustomer.latitude),
            longitude: parseFloat(savedCustomer.longitude),
            displayName: savedCustomer.address || savedCustomer.name || 'Customer',
            lead_status: savedCustomer.lead_status || 'Monitoring',
          },
        ];
      });

      setPendingMarker(null);
      setDetailsModalVisible(false);
      setPropertyDetails(null);
      setManualAddress('');
      setManualZipCode('');
      setSelectedCustomer({
        ...savedCustomer,
        latitude: parseFloat(savedCustomer.latitude),
        longitude: parseFloat(savedCustomer.longitude),
      });
      setShowImpactHistory(false);
      setImpactHistory([]);
      setImpactHistoryError(null);
      setCustomerModalVisible(true);
    } catch (error) {
      Alert.alert('Unable to Save Marker', error.message || 'Please try again.');
    } finally {
      setSavingMarker(false);
    }
  };

  const handleCloseCustomerModal = () => {
    setCustomerModalVisible(false);
    setSelectedCustomer(null);
    setShowImpactHistory(false);
    setImpactHistory([]);
    setImpactHistoryError(null);
  };

  // Check if there's a customer marker at the given coordinates
  const hasCustomerAtLocation = (latitude, longitude, threshold = 0.0001) => {
    return customers.some((customer) => {
      const latDiff = Math.abs(parseFloat(customer.latitude) - latitude);
      const lngDiff = Math.abs(parseFloat(customer.longitude) - longitude);
      return latDiff < threshold && lngDiff < threshold;
    });
  };

  const handleCustomerMarkerPress = (customer) => {
    if (!customer) {
      return;
    }

    const normalizedCustomer = {
      ...customer,
      latitude: parseFloat(customer.latitude),
      longitude: parseFloat(customer.longitude),
    };

    setDetailsModalVisible(false);
    setPendingMarker(null);
    setSelectedPolygon(null);
    setSelectedCustomer(normalizedCustomer);
    setShowImpactHistory(false);
    setImpactHistory([]);
    setImpactHistoryError(null);
    setCustomerModalVisible(true);
  };

  const handleShowImpactHistory = async () => {
    if (!selectedCustomer) {
      return;
    }

    const latitude = parseFloat(selectedCustomer.latitude);
    const longitude = parseFloat(selectedCustomer.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert('Location Missing', 'Unable to fetch impact history for this marker.');
      return;
    }

    setShowImpactHistory(true);
    setImpactHistoryLoading(true);
    setImpactHistoryError(null);
    try {
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setFullYear(toDate.getFullYear() - 5);
      fromDate.setUTCHours(0, 0, 0, 0);
      toDate.setUTCHours(23, 59, 59, 0);

      const responseData = await fetchHailImpactHistory({
        latitude,
        longitude,
        fromDateISO: formatDateTimeForImpact(fromDate),
        toDateISO: formatDateTimeForImpact(toDate),
      });

      const rows = Array.isArray(responseData?.table_data)
        ? responseData.table_data
        : Array.isArray(responseData?.response)
        ? responseData.response
        : [];
      setImpactHistory(rows);
    } catch (error) {
      setImpactHistoryError(error.message || 'Failed to load hail impact history');
    } finally {
      setImpactHistoryLoading(false);
    }
  };

  // Format date as YYYY-MM-DD for API
  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTimeForImpact = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(
      date.getUTCHours(),
    )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}-0000`;
  };

  const fetchHailDates = async () => {
    try {
      const response = await fetch('https://app.stormbuddi.com/api/nexrad/local-dates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Unable to fetch hail dates (status ${response.status})`);
      }

      const data = await response.json();
      const rawDates =
        (Array.isArray(data?.dates) && data.dates) ||
        (Array.isArray(data?.data) && data.data) ||
        (Array.isArray(data) && data) ||
        [];

      const parsed = rawDates
        .map((entry, idx) => {
          const value = entry?.date || entry;
          if (!value) return null;
          const parsedDate = new Date(value);
          if (Number.isNaN(parsedDate.getTime())) {
            return null;
          }
          return {
            id: `${value}-${idx}`,
            date: parsedDate,
            hasImpact: entry?.hasImpact ?? entry?.has_impact ?? true,
            polygonCount: entry?.polygon_count ?? null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10);

      setHailDates(parsed);
      if (!selectedDate && parsed.length > 0) {
        setSelectedDate(parsed[0].date);
      }
    } catch (error) {
      console.error('Hail dates fetch error:', error);
      setCustomersError(error.message || 'Failed to load hail dates');
    }
  };

  const fetchHomeData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/dashboard/home-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const rawCustomers =
        (Array.isArray(data?.customers) && data.customers) ||
        (Array.isArray(data?.data?.customers) && data.data.customers) ||
        [];

      const normalizedCustomers = rawCustomers
        .map((customer, index) => {
          const latitude = parseFloat(
            customer.latitude ??
            customer.lat ??
            customer.location_lat ??
            customer.customer_latitude,
          );
          const longitude = parseFloat(
            customer.longitude ??
            customer.lng ??
            customer.location_lng ??
            customer.customer_longitude,
          );

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
          }

          // Use lead_status from database
          const leadStatus = customer.lead_status || 
                            customer.leadStatus || 
                            'Monitoring';

          // Log lead_status for debugging (only log first few to avoid spam)
          if (index < 3) {
            console.log('Customer lead_status:', {
              id: customer.id,
              lead_status: customer.lead_status,
              leadStatus: customer.leadStatus,
              resolved: leadStatus,
              allFields: Object.keys(customer),
            });
          }

          return {
            ...customer,
            id: customer.id ?? `customer-${index}`,
            latitude,
            longitude,
            displayName:
              customer.name ||
              customer.business_name ||
              customer.firstname ||
              customer.lastname ||
              customer.username ||
              'Customer',
            lead_status: leadStatus,
          };
        })
        .filter(Boolean);

      // Remove duplicates based on customer ID (keep the first occurrence)
      const uniqueCustomers = normalizedCustomers.reduce((acc, customer) => {
        const customerIdStr = String(customer.id);
        if (!acc.find(c => String(c.id) === customerIdStr)) {
          acc.push(customer);
        }
        return acc;
      }, []);

      console.log('Loaded customers with lead_status:', uniqueCustomers.map(c => ({
        id: c.id,
        lead_status: c.lead_status,
      })));

      setCustomers(uniqueCustomers);
      setCustomersError(null);

      // Keep map focus driven by hail polygons rather than customer markers
    } catch (error) {
      console.error('Home data fetch error:', error);
      setCustomersError(error.message || 'Failed to load customers');
    }
  };

  // Fetch NEXRAD data and create polygons
  const fetchNexradData = async (date = selectedDate) => {
    if (!date) return;
    startLoading();
    setMapError(null);
    
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Format date as YYYY-MM-DD
      const formattedDate = formatDateForAPI(date);

      
      // Add date as query parameter
      const apiUrl = `https://app.stormbuddi.com/api/nexrad/local-date-data?date=${formattedDate}`;
      
      console.log('Fetching NEXRAD data for date:', formattedDate);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
        console.error('API Error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('NEXRAD data fetched:', data);
      
      // Process GeoJSON data and convert to polygon coordinates
      const processedPolygons = processGeoJsonData(data);
      setPolygons(processedPolygons);
      
      // Adjust map region to fit all polygons if we have data
      if (processedPolygons.length > 0) {
        focusOnHailPolygons(processedPolygons);
      }
      
    } catch (err) {
      console.error('NEXRAD data fetch error:', err);
      setMapError(err.message || 'Failed to load NEXRAD data');
    } finally {
      stopLoading();
    }
  };

  // Process GeoJSON data and convert to polygon format for react-native-maps
  const processGeoJsonData = (data) => {
    const polygonsArray = [];
    
    // Handle different possible response formats
    let geoJsonData = null;
    
    if (data.features) {
      // Standard GeoJSON format
      geoJsonData = data;
    } else if (data.data && data.data.features) {
      // Wrapped in data object
      geoJsonData = data.data;
    } else if (data.success && data.data) {
      // Check if data itself is GeoJSON
      if (data.data.features) {
        geoJsonData = data.data;
      } else if (Array.isArray(data.data)) {
        // Array of features
        geoJsonData = { type: 'FeatureCollection', features: data.data };
      }
    } else if (Array.isArray(data)) {
      // Direct array of features
      geoJsonData = { type: 'FeatureCollection', features: data };
    }

    if (!geoJsonData || !geoJsonData.features) {
      console.warn('Invalid GeoJSON format:', data);
      return [];
    }

    // Process each feature
    geoJsonData.features.forEach((feature, index) => {
      if (feature.geometry && feature.geometry.type === 'Polygon') {
        // Polygon coordinates: [[[lng, lat], [lng, lat], ...]]
        const coordinates = feature.geometry.coordinates[0];
        
        // Convert GeoJSON [lng, lat] to react-native-maps [lat, lng] format
        const polygonCoordinates = coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
        }));

        const hailSizeValue =
          feature.properties?.hailsize ||
          feature.properties?.hail_size ||
          feature.properties?.max_hail_size ||
          feature.properties?.min_hail_size;

        polygonsArray.push({
          id: feature.id || `polygon-${index}`,
          coordinates: polygonCoordinates,
          properties: feature.properties || {},
          fillColor: feature.properties?.color || getColorForHailSize(hailSizeValue),
          strokeColor: 'transparent',
          strokeWidth: 0,
        });
      } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
        // Handle MultiPolygon - create separate polygon for each polygon in the multipolygon
        feature.geometry.coordinates.forEach((polygonCoords, polyIndex) => {
          const coordinates = polygonCoords[0];
          const polygonCoordinates = coordinates.map(coord => ({
            latitude: coord[1],
            longitude: coord[0],
          }));

          const hailSizeValue =
            feature.properties?.hailsize ||
            feature.properties?.hail_size ||
            feature.properties?.max_hail_size ||
            feature.properties?.min_hail_size;

          polygonsArray.push({
            id: feature.id || `multipolygon-${index}-${polyIndex}`,
            coordinates: polygonCoordinates,
            properties: feature.properties || {},
            fillColor: feature.properties?.color || getColorForHailSize(hailSizeValue),
            strokeColor: 'transparent',
            strokeWidth: 0,
          });
        });
      }
    });

    return polygonsArray;
  };

  // Adjust map region to fit all polygons
  const adjustMapRegion = (polygons) => {
    if (polygons.length === 0) return;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    polygons.forEach(polygon => {
      polygon.coordinates.forEach(coord => {
        if (!Number.isFinite(coord?.latitude) || !Number.isFinite(coord?.longitude)) {
          return;
        }
        minLat = Math.min(minLat, coord.latitude);
        maxLat = Math.max(maxLat, coord.latitude);
        minLng = Math.min(minLng, coord.longitude);
        maxLng = Math.max(maxLng, coord.longitude);
      });
    });

    if (!Number.isFinite(minLat) || !Number.isFinite(maxLat) || !Number.isFinite(minLng) || !Number.isFinite(maxLng)) {
      return;
    }

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * 1.5; // Add 50% padding
    const lngDelta = (maxLng - minLng) * 1.5;

    setRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    });
  };

  const focusOnHailPolygons = (polygonsToFocus = []) => {
    if (!Array.isArray(polygonsToFocus) || polygonsToFocus.length === 0) {
      return;
    }

    const allCoordinates = polygonsToFocus
      .flatMap((poly) => poly.coordinates || [])
      .filter(
        (coord) =>
          Number.isFinite(coord?.latitude) && Number.isFinite(coord?.longitude),
      );

    if (allCoordinates.length === 0) {
      return;
    }

    if (isMapReady && mapRef.current?.fitToCoordinates) {
      mapRef.current.fitToCoordinates(allCoordinates, {
        edgePadding: focusPadding,
        animated: true,
      });
    }

    adjustMapRegion(polygonsToFocus);
  };

  // Extract hail size from polygon properties
  const getHailSize = (properties = {}) => {
    return (
      properties.hailsize ||
      properties.hail_size ||
      properties.max_hail_size ||
      properties.min_hail_size ||
      properties.hailSize ||
      '--'
    );
  };

const getPolygonCentroid = (coordinates = []) => {
  if (!coordinates.length) {
    return null;
  }
  let sumLat = 0;
  let sumLng = 0;
  coordinates.forEach((coord) => {
    sumLat += coord.latitude;
    sumLng += coord.longitude;
  });
  return {
    latitude: sumLat / coordinates.length,
    longitude: sumLng / coordinates.length,
  };
};

  // Handle date change
  // Hail date modal selection
  const handleSelectHailDate = (date) => {
    setIsHailDateModalVisible(false);
    setSelectedDate(date);
  };

  // Only fetch data and show loader when Canvassing screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Canvassing screen focused');
      fetchHomeData();
      fetchHailDates();
      
      // Cleanup: stop loader when screen loses focus
      return () => {
        console.log('Canvassing screen blurred');
        resetLoader();
      };
    }, [])
  );

  useEffect(() => {
    if (selectedDate) {
      setSelectedPolygon(null);
      fetchNexradData(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isMapReady && polygons.length > 0) {
      focusOnHailPolygons(polygons);
    }
  }, [isMapReady, polygons]);

  useEffect(() => {
    if (selectedPolygon && selectedMarkerRef.current && selectedMarkerRef.current.showCallout) {
      // Delay to ensure marker is mounted
      setTimeout(() => {
        selectedMarkerRef.current?.showCallout();
      }, 0);
    }
  }, [selectedPolygon]);

  useEffect(() => {
    if (pendingMarker && pendingMarkerRef.current?.showCallout) {
      setTimeout(() => {
        pendingMarkerRef.current?.showCallout();
      }, 0);
    }
  }, [pendingMarker]);

  useEffect(() => {
    if (!detailsModalVisible || !pendingMarker) {
      return;
    }

    let isCancelled = false;

    const loadDetails = async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      
      // Fetch Street View image as soon as we have coordinates
      if (pendingMarker.latitude && pendingMarker.longitude) {
        fetchStreetViewImage(pendingMarker);
      }
      
      try {
        const attomResponse = await fetchAttomData(pendingMarker);
        if (isCancelled) return;
        const attomData =
          attomResponse?.data ||
          attomResponse?.property ||
          attomResponse?.customer ||
          attomResponse;

        if (!attomData) {
          throw new Error('No Attom data available');
        }

        const derivedAddress =
          attomData.address ||
          attomData.full_address ||
          attomData.AddressFull ||
          attomData.formatted_address ||
          pendingMarker.address ||
          '';

        const derivedZip =
          attomData.zip_code ||
          attomData.postal_code ||
          attomData.PostalCode ||
          attomData.zipcode ||
          pendingMarker.zipCode ||
          null;

        setPropertyDetails(attomData);
        setManualAddress(derivedAddress);
        setManualZipCode(derivedZip || '');
        setPendingMarker((prev) =>
          prev
            ? {
                ...prev,
                address: derivedAddress || prev.address,
                zipCode: derivedZip || prev.zipCode,
                attomData,
              }
            : prev,
        );
        return;
      } catch (attomError) {
        console.warn('Attom fetch failed, falling back to Google:', attomError);
        try {
          const googleData = await fetchGoogleAddress(pendingMarker);
          if (isCancelled) return;
          setPropertyDetails(null);
          setManualAddress(googleData.address);
          setManualZipCode(googleData.zipCode || '');
          setPendingMarker((prev) =>
            prev
              ? {
                  ...prev,
                  address: googleData.address,
                  zipCode: googleData.zipCode || prev.zipCode,
                }
              : prev,
          );
          // Still fetch street view even if Attom fails
          if (pendingMarker.latitude && pendingMarker.longitude) {
            fetchStreetViewImage(pendingMarker);
          }
          return;
        } catch (googleError) {
          console.warn('Google reverse geocode failed:', googleError);
          if (isCancelled) return;
          setDetailsError('Unable to fetch property details. Please enter manually.');
          setPropertyDetails(null);
          // Still try to fetch street view if we have coordinates
          if (pendingMarker.latitude && pendingMarker.longitude) {
            fetchStreetViewImage(pendingMarker);
          }
        }
      } finally {
        if (!isCancelled) {
          setDetailsLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isCancelled = true;
      // Reset street view when modal closes
      setStreetViewImageUrl(null);
      setStreetViewImageError(false);
      setStreetViewImageLoading(false);
    };
  }, [detailsModalVisible, pendingMarker?.latitude, pendingMarker?.longitude]);

  if (!MapView) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Header
          title="Canvassing"
          onNotificationPress={handleNotificationPress}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Map is not available. Please rebuild the app after installing react-native-maps.
          </Text>
          <Text style={styles.errorSubText}>
            Run: npm run android (or npm run ios) to rebuild
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <Header
        title="Canvassing"
        onNotificationPress={handleNotificationPress}
      />

      {customersError && (
        <View style={styles.inlineErrorBanner}>
          <Text style={styles.inlineErrorText}>{customersError}</Text>
        </View>
      )}

      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading canvassing data..."
      />

      {/* Full Screen Map */}
      <View style={styles.mapContainer}>
        {mapError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Map Error: {mapError}</Text>
            <Text style={styles.errorSubText}>
              Please check your Google Maps API key configuration
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {ClusteredMapView ? (
              <ClusteredMapView
                ref={mapRef}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={styles.map}
                region={region}
                onRegionChangeComplete={(newRegion) => {
                  // Only update if region actually changed to prevent feedback loops
                  setRegion((prev) => {
                    const threshold = 0.0001;
                    const latDiff = Math.abs(prev.latitude - newRegion.latitude);
                    const lngDiff = Math.abs(prev.longitude - newRegion.longitude);
                    const latDeltaDiff = Math.abs(prev.latitudeDelta - newRegion.latitudeDelta);
                    const lngDeltaDiff = Math.abs(prev.longitudeDelta - newRegion.longitudeDelta);
                    
                    if (latDiff > threshold || lngDiff > threshold || 
                        latDeltaDiff > threshold || lngDeltaDiff > threshold) {
                      return newRegion;
                    }
                    return prev;
                  });
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                showsScale={true}
                zoomEnabled={true}
                zoomControlEnabled={Platform.OS === 'android'}
                scrollEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
                mapType={mapType}
                loadingEnabled={true}
                toolbarEnabled={Platform.OS === 'android'}
                onPress={handleMapPress}
                onMapReady={() => {
                  console.log('Map is ready');
                  setMapError(null);
                  setIsMapReady(true);
                }}
                onError={(error) => {
                  console.error('Map error:', error);
                  setMapError(error.message || 'Unknown map error');
                }}
                radius={120}
                maxZoom={9}
                minZoom={0}
                extent={512}
                nodeSize={64}
                edgePadding={{ top: 50, right: 50, bottom: 50, left: 50 }}
                clusterColor="#007AFF"
                clusterTextColor="#FFFFFF"
                clusterFontFamily="System"
                animationEnabled={true}
              >
                {Marker
                  ? customers.map((customer) => (
                      <Marker
                        key={`${customer.id}-${customer.lead_status || 'default'}`}
                        coordinate={{
                          latitude: customer.latitude,
                          longitude: customer.longitude,
                        }}
                        title={customer.displayName}
                        description={
                          customer.address ||
                          customer.street_address ||
                          customer.city ||
                          undefined
                        }
                        image={getMarkerIconSource(mapLeadStatusToMarkerKey(customer.lead_status))}
                        anchor={{ x: 0.5, y: 1 }}
                        tracksViewChanges={false}
                        onPress={() => handleCustomerMarkerPress(customer)}
                        zIndex={1}
                      />
                    ))
                  : null}
                {/* Render polygons from NEXRAD data */}
                {Polygon && polygons.map((polygon) => (
                  <Polygon
                    key={polygon.id}
                    coordinates={polygon.coordinates}
                    fillColor={polygon.fillColor}
                    strokeColor={polygon.strokeColor}
                    strokeWidth={polygon.strokeWidth}
                    tappable={true}
                    onPress={(event) => {
                      // Set flag to prevent handleMapPress from clearing the polygon
                      polygonClickRef.current = true;
                      
                      const hailSize = getHailSize(polygon.properties);
                      const centroid = getPolygonCentroid(polygon.coordinates);
                      const tapCoordinate = event?.nativeEvent?.coordinate || mapPressLocation;
                      const markerCoordinate = tapCoordinate || centroid || polygon.coordinates[0];
                      
                      // Set the selected polygon to show hail info
                      setSelectedPolygon({
                        id: polygon.id,
                        hailSize,
                        pointCount: polygon.properties?.point_count,
                        maxHailSize: polygon.properties?.max_hail_size,
                        minHailSize: polygon.properties?.min_hail_size,
                        center: markerCoordinate,
                      });
                      
                      // Only create pendingMarker if there's no customer at this location
                      if (!hasCustomerAtLocation(markerCoordinate.latitude, markerCoordinate.longitude)) {
                        setPendingMarker({
                          latitude: markerCoordinate.latitude,
                          longitude: markerCoordinate.longitude,
                          address: '',
                          zipCode: null,
                          attomData: null,
                        });
                      } else {
                        // Clear pendingMarker if customer exists at this location
                        setPendingMarker(null);
                      }
                      
                      // Animate map to the clicked location
                      const nextRegion = {
                        latitude: markerCoordinate.latitude,
                        longitude: markerCoordinate.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      };
                      if (mapRef.current?.animateToRegion) {
                        mapRef.current.animateToRegion(nextRegion, 400);
                      }
                      
                      // Clear other states
                      setManualAddress('');
                      setManualZipCode('');
                      setPropertyDetails(null);
                      setDetailsError(null);
                      
                      // Use requestAnimationFrame to ensure state updates complete before allowing handleMapPress
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          // Reset the flag after state updates have completed
                          // This prevents handleMapPress from clearing the selectedPolygon
                          setTimeout(() => {
                            polygonClickRef.current = false;
                          }, 200);
                        });
                      });
                    }}
                  />
                ))}
                {Marker && pendingMarker && !hasCustomerAtLocation(pendingMarker.latitude, pendingMarker.longitude) ? (
                  <Marker
                    ref={pendingMarkerRef}
                    coordinate={{
                      latitude: pendingMarker.latitude,
                      longitude: pendingMarker.longitude,
                    }}
                    image={getMarkerIconSource('default')}
                    anchor={{ x: 0.5, y: 1 }}
                    tracksViewChanges={false}
                  >
                    {Callout ? (
                      <Callout tooltip onPress={handleViewDetailsPress}>
                        <View style={styles.pendingCallout}>
                          <Icon name="info" size={16} color={colors.white} />
                          <Text style={styles.pendingCalloutText}>View Details</Text>
                        </View>
                      </Callout>
                    ) : null}
                  </Marker>
                ) : null}
                {/* Removed hail callout marker - hail info now only shows in left side box */}
              </ClusteredMapView>
            ) : (
              <MapView
                ref={mapRef}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={styles.map}
                region={region}
                onRegionChangeComplete={(newRegion) => {
                  // Only update if region actually changed to prevent feedback loops
                  setRegion((prev) => {
                    const threshold = 0.0001;
                    const latDiff = Math.abs(prev.latitude - newRegion.latitude);
                    const lngDiff = Math.abs(prev.longitude - newRegion.longitude);
                    const latDeltaDiff = Math.abs(prev.latitudeDelta - newRegion.latitudeDelta);
                    const lngDeltaDiff = Math.abs(prev.longitudeDelta - newRegion.longitudeDelta);
                    
                    if (latDiff > threshold || lngDiff > threshold || 
                        latDeltaDiff > threshold || lngDeltaDiff > threshold) {
                      return newRegion;
                    }
                    return prev;
                  });
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                showsScale={true}
                zoomEnabled={true}
                zoomControlEnabled={Platform.OS === 'android'}
                scrollEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
                mapType={mapType}
                loadingEnabled={true}
                toolbarEnabled={Platform.OS === 'android'}
                onPress={handleMapPress}
                onMapReady={() => {
                  console.log('Map is ready');
                  setMapError(null);
                  setIsMapReady(true);
                }}
                onError={(error) => {
                  console.error('Map error:', error);
                  setMapError(error.message || 'Unknown map error');
                }}
              >
                {Marker
                  ? customers.map((customer) => (
                      <Marker
                        key={`${customer.id}-${customer.lead_status || 'default'}`}
                        coordinate={{
                          latitude: customer.latitude,
                          longitude: customer.longitude,
                        }}
                        title={customer.displayName}
                        description={
                          customer.address ||
                          customer.street_address ||
                          customer.city ||
                          undefined
                        }
                        image={getMarkerIconSource(mapLeadStatusToMarkerKey(customer.lead_status))}
                        anchor={{ x: 0.5, y: 1 }}
                        tracksViewChanges={false}
                        onPress={() => handleCustomerMarkerPress(customer)}
                        zIndex={1}
                      />
                    ))
                  : null}
                {/* Render polygons from NEXRAD data */}
                {Polygon && polygons.map((polygon) => (
                  <Polygon
                    key={polygon.id}
                    coordinates={polygon.coordinates}
                    fillColor={polygon.fillColor}
                    strokeColor={polygon.strokeColor}
                    strokeWidth={polygon.strokeWidth}
                    tappable={true}
                    onPress={(event) => {
                      // Set flag to prevent handleMapPress from clearing the polygon
                      polygonClickRef.current = true;
                      
                      const hailSize = getHailSize(polygon.properties);
                      const centroid = getPolygonCentroid(polygon.coordinates);
                      const tapCoordinate = event?.nativeEvent?.coordinate || mapPressLocation;
                      const markerCoordinate = tapCoordinate || centroid || polygon.coordinates[0];
                      
                      // Set the selected polygon to show hail info
                      setSelectedPolygon({
                        id: polygon.id,
                        hailSize,
                        pointCount: polygon.properties?.point_count,
                        maxHailSize: polygon.properties?.max_hail_size,
                        minHailSize: polygon.properties?.min_hail_size,
                        center: markerCoordinate,
                      });
                      
                      // Only create pendingMarker if there's no customer at this location
                      if (!hasCustomerAtLocation(markerCoordinate.latitude, markerCoordinate.longitude)) {
                        setPendingMarker({
                          latitude: markerCoordinate.latitude,
                          longitude: markerCoordinate.longitude,
                          address: '',
                          zipCode: null,
                          attomData: null,
                        });
                      } else {
                        // Clear pendingMarker if customer exists at this location
                        setPendingMarker(null);
                      }
                      
                      // Animate map to the clicked location
                      const nextRegion = {
                        latitude: markerCoordinate.latitude,
                        longitude: markerCoordinate.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      };
                      if (mapRef.current?.animateToRegion) {
                        mapRef.current.animateToRegion(nextRegion, 400);
                      }
                      
                      // Clear other states
                      setManualAddress('');
                      setManualZipCode('');
                      setPropertyDetails(null);
                      setDetailsError(null);
                      
                      // Use requestAnimationFrame to ensure state updates complete before allowing handleMapPress
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          // Reset the flag after state updates have completed
                          // This prevents handleMapPress from clearing the selectedPolygon
                          setTimeout(() => {
                            polygonClickRef.current = false;
                          }, 200);
                        });
                      });
                    }}
                  />
                ))}
                {Marker && pendingMarker && !hasCustomerAtLocation(pendingMarker.latitude, pendingMarker.longitude) ? (
                  <Marker
                    ref={pendingMarkerRef}
                    coordinate={{
                      latitude: pendingMarker.latitude,
                      longitude: pendingMarker.longitude,
                    }}
                    image={getMarkerIconSource('default')}
                    anchor={{ x: 0.5, y: 1 }}
                    tracksViewChanges={false}
                  >
                    {Callout ? (
                      <Callout tooltip onPress={handleViewDetailsPress}>
                        <View style={styles.pendingCallout}>
                          <Icon name="info" size={16} color={colors.white} />
                          <Text style={styles.pendingCalloutText}>View Details</Text>
                        </View>
                      </Callout>
                    ) : null}
                  </Marker>
                ) : null}
                {/* Removed hail callout marker - hail info now only shows in left side box */}
              </MapView>
            )}
            <View style={styles.searchContainer} pointerEvents="box-none">
              <View style={styles.searchInputWrapper}>
                <GooglePlacesAutocomplete
                  ref={placesSearchRef}
                  placeholder="Search address..."
                  onPress={handleAddressSelect}
                  query={{
                    key: GOOGLE_PLACES_API_KEY,
                    language: 'en',
                    types: 'address',
                    components: 'country:us',
                  }}
                  fetchDetails
                  debounce={300}
                  enablePoweredByContainer={false}
                  keyboardShouldPersistTaps="handled"
                  nearbyPlacesAPI="GooglePlacesSearch"
                  listViewDisplayed={forceClosePlacesList ? false : (searchAddressText && searchAddressText.length > 0 ? showPlacesList : false)}
                  onFocus={() => {
                    setForceClosePlacesList(false);
                    if (searchAddressText && searchAddressText.length > 0) {
                      setShowPlacesList('auto');
                    }
                  }}
                  styles={{
                    container: styles.placesContainer,
                    textInputContainer: styles.placesInputContainer,
                    textInput: [styles.placesTextInput, searchAddressText ? { paddingRight: 40 } : {}],
                    listView: styles.placesListView,
                    row: styles.placesRow,
                    separator: styles.placesSeparator,
                    description: styles.placesDescription,
                  }}
                  textInputProps={{
                    placeholderTextColor: colors.textSecondary,
                    returnKeyType: 'search',
                    onFocus: () => {
                      setForceClosePlacesList(false);
                      // Only show list if there's text in the search bar
                      if (searchAddressText && searchAddressText.length > 0) {
                        setShowPlacesList('auto');
                      } else {
                        setShowPlacesList(false);
                      }
                    },
                    onChangeText: (text) => {
                      setForceClosePlacesList(false);
                      const trimmedText = text || '';
                      setSearchAddressText(trimmedText);
                      // Only show list if there's text, otherwise keep it closed
                      if (trimmedText && trimmedText.length > 0) {
                        setShowPlacesList('auto');
                      } else {
                        setShowPlacesList(false);
                      }
                    },
                  }}
                />
                {searchAddressText.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClearAddress}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <Icon name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.mapTypeToggle}>
                {['standard', 'satellite'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mapTypeButton,
                      mapType === type && styles.mapTypeButtonActive,
                    ]}
                    onPress={() => setMapType(type)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.mapTypeButtonText,
                        mapType === type && styles.mapTypeButtonTextActive,
                      ]}
                    >
                      {type === 'standard' ? 'Map' : 'Satellite'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Hail Info Box - shown when a polygon is selected */}
              {selectedPolygon && (
                <View style={styles.hailInfoBox}>
                  <View style={styles.hailInfoBoxHeader}>
                    <Text style={styles.hailInfoBoxTitle}>Hail Size</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPolygon(null);
                        setPendingMarker(null);
                      }}
                      style={styles.hailInfoBoxCloseBtn}
                    >
                      <Icon name="close" size={16} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hailInfoBoxValue}>
                    {selectedPolygon.hailSize ? `${selectedPolygon.hailSize}"` : '--'}
                  </Text>
                  <View style={styles.hailInfoBoxMetaRow}>
                    {selectedPolygon.minHailSize ? (
                      <Text style={styles.hailInfoBoxMeta}>
                        Min {selectedPolygon.minHailSize}"
                      </Text>
                    ) : null}
                    {selectedPolygon.maxHailSize ? (
                      <Text style={styles.hailInfoBoxMeta}>
                        Max {selectedPolygon.maxHailSize}"
                      </Text>
                    ) : null}
                    {selectedPolygon.pointCount ? (
                      <Text style={styles.hailInfoBoxMeta}>
                        Points {selectedPolygon.pointCount}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>
                {selectedDate ? formatDateForDisplay(selectedDate) : 'Select hail date'}
              </Text>
              <TouchableOpacity
                style={styles.mapOverlayButton}
                onPress={() => setIsHailDateModalVisible(true)}
                activeOpacity={0.8}
              >
                <Icon name="calendar-today" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={isHailDateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsHailDateModalVisible(false)}
      >
        <Pressable
          style={styles.hailDateModalOverlay}
          onPress={() => setIsHailDateModalVisible(false)}
        >
          <View style={styles.hailDateModalCard}>
            <View style={styles.hailDateModalHeader}>
              <Text style={styles.hailDateModalTitle}>Hail Impact Dates</Text>
              <TouchableOpacity onPress={() => setIsHailDateModalVisible(false)}>
                <Icon name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={hailDates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.hailDateRow}
                  onPress={() => handleSelectHailDate(item.date)}
                >
                  <View style={styles.hailDateRowLeft}>
                    <Icon name="calendar-today" size={18} color={colors.white} />
                    <Text style={styles.hailDateText}>{formatDateForDisplay(item.date)}</Text>
                  </View>
                  {Number.isFinite(item.polygonCount) && (
                    <Text style={styles.hailDateCount}>{item.polygonCount}</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.hailDateEmpty}>No recent hail impacts found.</Text>
              }
            />
          </View>
        </Pressable>
      </Modal>

      <AddressDetailsModal
        visible={detailsModalVisible}
        onClose={() => {
          setDetailsModalVisible(false);
          setStreetViewImageUrl(null);
          setStreetViewImageError(false);
          setStreetViewImageLoading(false);
        }}
        loading={detailsLoading}
        error={detailsError}
        propertyDetails={propertyDetails}
        manualAddress={manualAddress}
        manualZipCode={manualZipCode}
        onManualAddressChange={setManualAddress}
        onManualZipChange={setManualZipCode}
        onStreetViewPress={handleStreetViewPress}
        onAddMarker={handleAddAddressMarker}
        saving={savingMarker}
        pendingMarker={pendingMarker}
        streetViewImageUrl={streetViewImageUrl}
        streetViewImageLoading={streetViewImageLoading}
        streetViewImageError={streetViewImageError}
        onFetchStreetView={fetchStreetViewImage}
      />
      <CustomerInfoModal
        visible={customerModalVisible}
        onClose={handleCloseCustomerModal}
        customer={selectedCustomer}
        onStreetViewPress={() => handleStreetViewPress(selectedCustomer)}
        onShowImpactHistory={handleShowImpactHistory}
        showImpactHistory={showImpactHistory}
        onBackToSummary={() => setShowImpactHistory(false)}
        impactHistory={impactHistory}
        impactHistoryLoading={impactHistoryLoading}
        impactHistoryError={impactHistoryError}
        markerOptions={MARKER_ICON_OPTIONS}
        selectedMarkerKey={selectedCustomer?.lead_status ? mapLeadStatusToMarkerKey(selectedCustomer.lead_status) : 'default'}
        onSelectMarker={handleSelectCustomMarker}
        updatingMarkerIcon={isUpdatingMarkerIcon}
        pendingMarkerIcon={pendingMarkerIcon}
      />
    </View>
  );
};




const focusPadding = { top: 80, right: 40, bottom: 80, left: 40 };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.text,
  },
  mapOverlay: {
    position: 'absolute',
    top: 72,
    right: 12,
    alignItems: 'flex-end',
    gap: 6,
    zIndex: 10,
  },
  searchContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
    elevation: 6,
  },
  searchInputWrapper: {
    position: 'relative',
  },
  placesContainer: {
    flex: 0,
  },
  placesInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    padding: 0,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 13,
    zIndex: 21,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placesTextInput: {
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  placesListView: {
    backgroundColor: colors.white,
    borderRadius: 10,
    marginTop: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  placesRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  placesDescription: {
    color: colors.text,
    fontSize: 14,
  },
  placesSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  pendingCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    columnGap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  pendingCalloutText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  mapOverlayText: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
  },
  mapOverlayButton: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 28,
    elevation: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  mapTypeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  mapTypeButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  mapTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mapTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  mapTypeButtonTextActive: {
    color: colors.white,
  },
  inlineErrorBanner: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineErrorText: {
    color: colors.error,
    fontSize: 12,
  },
  hailCallout: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 140,
    maxWidth: 220,
    minHeight: 120,
  },
  hailCalloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hailCalloutTitle: {
    color: colors.white,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hailCalloutCloseBtn: {
    padding: 4,
  },
  hailCalloutValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  hailCalloutMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  hailCalloutMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginRight: 8,
    marginTop: 2,
  },
  hailDateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  hailDateModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  hailDateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hailDateModalTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  hailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'space-between',
  },
  hailDateRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hailDateText: {
    color: colors.white,
    marginLeft: 10,
    fontSize: 13,
  },
  hailDateCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  hailDateEmpty: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
  },
  hailInfoBox: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 140,
    maxWidth: 220,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  hailInfoBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hailInfoBoxTitle: {
    color: colors.white,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  hailInfoBoxCloseBtn: {
    padding: 4,
  },
  hailInfoBoxValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  hailInfoBoxMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  hailInfoBoxMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginRight: 8,
    marginTop: 2,
  },
});

export default Canvassing;

