/**
 * Projects Management Component
 * 
 * This component is structured for easy API integration:
 * 1. Mock data structure matches expected API response format
 * 2. fetchProjects() function ready for API calls
 * 3. Loading and error states implemented
 * 4. Data is mapped dynamically from state
 * 5. Uses reusable components for consistent UI
 * 6. Includes project stage filtering and search functionality
 * 
 * To connect to backend:
 * - Replace mockData with actual API calls in fetchProjects()
 * - Update API endpoints in the TODO comments
 * - Data structure is already compatible with typical REST API responses
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';

// Import reusable components
import Header from '../components/Header';
import Button from '../components/Button';
import FloatingActionButton from '../components/FloatingActionButton';
import JobCard from '../components/JobCard';
import CreateJobModal from '../components/CreateJobModal';
import PageLoader from '../components/PageLoader';
import ErrorMessage from '../components/ErrorMessage';
import NotificationListModal from '../components/NotificationListModal';
import { getToken } from '../utils/tokenStorage';
import usePageLoader from '../hooks/usePageLoader';

// Mock data structure - this will be replaced with API calls
const mockJobs = [
  {
    id: '1',
    title: 'Title',
    address: '203 W Mansfield Avenue, Kennedale, TX, 76060',
    createdOn: '14 Jun 2025, 12:53 PM',
    lastUpdated: '14 Jun 2025, 12:53 PM',
    assignedTo: 'MT Roofr',
    status: 'Proposal Sent',
    stage: 'proposal-sent',
  },
  {
    id: '2',
    title: 'Title',
    address: '456 Oak Avenue, Chicago, IL, 60601',
    createdOn: '13 Jun 2025, 10:30 AM',
    lastUpdated: '13 Jun 2025, 2:15 PM',
    assignedTo: 'John Smith',
    status: 'New Lead',
    stage: 'new-lead',
  },
  {
    id: '3',
    title: 'Title',
    address: '789 Pine Street, Dallas, TX, 75201',
    createdOn: '12 Jun 2025, 3:45 PM',
    lastUpdated: '12 Jun 2025, 5:20 PM',
    assignedTo: 'Sarah Johnson',
    status: 'Appointment Scheduled',
    stage: 'appointment-scheduled',
  },
];

const Jobs = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Use the new page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(true);

  // Fetch jobs from backend API
  const fetchJobs = async () => {
    startLoading();
    setError(null);

    try {
      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      
      const response = await fetch('https://app.stormbuddi.com/api/mobile/jobs', {
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
        console.log('Jobs fetched successfully:', data.data);
        
        // Debug: Log unique status values from API
        const uniqueStatuses = [...new Set(data.data.map(job => job.status))];
        console.log('Unique status values from API:', uniqueStatuses);
        
        setJobs(data.data);
      } else {
        // Fallback to mock data if API structure is different
        console.log('API response structure different, using mock data');
        setJobs(mockJobs);
      }
    } catch (err) {
      console.error('Jobs fetch error:', err);
      setError('Failed to load jobs. Using offline data.');
      // Fallback to mock data on error
      setJobs(mockJobs);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Memoize filtered jobs to avoid recalculating on every render
  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        job.title?.toLowerCase().includes(query) ||
        job.address?.toLowerCase().includes(query) ||
        (job.assigned_to && job.assigned_to.toLowerCase().includes(query))
      );
    }

    // Stage filter - map filter values to actual API status values
    if (selectedStage !== 'all') {
      const statusMapping = {
        'new-job': 'new-job',
        'in-progress': 'in-progress',
        'proposal-sent': 'proposal-sent',
        'proposal-signed': 'proposal-signed',
        'material-ordered': 'material-ordered',
        'work-order': 'work-order',
        'appointment-scheduled': 'appointment-schedule',
        'invoicing-payment': 'invoicing-payment',
        'job-completed': 'job-completed',
        'lost': 'lost',
        'unqualified': 'unqualified'
      };
      
      const targetStatus = statusMapping[selectedStage];
      if (targetStatus) {
        filtered = filtered.filter(job => job.status === targetStatus);
      }
    }

    return filtered;
  }, [jobs, searchQuery, selectedStage]);



  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const hasActiveFilters = selectedStage !== 'all';

  const handleCreateProject = () => {
    setShowCreateJobModal(true);
  };

  const handleCreateJobSubmit = (jobData) => {
    console.log('Job created:', jobData);
    
    // Refresh the jobs list to show the newly created job
    fetchJobs();
    
    // Close the modal
    setShowCreateJobModal(false);
  };

  const handleCreateJobClose = () => {
    setShowCreateJobModal(false);
  };

  const handleJobPress = (job) => {
    // Navigate to JobDetails screen with job data
    navigation.navigate('JobDetails', { project: job });
  };

  // Format date from API response to user-friendly format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Render function for FlatList
  const renderJobItem = ({ item: job }) => {
    // Debug logging to check data
    console.log('Job data for card:', {
      title: job.title,
      assigned_to: job.assigned_to,
      assignedTo: job.assigned_to || 'Unassigned'
    });
    
    return (
      <JobCard
        title={job.title}
        address={job.address}
        createdOn={formatDate(job.created_at)}
        lastUpdated={formatDate(job.updated_at)}
        assignedTo={job.assigned_to || 'Unassigned'}
        status={job.status}
        onPress={() => handleJobPress(job)}
        style={styles.jobCard}
      />
    );
  };

  // Key extractor for FlatList
  const keyExtractor = (item) => item.id.toString();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStageDisplayName = (stage) => {
    return stage.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading jobs..."
      />
      
      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={styles.contentContainer}>
          {/* Header */}
          <Header
            title="Maddock"
            onNotificationPress={handleNotificationPress}
          />

          {/* Jobs List with Header */}
          <FlatList
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[styles.jobsContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 200, // Approximate height of JobCard
            offset: 200 * index,
            index,
          })}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              {/* Screen Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.screenTitle}>Jobs</Text>
              </View>

              {/* Search and Filters */}
              <View style={styles.filtersContainer}>
                <View style={styles.searchContainer}>
                  <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search jobs..."
                    placeholderTextColor="#666"
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
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'new-job', label: 'New Job' },
                          { value: 'in-progress', label: 'In Progress' },
                          { value: 'proposal-sent', label: 'Proposal Sent' },
                          { value: 'proposal-signed', label: 'Proposal Signed' },
                          { value: 'material-ordered', label: 'Material Ordered' },
                          { value: 'work-order', label: 'Work Order' },
                          { value: 'appointment-scheduled', label: 'Appointment Scheduled' },
                          { value: 'invoicing-payment', label: 'Invoicing Payment' },
                          { value: 'job-completed', label: 'Job Completed' },
                          { value: 'lost', label: 'Lost' },
                          { value: 'unqualified', label: 'Unqualified' },
                        ].map((filter) => (
                          <TouchableOpacity
                            key={filter.value}
                            style={[
                              styles.filterButton,
                              selectedStage === filter.value && styles.filterButtonActive
                            ]}
                            onPress={() => setSelectedStage(filter.value)}
                          >
                            <Text style={[
                              styles.filterButtonText,
                              selectedStage === filter.value && styles.filterButtonTextActive
                            ]}>
                              {filter.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedStage !== 'all' 
                  ? 'No jobs match your filters' 
                  : 'No jobs found'
                }
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery || selectedStage !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first job to get started'
                }
              </Text>
            </View>
          )}
        />

        <FloatingActionButton
          onPress={handleCreateProject}
          icon="+"
        />

        {/* Create Job Modal */}
        <CreateJobModal
          visible={showCreateJobModal}
          onClose={handleCreateJobClose}
          onSubmit={handleCreateJobSubmit}
          customerId={1} // Default customer ID - this could be enhanced to select from a list
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
          onRetry={fetchJobs}
          retryText="Retry"
        />
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
  },
  listHeader: {
    paddingBottom: 20,
  },
  titleContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  filtersContainer: {
    
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minwidth: 150,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  filterIcon: {
    padding: 4,
    position: 'relative',
  },
  filterIconActive: {
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterRow: {
    gap: 16,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  jobsContainer: {
    paddingHorizontal: 16,
    // paddingBottom handled dynamically in FlatList contentContainerStyle
  },
  jobCard: {
    marginVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default Jobs;
