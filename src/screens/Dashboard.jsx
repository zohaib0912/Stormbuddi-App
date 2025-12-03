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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
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
// Calculate card width to show exactly 2 cards horizontally
// Formula: (screen width - left padding - gap between cards - right padding) / 2
// Left padding: 8px, Gap: 12px, Right padding: 16px (to match section margin)
const ALERT_CARD_WIDTH = (width - 8 - 12 - 40) / 2;

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
  
  // Use the new page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(true);
  
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading dashboard..."
      />
      
      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
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
              >
                {data.stormAlerts.map((alert, index) => {
                  const formattedTime = new Date(alert.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  
                  // Determine severity based on hail size
                  const getSeverityColor = (hailSize) => {
                    if (!hailSize || hailSize === 0) return colors.textSecondary;
                    if (hailSize >= 1.5) return colors.error; // Severe
                    if (hailSize >= 1.0) return colors.warning; // Moderate
                    return colors.info; // Light
                  };
                  
                  const getSeverityLabel = (hailSize) => {
                    if (!hailSize || hailSize === 0) return 'N/A';
                    if (hailSize >= 1.5) return 'Severe';
                    if (hailSize >= 1.0) return 'Moderate';
                    return 'Light';
                  };
                  
                  const severityColor = getSeverityColor(alert.maxHailSize);
                  const severityLabel = getSeverityLabel(alert.maxHailSize);
                  
                  return (
                    <Card
                      key={alert.id}
                      style={[
                        styles.alertCard,
                        index === data.stormAlerts.length - 1 && styles.alertCardLast,
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
                        <View style={[styles.severityBadge, { backgroundColor: severityColor + '15' }]}>
                          <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
                          <Text style={[styles.severityText, { color: severityColor }]}>
                            {severityLabel}
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
                            <Text style={[styles.alertMetricValue, { color: severityColor }]}>
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
                          <Text style={styles.alertFooterText}>{formattedTime}</Text>
                        </View>
                        <View style={styles.alertFooterItem}>
                          <Icon name="radar" size={12} color={colors.textSecondary} />
                          <Text style={styles.alertFooterText}>{alert.radarId || 'N/A'}</Text>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </ScrollView>
            </View>
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
              {data.leads.map((lead) => {
                const formattedDate = new Date(lead.lastUpdated).toLocaleString();
                return (
                  <View key={lead.id} style={styles.leadRow}>
                    <Text style={styles.leadData}>{formattedDate}</Text>
                    <Text style={styles.leadData}>{lead.timeInStage}</Text>
                    <Text style={styles.leadAddress}>{lead.address}</Text>
                  </View>
                );
              })}
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

    </SafeAreaView>
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
  alertsScrollContent: {
    flexDirection: 'row',
    paddingLeft: 8,
    paddingRight: 16,
    paddingBottom: 4,
  },
  alertCard: {
    width: ALERT_CARD_WIDTH,
    minWidth: ALERT_CARD_WIDTH,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  alertCardLast: {
    marginRight: 0,
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
});

export default Dashboard;

