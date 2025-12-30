import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import Header from '../components/Header';
import InspectionReportCard from '../components/InspectionReportCard';
import SearchBar from '../components/SearchBar';
import FloatingActionButton from '../components/FloatingActionButton';
import PageLoader from '../components/PageLoader';
import ErrorMessage from '../components/ErrorMessage';
import NotificationListModal from '../components/NotificationListModal';
import UploadInspectionReportModal from '../components/UploadInspectionReportModal';
import AppointmentCard from '../components/AppointmentCard';
import CreateAppointmentModal from '../components/CreateAppointmentModal';
import { getToken } from '../utils/tokenStorage';
import usePageLoader from '../hooks/usePageLoader';
import { colors } from '../theme/colors';

const InspectionReport = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'reports'
  
  // Inspection Reports state
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  
  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [appointmentError, setAppointmentError] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  // Use the page loader hook - start with false, only show when screen is focused
  const { shouldShowLoader, startLoading, stopLoading, resetLoader } = usePageLoader(false);
  
  // Get jobId from route params if available
  const jobId = route?.params?.jobId;

  // Mock appointments data
  const generateMockAppointments = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    
    const appointments = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const appointmentCount = Math.floor(Math.random() * 2) + 1;
      
      for (let j = 0; j < appointmentCount; j++) {
        // Only generate Inspection type appointments for this tab
        const appointmentTypes = ['Inspection', 'Inspection', 'Inspection']; // More likely to be inspection
        const appointmentTitles = [
          'Roof inspection',
          'Hail damage inspection',
          'Wind damage assessment',
          'Property damage evaluation',
          'Roof condition check',
          'Pre-storm inspection',
          'Post-storm damage assessment'
        ];
        const statuses = ['Pending', 'Confirmed', 'Completed'];
        
        appointments.push({
          id: `${i}-${j}`,
          type: 'Inspection', // Always inspection type
          title: appointmentTitles[Math.floor(Math.random() * appointmentTitles.length)],
          date: date.toISOString().split('T')[0],
          startTime: `${9 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`,
          endTime: `${10 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
        });
      }
    }
    
    return appointments;
  };

  const mockAppointments = generateMockAppointments();

  // Mock data - replace with API call
  const mockReports = [
    {
      id: '1',
      title: 'Pre-Storm Damage Assessment',
      report_name: 'Pre-Storm Damage Assessment',
      property_address: '123 Main St, Anytown, CA 90210',
      client_name: 'John Smith',
      inspector_name: 'Mike Johnson',
      status: 'completed',
      inspection_date: '2024-05-15',
      created_at: '2024-05-15',
      file_url: 'https://example.com/report1.pdf',
    },
    {
      id: '2',
      title: 'Hail Damage Inspection',
      report_name: 'Hail Damage Inspection',
      property_address: '456 Oak Ave, Springfield, IL 62701',
      client_name: 'Sarah Davis',
      inspector_name: 'Mike Johnson',
      status: 'completed',
      inspection_date: '2024-05-18',
      created_at: '2024-05-18',
      file_url: 'https://example.com/report2.pdf',
    },
    {
      id: '3',
      title: 'Roof Condition Evaluation',
      report_name: 'Roof Condition Evaluation',
      property_address: '789 Pine Rd, Denver, CO 80202',
      client_name: 'Tom Wilson',
      inspector_name: 'Emily Brown',
      status: 'pending',
      inspection_date: '2024-05-20',
      created_at: '2024-05-20',
    },
    {
      id: '4',
      title: 'Wind Damage Assessment',
      report_name: 'Wind Damage Assessment',
      property_address: '321 Elm St, Miami, FL 33101',
      client_name: 'Lisa Anderson',
      inspector_name: 'Mike Johnson',
      status: 'in-progress',
      inspection_date: '2024-05-22',
      created_at: '2024-05-22',
    },
    {
      id: '5',
      title: 'Post-Repair Verification',
      report_name: 'Post-Repair Verification',
      property_address: '654 Maple Dr, Seattle, WA 98101',
      client_name: 'David Lee',
      inspector_name: 'Emily Brown',
      status: 'draft',
      inspection_date: '2024-05-25',
      created_at: '2024-05-25',
    },
  ];


  const fetchProjects = async () => {
    try {
      const token = await getToken();
      if (!token) {
        return;
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
        console.error('Failed to fetch projects');
        return;
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('Projects fetched successfully. Count:', data.data.length);
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchAppointments = async () => {
    startLoading();
    setAppointmentError(null);
    
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/schedules', {
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
        console.log('Appointments fetched successfully:', data.data);
        
        const mappedAppointments = data.data.map(appointment => ({
          id: appointment.id,
          status: appointment.status,
          type: appointment.type,
          title: appointment.title,
          date: appointment.start_date_time.split(' ')[0],
          startTime: appointment.start_date_time.split(' ')[1].substring(0, 5),
          endTime: appointment.end_date_time.split(' ')[1].substring(0, 5),
          client_name: appointment.client_name,
          client_email: appointment.client_email,
          client_phone: appointment.client_phone,
          location: appointment.location,
          priority: appointment.priority,
          project_id: appointment.project_id || appointment.job_id,
          job_id: appointment.job_id || appointment.project_id,
          project_title: appointment.project_title,
          project_status: appointment.project_status,
          description: appointment.description,
          is_urgent: appointment.is_urgent,
          is_all_day: appointment.is_all_day,
          tags: appointment.tags,
          time_until_start: appointment.time_until_start,
          created_at: appointment.created_at,
          updated_at: appointment.updated_at,
        }));
        
        setAppointments(mappedAppointments);
      } else {
        console.log('API response structure different, using mock data');
        setAppointments(mockAppointments);
      }
    } catch (err) {
      console.error('Appointments fetch error:', err);
      setAppointmentError('Failed to load appointments. Using offline data.');
      setAppointments(mockAppointments);
    } finally {
      stopLoading();
    }
  };

  // Group reports by job_id only (combine all reports from same job into one card)
  const groupReportsByUploadSession = (reports) => {
    const grouped = {};
    
    reports.forEach(report => {
      // Create a unique key based on job_id only
      const jobId = report.job_id || report.project_id;
      
      // If no jobId, use report id as fallback
      if (!jobId) {
        // Handle reports without job_id by using their own id
        grouped[`report_${report.id}`] = {
          ...report,
          id: report.id,
          files: [{
            id: report.id,
            file_url: report.file_url || report.url,
            file_path: report.file_path,
            file_name: report.file_name || report.original_name,
            file_type: report.file_type,
            file_size: report.file_size,
            url: report.file_url || report.url,
            type: report.file_type,
          }]
        };
        return;
      }
      
      const sessionKey = `job_${jobId}`; // Group by job_id only
      
      if (!grouped[sessionKey]) {
        // First report for this job - create group
        grouped[sessionKey] = {
          ...report,
          id: report.id, // Use first report's ID as group ID
          files: [{
            id: report.id,
            file_url: report.file_url || report.url,
            file_path: report.file_path,
            file_name: report.file_name || report.original_name,
            file_type: report.file_type,
            file_size: report.file_size,
            url: report.file_url || report.url,
            type: report.file_type,
          }]
        };
      } else {
        // Add to existing group for this job
        grouped[sessionKey].files.push({
          id: report.id,
          file_url: report.file_url || report.url,
          file_path: report.file_path,
          file_name: report.file_name || report.original_name,
          file_type: report.file_type,
          file_size: report.file_size,
          url: report.file_url || report.url,
          type: report.file_type,
        });
      }
    });
    
    return Object.values(grouped);
  };

  const fetchReports = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      let url;
      
      if (jobId) {
        // Fetch inspection reports for a specific job
        url = `https://app.stormbuddi.com/api/mobile/jobs/${jobId}/inspection-reports`;
      } else {
        // Fetch all inspection reports (returns reports based on authenticated user's roofr_id)
        url = `https://app.stormbuddi.com/api/mobile/jobs/inspection-reports`;
      }

      console.log('Fetching inspection reports from:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        
        // If 404, no reports exist for this job/user - show empty state
        if (response.status === 404) {
          console.log('No inspection reports found');
          setReports([]);
          setError(null);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response structures - API returns { inspection_reports: [...] }
      const reportsData = data.inspection_reports || (data.data?.inspection_reports) || data.data || data.reports || data || [];
      
      console.log('Success! Full API response:', data);
      console.log('Inspection reports extracted:', reportsData);
      console.log('Number of reports:', reportsData.length);
      
      // Group reports by upload session (same date, job_id, and description)
      const groupedReports = groupReportsByUploadSession(reportsData);
      console.log('Grouped reports:', groupedReports.length, 'groups from', reportsData.length, 'reports');
      
      setReports(groupedReports);
      setError(null);
    } catch (err) {
      console.error('Error fetching inspection reports:', err);
      
      // Only set error for actual errors, not for missing API endpoints
      if (err.message.includes('404')) {
        setError(null);
        setReports([]);
      } else {
        setError(err.message || 'Failed to fetch inspection reports');
        // Use mock data as fallback
        setReports(mockReports);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Only fetch data and show loader when InspectionReport screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchReports();
      fetchAppointments();
      // Only fetch projects if not viewing a specific job
      if (!jobId) {
        fetchProjects();
      }
      
      // Cleanup: stop loader when screen loses focus
      return () => {
        resetLoader();
      };
    }, [jobId])
  );

  useEffect(() => {
    let filtered = reports || [];

    // Apply project filter
    if (selectedProjectId) {
      filtered = filtered.filter(report => report.job_id === selectedProjectId);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        report =>
          report.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.original_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.report_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.property_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.job_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.inspector_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.data?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.uploaded_by?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredReports(filtered);
  }, [reports, searchQuery, selectedProjectId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
    fetchAppointments();
    // Only fetch projects if not viewing a specific job
    if (!jobId) {
      fetchProjects();
    }
  };

  // Appointment handlers
  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleShowAllAppointments = () => {
    setSelectedDate(null);
  };

  const handleAppointmentPress = (appointment) => {
    // Open UploadInspectionReportModal for inspection appointment
    setSelectedAppointment(appointment);
    setShowUploadModal(true);
  };

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setShowAppointmentModal(true);
  };

  const handleAppointmentModalClose = () => {
    setShowAppointmentModal(false);
    setSelectedAppointment(null);
  };

  const handleAppointmentModalSubmit = (formData) => {
    fetchAppointments();
  };

  const handleCalendarIconPress = () => {
    setShowCalendarModal(true);
  };

  const handleCalendarDateSelect = (date) => {
    setSelectedDate(date);
    setShowCalendarModal(false);
    if (calendarStripRef.current) {
      calendarStripRef.current.scrollToDate(date);
    }
  };

  const handleCloseCalendarModal = () => {
    setShowCalendarModal(false);
  };

  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
  };

  const handleReportPress = (report) => {
    // TODO: Navigate to report details screen
    console.log('Report pressed:', report);
    // navigation.navigate('InspectionReportDetails', { reportId: report.id });
  };

  const handleCreateReport = () => {
    setShowUploadModal(true);
  };

  const handleUploadSubmit = (uploadData) => {
    console.log('Report uploaded:', uploadData);
    
    // Refresh the reports list
    fetchReports();
    // Switch to the Reports tab to show the uploaded report
    setActiveTab('reports');
  };

  const handleProjectFilterToggle = () => {
    setShowProjectDropdown(!showProjectDropdown);
  };

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
    setShowProjectDropdown(false);
  };

  const handleProjectFilterClear = () => {
    setSelectedProjectId(null);
  };

  const getSelectedProjectName = () => {
    if (!selectedProjectId) return 'All Projects';
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    return selectedProject ? (selectedProject.title || selectedProject.name || `Project ${selectedProject.id}`) : 'All Projects';
  };

  // Filter appointments for selected date (show all if no date selected)
  // Only show appointments with type "inspection" or "Inspection"
  let filteredAppointments = appointments.filter(appointment => {
    const appointmentType = appointment.type?.toLowerCase();
    console.log('Filtering appointment:', {
      id: appointment.id,
      type: appointment.type,
      typeLowercase: appointmentType,
      matchesInspection: appointmentType === 'inspection'
    });
    if (appointmentType !== 'inspection') {
      console.log('Filtered out - not inspection type');
      return false;
    }
    
    // Check if there's a report for this appointment's project/job
    // Convert to string for comparison to handle number/string mismatches
    const appointmentJobId = appointment.job_id || appointment.project_id;
    if (appointmentJobId && reports && reports.length > 0) {
      const appointmentIdStr = String(appointmentJobId);
      const hasReport = reports.some(report => {
        // Check multiple possible field names and convert to string for comparison
        const reportJobId = report.job_id || report.project_id || report.jobId || report.projectId;
        if (reportJobId && String(reportJobId) === appointmentIdStr) {
          console.log('Filtering out appointment with existing report:', {
            appointmentId: appointment.id,
            appointmentJobId: appointmentJobId,
            reportJobId: reportJobId,
            reportId: report.id
          });
          return true;
        }
        return false;
      });
      // If appointment has a report, exclude it (return false)
      if (hasReport) {
        return false;
      }
    }
    
    return true;
  });

  // Apply date filter
  if (selectedDate) {
    filteredAppointments = filteredAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.toDateString() === selectedDate.toDateString();
    });
  } else {
    filteredAppointments = filteredAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return appointmentDate >= today;
    });
  }

  // Apply project filter to appointments
  if (selectedProjectId) {
    filteredAppointments = filteredAppointments.filter(appointment => {
      return appointment.project_id === selectedProjectId || 
             appointment.job_id === selectedProjectId ||
             appointment.project_title === projects.find(p => p.id === selectedProjectId)?.title ||
             appointment.project_title === projects.find(p => p.id === selectedProjectId)?.name;
    });
  }

  // Apply search filter to appointments
  if (searchQuery) {
    filteredAppointments = filteredAppointments.filter(appointment => {
      return appointment.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             appointment.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             appointment.client_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             appointment.client_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             appointment.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             appointment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             appointment.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             appointment.status?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }

  const renderAppointmentsContent = () => {
    if (shouldShowLoader && appointments.length === 0) {
      return null; // PageLoader will show
    }

    if (appointmentError && appointments.length === 0) {
      return (
        <ErrorMessage
          message={appointmentError}
          onRetry={fetchAppointments}
        />
      );
    }

    if (filteredAppointments.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="event" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>
            {searchQuery || selectedProjectId
              ? 'No appointments match your search'
              : selectedDate 
              ? 'No appointments for this date' 
              : 'No upcoming appointments found'
            }
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.appointmentsContainer}>
        {filteredAppointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            showUploadButton={true}
            onUploadPress={(appointment) => handleAppointmentPress(appointment)}
          />
        ))}
      </View>
    );
  };

  const renderReportsContent = () => {
    if (loading && reports.length === 0) {
      return null; // PageLoader will show
    }

    if (error && reports.length === 0) {
      return (
        <ErrorMessage
          message={error}
          onRetry={fetchReports}
        />
      );
    }

    if (!Array.isArray(filteredReports) || filteredReports.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="description" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'No inspection reports match your search'
              : 'No inspection reports yet'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateReport}
            >
              <Icon name="add" size={20} color={colors.white} />
              <Text style={styles.createButtonText}>Create First Report</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.reportsContainer}>
        {filteredReports.map((report) => (
          <InspectionReportCard
            key={report.id}
            report={report}
            onPress={() => handleReportPress(report)}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <PageLoader visible={shouldShowLoader} message="Loading..." />
      
      <Header
        title={jobId ? "Job Details" : "Inspection Reports"}
        onNotificationPress={handleNotificationPress}
        showNotification={true}
      />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'appointments' && styles.activeTab]}
          onPress={() => setActiveTab('appointments')}
        >
          <Icon 
            name="event" 
            size={20} 
            color={activeTab === 'appointments' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'appointments' && styles.activeTabText
          ]}>
            Appointments
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Icon 
            name="description" 
            size={20} 
            color={activeTab === 'reports' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'reports' && styles.activeTabText
          ]}>
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'appointments' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Appointment</Text>
              {selectedDate && (
                <TouchableOpacity 
                  style={styles.showAllButton}
                  onPress={handleShowAllAppointments}
                >
                  <Text style={styles.showAllText}>Show All Appointments</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarLabel}>Calendar</Text>
              <TouchableOpacity onPress={handleCalendarIconPress} style={styles.calendarIconContainer}>
                <Icon name="calendar-today" size={16} color={colors.text} style={styles.calendarIcon} />
              </TouchableOpacity>
            </View>

            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={handleSearchClear}
              placeholder="Search appointments, clients, locations..."
              style={styles.searchBarAppointments}
            />

            {/* Project Filter Dropdown - Only show if not viewing a specific job */}
            {!jobId && (
              <View style={styles.filterContainerAppointments}>
                <TouchableOpacity
                  style={styles.filterButton}
                  onPress={handleProjectFilterToggle}
                  activeOpacity={0.7}
                >
                  <Icon name="filter-list" size={20} color={colors.primary} />
                  <Text style={styles.filterButtonText}>
                    {getSelectedProjectName()}
                  </Text>
                  <Icon 
                    name={showProjectDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
                
                {selectedProjectId && (
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={handleProjectFilterClear}
                  >
                    <Icon name="close" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {renderAppointmentsContent()}
          </>
        ) : (
          <View style={styles.content}>
            <>
              <View style={styles.titleContainer}>
                <View style={styles.titleRow}>
                  <View style={styles.titleTextContainer}>
                    <Text style={styles.sectionTitle}>Inspection Reports</Text>
                    <Text style={styles.sectionSubtitle}>
                      {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
                    </Text>
                  </View>
                </View>
              </View>

              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={handleSearchClear}
                placeholder="Search reports, properties, inspectors..."
                style={styles.searchBar}
              />

              {/* Project Filter Dropdown - Only show if not viewing a specific job */}
              {!jobId && (
                <View style={styles.filterContainer}>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={handleProjectFilterToggle}
                    activeOpacity={0.7}
                  >
                    <Icon name="filter-list" size={20} color={colors.primary} />
                    <Text style={styles.filterButtonText}>
                      {getSelectedProjectName()}
                    </Text>
                    <Icon 
                      name={showProjectDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                  
                  {selectedProjectId && (
                    <TouchableOpacity
                      style={styles.clearFilterButton}
                      onPress={handleProjectFilterClear}
                    >
                      <Icon name="close" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {renderReportsContent()}
            </>
          </View>
        )}
      </ScrollView>

      <FloatingActionButton
        icon="+"
        onPress={activeTab === 'appointments' ? handleCreateAppointment : handleCreateReport}
      />

      <NotificationListModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      <CreateAppointmentModal
        visible={showAppointmentModal}
        onClose={handleAppointmentModalClose}
        onSubmit={handleAppointmentModalSubmit}
        appointment={selectedAppointment}
        forceInspectionType={true}
      />

      <UploadInspectionReportModal
        visible={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedAppointment(null);
        }}
        onSubmit={handleUploadSubmit}
        jobId={selectedAppointment?.job_id || selectedAppointment?.project_id || jobId}
      />

      {/* Calendar Picker Modal */}
      <Modal
        visible={showCalendarModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseCalendarModal}
      >
        <View style={styles.calendarModalContainer}>
          <View style={styles.calendarModalHeader}>
            <TouchableOpacity onPress={handleCloseCalendarModal} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.calendarModalTitle}>Select Date</Text>
            <View style={styles.placeholder} />
          </View>
          
          <ScrollView style={styles.calendarModalContent}>
            <Text style={styles.calendarModalSubtitle}>Choose a date to view appointments</Text>
            
            <View style={styles.datePickerContainer}>
              {Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                const isToday = i === 0;
                
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.datePickerItem,
                      isSelected && styles.datePickerItemSelected,
                      isToday && styles.datePickerItemToday
                    ]}
                    onPress={() => handleCalendarDateSelect(date)}
                  >
                    <Text style={[
                      styles.datePickerDayName,
                      isSelected && styles.datePickerTextSelected
                    ]}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[
                      styles.datePickerDayNumber,
                      isSelected && styles.datePickerTextSelected
                    ]}>
                      {date.getDate()}
                    </Text>
                    <Text style={[
                      styles.datePickerMonth,
                      isSelected && styles.datePickerTextSelected
                    ]}>
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Project Filter Dropdown Modal */}
      <Modal
        visible={showProjectDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProjectDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProjectDropdown(false)}
        >
          <View 
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Project</Text>
              <TouchableOpacity
                onPress={() => setShowProjectDropdown(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={[
                { id: null, title: 'All Projects', isHeader: true },
                ...projects
              ]}
              keyExtractor={(item) => `project-${item.id || 'all'}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item.isHeader && styles.modalItemHeader,
                    selectedProjectId === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => handleProjectSelect(item.id)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      item.isHeader && styles.modalItemHeaderText,
                      selectedProjectId === item.id && styles.modalItemTextSelected
                    ]}
                  >
                    {item.title || item.name || `Project ${item.id}`}
                  </Text>
                  {selectedProjectId === item.id && (
                    <Icon name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  titleContainer: {
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    marginBottom: 16,
    marginHorizontal: 0,
    marginTop: 10,
  },
  searchBarAppointments: {
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 10,
  },
  reportsContainer: {
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 0,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  clearFilterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemHeader: {
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  modalItemSelected: {
    backgroundColor: colors.background,
  },
  modalItemText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  modalItemHeaderText: {
    fontWeight: 'bold',
    color: colors.text,
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Appointment-related styles
  appointmentsContainer: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: -8,
  },
  calendarLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  calendarIcon: {
    marginLeft: 8,
  },
  calendarIconContainer: {
    padding: 4,
    borderRadius: 4,
  },
  showAllButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  showAllText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  calendarModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 8,
  },
  calendarModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  calendarModalContent: {
    flex: 1,
    padding: 16,
  },
  calendarModalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  datePickerItem: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  datePickerItemSelected: {
    backgroundColor: colors.primary,
  },
  datePickerItemToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  datePickerDayName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  datePickerDayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 4,
  },
  datePickerMonth: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  datePickerTextSelected: {
    color: colors.white,
  },
  filterContainerAppointments: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 16,
    gap: 8,
  },
});

export default InspectionReport;

