import React, { useState, useEffect, useRef } from 'react';
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
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';

const CreateInvoiceModal = ({ 
  visible, 
  onClose, 
  onSubmit 
}) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    selectedJobs: [],
    createdDate: '',
    createdTime: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showJobsDropdown, setShowJobsDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Animate modal in and out
  useEffect(() => {
    if (visible) {
      // Reset animation to start position before animating
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Fetch jobs when modal opens
  const fetchJobs = async () => {
    setJobsLoading(true);
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
        console.log('Jobs fetched for invoice:', data.data);
        setJobs(data.data);
      }
    } catch (error) {
      console.error('Jobs fetch error:', error);
      showError('Failed to fetch jobs. Please try again.');
    } finally {
      setJobsLoading(false);
    }
  };

  // Fetch jobs when modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchJobs();
    }
  }, [visible]);


  const handleJobSelect = (job) => {
    setFormData(prev => ({
      ...prev,
      selectedJobs: [job] // Single selection for dropdown
    }));
    setShowJobsDropdown(false);
    
    // Clear error when job is selected
    if (errors.selectedJobs) {
      setErrors(prev => ({
        ...prev,
        selectedJobs: ''
      }));
    }
  };

  const handleDateSelect = (date) => {
    setFormData(prev => ({
      ...prev,
      createdDate: date
    }));
    setShowDatePicker(false);
    
    // Clear error when date is selected
    if (errors.createdDate) {
      setErrors(prev => ({
        ...prev,
        createdDate: ''
      }));
    }
  };

  const handleTimeSelect = (time) => {
    setFormData(prev => ({
      ...prev,
      createdTime: time
    }));
    setShowTimePicker(false);
    
    // Clear error when time is selected
    if (errors.createdTime) {
      setErrors(prev => ({
        ...prev,
        createdTime: ''
      }));
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const validateForm = () => {
    console.log('=== FORM VALIDATION ===');
    console.log('Validating form data:', formData);
    
    const newErrors = {};
    
    if (formData.selectedJobs.length === 0) {
      newErrors.selectedJobs = 'Please select a job';
      console.log('Validation error: No job selected');
    }
    
    if (!formData.createdDate.trim()) {
      newErrors.createdDate = 'Please select a date';
      console.log('Validation error: No date selected');
    }
    
    if (!formData.createdTime.trim()) {
      newErrors.createdTime = 'Please select a time';
      console.log('Validation error: No time selected');
    }
    
    console.log('Validation errors:', newErrors);
    console.log('Form is valid:', Object.keys(newErrors).length === 0);
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('🚀 CREATE INVOICE BUTTON PRESSED!');
    console.log('=== INVOICE CREATION DEBUG ===');
    console.log('Form data:', formData);
    console.log('Selected jobs:', formData.selectedJobs);
    console.log('Created date:', formData.createdDate);
    console.log('Created time:', formData.createdTime);
    
    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      return;
    }

    setLoading(true);
    
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Format date and time for API - backend expects project_id
      const apiData = {
        project_id: formData.selectedJobs[0]?.id, // Backend expects project_id (single ID)
        created_date: formData.createdDate, // Already in YYYY-MM-DD format
        created_time: formData.createdTime, // Already in HH:MM format
      };

      // Alternative format in case backend expects different field names
      const alternativeApiData = {
        project_id: formData.selectedJobs[0]?.id, // Single project ID
        date: formData.createdDate,
        time: formData.createdTime,
        created_at: `${formData.createdDate} ${formData.createdTime}:00`, // Combined datetime
      };

      console.log('Selected job:', formData.selectedJobs[0]);
      console.log('Project ID being sent:', formData.selectedJobs[0]?.id);
      console.log('Primary API data format:', apiData);
      console.log('Alternative API data format:', alternativeApiData);
      console.log('API endpoint: https://app.stormbuddi.com/api/mobile/invoices');

      // Try primary format first
      let response = await fetch('https://app.stormbuddi.com/api/mobile/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(apiData),
      });

      console.log('Primary request - Response status:', response.status);

      // If primary format fails, try alternative format
      if (!response.ok) {
        console.log('Primary format failed, trying alternative format...');
        const errorText = await response.text();
        console.error('Primary format error:', errorText);
        
        response = await fetch('https://app.stormbuddi.com/api/mobile/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(alternativeApiData),
        });
        
        console.log('Alternative request - Response status:', response.status);
      }

      console.log('Final response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      
      if (data.success) {
        console.log('Invoice created successfully:', data);
        showSuccess('Invoice created successfully!');
        onSubmit(formData);
        handleClose();
      } else {
        console.error('API returned success: false', data);
        throw new Error(data.message || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Invoice creation error:', error);
      showError(error.message || 'Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      selectedJobs: [],
      createdDate: '',
      createdTime: '',
    });
    setErrors({});
    setLoading(false);
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
              <Text style={styles.modalTitle}>Create Invoice</Text>
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
              {/* Jobs Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Select Job</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.selectedJobs && styles.inputError
                  ]}
                  onPress={() => setShowJobsDropdown(!showJobsDropdown)}
                  disabled={jobsLoading}
                >
                  <Text style={[
                    styles.dropdownText,
                    formData.selectedJobs.length === 0 && styles.placeholderText
                  ]}>
                    {jobsLoading ? 'Loading jobs...' : 
                     formData.selectedJobs.length > 0 ? 
                     `${formData.selectedJobs[0].title} - ${formatDate(formData.selectedJobs[0].created_at)}` : 
                     'Select job...'}
                  </Text>
                  <Icon 
                    name={showJobsDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={20} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
                {showJobsDropdown && !jobsLoading && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {jobs.length > 0 ? (
                        jobs.map((job, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.dropdownItem}
                            onPress={() => handleJobSelect(job)}
                          >
                            <Text style={styles.dropdownItemTitle}>{job.title}</Text>
                            <Text style={styles.dropdownItemDate}>
                              {formatDate(job.created_at)}
                            </Text>
                            <Text style={styles.dropdownItemAddress} numberOfLines={1}>
                              {job.address}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.dropdownItem}>
                          <Text style={[styles.dropdownItemText, { color: '#999' }]}>
                            No jobs available
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
                {errors.selectedJobs && (
                  <Text style={styles.errorText}>{errors.selectedJobs}</Text>
                )}
              </View>

              {/* Created Date */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Created Date</Text>
                {DateTimePicker ? (
                  <TouchableOpacity
                    style={[
                      styles.dropdownButton,
                      errors.createdDate && styles.inputError
                    ]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={[
                      styles.dropdownText,
                      !formData.createdDate && styles.placeholderText
                    ]}>
                      {formData.createdDate || 'Select date...'}
                    </Text>
                    <Icon name="calendar-today" size={20} color="#666" />
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.createdDate && styles.inputError
                    ]}
                    placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
                    value={formData.createdDate}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, createdDate: text }));
                      if (errors.createdDate) {
                        setErrors(prev => ({ ...prev, createdDate: '' }));
                      }
                    }}
                  />
                )}
                {errors.createdDate && (
                  <Text style={styles.errorText}>{errors.createdDate}</Text>
                )}
              </View>

              {/* Created Time */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Created Time</Text>
                {DateTimePicker ? (
                  <TouchableOpacity
                    style={[
                      styles.dropdownButton,
                      errors.createdTime && styles.inputError
                    ]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={[
                      styles.dropdownText,
                      !formData.createdTime && styles.placeholderText
                    ]}>
                      {formData.createdTime || 'Select time...'}
                    </Text>
                    <Icon name="access-time" size={20} color="#666" />
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.createdTime && styles.inputError
                    ]}
                    placeholder="HH:MM (e.g., 14:30)"
                    value={formData.createdTime}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, createdTime: text }));
                      if (errors.createdTime) {
                        setErrors(prev => ({ ...prev, createdTime: '' }));
                      }
                    }}
                  />
                )}
                {errors.createdTime && (
                  <Text style={styles.errorText}>{errors.createdTime}</Text>
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
                onPress={() => {
                  console.log('🔥 BUTTON PRESSED - TouchableOpacity working!');
                  handleSubmit();
                }}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Creating...' : 'Create Invoice'}
                </Text>
              </TouchableOpacity>
            </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {DateTimePicker && showDatePicker && (
        <DateTimePicker
          value={formData.createdDate ? new Date(formData.createdDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              const dateString = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              handleDateSelect(dateString);
            }
            setShowDatePicker(false);
          }}
        />
      )}

      {/* Time Picker */}
      {DateTimePicker && showTimePicker && (
        <DateTimePicker
          value={formData.createdTime ? new Date(`2000-01-01T${formData.createdTime}`) : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            if (selectedTime) {
              const timeString = selectedTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
              handleTimeSelect(timeString);
            }
            setShowTimePicker(false);
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
        backgroundColor: colors.white,
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
  dropdownButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  textInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownList: {
    backgroundColor: colors.white,
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
    elevation: 3,
  },
  dropdownScrollView: {
    maxHeight: 150,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  dropdownItemDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  dropdownItemAddress: {
    fontSize: 12,
    color: '#999',
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.text,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  noJobsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 50, // Ensure button has minimum height
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

export default CreateInvoiceModal;
