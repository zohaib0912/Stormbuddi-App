import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useToast } from '../contexts/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Try to import DateTimePicker, fallback if not available
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  console.warn('DateTimePicker not available, using fallback inputs');
}

import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../utils/tokenStorage';

const CreateAppointmentModal = ({ 
  visible, 
  onClose, 
  onSubmit,
  appointment = null, // Add appointment prop for editing
  forceInspectionType = false, // Force appointment type to "Inspection" and lock it
  projectId = null // Pre-select project when creating from JobDetails
}) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    requestTitle: '',
    requestType: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    
    customerName: '',
    address: '',
    zipCode: '',
    phone: '',
    status: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const requestTypeOptions = [
    'Inspection',
    'Repair',
    'Installation',
    'Replacement',
    'Maintenance',
    'Consultation',
    'Emergency',
    'Upgrade',
    'Other'
  ];

  const locationOptions = [
    'Client Location',
    'Office',
    'Warehouse',
    'Remote',
    'Other'
  ];

  const statusOptions = [
    'Pending',
    'Confirm',
    'Cancel',
    'Completed',
    'In Progress',
    'scheduled'
  ];

  // Get status badge color
  const getStatusColor = (status) => {
    if (!status) return { backgroundColor: '#757575', textColor: '#ffffff' }; // Gray for no status
    
    const normalized = (status || '').toLowerCase().replace(/\s+/g, '-');
    
    // Status color mapping for appointments
    const statusColors = {
      'pending': { backgroundColor: '#FFC107', textColor: '#000000' },        // Amber - waiting
      'confirm': { backgroundColor: '#4DA3FF', textColor: '#ffffff' },        // Light Blue - confirmed
      'cancel': { backgroundColor: '#E53935', textColor: '#ffffff' },         // Red - cancelled
      'canceled': { backgroundColor: '#E53935', textColor: '#ffffff' },     // Red - cancelled (alias)
      'completed': { backgroundColor: '#2E7D32', textColor: '#ffffff' },     // Dark Green - done
      'in-progress': { backgroundColor: '#28A745', textColor: '#ffffff' },   // Medium Green - active
      'scheduled': { backgroundColor: '#26A69A', textColor: '#ffffff' },       // Teal - scheduled
    };
    
    // Check for exact matches or contains
    if (normalized === 'pending') return statusColors.pending;
    if (normalized.includes('confirm')) return statusColors.confirm;
    if (normalized.includes('cancel')) return statusColors.cancel;
    if (normalized.includes('completed') || normalized === 'complete') return statusColors.completed;
    if (normalized.includes('in-progress') || normalized.includes('in progress')) return statusColors['in-progress'];
    if (normalized.includes('scheduled')) return statusColors.scheduled;
    
    // Default to gray
    return { backgroundColor: '#757575', textColor: '#ffffff' };
  };

  // Helper function to format date for display (YYYY-MM-DD to MM/DD/YYYY)
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US');
    } catch (error) {
      return dateStr;
    }
  };

  // Helper function to format time for display (HH:MM to HH:MM AM/PM)
  const formatTimeForDisplay = (timeStr) => {
    if (!timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour24 = parseInt(hours);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${period}`;
    } catch (error) {
      return timeStr;
    }
  };

  // Populate form data when appointment prop changes (for editing)
  useEffect(() => {
    if (appointment && visible) {
      // Parse the appointment data and populate the form
      const startDateTime = appointment.start_date_time || `${appointment.date} ${appointment.startTime}:00`;
      const endDateTime = appointment.end_date_time || `${appointment.date} ${appointment.endTime}:00`;
      
      // Extract date and time from datetime strings
      const startDate = startDateTime.split(' ')[0];
      const startTime = startDateTime.split(' ')[1] ? startDateTime.split(' ')[1].substring(0, 5) : '';
      const endDate = endDateTime.split(' ')[0];
      const endTime = endDateTime.split(' ')[1] ? endDateTime.split(' ')[1].substring(0, 5) : '';

      setFormData({
        requestTitle: appointment.title || '',
        requestType: appointment.type || '',
        startDate: formatDateForDisplay(startDate),
        startTime: formatTimeForDisplay(startTime),
        endDate: formatDateForDisplay(endDate),
        endTime: formatTimeForDisplay(endTime),
        location: appointment.location || '',
        customerName: appointment.client_name || '',
        address: appointment.location || '',
        zipCode: '', // Not available in appointment data
        phone: appointment.client_phone || '',
        status: appointment.status || 'Pending',
      });

      // Set project ID if available
      if (appointment.project_id) {
        setSelectedProjectId(appointment.project_id);
      }
    } else if (!appointment && visible) {
      // Reset form for creating new appointment
      setFormData({
        requestTitle: '',
        requestType: forceInspectionType ? 'Inspection' : '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        location: '',
        customerName: '',
        address: '',
        zipCode: '',
        phone: '',
        status: '',
      });
      // Pre-select project if projectId prop is provided
      setSelectedProjectId(projectId || null);
    }
  }, [appointment, visible, forceInspectionType, projectId]);

  // Animate modal in and out
  useEffect(() => {
    if (visible) {
      // Reset animation to start position before animating
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Fetch jobs when modal becomes visible
  const fetchJobs = useCallback(async () => {
    try {
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
        console.log('Jobs fetched for project selection. Count:', data.data.length);
        console.log('First few jobs:', data.data.slice(0, 3).map(j => ({ id: j.id, title: j.title, address: j.address })));
        setJobs(data.data);
      } else {
        console.log('Failed to fetch jobs:', data);
      }
    } catch (error) {
      console.error('Jobs fetch error:', error);
      // Don't show error to user, just use empty array
      setJobs([]);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      console.log('Fetching jobs for appointment modal...');
      fetchJobs();
    }
  }, [visible, fetchJobs]);

  // Pre-select project when jobs are loaded and projectId prop is provided (for new appointments)
  useEffect(() => {
    if (!appointment && visible && projectId && jobs.length > 0) {
      console.log('Pre-selecting project from prop:', projectId);
      console.log('Available jobs:', jobs.map(j => ({ id: j.id, title: j.title })));
      
      // Find the job matching the projectId
      const matchingJob = jobs.find(job => job.id === projectId || String(job.id) === String(projectId));
      
      if (matchingJob) {
        console.log('Found matching job:', matchingJob);
        setSelectedProjectId(projectId);
        
        // Also populate form data with job information
        setFormData(prev => ({
          ...prev,
          location: matchingJob.address || prev.location,
          customerName: matchingJob.client_name || prev.customerName,
          address: matchingJob.client_address || matchingJob.address || prev.address,
          zipCode: matchingJob.client_zip || matchingJob.client_zip_code || matchingJob.zip_code || matchingJob.postal_code || prev.zipCode,
          phone: matchingJob.client_phone || prev.phone,
        }));
      } else {
        console.log('No matching job found for projectId:', projectId);
      }
    }
  }, [projectId, jobs, visible, appointment]);

  // Populate project information when jobs are loaded and we're editing
  useEffect(() => {
    // Only proceed if we're editing and jobs are loaded
    if (!appointment || !visible || jobs.length === 0) {
      return;
    }

    console.log('Project population useEffect triggered:', {
      appointment: !!appointment,
      visible,
      jobsLength: jobs.length,
      selectedProjectId,
      appointmentProjectId: appointment?.project_id,
      appointmentJobId: appointment?.job_id,
      appointmentClientId: appointment?.client_id,
      appointmentCustomerId: appointment?.customer_id,
      allAppointmentKeys: appointment ? Object.keys(appointment) : []
    });
    
    // Debug: Show all appointment data to find the correct project field
    console.log('Full appointment data:', appointment);
    console.log('Looking for project-related fields:', {
      project_id: appointment.project_id,
      job_id: appointment.job_id,
      client_id: appointment.client_id,
      customer_id: appointment.customer_id,
      project: appointment.project,
      job: appointment.job,
      client: appointment.client,
      customer: appointment.customer,
      roofr_id: appointment.roofr_id,
      lead_id: appointment.lead_id
    });
    
    // Proceed with project population
    // Try multiple possible project ID field names
    const projectId = selectedProjectId || 
                       appointment.project_id || 
                       appointment.job_id || 
                       appointment.client_id || 
                       appointment.customer_id ||
                       appointment.roofr_id ||
                       appointment.lead_id ||
                       (appointment.project && appointment.project.id) ||
                       (appointment.job && appointment.job.id) ||
                       (appointment.client && appointment.client.id) ||
                       (appointment.customer && appointment.customer.id);
    
    console.log('==== PROJECT LOOKUP DEBUG ====');
    console.log('Looking for project with ID:', projectId);
    console.log('Available jobs:', jobs.map(j => ({ id: j.id, title: j.title })));
    console.log('Appointment data:', appointment);
      
      if (projectId) {
        const selectedJob = jobs.find(job => job.id === projectId);
        console.log('Found selected job:', selectedJob);
        
        if (selectedJob) {
          console.log('Updating form data with project info:', {
            address: selectedJob.address,
            client_name: selectedJob.client_name,
            client_zip: selectedJob.client_zip,
            client_zip_code: selectedJob.client_zip_code,
            zip_code: selectedJob.zip_code,
            postal_code: selectedJob.postal_code,
            client_phone: selectedJob.client_phone
          });
          
          setFormData(prev => ({
            ...prev,
            location: selectedJob.address,
            customerName: selectedJob.client_name || prev.customerName,
            address: selectedJob.client_address || selectedJob.address || prev.address,
            zipCode: selectedJob.client_zip || selectedJob.client_zip_code || selectedJob.zip_code || selectedJob.postal_code || prev.zipCode,
            phone: selectedJob.client_phone || prev.phone,
          }));
          
          // Also set selectedProjectId if it wasn't set
          if (!selectedProjectId) {
            setSelectedProjectId(projectId);
          }
        } else {
          console.log('No job found with ID:', projectId);
          console.log('Available job IDs:', jobs.map(job => job.id));
          
          // If no job found but appointment has client data, use appointment's data directly
          if (appointment.client_name || appointment.client_phone || appointment.location) {
            // Extract zip code from location string (e.g., "2021 K St NW, Washington, DC 20006, USA")
            const extractZipFromLocation = (location) => {
              if (!location) return null;
              const zipMatch = location.match(/\b\d{5}(-\d{4})?\b/);
              return zipMatch ? zipMatch[0] : null;
            };
            
            const extractedZip = extractZipFromLocation(appointment.location);
            
            console.log('Using appointment client data directly:', {
              client_zip: appointment.client_zip,
              client_name: appointment.client_name,
              client_phone: appointment.client_phone,
              location: appointment.location,
              extracted_zip: extractedZip
            });
            
            setFormData(prev => ({
              ...prev,
              location: appointment.location || prev.location,
              customerName: appointment.client_name || prev.customerName,
              address: appointment.location || prev.address,
              zipCode: appointment.client_zip || extractedZip || prev.zipCode,
              phone: appointment.client_phone || prev.phone,
            }));
            
            // Set selectedProjectId if it wasn't set
            if (!selectedProjectId) {
              setSelectedProjectId(projectId);
            }
          }
        }
      }
    
    if (!projectId) {
      console.log('No project ID found in appointment data - this appointment was created without a project');
      
      // Even without a project, try to populate form data from appointment's client data
      if (appointment.client_name || appointment.client_phone || appointment.location) {
        // Extract zip code from location string (e.g., "2021 K St NW, Washington, DC 20006, USA")
        const extractZipFromLocation = (location) => {
          if (!location) return null;
          const zipMatch = location.match(/\b\d{5}(-\d{4})?\b/);
          return zipMatch ? zipMatch[0] : null;
        };
        
        const extractedZip = extractZipFromLocation(appointment.location);
        
        console.log('Populating form data from appointment without project:', {
          client_zip: appointment.client_zip,
          client_name: appointment.client_name,
          client_phone: appointment.client_phone,
          location: appointment.location,
          extracted_zip: extractedZip
        });
        
        setFormData(prev => ({
          ...prev,
          location: appointment.location || prev.location,
          customerName: appointment.client_name || prev.customerName,
          address: appointment.location || prev.address,
          zipCode: appointment.client_zip || extractedZip || prev.zipCode,
          phone: appointment.client_phone || prev.phone,
        }));
      }
    }
  }, [jobs, appointment, visible, selectedProjectId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleTypeSelect = (type) => {
    setFormData(prev => ({
      ...prev,
      requestType: type
    }));
    setShowTypeDropdown(false);
    
    if (errors.requestType) {
      setErrors(prev => ({
        ...prev,
        requestType: ''
      }));
    }
  };

  const handleLocationSelect = (location) => {
    setFormData(prev => ({
      ...prev,
      location: location
    }));
    setShowLocationDropdown(false);
    
    if (errors.location) {
      setErrors(prev => ({
        ...prev,
        location: ''
      }));
    }
  };

  const handleStatusSelect = (status) => {
    console.log('Status selected:', status);
    setFormData(prev => {
      const newFormData = {
        ...prev,
        status: status
      };
      console.log('New form data with status:', newFormData);
      return newFormData;
    });
    setShowStatusDropdown(false);
    console.log('Status updated in form data');
  };

  const handleProjectSelect = (job) => {
    console.log('Selected project data:', job);
    console.log('All available fields:', Object.keys(job));
    console.log('Looking for zip code fields:', {
      client_zip_code: job.client_zip_code,
      zip_code: job.zip_code,
      client_zip: job.client_zip,
      postal_code: job.postal_code
    });
    
    setFormData(prev => ({
      ...prev,
      location: job.address,
      // Auto-populate customer fields from project data
      customerName: job.client_name || '',
      address: job.client_address || job.address || '',
      zipCode: job.client_zip || '',
      phone: job.client_phone || '',
      // Preserve existing status
      status: prev.status || '',
    }));
    setSelectedProjectId(job.id);
    setShowProjectDropdown(false);
    
    // Clear errors for all auto-populated fields
    if (errors.location || errors.customerName || errors.address || errors.zipCode || errors.phone) {
      setErrors(prev => ({
        ...prev,
        location: '',
        customerName: '',
        address: '',
        zipCode: '',
        phone: '',
      }));
    }
  };

  

  // Helper function to safely parse date strings
  const parseDateString = (dateString) => {
    try {
      // Handle MM/DD/YYYY format
      if (dateString.includes('/')) {
        const [month, day, year] = dateString.split('/');
        return new Date(year, month - 1, day); // month is 0-indexed
      }
      // Handle other formats
      return new Date(dateString);
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return new Date(); // fallback to current date
    }
  };

  // Helper function to safely parse time strings
  const parseTimeString = (timeString) => {
    try {
      console.log('parseTimeString input:', timeString);
      
      // Handle "11:00 AM" format
      const trimmedTime = timeString.trim();
      
      // Handle different possible separators and formats
      let time, period;
      
      // Try splitting by space first
      const spaceParts = trimmedTime.split(' ');
      if (spaceParts.length >= 2) {
        time = spaceParts[0];
        period = spaceParts[spaceParts.length - 1]; // Take the last part as AM/PM
      } else {
        // Try splitting by other possible separators
        const amIndex = trimmedTime.toUpperCase().indexOf('AM');
        const pmIndex = trimmedTime.toUpperCase().indexOf('PM');
        
        if (amIndex > 0) {
          time = trimmedTime.substring(0, amIndex).trim();
          period = 'AM';
        } else if (pmIndex > 0) {
          time = trimmedTime.substring(0, pmIndex).trim();
          period = 'PM';
        } else {
          throw new Error(`Invalid time format: ${timeString}`);
        }
      }
      
      console.log('Parsed time:', time, 'period:', period);
      
      const [hours, minutes] = time.split(':');
      
      if (!hours || !minutes || !period) {
        throw new Error(`Invalid time components: ${timeString}`);
      }
      
      let hour24 = parseInt(hours);
      const mins = parseInt(minutes);
      
      if (isNaN(hour24) || isNaN(mins)) {
        throw new Error(`Invalid numeric values: ${timeString}`);
      }
      
      // Convert to 24-hour format
      if (period.toUpperCase() === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      // Create a date object with today's date and the parsed time
      const today = new Date();
      const result = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, mins);
      
      console.log('parseTimeString result:', result);
      return result;
    } catch (error) {
      console.error('Error parsing time:', timeString, error);
      return new Date(); // fallback to current time
    }
  };

  // Helper function to safely add days to a date
  const addDaysToDate = (dateString, days) => {
    try {
      const date = parseDateString(dateString);
      const newDate = new Date(date);
      newDate.setDate(date.getDate() + days);
      return newDate.toLocaleDateString('en-US');
    } catch (error) {
      console.error('Error adding days to date:', dateString, error);
      return dateString; // fallback to original string
    }
  };

  const handleDateSelect = (dateType, selectedDate) => {
    if (selectedDate) {
      // Format date as MM/DD/YYYY for display
      const formattedDate = selectedDate.toLocaleDateString('en-US');
      
      setFormData(prev => {
        const newFormData = {
          ...prev,
          [dateType]: formattedDate
        };
        
        // If start date is selected and we have a start time, recalculate end date/time
        if (dateType === 'startDate' && prev.startTime) {
          console.log('Recalculating end time from start time:', prev.startTime);
          const { endTime, crossesMidnight } = calculateEndTimeWithDate(prev.startTime);
          newFormData.endTime = endTime;
          
          if (crossesMidnight) {
            // If crossing midnight, set end date to next day
            newFormData.endDate = addDaysToDate(formattedDate, 1);
          } else {
            // If not crossing midnight, set end date to same as start date
            newFormData.endDate = formattedDate;
          }
        }
        
        return newFormData;
      });
      
      // Clear error when user selects date
      if (errors[dateType]) {
        setErrors(prev => ({
          ...prev,
          [dateType]: ''
        }));
      }
    }
  };

  const handleTimeSelect = (timeType, selectedTime) => {
    if (selectedTime) {
      // Format time as HH:MM AM/PM for display
      const formattedTime = selectedTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      setFormData(prev => {
        const newFormData = {
          ...prev,
          [timeType]: formattedTime
        };
        
        // If start time is selected, automatically set end time to 3 hours later
        if (timeType === 'startTime') {
          console.log('Setting end time from start time:', formattedTime);
          const { endTime, crossesMidnight } = calculateEndTimeWithDate(formattedTime);
          newFormData.endTime = endTime;
          
          // Set end date based on whether it crosses midnight
          if (prev.startDate) {
            if (crossesMidnight) {
              // If crossing midnight, set end date to next day
              newFormData.endDate = addDaysToDate(prev.startDate, 1);
            } else {
              // If not crossing midnight, set end date to same as start date
              newFormData.endDate = prev.startDate;
            }
          }
        }
        
        return newFormData;
      });
      
      // Clear error when user selects time
      if (errors[timeType]) {
        setErrors(prev => ({
          ...prev,
          [timeType]: ''
        }));
      }
    }
  };

  // Helper function to calculate end time with date handling (3 hours after start time)
  const calculateEndTimeWithDate = (startTime) => {
    try {
      console.log('calculateEndTimeWithDate input:', startTime);
      
      // Parse the start time (format: "9:00 AM" or "2:30 PM")
      const trimmedTime = startTime.trim();
      
      // Handle different possible separators and formats
      let time, period;
      
      // Try splitting by space first
      const spaceParts = trimmedTime.split(' ');
      if (spaceParts.length >= 2) {
        time = spaceParts[0];
        period = spaceParts[spaceParts.length - 1]; // Take the last part as AM/PM
      } else {
        // Try splitting by other possible separators
        const amIndex = trimmedTime.toUpperCase().indexOf('AM');
        const pmIndex = trimmedTime.toUpperCase().indexOf('PM');
        
        if (amIndex > 0) {
          time = trimmedTime.substring(0, amIndex).trim();
          period = 'AM';
        } else if (pmIndex > 0) {
          time = trimmedTime.substring(0, pmIndex).trim();
          period = 'PM';
        } else {
          throw new Error(`Invalid time format: ${startTime}`);
        }
      }
      
      console.log('Parsed time:', time, 'period:', period);
      
      const [hours, minutes] = time.split(':');
      
      let hour24 = parseInt(hours);
      const mins = parseInt(minutes);
      
      // Convert to 24-hour format
      if (period.toUpperCase() === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      console.log('Converted to 24-hour:', hour24);
      
      // Add 3 hours
      hour24 += 3;
      
      console.log('After adding 3 hours:', hour24);
      
      // Check if it crosses midnight
      const crossesMidnight = hour24 >= 24;
      
      // Handle day overflow (if it goes past 24 hours)
      if (hour24 >= 24) {
        hour24 -= 24;
      }
      
      console.log('Final 24-hour:', hour24);
      
      // Convert back to 12-hour format
      let endHour = hour24;
      let endPeriod = 'AM';
      
      if (hour24 === 0) {
        endHour = 12;
        endPeriod = 'AM';
      } else if (hour24 === 12) {
        endHour = 12;
        endPeriod = 'PM';
      } else if (hour24 > 12) {
        endHour = hour24 - 12;
        endPeriod = 'PM';
      } else {
        // hour24 is 1-11, stays AM
        endPeriod = 'AM';
      }
      
      const endTime = `${endHour}:${mins.toString().padStart(2, '0')} ${endPeriod}`;
      
      console.log('Final end time:', endTime, 'crossesMidnight:', crossesMidnight);
      
      return { endTime, crossesMidnight };
    } catch (error) {
      console.error('Error calculating end time:', error);
      return { endTime: startTime, crossesMidnight: false }; // Fallback to start time if calculation fails
    }
  };

  // Helper function to calculate end time (3 hours after start time) - kept for backward compatibility
  const calculateEndTime = (startTime) => {
    try {
      // Parse the start time (format: "9:00 AM" or "2:30 PM")
      const [time, period] = startTime.split(' ');
      const [hours, minutes] = time.split(':');
      
      let hour24 = parseInt(hours);
      const mins = parseInt(minutes);
      
      // Convert to 24-hour format
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      // Add 3 hours
      hour24 += 3;
      
      // Handle day overflow (if it goes past 24 hours)
      if (hour24 >= 24) {
        hour24 -= 24;
      }
      
      // Convert back to 12-hour format
      let endHour = hour24;
      let endPeriod = 'AM';
      
      if (hour24 === 0) {
        endHour = 12;
        endPeriod = 'AM';
      } else if (hour24 === 12) {
        endHour = 12;
        endPeriod = 'PM';
      } else if (hour24 > 12) {
        endHour = hour24 - 12;
        endPeriod = 'PM';
      }
      
      return `${endHour}:${mins.toString().padStart(2, '0')} ${endPeriod}`;
    } catch (error) {
      console.error('Error calculating end time:', error);
      return startTime; // Fallback to start time if calculation fails
    }
  };




  const formatDateTime = (date, time) => {
    if (!date || !time) return '';
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    return `${formattedDate} - ${time}`;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.requestTitle.trim()) {
      newErrors.requestTitle = 'Request title is required';
    }
    
    if (!formData.requestType.trim()) {
      newErrors.requestType = 'Request type is required';
    }
    
    if (!formData.startDate.trim()) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.startTime.trim()) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!formData.endDate.trim()) {
      newErrors.endDate = 'End date is required';
    }
    
    if (!formData.endTime.trim()) {
      newErrors.endTime = 'End time is required';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    // Zip code and phone are optional for editing appointments
    // if (!formData.zipCode.trim()) {
    //   newErrors.zipCode = 'Zip code is required';
    // }
    
    // if (!formData.phone.trim()) {
    //   newErrors.phone = 'Phone number is required';
    // }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Check if we're editing an existing appointment (declare outside try block for catch access)
    const isEditing = appointment && appointment.id;
    
    setLoading(true);
    
    try {
      // Get stored token
      const token = await getToken();
      console.log('CreateAppointmentModal: Token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Handle project selection - make it optional for existing appointments without projects
      const projectIdToUse = selectedProjectId || 
                           (appointment && (appointment.project_id || 
                                          appointment.job_id || 
                                          appointment.client_id || 
                                          appointment.customer_id ||
                                          appointment.roofr_id ||
                                          appointment.lead_id ||
                                          (appointment.project && appointment.project.id) ||
                                          (appointment.job && appointment.job.id) ||
                                          (appointment.client && appointment.client.id) ||
                                          (appointment.customer && appointment.customer.id)));
      
      console.log('Project validation:', {
        selectedProjectId,
        appointmentProjectId: appointment?.project_id,
        appointmentJobId: appointment?.job_id,
        appointmentClientId: appointment?.client_id,
        appointmentCustomerId: appointment?.customer_id,
        projectIdToUse,
        isEditing: isEditing
      });
      
      // Only require project for new appointments or if explicitly selected
      if (!projectIdToUse && !appointment) {
        setLoading(false);
        showError('Missing Project. Please choose a project before submitting.');
        return;
      }
      
      // For existing appointments without projects, allow updating without project
      if (!projectIdToUse && appointment) {
        console.log('Editing appointment without project - allowing update');
      }

      console.log('CreateAppointmentModal: isEditing:', isEditing);
      console.log('CreateAppointmentModal: appointment:', appointment);
      console.log('CreateAppointmentModal: appointment.id:', appointment?.id);

      // Convert form data to API format - match backend structure exactly
      const formatDateForAPI = (dateStr) => {
        try {
          console.log('formatDateForAPI input:', dateStr);
      
          if (!dateStr) {
            console.log('No date provided, using current date');
            const today = new Date();
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          }
      
          // Already in YYYY-MM-DD format
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            console.log('Date already in YYYY-MM-DD format');
            return dateStr;
          }
      
          let year, month, day;
      
          // Parse MM/DD/YYYY format
          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            console.log('Parsing MM/DD/YYYY format');
            [month, day, year] = dateStr.split('/').map(v => v.trim());
            
            // Ensure year is 4 digits (handle 2-digit years)
            if (year.length === 2) {
              const currentYear = new Date().getFullYear();
              const currentCentury = Math.floor(currentYear / 100) * 100;
              year = currentCentury + parseInt(year);
            }
          } else {
            // Try parsing via Date object but keep local parts
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) throw new Error('Invalid date');
            year = d.getFullYear();
            month = String(d.getMonth() + 1);
            day = String(d.getDate());
          }
      
          // ✅ Use local date parts (no UTC conversion)
          const formatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          console.log('Formatted date (fixed):', formatted);
          return formatted;
      
        } catch (error) {
          console.error('Date formatting error:', error, 'Input:', dateStr);
          const fallback = new Date();
          const fallbackFormatted = `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}-${String(fallback.getDate()).padStart(2, "0")}`;
          console.log('Using fallback date:', fallbackFormatted);
          return fallbackFormatted;
        }
      };
      

      const formatTimeForAPI = (timeStr) => {
        try {
          console.log('formatTimeForAPI input:', timeStr);
          
          // Convert "11:00 AM" to "11:00:00" (24-hour format)
          const trimmedTime = timeStr.trim();
          
          // Handle different possible separators and formats
          let time, period;
          
          // Try splitting by space first
          const spaceParts = trimmedTime.split(' ');
          if (spaceParts.length >= 2) {
            time = spaceParts[0];
            period = spaceParts[spaceParts.length - 1]; // Take the last part as AM/PM
          } else {
            // Try splitting by other possible separators
            const amIndex = trimmedTime.toUpperCase().indexOf('AM');
            const pmIndex = trimmedTime.toUpperCase().indexOf('PM');
            
            if (amIndex > 0) {
              time = trimmedTime.substring(0, amIndex).trim();
              period = 'AM';
            } else if (pmIndex > 0) {
              time = trimmedTime.substring(0, pmIndex).trim();
              period = 'PM';
            } else {
              throw new Error(`Invalid time format: ${timeStr}`);
            }
          }
          
          console.log('Parsed time:', time, 'period:', period);
          
          const [hours, minutes] = time.split(':');
          
          if (!hours || !minutes || !period) {
            throw new Error(`Invalid time components: ${timeStr}`);
          }
          
          let hour24 = parseInt(hours);
          const mins = parseInt(minutes);
          
          if (isNaN(hour24) || isNaN(mins)) {
            throw new Error(`Invalid numeric values: ${timeStr}`);
          }
          
          if (period.toUpperCase() === 'PM' && hour24 !== 12) {
            hour24 += 12;
          } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
            hour24 = 0;
          }
          
          const result = `${hour24.toString().padStart(2, '0')}:${minutes}:00`;
          console.log('formatTimeForAPI result:', result);
          return result;
        } catch (error) {
          console.error('Time formatting error:', error, 'Input:', timeStr);
          // Fallback to current time
          const now = new Date();
          return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
        }
      };

      console.log('Form data:', formData);
      console.log('Start date:', formData.startDate, 'Start time:', formData.startTime);
      console.log('End date:', formData.endDate, 'End time:', formData.endTime);
      
      const formattedStartDate = formatDateForAPI(formData.startDate);
      const formattedEndDate = formatDateForAPI(formData.endDate);
      const formattedStartTime = formatTimeForAPI(formData.startTime);
      const formattedEndTime = formatTimeForAPI(formData.endTime);
      
      console.log('Formatted start date:', formattedStartDate);
      console.log('Formatted end date:', formattedEndDate);
      console.log('Formatted start time:', formattedStartTime);
      console.log('Formatted end time:', formattedEndTime);
      
      // Validate formatted strings are not empty
      if (!formattedStartDate || !formattedStartTime || !formattedEndDate || !formattedEndTime) {
        setLoading(false);
        showError('Invalid Input. Please ensure all date and time fields are properly filled.');
        return;
      }
      
      // Validate that end datetime is after start datetime
      const startDateTime = new Date(`${formattedStartDate} ${formattedStartTime}`);
      const endDateTime = new Date(`${formattedEndDate} ${formattedEndTime}`);
      
      // Check if dates are valid before calling toISOString()
      if (isNaN(startDateTime.getTime())) {
        setLoading(false);
        showError('Invalid Date. Start date/time is invalid. Please check your input.');
        return;
      }
      
      if (isNaN(endDateTime.getTime())) {
        setLoading(false);
        showError('Invalid Date. End date/time is invalid. Please check your input.');
        return;
      }
      
      console.log('Start DateTime:', startDateTime.toISOString());
      console.log('End DateTime:', endDateTime.toISOString());
      console.log('End is after start:', endDateTime > startDateTime);
      
      if (endDateTime <= startDateTime) {
        setLoading(false);
        showError('Invalid Time Range. End date and time must be after start date and time.');
        return;
      }
      
      console.log('Available status options:', statusOptions);
      console.log('Selected status:', formData.status);
      console.log('Status being sent:', formData.status || 'Pending');

      // Validate status value
      const validStatus = statusOptions.includes(formData.status) ? formData.status : 'Pending';
      console.log('Validated status:', validStatus);

      // Try including roofr_id to match what backend expects
      // Force type to "inspection" if forceInspectionType is true and creating new appointment
      let appointmentType = (forceInspectionType && !appointment)
        ? 'inspection' 
        : (formData.requestType || '').toLowerCase().trim();
      
      // Ensure type is provided for new appointments
      if (!appointment && !appointmentType) {
        setLoading(false);
        showError('Missing Type. Please select an appointment type.');
        setErrors(prev => ({ ...prev, requestType: 'Appointment type is required' }));
        return;
      }
      
      console.log('Creating appointment with type:', {
        forceInspectionType,
        isEditing: !!appointment,
        formDataRequestType: formData.requestType,
        appointmentType: appointmentType,
        appointmentTypeLength: appointmentType.length
      });
      
      const apiData = {
        title: formData.requestTitle.trim(),
        start_date_time: `${formattedStartDate} ${formattedStartTime}`,
        end_date_time: `${formattedEndDate} ${formattedEndTime}`,
        // Required by backend
        type: appointmentType,
        priority: 'Medium',
        status: validStatus, // Include the status field
      };
      
      // Only include project_id if we have one
      if (projectIdToUse) {
        apiData.project_id = projectIdToUse;
      }

      console.log(isEditing ? 'Updating appointment data:' : 'Creating appointment data:', apiData);

      // Use PUT method for editing (backend only supports GET, HEAD, PUT)
      const url = isEditing 
        ? `https://app.stormbuddi.com/api/mobile/schedules/${appointment.id}`
        : 'https://app.stormbuddi.com/api/mobile/schedules';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(isEditing ? 'Appointment updated successfully:' : 'Appointment created successfully:', data);
        showSuccess(isEditing ? 'Appointment updated successfully!' : 'Appointment created successfully!');
        onSubmit();
        handleClose();
      } else {
        throw new Error(data.message || (isEditing ? 'Failed to update appointment' : 'Failed to create appointment'));
      }
    } catch (error) {
      console.error(isEditing ? 'Appointment update error:' : 'Appointment creation error:', error);
      showError(error.message || (isEditing ? 'Failed to update appointment. Please try again.' : 'Failed to create appointment. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      requestTitle: '',
      requestType: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      location: '',
      
      customerName: '',
      address: '',
      zipCode: '',
      phone: '',
      status: '',
    });
    setErrors({});
    setLoading(false);
    setShowTypeDropdown(false);
    setShowLocationDropdown(false);
    setShowProjectDropdown(false);
    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
    setShowStatusDropdown(false);
    setSelectedProjectId(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}
        >
        {/* Background overlay that closes modal when tapped */}
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}
          onStartShouldSetResponder={() => true}
        >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {appointment ? 'Edit Appointment' : 'Create Appointment'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
              >
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Request Type */}
              <View style={styles.inputContainer}>
                {forceInspectionType && !appointment ? (
                  // Read-only display when forceInspectionType is true
                  <View style={[
                    styles.dropdownButton,
                    styles.readOnlyButton,
                    errors.requestType && styles.inputError
                  ]}>
                    <Text style={styles.dropdownText}>
                      Inspection
                    </Text>
                    <Icon 
                      name="lock" 
                      size={20} 
                      color="#999" 
                    />
                  </View>
                ) : (
                  // Normal dropdown when forceInspectionType is false
                  <>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        errors.requestType && styles.inputError
                      ]}
                      onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                    >
                      <Text style={[
                        styles.dropdownText,
                        !formData.requestType && styles.placeholderText
                      ]}>
                        {formData.requestType || 'Request type'}
                      </Text>
                      <Icon 
                        name={showTypeDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                        size={20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                    {showTypeDropdown && (
                      <View style={styles.dropdownList}>
                        <ScrollView 
                          style={styles.dropdownScrollView}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                        >
                          {requestTypeOptions.map((option, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.dropdownItem}
                              onPress={() => handleTypeSelect(option)}
                            >
                              <Text style={styles.dropdownItemText}>{option}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}
                {errors.requestType && (
                  <Text style={styles.errorText}>{errors.requestType}</Text>
                )}
              </View>

              {/* Event Title */}
              <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                    styles.textInput,
                    errors.requestTitle && styles.inputError
                    ]}
                  placeholder="Event title.."
                    placeholderTextColor="#999"
                  value={formData.requestTitle}
                  onChangeText={(value) => handleInputChange('requestTitle', value)}
                />
                {errors.requestTitle && (
                  <Text style={styles.errorText}>{errors.requestTitle}</Text>
                )}
              </View>

              {/* Choose Project */}
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.location && styles.inputError
                  ]}
                  onPress={() => setShowProjectDropdown(!showProjectDropdown)}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.location && styles.placeholderText
                  ]}>
                    {formData.location || 'Choose Project'}
                  </Text>
                  <Icon 
                    name={showProjectDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={20} 
                    color="#666" 
                  />
                  </TouchableOpacity>
                {showProjectDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {jobs.length > 0 ? (
                        jobs.map((job, index) => (
                          <TouchableOpacity
                            key={job.id}
                            style={styles.dropdownItem}
                            onPress={() => handleProjectSelect(job)}
                          >
                            <Text style={styles.dropdownItemText} numberOfLines={2}>
                              {job.address}
                            </Text>
                            <Text style={styles.dropdownItemSubText}>
                              {job.title} - {job.client_name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.dropdownItem}>
                          <Text style={styles.dropdownItemText}>No projects available</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
                {errors.location && (
                  <Text style={styles.errorText}>{errors.location}</Text>
                )}
              </View>

              {/* Customer Information */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Customer Name</Text>
                  <TextInput
                    style={[
                    styles.textInput,
                    errors.customerName && styles.inputError
                    ]}
                  placeholder="Enter customer name..."
                    placeholderTextColor="#999"
                  value={formData.customerName}
                  onChangeText={(value) => handleInputChange('customerName', value)}
                />
                {errors.customerName && (
                  <Text style={styles.errorText}>{errors.customerName}</Text>
                )}
                </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.address && styles.inputError
                  ]}
                  placeholder="Enter address..."
                  placeholderTextColor="#999"
                  value={formData.address}
                  onChangeText={(value) => handleInputChange('address', value)}
                  multiline={true}
                  numberOfLines={2}
                  textAlignVertical="top"
                />
                {errors.address && (
                  <Text style={styles.errorText}>{errors.address}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Zip Code</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.zipCode && styles.inputError
                  ]}
                  placeholder="Enter zip code..."
                  placeholderTextColor="#999"
                  value={formData.zipCode}
                  onChangeText={(value) => handleInputChange('zipCode', value)}
                  keyboardType="numeric"
                />
                {errors.zipCode && (
                  <Text style={styles.errorText}>{errors.zipCode}</Text>
                    )}
                  </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.phone && styles.inputError
                  ]}
                  placeholder="Enter phone number..."
                  placeholderTextColor="#999"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  keyboardType="phone-pad"
                />
                {errors.phone && (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                )}
              </View>

              {/* Status */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Status</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton
                  ]}
                  onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                >
                  {formData.status ? (
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(formData.status).backgroundColor }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(formData.status).textColor }
                      ]}>
                        {formData.status}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[
                      styles.dropdownText,
                      styles.placeholderText
                    ]}>
                      Select status
                    </Text>
                  )}
                  <Icon 
                    name={showStatusDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={20} 
                    color="#666" 
                    style={{ marginLeft: 'auto' }}
                  />
                </TouchableOpacity>
                {showStatusDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {statusOptions.map((option, index) => {
                        const statusColor = getStatusColor(option);
                        return (
                          <TouchableOpacity
                            key={index}
                            style={styles.dropdownItem}
                            onPress={() => {
                              console.log('Dropdown option clicked:', option);
                              handleStatusSelect(option);
                            }}
                          >
                            <View style={[
                              styles.statusBadge,
                              { backgroundColor: statusColor.backgroundColor }
                            ]}>
                              <Text style={[
                                styles.statusBadgeText,
                                { color: statusColor.textColor }
                              ]}>
                                {option}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Start Date & Time */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Start Date & Time:</Text>
                
                {/* Combined Start Date & Time */}
                <View style={styles.dateTimeCombinedRow}>
                  {DateTimePicker ? (
                    <TouchableOpacity
                      style={[
                        styles.dateTimeButtonSingle,
                        (errors.startDate || errors.startTime) && styles.inputError
                      ]}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Icon name="event" size={20} color="#666" />
                      <View style={styles.dateTimeTextContainer}>
                        <Text style={[
                          styles.dateTimeButtonText,
                          !formData.startDate && styles.placeholderText
                        ]}>
                          {formData.startDate || 'Select date'}
                        </Text>
                        {formData.startDate && formData.startTime && (
                          <Text style={styles.separatorText}> • </Text>
                        )}
                        <Icon name="access-time" size={20} color="#666" />
                        <Text style={[
                          styles.dateTimeButtonText,
                          !formData.startTime && styles.placeholderText
                        ]}>
                          {formData.startTime || 'Select time'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TextInput
                        style={[
                          styles.dateTimeInput,
                          errors.startDate && styles.inputError
                        ]}
                        placeholder="MM/DD/YYYY"
                        value={formData.startDate}
                        onChangeText={(text) => {
                          setFormData(prev => ({ ...prev, startDate: text }));
                          if (errors.startDate) {
                            setErrors(prev => ({ ...prev, startDate: '' }));
                          }
                        }}
                      />
                      <TextInput
                        style={[
                          styles.dateTimeInput,
                          errors.startTime && styles.inputError
                        ]}
                        placeholder="HH:MM AM/PM"
                        value={formData.startTime}
                        onChangeText={(text) => {
                          setFormData(prev => ({ ...prev, startTime: text }));
                          if (errors.startTime) {
                            setErrors(prev => ({ ...prev, startTime: '' }));
                          }
                        }}
                      />
                    </>
                  )}
                </View>
                
                {(errors.startDate || errors.startTime) && (
                  <Text style={styles.errorText}>{errors.startDate || errors.startTime}</Text>
                )}
              </View>

              {/* End Date & Time */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>End Date & Time:</Text>
                
                {/* Combined End Date & Time */}
                <View style={styles.dateTimeCombinedRow}>
                  {DateTimePicker ? (
                    <TouchableOpacity
                      style={[
                        styles.dateTimeButtonSingle,
                        (errors.endDate || errors.endTime) && styles.inputError
                      ]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Icon name="event" size={20} color="#666" />
                      <View style={styles.dateTimeTextContainer}>
                        <Text style={[
                          styles.dateTimeButtonText,
                          !formData.endDate && styles.placeholderText
                        ]}>
                          {formData.endDate || 'Select date'}
                        </Text>
                        {formData.endDate && formData.endTime && (
                          <Text style={styles.separatorText}> • </Text>
                        )}
                        <Icon name="access-time" size={20} color="#666" />
                        <Text style={[
                          styles.dateTimeButtonText,
                          !formData.endTime && styles.placeholderText
                        ]}>
                          {formData.endTime || 'Select time'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TextInput
                        style={[
                          styles.dateTimeInput,
                          errors.endDate && styles.inputError
                        ]}
                        placeholder="MM/DD/YYYY"
                        value={formData.endDate}
                        onChangeText={(text) => {
                          setFormData(prev => ({ ...prev, endDate: text }));
                          if (errors.endDate) {
                            setErrors(prev => ({ ...prev, endDate: '' }));
                          }
                        }}
                      />
                      <TextInput
                        style={[
                          styles.dateTimeInput,
                          errors.endTime && styles.inputError
                        ]}
                        placeholder="HH:MM AM/PM"
                        value={formData.endTime}
                        onChangeText={(text) => {
                          setFormData(prev => ({ ...prev, endTime: text }));
                          if (errors.endTime) {
                            setErrors(prev => ({ ...prev, endTime: '' }));
                          }
                        }}
                      />
                    </>
                  )}
                </View>
                
                {(errors.endDate || errors.endTime) && (
                  <Text style={styles.errorText}>{errors.endDate || errors.endTime}</Text>
                )}
              </View>

              
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  loading && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? (appointment ? 'Updating...' : 'Creating...') : (appointment ? 'Update' : 'Submit')}
                </Text>
              </TouchableOpacity>
            </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* DateTimePicker Components */}
      {DateTimePicker && showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate ? parseDateString(formData.startDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              handleDateSelect('startDate', selectedDate);
            }
            setShowStartDatePicker(false);
            // Automatically open time picker after date selection
            if (selectedDate && event.type !== 'dismissed') {
              setTimeout(() => setShowStartTimePicker(true), 300);
            }
          }}
        />
      )}

      {DateTimePicker && showStartTimePicker && (
        <DateTimePicker
          value={formData.startTime ? parseTimeString(formData.startTime) : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            if (selectedTime) {
              handleTimeSelect('startTime', selectedTime);
            }
            setShowStartTimePicker(false);
          }}
        />
      )}

      {DateTimePicker && showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate ? parseDateString(formData.endDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              handleDateSelect('endDate', selectedDate);
            }
            setShowEndDatePicker(false);
            // Automatically open time picker after date selection
            if (selectedDate && event.type !== 'dismissed') {
              setTimeout(() => setShowEndTimePicker(true), 300);
            }
          }}
        />
      )}

      {DateTimePicker && showEndTimePicker && (
        <DateTimePicker
          value={formData.endTime ? parseTimeString(formData.endTime) : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            if (selectedTime) {
              handleTimeSelect('endTime', selectedTime);
            }
            setShowEndTimePicker(false);
          }}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
      modalContainer: {
        backgroundColor: '#ffffff',
        width: '100%',
        height: '90%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 100,
  },
  dropdownButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readOnlyButton: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
    maxHeight: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownScrollView: {
    maxHeight: 150,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateTimeInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  calendarIcon: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateTimeRow: {
    marginBottom: 8,
  },
  dateTimeCombinedRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dateTimeButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeButtonCombined: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeButtonSingle: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTimeTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  separatorText: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 4,
  },
  dateTimeInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  datePickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dateOptions: {
    gap: 8,
  },
  dateOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dateOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
});

export default CreateAppointmentModal;
