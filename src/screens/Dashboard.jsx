/**
 * Dashboard Component
 * 
 * This component is structured for easy API integration:
 * 1. Mock data structure matches expected API response format
 * 2. fetchDashboardData() function ready for API calls
 * 3. Loading and error states implemented
 * 4. Data is mapped dynamically from state
 * 
 * To connect to backend:
 * - Replace mockData with actual API calls in fetchDashboardData()
 * - Update API endpoints in the TODO comments
 * - Data structure is already compatible with typical REST API responses
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import reusable components
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import FloatingActionButton from '../components/FloatingActionButton';
import PageLoader from '../components/PageLoader';
import ErrorMessage from '../components/ErrorMessage';
import NotificationListModal from '../components/NotificationListModal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken, hasNotificationPermissionBeenRequested, setNotificationPermissionRequested } from '../utils/tokenStorage';
import usePageLoader from '../hooks/usePageLoader';
import useNotifications from '../hooks/useNotifications';
import NotificationService from '../services/NotificationService';
import { colors } from '../theme/colors';
import messaging from '@react-native-firebase/messaging';


const { width, height } = Dimensions.get('window');
// Responsive card width calculation for all mobile screen sizes
// Uses 85% of screen width per card to show first card fully and peek of 2nd card (10-20% visible)
const ALERT_CARD_WIDTH = Math.max(
  280, // Minimum width for readability on small screens
  Math.min(
    width * 0.5, // 85% of screen width for proper sizing, showing peek of next card
    400 // Maximum width to prevent cards from being too wide on large screens
  )
);

// Hail size colors (same as Canvassing)
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

// Get color for hail size (same as Canvassing)
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

// Map lead status to marker key (same as Canvassing)
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

// Get marker icon source (same as Canvassing)
const getMarkerIconSource = (markerKey) => {
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
  const match = MARKER_ICON_OPTIONS.find((opt) => opt.value === markerKey);
  return match ? match.image : MARKER_ICON_OPTIONS[0].image;
};

// Try to import MapView (same as Canvassing)
let MapView = null;
let Polygon = null;
let Marker = null;
let PROVIDER_GOOGLE = null;
try {
  const mapsModule = require('react-native-maps');
  MapView = mapsModule.default;
  Polygon = mapsModule.Polygon;
  Marker = mapsModule.Marker;
  PROVIDER_GOOGLE = mapsModule.PROVIDER_GOOGLE;
} catch (error) {
  console.warn('react-native-maps not available:', error);
}

// Mock data structure - this will be replaced with API calls
const mockData = {
  metrics: [
    { id: 'unactioned-leads', value: 0.00, label: 'Unactioned Leads'},
    { id: 'actioned-leads', value: 0.00, label: 'Actioned Leads'},
    { id: 'active-jobs', value: 0.00, label: 'Active Jobs'},
  ],
  stormAlerts: [
    {
      id: '1',
      location: 'Milford, NE',
      type: 'hail',
      radarId: 'OAX',
      timestamp: '2025-02-07T16:52:34Z',
      movement: { direction: 'W', speed: 14 },
      hailProbability: 70,
      maxHailSize: 0.50,
    },
    {
      id: '2',
      location: 'Venice, LA',
      type: 'hail',
      radarId: 'MOB',
      timestamp: '2025-02-07T16:51:39Z',
      movement: { direction: 'SW', speed: 5 },
      hailProbability: 70,
      maxHailSize: 0.50,
    },
  ],
  leads: [
    {
      id: '1',
      address: '123 Market',
      lastUpdated: '2025-06-14T12:53:00Z',
      timeInStage: '12:53 PM',
      stage: 'unactioned',
    },
    {
      id: '2',
      address: '789 El Camino Real...',
      lastUpdated: '2025-06-14T12:47:00Z',
      timeInStage: '12:47 PM',
      stage: 'proposal-sent',
    },
    {
      id: '3',
      address: '123 Market St. SE',
      lastUpdated: '2025-06-14T12:53:00Z',
      timeInStage: '12:53 PM',
      stage: 'proposal-viewed',
    },
  ],
};

const Dashboard = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(mockData);
  const [error, setError] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [hasCheckedPermission, setHasCheckedPermission] = useState(false);
  const [canvassingCustomers, setCanvassingCustomers] = useState([]);
  const [canvassingPolygons, setCanvassingPolygons] = useState([]);
  const [canvassingRegion, setCanvassingRegion] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  
  // Use the new page loader hook - start with false, only show when screen is focused
  const { shouldShowLoader, startLoading, stopLoading, resetLoader } = usePageLoader(false);
  
  // Use notifications hook to check permission status
  const { isPermissionGranted, loading: notificationLoading } = useNotifications();

  // Fetch storm alerts from backend (Texas storms endpoint)
  const fetchStormAlerts = async (token) => {
    try {
      const response = await fetch('https://app.stormbuddi.com/api/nexrad/all-texas-storms', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      console.log('Storm alerts response:', response);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const stormData = await response.json();
      
      if (!stormData?.success || !Array.isArray(stormData?.response)) {
        console.warn('Invalid storm data response:', stormData);
        return mockData.stormAlerts;
      }

      const rawAlerts = stormData.response;

      if (!rawAlerts.length) {
        console.warn('No storm alerts returned from backend', stormData);
        return mockData.stormAlerts;
      }
      
      const mappedAlerts = rawAlerts.slice(0, 10).map((alert, index) => {
        // Extract location from place object
        const place = alert.place || {};
        const locationParts = [
          place.name || place.county,
          place.state,
        ].filter(Boolean);
        const location = locationParts.join(', ') || 'Unknown Location';

        // Extract timestamp from report.dateTimeISO
        const timestamp = alert.report?.dateTimeISO || alert.date || new Date().toISOString();

        // Extract type from report.type
        const type = alert.report?.type?.toLowerCase() || 'hail';

        // Extract max hail size from maxHailSize or report.detail.hailIN
        const maxHailSize = Number(
          alert.maxHailSize || 
          alert.report?.detail?.hailIN || 
          0
        );

        return {
          id: alert.id?.toString() || `storm-${index}`,
          location: location,
          type: type,
          radarId: alert.report?.reporter || 'N/A',
          timestamp: timestamp,
          totalEvents: Number(alert.totalEvents ?? alert.report?.totalEvents ?? 0),
          movement: {
            direction: 'N/A',
            speed: 0,
          },
          hailProbability: 0,
          maxHailSize: maxHailSize,
        };
      });

      return mappedAlerts;
    } catch (err) {
      console.error('Storm alerts fetch error:', err);
      return mockData.stormAlerts; // Fallback to mock data
    }
  };

  // Fetch leads from backend API
  const fetchLeads = async (token) => {
    try {
        const response = await fetch('https://app.stormbuddi.com/api/mobile/leads', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const leadsData = await response.json();
      
      if (leadsData.success && leadsData.data) {
        console.log('Leads fetched successfully:', leadsData);
        
        // Map leads API response to expected format (show all leads in dashboard, they'll be scrollable)
        const mappedLeads = leadsData.data.map((lead) => ({
          id: lead.id.toString(),
          address: lead.address || 'No address',
          lastUpdated: lead.updated_at || lead.created_at || new Date().toISOString(),
          timeInStage: lead.time_in_stage || 'Unknown',
          stage: lead.status?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
        }));
        
        return mappedLeads;
      } else {
        console.warn('Invalid leads data response:', leadsData);
        return mockData.leads; // Fallback to mock data
      }
    } catch (err) {
      console.error('Leads fetch error:', err);
      return mockData.leads; // Fallback to mock data
    }
  };

  // Format date as YYYY-MM-DD (same as Canvassing)
  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Process GeoJSON data (same as Canvassing)
  const processGeoJsonData = (data) => {
    const polygonsArray = [];
    
    let geoJsonData = null;
    
    if (data.features) {
      geoJsonData = data;
    } else if (data.data && data.data.features) {
      geoJsonData = data.data;
    } else if (data.success && data.data) {
      if (data.data.features) {
        geoJsonData = data.data;
      } else if (Array.isArray(data.data)) {
        geoJsonData = { type: 'FeatureCollection', features: data.data };
      }
    } else if (Array.isArray(data)) {
      geoJsonData = { type: 'FeatureCollection', features: data };
    }

    if (!geoJsonData || !geoJsonData.features) {
      console.warn('Invalid GeoJSON format:', data);
      return [];
    }

    geoJsonData.features.forEach((feature, index) => {
      if (feature.geometry && feature.geometry.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates[0];
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

  // Fetch home data (same as Canvassing)
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

          const leadStatus = customer.lead_status || 
                            customer.leadStatus || 
                            'Monitoring';

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

      const uniqueCustomers = normalizedCustomers.reduce((acc, customer) => {
        const customerIdStr = String(customer.id);
        if (!acc.find(c => String(c.id) === customerIdStr)) {
          acc.push(customer);
        }
        return acc;
      }, []);

      setCanvassingCustomers(uniqueCustomers);
    } catch (error) {
      console.error('Home data fetch error:', error);
    }
  };

  // Fetch hail dates and get most recent (same as Canvassing)
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
        .slice(0, 1); // Get only the most recent

      if (parsed.length > 0) {
        return parsed[0].date;
      }
      return null;
    } catch (error) {
      console.error('Hail dates fetch error:', error);
      return null;
    }
  };

  // Fetch NEXRAD data (same as Canvassing)
  const fetchNexradData = async (date) => {
    if (!date) return;
    
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const formattedDate = formatDateForAPI(date);
      const apiUrl = `https://app.stormbuddi.com/api/nexrad/local-date-data?date=${formattedDate}`;
      
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
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const processedPolygons = processGeoJsonData(data);
      setCanvassingPolygons(processedPolygons);
    } catch (err) {
      console.error('NEXRAD data fetch error:', err);
    }
  };

  // Adjust region to fit all polygons and customers
  const adjustCanvassingRegion = (polygons, customers) => {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    polygons.forEach(polygon => {
      polygon.coordinates.forEach(coord => {
        if (Number.isFinite(coord?.latitude) && Number.isFinite(coord?.longitude)) {
          minLat = Math.min(minLat, coord.latitude);
          maxLat = Math.max(maxLat, coord.latitude);
          minLng = Math.min(minLng, coord.longitude);
          maxLng = Math.max(maxLng, coord.longitude);
        }
      });
    });

    customers.forEach(customer => {
      if (Number.isFinite(customer.latitude) && Number.isFinite(customer.longitude)) {
        minLat = Math.min(minLat, customer.latitude);
        maxLat = Math.max(maxLat, customer.latitude);
        minLng = Math.min(minLng, customer.longitude);
        maxLng = Math.max(maxLng, customer.longitude);
      }
    });

    if (!Number.isFinite(minLat) || !Number.isFinite(maxLat) || 
        !Number.isFinite(minLng) || !Number.isFinite(maxLng)) {
      return;
    }

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = Math.max((maxLat - minLat) * 1.5, 0.1);
    const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.1);

    setCanvassingRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    });
  };

  // Fetch canvassing data
  const fetchCanvassingData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // Fetch customers first
      await fetchHomeData();

      // Then fetch most recent hail date and polygons
      const mostRecentDate = await fetchHailDates();
      if (mostRecentDate) {
        await fetchNexradData(mostRecentDate);
      }
    } catch (error) {
      console.error('Canvassing data fetch error:', error);
    }
  };

  // Adjust region when customers or polygons change
  useEffect(() => {
    if (canvassingPolygons.length > 0 || canvassingCustomers.length > 0) {
      adjustCanvassingRegion(canvassingPolygons, canvassingCustomers);
    }
  }, [canvassingPolygons, canvassingCustomers]);

  // Fetch dashboard data from backend API
  const fetchDashboardData = async () => {
    startLoading();
    setError(null);
    
    try {
      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Fetch KPIs, storm alerts, and leads in parallel
      const [kpiResponse, stormAlerts, leads] = await Promise.all([
        fetch('https://app.stormbuddi.com/api/mobile/dashboard/kpis', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetchStormAlerts(token),
        fetchLeads(token)
      ]);

      // Fetch canvassing data separately (async, doesn't block)
      fetchCanvassingData();

      if (!kpiResponse.ok) {
        throw new Error(`HTTP error! status: ${kpiResponse.status}`);
      }

      const kpiData = await kpiResponse.json();
      
      if (kpiData.success && kpiData.data) {
        console.log('Dashboard KPIs fetched successfully:', kpiData);
        
        // Map API response to expected format
        const mappedData = {
          metrics: [
            { 
              id: 'unactioned-leads', 
              value: kpiData.data.unactioned_leads || 0, 
              label: 'Unactioned Leads'
            },
            { 
              id: 'actioned-leads', 
              value: kpiData.data.actioned_leads || 0, 
              label: 'Actioned Leads'
            },
            { 
              id: 'active-jobs', 
              value: kpiData.data.active_jobs || 0, 
              label: 'Active Jobs'
            },
          ],
          stormAlerts: stormAlerts, // Use real storm alerts from XWeather API
          leads: leads, // Use real leads from backend API
        };
        
        setData(mappedData);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Failed to load dashboard data. Using offline data.');
      // Fallback to mock data on error
      setData(mockData);
    } finally {
      stopLoading();
    }
  };

  // Only fetch data and show loader when Dashboard screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
      
      // Cleanup: stop loader when screen loses focus
      return () => {
        resetLoader();
      };
    }, [])
  );

  // Function to update notification status in backend
  const updateNotificationStatusInBackend = async (enabled) => {
    try {
      const token = await getToken();
      if (!token) {
        console.error('No token found for updating notification status');
        return false;
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/notifications/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: enabled,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`Notifications ${enabled ? 'enabled' : 'disabled'} in backend`);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error updating notification status in backend:', error);
      return false;
    }
  };

  // Function to fetch current backend notification status
  // Returns 'active', 'inactive', or null
  const getBackendNotificationStatus = async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.error('No token found for fetching notification status');
        return null;
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/notifications/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Backend returns notifications_enabled as boolean, convert to status string
          const enabled = data.data.notifications_enabled === true || data.data.notifications_enabled === 1;
          const status = enabled ? 'active' : 'inactive';
          console.log('Backend status fetched:', status);
          return status;
        }
      }
      console.log('Backend status not found or invalid response');
      return null;
    } catch (error) {
      console.error('Error fetching notification status:', error);
      return null;
    }
  };

  // Request notification permission on first login only (after dashboard loads)
  useEffect(() => {
    console.log('Permission check effect triggered:', {
      shouldShowLoader,
      notificationLoading,
      hasCheckedPermission,
      isPermissionGranted
    });

    // Wait for dashboard to load (notification loading might take time, so we'll check directly)
    if (!shouldShowLoader && !hasCheckedPermission) {
      console.log('Dashboard loaded, checking permission status...');
      const requestNotificationPermissionIfFirstTime = async () => {
        try {
          // Check if permission was already requested before
          const permissionRequested = await hasNotificationPermissionBeenRequested();
          console.log('Permission requested before?', permissionRequested);
          
          // Check permission status directly from Firebase messaging
          let currentPermissionGranted = false;
          try {
            const authStatus = await messaging().hasPermission();
            currentPermissionGranted = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                                      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            console.log('Current permission status from messaging:', authStatus, 'Granted:', currentPermissionGranted);
          } catch (error) {
            console.error('Error checking permission status:', error);
          }
          
          // Only request if:
          // 1. Permission hasn't been requested before (first time login)
          // 2. Permission is not already granted by system
          if (!permissionRequested && !currentPermissionGranted) {
            console.log('Requesting notification permission in 1.5 seconds...');
            // Small delay to ensure UI is ready and dashboard is visible
            setTimeout(async () => {
              try {
                console.log('Calling NotificationService.requestPermission()...');
                // Request permission
                const granted = await NotificationService.requestPermission();
                console.log('Permission request result:', granted);
                
                // Mark as requested regardless of whether user granted or denied
                await setNotificationPermissionRequested();
                
                // Update backend status based on permission result
                await updateNotificationStatusInBackend(granted);
                
                if (granted) {
                  console.log('Notification permission granted and enabled in backend');
                } else {
                  console.log('Notification permission denied and disabled in backend');
                }
              } catch (error) {
                console.error('Error in permission request flow:', error);
                await setNotificationPermissionRequested();
              }
            }, 1500);
          } else if (permissionRequested) {
            console.log('Permission already requested before, checking backend status...');
            // Permission was already requested - check backend status before syncing
            // Only sync if backend status doesn't exist or needs updating, respect user's manual disable
            const backendStatus = await getBackendNotificationStatus();
            console.log('Backend notification status:', backendStatus);
            
            if (backendStatus === null) {
              // Backend status doesn't exist, sync with current permission
              console.log('Backend status not found, syncing with system permission...');
              const statusToSet = currentPermissionGranted ? 'active' : 'inactive';
              await updateNotificationStatusInBackend(currentPermissionGranted);
              if (currentPermissionGranted) {
                try {
                  await NotificationService.updateFCMTokenAfterLogin();
                  console.log('FCM token updated after syncing');
                } catch (error) {
                  console.error('Error updating FCM token:', error);
                }
              }
            } else if (backendStatus === 'inactive') {
              // Backend status is explicitly inactive (disabled) - respect it, do NOT enable even if permission granted
              console.log('Backend status is INACTIVE - respecting user preference. Not enabling.');
              // Don't update anything, user has manually disabled
            } else if (backendStatus === 'active') {
              // Backend status is active - just ensure FCM token is up to date if permission granted
              console.log('Backend status is ACTIVE - ensuring FCM token is updated.');
              if (currentPermissionGranted) {
                try {
                  await NotificationService.updateFCMTokenAfterLogin();
                  console.log('FCM token updated');
                } catch (error) {
                  console.error('Error updating FCM token:', error);
                }
              }
            } else {
              // Unknown backend status - don't sync, just log
              console.log('Unknown backend status value:', backendStatus);
            }
          } else if (currentPermissionGranted) {
            console.log('Permission already granted by system, enabling in backend...');
            // Permission already granted, enable in backend
            await updateNotificationStatusInBackend(true);
            console.log('Notification permission already granted. Enabled in backend.');
          } else {
            console.log('Unexpected state - permission not requested, not granted, but not triggering request');
          }
          
          setHasCheckedPermission(true);
        } catch (error) {
          console.error('Error in notification permission check:', error);
          setHasCheckedPermission(true);
        }
      };

      requestNotificationPermissionIfFirstTime();
    } else {
      console.log('Conditions not met yet, waiting...', {
        shouldShowLoader,
        hasCheckedPermission
      });
    }
  }, [shouldShowLoader, hasCheckedPermission]);

  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const handleInvoicePress = () => {
    navigation.navigate('Invoice');
  };

  const handleLeadsPress = () => {
    navigation.navigate('Leads');
  };

  const handleMetricPress = (metricId) => {
    switch (metricId) {
      case 'unactioned-leads':
        // Navigate to Leads page with unactioned filter
        navigation.navigate('MainStack', { 
          screen: 'Leads',
          params: { 
            filter: 'new',
            filterLabel: 'New Leads'
          }
        });
        break;
      case 'actioned-leads':
        // Navigate to Leads page with actioned filter
        navigation.navigate('MainStack', { 
          screen: 'Leads',
          params: { 
            filter: 'qualified',
            filterLabel: 'Qualified Leads'
          }
        });
        break;
      case 'active-jobs':
        // Navigate to Jobs page
        navigation.navigate('MainStack', { 
          screen: 'Jobs'
        });
        break;
      default:
        console.log('Unknown metric pressed:', metricId);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleCanvassingPress = () => {
    navigation.navigate('MainStack', { screen: 'Canvassing' });
  };

  // Memoize processed storm alerts to avoid recalculating on every render
  const processedStormAlerts = useMemo(() => {
    return data.stormAlerts.map((alert) => {
      const formattedTime = new Date(alert.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      
      const getSeverityColor = (hailSize) => {
        if (!hailSize || hailSize === 0) return colors.textSecondary;
        if (hailSize >= 1.5) return colors.error;
        if (hailSize >= 1.0) return colors.warning;
        return colors.info;
      };
      
      const getSeverityLabel = (hailSize) => {
        if (!hailSize || hailSize === 0) return 'N/A';
        if (hailSize >= 1.5) return 'Severe';
        if (hailSize >= 1.0) return 'Moderate';
        return 'Light';
      };
      
      return {
        ...alert,
        formattedTime,
        severityColor: getSeverityColor(alert.maxHailSize),
        severityLabel: getSeverityLabel(alert.maxHailSize),
      };
    });
  }, [data.stormAlerts]);

  // Memoize sorted and formatted leads
  const processedLeads = useMemo(() => {
    return data.leads
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
      .slice(0, 10)
      .map((lead) => ({
        ...lead,
        formattedDate: new Date(lead.lastUpdated).toLocaleString(),
      }));
  }, [data.leads]);

  // Limit canvassing customers for better map performance
  const limitedCanvassingCustomers = useMemo(() => {
    return canvassingCustomers.slice(0, 30);
  }, [canvassingCustomers]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading dashboard..."
      />
      
      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={styles.contentContainer}>
          {/* Header */}
          <Header
            title="Maddock"
            onNotificationPress={handleNotificationPress}
          />

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
        {/* Dashboard Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>
        </View>

        {/* Error State */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={handleRefresh}
            retryText="Retry"
          />
        )}

        {/* Key Metrics Section */}
        {!shouldShowLoader && !error && (
          <View style={styles.metricsContainer}>
            {data.metrics.map((metric) => {
              // Define icons for each metric
              const getIcon = (id) => {
                switch (id) {
                  case 'unactioned-leads':
                    return 'person-add';
                  case 'actioned-leads':
                    return 'check-circle';
                  case 'active-jobs':
                    return 'work';
                  default:
                    return 'info';
                }
              };

              return (
                <Card
                  key={metric.id}
                  style={styles.metricCard}
                  onPress={() => handleMetricPress(metric.id)}
                >
                  <View style={styles.metricContent}>
                    <View style={styles.metricLeft}>
                      <Icon name={getIcon(metric.id)} size={24} color={colors.primary} style={styles.metricIcon} />
                      <Text style={styles.metricLabel}>{metric.label}</Text>
                    </View>
                    <Text style={styles.metricValue}>
                      {metric.currency ? `$${metric.value.toFixed(2)}` : metric.value}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Hail Impact Map Section */}
        {/* {!shouldShowLoader && !error && (
          <Card
            showHeader={true}
            headerTitle="Hail Impact Map"
            style={styles.mapCard}
          >
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Map View</Text>
              <Text style={styles.mapSubText}>Hail Impact Heatmap</Text>
            </View>
          </Card>
        )} */}

        {/* Storm Alerts Section */}
        {!shouldShowLoader && !error && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon name="warning" size={22} color={colors.warning} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Storm Alerts</Text>
              </View>
              {data.stormAlerts.length > 0 && (
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>{data.stormAlerts.length}</Text>
                </View>
              )}
            </View>
            <View style={styles.alertsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.alertsScrollContent}
                style={styles.alertsScrollView}
              >
                {processedStormAlerts.map((alert, index) => (
                  <Card
                    key={alert.id}
                    style={[
                      styles.alertCard,
                      index === processedStormAlerts.length - 1 && styles.alertCardLast,
                    ]}
                  >
                    {/* Card Header with Location */}
                    <View style={styles.alertCardHeader}>
                      <View style={styles.alertHeaderLeft}>
                        <Icon name="location-on" size={16} color={colors.primary} />
                        <Text style={styles.alertLocation} numberOfLines={1}>
                          {alert.location}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Storm Type with Severity Badge and Icon */}
                    <View style={styles.alertTypeRow}>
                      <View style={[styles.severityBadge, { backgroundColor: alert.severityColor + '15' }]}>
                        <View style={[styles.severityDot, { backgroundColor: alert.severityColor }]} />
                        <Text style={[styles.severityText, { color: alert.severityColor }]}>
                          {alert.severityLabel}
                        </Text>
                      </View>
                      <Icon 
                        name={alert.type === 'hail' ? 'grain' : 'cloud'} 
                        size={18} 
                        color={colors.primary} 
                        style={styles.alertTypeIcon}
                      />
                      <Text style={styles.alertType}>
                        {alert.type ? alert.type.charAt(0).toUpperCase() + alert.type.slice(1) : 'Storm'}
                      </Text>
                    </View>
                    
                    {/* Metrics Grid */}
                    <View style={styles.alertMetricsGrid}>
                      <View style={[styles.alertMetricCard, styles.alertMetricCardFirst]}>
                        <View style={styles.alertMetricIconContainer}>
                          <Icon name="grain" size={16} color={colors.primary} />
                        </View>
                        <View style={styles.alertMetricContent}>
                          <Text style={styles.alertMetricLabel}>Max Hail</Text>
                          <Text style={[styles.alertMetricValue, { color: alert.severityColor }]}>
                            {alert.maxHailSize ? `${alert.maxHailSize}"` : '--'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.alertMetricCard, styles.alertMetricCardLast]}>
                        <View style={styles.alertMetricIconContainer}>
                          <Icon name="flash-on" size={16} color={colors.primary} />
                        </View>
                        <View style={styles.alertMetricContent}>
                          <Text style={styles.alertMetricLabel}>Events</Text>
                          <Text style={styles.alertMetricValue}>
                            {Number.isFinite(alert.totalEvents) && alert.totalEvents > 0
                              ? alert.totalEvents
                              : '--'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Divider */}
                    <View style={styles.alertDivider} />
                    
                    {/* Footer Info */}
                    <View style={styles.alertFooter}>
                      <View style={styles.alertFooterItem}>
                        <Icon name="access-time" size={12} color={colors.textSecondary} />
                        <Text style={styles.alertFooterText}>{alert.formattedTime}</Text>
                      </View>
                      <View style={styles.alertFooterItem}>
                        <Icon name="radar" size={12} color={colors.textSecondary} />
                        <Text style={styles.alertFooterText}>{alert.radarId || 'N/A'}</Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Canvassing Preview Section */}
        {!shouldShowLoader && !error && MapView && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon name="map" size={22} color={colors.primary} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Canvassing</Text>
              </View>
              <TouchableOpacity onPress={handleCanvassingPress}>
                <Text style={styles.viewAllLink}>View Full Map</Text>
              </TouchableOpacity>
            </View>
            <Card style={styles.canvassingCard} onPress={handleCanvassingPress}>
              <View style={styles.canvassingMapContainer}>
                <MapView
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  style={styles.canvassingMap}
                  region={canvassingRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  mapType="standard"
                  loadingEnabled={true}
                >
                  {Polygon && canvassingPolygons.map((polygon) => (
                    <Polygon
                      key={polygon.id}
                      coordinates={polygon.coordinates}
                      fillColor={polygon.fillColor}
                      strokeColor={polygon.strokeColor}
                      strokeWidth={polygon.strokeWidth}
                    />
                  ))}
                  
                  {Marker && limitedCanvassingCustomers.map((customer) => (
                    <Marker
                      key={customer.id}
                      coordinate={{
                        latitude: customer.latitude,
                        longitude: customer.longitude,
                      }}
                      image={getMarkerIconSource(mapLeadStatusToMarkerKey(customer.lead_status))}
                      anchor={{ x: 0.5, y: 1 }}
                      tracksViewChanges={false}
                    />
                  ))}
                </MapView>
                <View style={styles.canvassingOverlay}>
                  <Text style={styles.canvassingOverlayText}>
                    {canvassingCustomers.length} Customers
                  </Text>
                  {canvassingPolygons.length > 0 && (
                    <Text style={styles.canvassingOverlayText}>
                      {canvassingPolygons.length} Hail Areas
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Leads Section */}
        {!shouldShowLoader && !error && (
          <View style={styles.sectionContainer}>
            <View style={styles.leadsSectionHeader}>
              <Text style={styles.sectionTitle}>Leads</Text>
            </View>
            <Card
              style={styles.leadsCard}
            >
              <View style={styles.leadsHeader}>
                <Text style={styles.leadsHeaderText}>Last Updated</Text>
                <Text style={styles.leadsHeaderText}>Time in Stage</Text>
                <Text style={styles.leadsHeaderText}>Address</Text>
              </View>
            
            <ScrollView
              style={styles.leadsScrollView}
              contentContainerStyle={styles.leadsScrollContent}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {processedLeads.map((lead) => (
                <View key={lead.id} style={styles.leadRow}>
                  <Text style={styles.leadData}>{lead.formattedDate}</Text>
                  <Text style={styles.leadData}>{lead.timeInStage}</Text>
                  <Text style={styles.leadAddress}>{lead.address}</Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.leadsFooter}>
              <Button
                title="View All Leads"
                onPress={handleLeadsPress}
                variant="outline"
                size="small"
                style={styles.viewAllButton}
              />
            </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Notification List Modal */}
      <NotificationListModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    fontSize: 20,
  },
  metricsContainer: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricIcon: {
    marginRight: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  alertBadge: {
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  mapCard: {
    marginHorizontal: 16,
  },
  mapPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  mapSubText: {
    fontSize: 12,
    color: colors.textLight,
  },
  alertsContainer: {
    paddingTop: 4,
  },
  alertsScrollView: {
    width: '100%',
  },
  alertsScrollContent: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 4,
  },
  alertCard: {
    width: ALERT_CARD_WIDTH,
    marginRight: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  alertCardLast: {
    marginRight: 16,
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  alertLocation: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 4,
    flex: 1,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  severityText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTypeIcon: {
    marginLeft: 6,
    marginRight: 6,
  },
  alertType: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  alertMetricsGrid: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  alertMetricCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  alertMetricCardFirst: {
    marginBottom: 6,
  },
  alertMetricCardLast: {
    marginBottom: 0,
  },
  alertMetricIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.primaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  alertMetricContent: {
    flex: 1,
  },
  alertMetricLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    fontWeight: '600',
  },
  alertMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  alertDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 6,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertFooterText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  leadsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  leadsCard: {
    marginHorizontal: 16,
   
  },
  leadsScrollView: {
    maxHeight: 300,
  },
  leadsScrollContent: {
    paddingBottom: 8,
  },
  leadsHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginHorizontal: -16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginTop: -16,
  },
  leadsHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  leadRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  leadData: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  leadAddress: {
    flex: 1,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  leadsFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
  },
  viewAllButton: {
    minWidth: 120,
  },
  canvassingCard: {
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  canvassingMapContainer: {
    height: 200,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  canvassingMap: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  canvassingOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  canvassingOverlayText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default Dashboard;

