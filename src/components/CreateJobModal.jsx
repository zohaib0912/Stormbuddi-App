import React, { useState, useRef, useEffect } from 'react';
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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../utils/tokenStorage';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';
import ClientSelectionDropdown from './ClientSelectionDropdown';

// Try to import DateTimePicker, fallback if not available
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  console.warn('DateTimePicker not available, using fallback inputs');
}

const CreateJobModal = ({ 
  visible, 
  onClose, 
  onSubmit,
  customerId = null
}) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    customer: '',
    customerObject: null,
    jobType: '',
    jobPriority: '',
    createdDate: '',
  });

  const [errors, setErrors] = useState({});
  const [showJobTypeDropdown, setShowJobTypeDropdown] = useState(false);
  const [showJobPriorityDropdown, setShowJobPriorityDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Optional: Pre-fetch clients when modal opens (non-blocking)
  useEffect(() => {
    if (visible) {
      // Start fetching in background, but don't wait
      fetchClients();
    }
  }, [visible]);

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

  // Fetch clients from API
  const fetchClients = async () => {
    setClientsLoading(true);
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/clients', {
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
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Try different possible response structures
      let clientsList = [];
      
      if (data.success) {
        if (data.data) {
          clientsList = data.data;
        } else if (data.clients) {
          clientsList = data.clients;
        } else if (data.customers) {
          clientsList = data.customers;
        } else if (Array.isArray(data)) {
          clientsList = data;
        }
      } else if (Array.isArray(data)) {
        clientsList = data;
      }
      
      if (Array.isArray(clientsList)) {
        setClients(clientsList);
      } else {
        throw new Error(data.message || 'Failed to fetch clients - invalid response format');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      showError(err.message || 'Failed to fetch clients. Please try again.');
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  };

  // Job type options
  const jobTypes = [
    { id: '1', name: 'Residential' },
    { id: '2', name: 'Commercial' },
    { id: '3', name: 'Emergency' },
    { id: '4', name: 'Maintenance' },
    { id: '5', name: 'New Construction' },
  ];

  // Job priority options
  const jobPriorities = [
    { id: '1', name: 'High' },
    { id: '2', name: 'Medium' },
    { id: '3', name: 'Low' },
  ];

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
  const handleCustomerSelect = (customerName, customerObject) => {
    setFormData(prev => ({
      ...prev,
      customer: customerName,
      customerObject: customerObject,
    }));
    
    if (errors.customer) {
      setErrors(prev => ({
        ...prev,
        customer: ''
      }));
    }
  };

  const handleDateSelect = (selectedDate) => {
    if (selectedDate) {
      // Format date as MM/DD/YYYY for display
      const formattedDate = selectedDate.toLocaleDateString('en-US');
      
      setFormData(prev => ({
        ...prev,
        createdDate: formattedDate
      }));
      
      // Clear error when user selects date
      if (errors.createdDate) {
        setErrors(prev => ({
          ...prev,
          createdDate: ''
        }));
      }
    }
    setShowNativeDatePicker(false);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required';
    }
    
    if (!formData.jobDescription.trim()) {
      newErrors.jobDescription = 'Job description is required';
    }
    
    if (!formData.customer.trim() || !formData.customerObject) {
      newErrors.customer = 'Customer is required';
    }
    
    if (!formData.jobType.trim()) {
      newErrors.jobType = 'Job type is required';
    }
    
    if (!formData.jobPriority.trim()) {
      newErrors.jobPriority = 'Job priority is required';
    }
    
    if (!formData.createdDate.trim()) {
      newErrors.createdDate = 'Created date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Validate required data
      if (!formData.customerObject?.id && !customerId) {
        throw new Error('Customer is required to create a job.');
      }

      // Prepare the data for API submission
      const apiData = {
        description: formData.jobDescription.trim(),
        customer_id: formData.customerObject?.id || customerId,
        job: formData.jobTitle.trim(),
        status: 'new-job', // Set status to new job when created
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19), // Current timestamp in required format
      };

      const response = await fetch('https://app.stormbuddi.com/api/mobile/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('Job created successfully:', data);
        
        // Show success message
        showSuccess('Job created successfully!');
        onSubmit(formData); // Call the parent onSubmit callback
        handleClose();
      } else {
        throw new Error(data.message || 'Failed to create job');
      }
    } catch (err) {
      console.error('Job creation error:', err);
      
      // Show error message
      showError(err.message || 'Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      jobTitle: '',
      jobDescription: '',
      customer: '',
      customerObject: null,
      jobType: '',
      jobPriority: '',
      createdDate: '',
    });
    setErrors({});
    setShowJobTypeDropdown(false);
    setShowJobPriorityDropdown(false);
    setShowDatePicker(false);
    setShowNativeDatePicker(false);
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
              <Text style={styles.modalTitle}>Create Job</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Job Title Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Job Title</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.jobTitle && styles.inputError
                  ]}
                  placeholder="Enter job title..."
                  placeholderTextColor="#999"
                  value={formData.jobTitle}
                  onChangeText={(value) => handleInputChange('jobTitle', value)}
                />
                {errors.jobTitle && (
                  <Text style={styles.errorText}>{errors.jobTitle}</Text>
                )}
              </View>

              {/* Job Description Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Job Description</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    errors.jobDescription && styles.inputError
                  ]}
                  placeholder="Enter job description..."
                  placeholderTextColor="#999"
                  value={formData.jobDescription}
                  onChangeText={(value) => handleInputChange('jobDescription', value)}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {errors.jobDescription && (
                  <Text style={styles.errorText}>{errors.jobDescription}</Text>
                )}
              </View>

              {/* Customer Selection */}
              <View style={styles.inputContainer}>
                <ClientSelectionDropdown
                  value={formData.customer}
                  onSelectClient={handleCustomerSelect}
                  selectedClient={formData.customerObject}
                  error={!!errors.customer}
                  placeholder="Select customer..."
                  label="Customer"
                  clients={clients}
                  loading={clientsLoading}
                  onOpenModal={fetchClients}
                />
                {errors.customer && (
                  <Text style={styles.errorText}>{errors.customer}</Text>
                )}
              </View>

              {/* Job Type Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Job Type</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.jobType && styles.inputError
                  ]}
                  onPress={() => setShowJobTypeDropdown(!showJobTypeDropdown)}
                >
                  <Text style={[
                    styles.dropdownButtonText,
                    !formData.jobType && styles.placeholderText
                  ]}>
                    {formData.jobType || 'Select job type...'}
                  </Text>
                  <Icon 
                    name={showJobTypeDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
                
                {showJobTypeDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {jobTypes.map((jobType) => (
                        <TouchableOpacity
                          key={jobType.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData(prev => ({
                              ...prev,
                              jobType: jobType.name
                            }));
                            setShowJobTypeDropdown(false);
                            if (errors.jobType) {
                              setErrors(prev => ({
                                ...prev,
                                jobType: ''
                              }));
                            }
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{jobType.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {errors.jobType && (
                  <Text style={styles.errorText}>{errors.jobType}</Text>
                )}
              </View>

              {/* Job Priority Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Job Priority</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.jobPriority && styles.inputError
                  ]}
                  onPress={() => setShowJobPriorityDropdown(!showJobPriorityDropdown)}
                >
                  <Text style={[
                    styles.dropdownButtonText,
                    !formData.jobPriority && styles.placeholderText
                  ]}>
                    {formData.jobPriority || 'Select priority...'}
                  </Text>
                  <Icon 
                    name={showJobPriorityDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
                
                {showJobPriorityDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {jobPriorities.map((priority) => (
                        <TouchableOpacity
                          key={priority.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData(prev => ({
                              ...prev,
                              jobPriority: priority.name
                            }));
                            setShowJobPriorityDropdown(false);
                            if (errors.jobPriority) {
                              setErrors(prev => ({
                                ...prev,
                                jobPriority: ''
                              }));
                            }
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{priority.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {errors.jobPriority && (
                  <Text style={styles.errorText}>{errors.jobPriority}</Text>
                )}
              </View>

              {/* Created Date Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Created Date</Text>
                {DateTimePicker ? (
                  <TouchableOpacity
                    style={[
                      styles.dropdownButton,
                      errors.createdDate && styles.inputError
                    ]}
                    onPress={() => setShowNativeDatePicker(true)}
                  >
                    <Text style={[
                      styles.dropdownButtonText,
                      !formData.createdDate && styles.placeholderText
                    ]}>
                      {formData.createdDate || 'Select date...'}
                    </Text>
                    <Icon 
                      name="calendar-today" 
                      size={24} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.dropdownButton,
                      errors.createdDate && styles.inputError
                    ]}
                    onPress={() => setShowDatePicker(!showDatePicker)}
                  >
                    <Text style={[
                      styles.dropdownButtonText,
                      !formData.createdDate && styles.placeholderText
                    ]}>
                      {formData.createdDate || 'Select date...'}
                    </Text>
                    <Icon 
                      name="calendar-today" 
                      size={24} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                )}
                
                {!DateTimePicker && showDatePicker && (
                  <View style={styles.datePickerContainer}>
                    <Text style={styles.datePickerTitle}>Select Date</Text>
                    <View style={styles.dateOptions}>
                      <TouchableOpacity
                        style={styles.dateOption}
                        onPress={() => {
                          const today = new Date().toLocaleDateString();
                          setFormData(prev => ({
                            ...prev,
                            createdDate: today
                          }));
                          setShowDatePicker(false);
                          if (errors.createdDate) {
                            setErrors(prev => ({
                              ...prev,
                              createdDate: ''
                            }));
                          }
                        }}
                      >
                        <Text style={styles.dateOptionText}>Today</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dateOption}
                        onPress={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setFormData(prev => ({
                            ...prev,
                            createdDate: tomorrow.toLocaleDateString()
                          }));
                          setShowDatePicker(false);
                          if (errors.createdDate) {
                            setErrors(prev => ({
                              ...prev,
                              createdDate: ''
                            }));
                          }
                        }}
                      >
                        <Text style={styles.dateOptionText}>Tomorrow</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dateOption}
                        onPress={() => {
                          const nextWeek = new Date();
                          nextWeek.setDate(nextWeek.getDate() + 7);
                          setFormData(prev => ({
                            ...prev,
                            createdDate: nextWeek.toLocaleDateString()
                          }));
                          setShowDatePicker(false);
                          if (errors.createdDate) {
                            setErrors(prev => ({
                              ...prev,
                              createdDate: ''
                            }));
                          }
                        }}
                      >
                        <Text style={styles.dateOptionText}>Next Week</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {errors.createdDate && (
                  <Text style={styles.errorText}>{errors.createdDate}</Text>
                )}
              </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.submitContainer}>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  loading && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Creating Job...' : 'Create Job'}
                </Text>
              </TouchableOpacity>
            </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* DateTimePicker Component */}
      {DateTimePicker && showNativeDatePicker && (
        <DateTimePicker
          value={formData.createdDate ? new Date(formData.createdDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              handleDateSelect(selectedDate);
            }
            setShowNativeDatePicker(false);
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textLight,
  },
  dropdownList: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 150,
    shadowColor: colors.shadowColor,
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
    borderBottomColor: colors.borderLight,
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
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
  submitContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  datePickerContainer: {
    backgroundColor: colors.white,
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
    color: colors.text,
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
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default CreateJobModal;

