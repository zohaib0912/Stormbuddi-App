import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../components/Header';
import CalendarStrip from '../components/CalendarStrip';
import AppointmentCard from '../components/AppointmentCard';
import FloatingActionButton from '../components/FloatingActionButton';
import CreateAppointmentModal from '../components/CreateAppointmentModal';
import PageLoader from '../components/PageLoader';
import ErrorMessage from '../components/ErrorMessage';
import NotificationListModal from '../components/NotificationListModal';
import { getToken } from '../utils/tokenStorage';
import usePageLoader from '../hooks/usePageLoader';
import { colors } from '../theme/colors';

// Mock data - moved outside component to avoid hooks order issues
const generateMockAppointments = () => {
  const today = new Date();
  const currentDay = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDay);
  
  // Generate appointments for the current week
  const appointments = [];
  
  // Add appointments for different days of the current week
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    
    // Add 1-2 appointments per day
    const appointmentCount = Math.floor(Math.random() * 2) + 1;
    
    for (let j = 0; j < appointmentCount; j++) {
      const appointmentTypes = ['Inspection', 'Consultation', 'Maintenance', 'Repair'];
      const appointmentTitles = [
        'Roofing and repairing',
        'Gutter cleaning service',
        'Window replacement',
        'HVAC maintenance',
        'Plumbing inspection',
        'Electrical work'
      ];
      const statuses = ['Pending', 'Confirmed', 'Completed'];
      
      appointments.push({
        id: `${i}-${j}`,
        type: appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)],
        title: appointmentTitles[Math.floor(Math.random() * appointmentTitles.length)],
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        startTime: `${9 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`,
        endTime: `${10 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
  }
  
  return appointments;
};

const mockAppointments = generateMockAppointments();

const Appointment = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // Changed to null to show all appointments initially
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const calendarStripRef = useRef(null);
  
  // Use the new page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(true);

  // Fetch appointments from backend API
  const fetchAppointments = async () => {
    startLoading();
    setError(null);
    
    try {
      // Get stored token
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
        
        // Map API response to match AppointmentCard expected format
        const mappedAppointments = data.data.map(appointment => ({
          id: appointment.id,
          status: appointment.status,
          type: appointment.type,
          title: appointment.title,
          date: appointment.start_date_time.split(' ')[0], // Extract date part (YYYY-MM-DD)
          startTime: appointment.start_date_time.split(' ')[1].substring(0, 5), // Extract time part (HH:MM)
          endTime: appointment.end_date_time.split(' ')[1].substring(0, 5), // Extract time part (HH:MM)
          // Additional fields from API that might be useful
          client_name: appointment.client_name,
          client_email: appointment.client_email,
          client_phone: appointment.client_phone,
          location: appointment.location,
          priority: appointment.priority,
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
        // Fallback to mock data if API structure is different
        console.log('API response structure different, using mock data');
        setAppointments(mockAppointments);
      }
    } catch (err) {
      console.error('Appointments fetch error:', err);
      setError('Failed to load appointments. Using offline data.');
      // Fallback to mock data on error
      setAppointments(mockAppointments);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleShowAllAppointments = () => {
    setSelectedDate(null);
  };

  const handleAppointmentPress = (appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  const handleModalSubmit = (formData) => {
    // Refresh the appointments list to show the newly created or updated appointment
    fetchAppointments();
  };

  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  const handleCalendarIconPress = () => {
    setShowCalendarModal(true);
  };

  const handleCalendarDateSelect = (date) => {
    setSelectedDate(date);
    setShowCalendarModal(false);
    // Scroll calendar strip to the selected date
    if (calendarStripRef.current) {
      calendarStripRef.current.scrollToDate(date);
    }
  };

  const handleCloseCalendarModal = () => {
    setShowCalendarModal(false);
  };

  // Filter appointments for selected date (show all if no date selected)
  // Only show present and future appointments, exclude past appointments
  const filteredAppointments = selectedDate 
    ? appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        return appointmentDate.toDateString() === selectedDate.toDateString();
      })
    : appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        return appointmentDate >= today; // Only show today and future appointments
      });

  return (
    <SafeAreaView style={styles.container}>
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading appointments..."
      />
      
      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
          <Header
            title="Appointments"
            onMenuPress={handleMenuPress}
            onNotificationPress={handleNotificationPress}
            showNotification={true}
            showMenu={true}
            showBack={false}
          />
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
        
        <CalendarStrip
          ref={calendarStripRef}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          appointments={appointments}
        />

        {/* Error State */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={fetchAppointments}
            retryText="Retry"
          />
        )}

        {/* Appointments List */}
        {!shouldShowLoader && !error && (
          <View style={styles.appointmentsContainer}>
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onPress={() => handleAppointmentPress(appointment)}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {selectedDate 
                    ? 'No appointments for this date' 
                    : 'No upcoming appointments found'
                  }
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FloatingActionButton onPress={handleCreateAppointment} />
      
      <CreateAppointmentModal
        visible={showModal}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        appointment={selectedAppointment}
      />

      {/* Notification List Modal */}
      <NotificationListModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
        </View>
      )}

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
            
            {/* Simple date picker - showing next 30 days */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  calendarLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  calendarIcon: {
    marginLeft: 8,
  },
  calendarIconContainer: {
    padding: 4,
    borderRadius: 4,
  },
  calendarModalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    padding: 8,
  },
  calendarModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#666',
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
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  datePickerItemSelected: {
    backgroundColor: '#007AFF',
  },
  datePickerItemToday: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  datePickerDayName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  datePickerDayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 4,
  },
  datePickerMonth: {
    fontSize: 12,
    color: '#666',
  },
  datePickerTextSelected: {
    color: '#ffffff',
  },
  showAllButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  showAllText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentsContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  bottomSpacing: {
    height: 100, // Space for bottom buttons
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Appointment;