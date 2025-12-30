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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../utils/tokenStorage';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';
import ClientSelectionDropdown from './ClientSelectionDropdown';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Try to import DateTimePicker, fallback if not available
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  console.warn('DateTimePicker not available, using fallback inputs');
}

const CreateLeadModal = ({ 
  visible, 
  onClose, 
  onSubmit 
}) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    address: '',
    status: '',
    source: '',
    client: '',
    clientObject: null,
    createdDate: '',
  });

  const [errors, setErrors] = useState({});
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
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

  const statusOptions = [
    'New',
    'Contacted',
    'Qualified',
    'Closed'
  ];

  const sourceOptions = [
    'Website Form',
    'Referral',
    'Facebook Ads',
    'Google Search',
    'Instagram',
    'Tradeshow',
    'Youtube Ads'
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

  const handleStatusSelect = (status) => {
    setFormData(prev => ({
      ...prev,
      status: status
    }));
    setShowStatusDropdown(false);
    
    if (errors.status) {
      setErrors(prev => ({
        ...prev,
        status: ''
      }));
    }
  };

  const handleSourceSelect = (source) => {
    setFormData(prev => ({
      ...prev,
      source: source
    }));
    setShowSourceDropdown(false);
    
    if (errors.source) {
      setErrors(prev => ({
        ...prev,
        source: ''
      }));
    }
  };

  const handleClientSelect = (clientName, clientObject) => {
    setFormData(prev => ({
      ...prev,
      client: clientName,
      clientObject: clientObject,
      // Auto-populate address if available
      address: clientObject?.address || clientObject?.street_address || clientObject?.location || prev.address
    }));
    
    if (errors.client) {
      setErrors(prev => ({
        ...prev,
        client: ''
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
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    if (!formData.status.trim()) {
      newErrors.status = 'Status is required';
    }
    
    if (!formData.source.trim()) {
      newErrors.source = 'Source is required';
    }
    
    if (!formData.client.trim() || !formData.clientObject) {
      newErrors.client = 'Client is required';
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

      // Prepare the data for API submission
      const apiData = {
        address: formData.address.trim(),
        status: formData.status,
        source: formData.source,
        // Prefer customer fields; include client_id for compatibility
        customer_id: formData.clientObject?.id || null,
        customer_name: formData.client || undefined,
        // Keep legacy/client fields for compatibility but let server prefer customer_*
        client_id: formData.clientObject?.id || null,
        client_name: formData.client || undefined,
      };
    
      const response = await fetch('https://app.stormbuddi.com/api/mobile/leads', {
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
        console.log('Lead created successfully:', data);
        
        // Show success message
        showSuccess('Lead created successfully!');
        onSubmit(formData); // Call the parent onSubmit callback
        handleClose();
      } else {
        throw new Error(data.message || 'Failed to create lead');
      }
    } catch (err) {
      console.error('Lead creation error:', err);
      
      // Show error message
      showError(err.message || 'Failed to create lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      address: '',
      status: '',
      source: '',
      client: '',
      clientObject: null,
      createdDate: '',
    });
    setErrors({});
    setShowStatusDropdown(false);
    setShowSourceDropdown(false);
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
              <Text style={styles.modalTitle}>Create Lead</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >

            {/* Client Selection */}
              <View style={styles.inputContainer}>
                <ClientSelectionDropdown
                  value={formData.client}
                  onSelectClient={handleClientSelect}
                  selectedClient={formData.clientObject}
                  error={!!errors.client}
                  placeholder="Select client..."
                  label="Client"
                  clients={clients}
                  loading={clientsLoading}
                  onOpenModal={fetchClients}
                />
                {errors.client && (
                  <Text style={styles.errorText}>{errors.client}</Text>
                )}
              </View>
              
              {/* Address Input */}
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
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {errors.address && (
                  <Text style={styles.errorText}>{errors.address}</Text>
                )}
              </View>

              

              {/* Status Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Status</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.status && styles.inputError
                  ]}
                  onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.status && styles.placeholderText
                  ]}>
                    {formData.status || 'Select status...'}
                  </Text>
                  <Icon 
                    name={showStatusDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                {showStatusDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {statusOptions.map((option, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => handleStatusSelect(option)}
                        >
                          <Text style={styles.dropdownItemText}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {errors.status && (
                  <Text style={styles.errorText}>{errors.status}</Text>
                )}
              </View>

              {/* Source Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Source</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.source && styles.inputError
                  ]}
                  onPress={() => setShowSourceDropdown(!showSourceDropdown)}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.source && styles.placeholderText
                  ]}>
                    {formData.source || 'Select source...'}
                  </Text>
                  <Icon 
                    name={showSourceDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                {showSourceDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {sourceOptions.map((option, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => handleSourceSelect(option)}
                        >
                          <Text style={styles.dropdownItemText}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {errors.source && (
                  <Text style={styles.errorText}>{errors.source}</Text>
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
                      styles.dropdownText,
                      !formData.createdDate && styles.placeholderText
                    ]}>
                      {formData.createdDate || 'Select date...'}
                    </Text>
                    <Icon 
                      name="calendar-today" 
                      size={20} 
                      color="#666" 
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
                      styles.dropdownText,
                      !formData.createdDate && styles.placeholderText
                    ]}>
                      {formData.createdDate || 'Select date...'}
                    </Text>
                    <Icon 
                      name="calendar-today" 
                      size={20} 
                      color="#666" 
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
                  {loading ? 'Creating Lead...' : 'Create Lead'}
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
    shadowColor: colors.shadowColor,
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
    color: colors.text,
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
  },
  dropdownItemSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  submitContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6,
  },
  datePickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateOptionText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default CreateLeadModal;

