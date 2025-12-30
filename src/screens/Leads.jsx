/**
 * Leads Management Component
 * 
 * This component is structured for easy API integration:
 * 1. Mock data structure matches expected API response format
 * 2. fetchLeads() function ready for API calls
 * 3. Loading and error states implemented
 * 4. Data is mapped dynamically from state
 * 5. Uses reusable components for consistent UI
 * 6. Includes lead filtering and search functionality
 * 
 * To connect to backend:
 * - Replace mockData with actual API calls in fetchLeads()
 * - Update API endpoints in the TODO comments
 * - Data structure is already compatible with typical REST API responses
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import reusable components
import Header from '../components/Header';
import Card from '../components/Card';
import LeadCard from '../components/LeadCard';
import Button from '../components/Button';
import FloatingActionButton from '../components/FloatingActionButton';
import PageLoader from '../components/PageLoader';
import ErrorMessage from '../components/ErrorMessage';
import JobModal from '../components/JobModal';
import CreateLeadModal from '../components/CreateLeadModal';
import NotificationListModal from '../components/NotificationListModal';
import { getToken } from '../utils/tokenStorage';
import usePageLoader from '../hooks/usePageLoader';
import { colors } from '../theme/colors';


// Mock data structure - this will be replaced with API calls
const mockLeads = [
  {
    id: '1',
    address: '123 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    propertyType: 'Residential',
    roofType: 'Asphalt Shingle',
    damageType: 'Hail',
    estimatedValue: 15000,
    status: 'unactioned',
    priority: 'high',
    source: 'Storm Alert',
    contactInfo: {
      name: 'John Smith',
      phone: '(555) 123-4567',
      email: 'john.smith@email.com',
    },
    lastUpdated: '2024-01-15T10:30:00Z',
    timeInStage: '2 days',
    notes: 'Property shows significant hail damage on south-facing roof. Owner is interested in insurance claim.',
  },
  {
    id: '2',
    address: '456 Oak Avenue',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94601',
    propertyType: 'Commercial',
    roofType: 'Metal',
    damageType: 'Wind',
    estimatedValue: 25000,
    status: 'proposal-sent',
    priority: 'medium',
    source: 'Referral',
    contactInfo: {
      name: 'Sarah Johnson',
      phone: '(555) 987-6543',
      email: 'sarah.j@company.com',
    },
    lastUpdated: '2024-01-14T14:20:00Z',
    timeInStage: '1 day',
    notes: 'Commercial building with wind damage. Proposal sent, waiting for response.',
  },
  {
    id: '3',
    address: '789 Pine Street',
    city: 'Berkeley',
    state: 'CA',
    zipCode: '94704',
    propertyType: 'Residential',
    roofType: 'Tile',
    damageType: 'Hail',
    estimatedValue: 18000,
    status: 'proposal-viewed',
    priority: 'high',
    source: 'Direct Contact',
    contactInfo: {
      name: 'Mike Davis',
      phone: '(555) 456-7890',
      email: 'mike.davis@email.com',
    },
    lastUpdated: '2024-01-13T09:15:00Z',
    timeInStage: '3 days',
    notes: 'Client viewed proposal but has questions about timeline. Follow-up scheduled.',
  },

];

const Leads = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [kpisData, setKpisData] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Use the new page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(true);

  // Handle route parameters for filtering
  useEffect(() => {
    // Always run this effect, but only apply changes if params exist
    if (route?.params?.filter) {
      const filter = String(route.params.filter).toLowerCase();
      
      // Normalize common aliases
      // Map unactioned/new/pending to 'new'
      const normalized = (filter === 'unactioned' || filter === 'pending') ? 'new' : filter;
      setStatusFilter(normalized);
    }
  }, [route?.params]);

  // Handle navigation title update separately
  useEffect(() => {
    if (route?.params?.filterLabel) {
      navigation.setOptions({
        title: route.params.filterLabel
      });
    }
  }, [route?.params?.filterLabel, navigation]);

  // Fetch leads from backend API
  const fetchLeads = async () => {
    startLoading();
    setError(null);
    
    try {
      // Get stored token
      const token = await getToken();

      
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
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

      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('Leads fetched successfully:', data.data);
        
        // Map API response to match LeadCard expected format
        const mappedLeads = data.data.map(lead => ({
          id: lead.id,
          // Expose client fields for JobModal
          client_id: (lead.client_id ?? lead.customer_id ?? null),
          client_name: (() => {
            const name = (lead.client_name ?? lead.customer_name ?? lead.client ?? '');
            if (!name || name === 'None' || name === 'N/A' || name === 'Unknown') return '';
            return name;
          })(),
          address: lead.address || 'No address',
          city: lead.address ? lead.address.split(',')[1]?.trim() || 'Unknown' : 'Unknown',
          state: lead.address ? lead.address.split(',')[2]?.trim().split(' ')[0] || 'Unknown' : 'Unknown',
          zipCode: lead.zipcode !== 'N/A' ? lead.zipcode : 'Unknown',
          propertyType: 'Residential', // Default value, could be enhanced
          roofType: 'Unknown', // Default value, could be enhanced
          damageType: 'Unknown', // Default value, could be enhanced
          estimatedValue: 15000, // Default value, could be enhanced
          status: lead.status, // Preserve backend status as-is for display
          priority: lead.status === 'New' ? 'high' : 
                    lead.status === 'Open' ? 'medium' : 'low',
          source: lead.source || 'Unknown',
          contactInfo: {
            name: lead.client_name || 'Unknown',
            phone: 'N/A', // Default value, could be enhanced
            email: 'N/A', // Default value, could be enhanced
          },
          lastUpdated: lead.updated_at,
          timeInStage: lead.time_in_stage || 'Unknown',
          notes: `Assigned to: ${lead.assigned_to || 'None'}. Project ID: ${lead.project_id || 'None'}`,
          // Additional fields from API that might be useful
          project_id: lead.project_id,
          assigned_to: lead.assigned_to,
          proposals_count: lead.proposals_count,
          schedules_count: lead.schedules_count,
          created_at: lead.created_at,
        }));
        
        setLeads(mappedLeads);
      } else {
        // Fallback to mock data if API structure is different
        console.log('API response structure different, using mock data');
        setLeads(mockLeads);
      }
    } catch (err) {
      console.error('Leads fetch error:', err);
      setError('Failed to load leads. Using offline data.');
      // Fallback to mock data on error
      setLeads(mockLeads);
    } finally {
      stopLoading();
    }
  };

  // Fetch KPIs data for metrics
  const fetchKPIs = async () => {
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      const response = await fetch('https://app.stormbuddi.com/api/mobile/dashboard/kpis', {
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

      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('KPIs fetched successfully:', data.data);
        setKpisData(data.data);
      }
    } catch (err) {
      console.error('KPIs fetch error:', err);
      // Don't set error state for KPIs, just log it
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchKPIs();
  }, []);

  // Filter leads based on search query and filters
  useEffect(() => {
    let filtered = leads;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.address.toLowerCase().includes(query) ||
        lead.contactInfo.name.toLowerCase().includes(query) ||
        lead.client_name?.toLowerCase().includes(query) ||
        lead.source?.toLowerCase().includes(query) ||
        lead.status?.toLowerCase().includes(query) ||
        lead.assigned_to?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      const target = String(statusFilter).toLowerCase();
      
      const statusMapping = {
        'new': ['new', 'unactioned', 'pending'],
        'qualified': ['qualified', 'proposal-sent', 'proposal-viewed'],
        'closed': ['closed'],
        'contacted': ['contacted', 'in-progress']
      };
      
      const targetStatuses = statusMapping[target] || [target];
      
      filtered = filtered.filter(lead => {
        const leadStatus = String(lead.status || '').toLowerCase();
        return targetStatuses.includes(leadStatus);
      });
    }

    setFilteredLeads(filtered);
  }, [leads, searchQuery, statusFilter]);



  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const hasActiveFilters = statusFilter !== 'all';

  // Calculate metrics using KPIs data
  const totalLeads = leads.length;
  const unactionedLeadsCount = kpisData ? kpisData.unactioned_leads : 0;

  const handleMetricPress = (metricType) => {
    switch (metricType) {
      case 'total':
        setStatusFilter('all');
        break;
      case 'unactioned':
        setStatusFilter('new');
        break;
      default:
        console.log('Unknown metric pressed:', metricType);
    }
  };

  const handleCreateLead = () => {
    setShowCreateLeadModal(true);
  };

  const handleCreateJob = (leadId, clientId, customerName) => {
    setSelectedLeadId(leadId);
    setSelectedClientId(clientId);
    setSelectedCustomerName(customerName);
    setShowJobModal(true);
  };

  const handleViewJob = (lead) => {
    // Navigate to JobDetails screen with the lead's project data
    if (lead.project_id) {
      // Create a mock job object from lead data for navigation
      const jobData = {
        id: lead.project_id,
        title: 'Job Title', // This could be enhanced with actual job data
        address: lead.address,
        createdOn: lead.created_at,
        lastUpdated: lead.lastUpdated,
        assignedTo: lead.assigned_to || 'Unassigned',
        status: 'Active', // Default status
        stage: 'in-progress', // Default stage
      };
      navigation.navigate('JobDetails', { project: jobData });
    }
  };

  // Function to check if a lead has a job (has project_id)
  const hasJob = (lead) => {
    return lead.project_id !== null && lead.project_id !== undefined;
  };

  const handleJobSubmit = (jobData) => {
    console.log('Job created:', jobData);
    
    // Refresh the leads list to show any updates
    fetchLeads();
    
    // Close the modal
    setShowJobModal(false);
  };

  const handleCloseJobModal = () => {
    setShowJobModal(false);
    setSelectedLeadId(null);
    setSelectedClientId(null);
    setSelectedCustomerName('');
  };

  const handleCreateLeadSubmit = (leadData) => {
    console.log('Lead created:', leadData);
    
    // Refresh the leads list to show the newly created lead
    fetchLeads();
    
    // Close the modal
    setShowCreateLeadModal(false);
  };

  // Render function for FlatList
  const renderLeadItem = ({ item: lead }) => (
    <LeadCard
      lead={lead}
      onPress={() => handleLeadPress(lead)}
      onCreateJob={() => handleCreateJob(lead.id, lead.client_id, lead.client_name)}
      onViewJob={() => handleViewJob(lead)}
      hasJob={hasJob(lead)}
      style={styles.leadCard}
    />
  );

  // Key extractor for FlatList
  const keyExtractor = (item) => item.id.toString();

  const handleCloseCreateLeadModal = () => {
    setShowCreateLeadModal(false);
  };

  const handleLeadPress = (lead) => {
    // TODO: Navigate to lead detail screen
    console.log('Lead pressed:', lead.id);
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading leads..."
      />
      
      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={styles.contentContainer}>
          {/* Header */}
          <Header
            title="Maddock"
            onNotificationPress={handleNotificationPress}
          />

          {/* Leads List */}
          <FlatList
          data={filteredLeads}
          renderItem={renderLeadItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[styles.leadsContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 200, // Approximate height of LeadCard
            offset: 200 * index,
            index,
          })}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              {/* Screen Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.screenTitle}>Leads</Text>
              </View>

              {/* Search and Filters */}
              <View style={styles.filtersContainer}>
                <View style={styles.searchContainer}>
                  <Icon name="search" size={20} color={colors.searchIcon} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search leads"
                    placeholderTextColor={colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.filterIcon,
                      (showFilters || hasActiveFilters) && styles.filterIconActive
                    ]} 
                    onPress={toggleFilters}
                  >
                    <Icon 
                      name="tune" 
                      size={20} 
                      color={(showFilters || hasActiveFilters) ? colors.primary : colors.textSecondary} 
                    />
                    {hasActiveFilters && (
                      <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>!</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                
                {showFilters && (
                  <View style={styles.filterRow}>
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Status:</Text>
                    <View style={styles.filterButtons}>
                      {['all', 'new', 'qualified', 'closed', 'contacted'].map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.filterButton,
                            statusFilter === status && styles.filterButtonActive
                          ]}
                          onPress={() => setStatusFilter(status)}
                        >
                          <Text style={[
                            styles.filterButtonText,
                            statusFilter === status && styles.filterButtonTextActive
                          ]}>
                            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  </View>
                )}
              </View>

              {/* Metrics Cards */}
              <View style={styles.metricsContainer}>
                <Card style={styles.metricCard} onPress={() => handleMetricPress('total')}>
                  <View style={styles.metricIcon}>
                    <Icon name="group" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.metricValue}>{totalLeads}</Text>
                  <Text style={styles.metricLabel}>Total Leads</Text>
                </Card>
                
                <Card style={styles.metricCard} onPress={() => handleMetricPress('unactioned')}>
                  <View style={styles.metricIcon}>
                    <Icon name="inbox" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.metricValue}>{unactionedLeadsCount}</Text>
                  <Text style={styles.metricLabel}>Unactioned Leads</Text>
                </Card>
              </View>

              {/* Error State */}
              {error && (
                <ErrorMessage
                  message={error}
                  onRetry={fetchLeads}
                  retryText="Retry"
                />
              )}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery || statusFilter !== 'all' 
                  ? 'No leads match your filters' 
                  : 'No leads found'
                }
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first lead to get started'
                }
              </Text>
            </View>
          )}
        />

        <FloatingActionButton
          onPress={handleCreateLead}
          icon="+"
          backgroundColor={colors.primary}
        />

        {/* Job Creation Modal */}
        <JobModal
          visible={showJobModal}
          onClose={handleCloseJobModal}
          onSubmit={handleJobSubmit}
          leadId={selectedLeadId}
          clientId={selectedClientId}
          customerName={selectedCustomerName}
        />

        {/* Create Lead Modal */}
        <CreateLeadModal
          visible={showCreateLeadModal}
          onClose={handleCloseCreateLeadModal}
          onSubmit={handleCreateLeadSubmit}
        />

        {/* Notification List Modal */}
        <NotificationListModal
          visible={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
        />
        </View>
      )}

      {/* Error State - Show when FlatList is not rendered */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={fetchLeads}
          retryText="Retry"
        />
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
  listHeader: {
    paddingBottom: 20,
  },
  titleContainer: {
    marginHorizontal: 0,
    marginTop: 24,
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  filtersContainer: {
    marginHorizontal: 0,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.searchBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
    fontWeight: '500',
  },
  filterIcon: {
    padding: 4,
    position: 'relative',
  },
  filterIconActive: {
    backgroundColor: colors.primaryBackground,
    borderRadius: 6,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: colors.textOnPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterRow: {
    gap: 12,
    marginTop: 0,
    paddingTop: 12,
    borderTopWidth: 0,
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    marginBottom: 12,
    gap: 16,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 0,
    alignItems: 'center',
    backgroundColor: colors.metricCardBackground,
    borderRadius: 12,
    padding: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0,
  },
  metricIcon: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBackground,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.metricValueText,
    marginBottom: 2,
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: colors.metricLabelText,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
  filterGroup: {
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.filterButtonBackground || colors.white,
    borderWidth: 1.5,
    borderColor: colors.searchBorder || colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: colors.textOnPrimary,
  },
  leadsContainer: {
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  leadCard: {
    marginVertical: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  createButton: {
    flex: 1,
    marginRight: 16,
  },
});

export default Leads;
