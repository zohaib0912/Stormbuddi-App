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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../utils/tokenStorage';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CreateCustomerModal = ({ 
  visible, 
  onClose, 
  onSubmit 
}) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    zip_code: '',
    subscription_package: '',
  });

  const [errors, setErrors] = useState({});
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [subscriptionPackages, setSubscriptionPackages] = useState([]);
  const [subscriptionPlansData, setSubscriptionPlansData] = useState([]); // Store full plan objects with id, name, slug
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Fetch subscription plans from API (customer_subscriptions_plan table)
  const fetchSubscriptionPlans = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // Try to fetch subscription plans from API
      // Common endpoint patterns: /subscription-plans, /subscriptions, /plans, /subscription-plans/list
      const possibleEndpoints = [
        'https://app.stormbuddi.com/api/customer-subscription-plans',
       
      ];

      let plansFetched = false;

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            
            // Handle different response structures
            let plansList = [];
            if (data.success && data.plans) {
              // API returns { success: true, plans: [...] }
              plansList = Array.isArray(data.plans) ? data.plans : [data.plans];
            } else if (data.success && data.data) {
              // Alternative structure: { success: true, data: [...] }
              plansList = Array.isArray(data.data) ? data.data : [data.data];
            } else if (Array.isArray(data.plans)) {
              plansList = data.plans;
            } else if (Array.isArray(data.data)) {
              plansList = data.data;
            } else if (Array.isArray(data)) {
              plansList = data;
            }

            if (plansList.length > 0) {
              // Store full plan objects for later use
              setSubscriptionPlansData(plansList);
              
              // Extract names for dropdown display
              const planNames = plansList.map(plan => 
                plan.name || plan.Name || plan.title || plan.slug || plan.Slug
              );
              setSubscriptionPackages(planNames);
              console.log('Fetched subscription plans from API:', plansList);
              plansFetched = true;
              break;
            } else {
              console.warn('API returned empty plans array. Response:', data);
            }
          } else {
            console.warn(`API request failed with status ${response.status} for endpoint: ${endpoint}`);
          }
        } catch (err) {
          // Try next endpoint
          continue;
        }
      }

      // Fallback: If no API endpoint works, use hardcoded values from the database
      if (!plansFetched) {
        const fallbackPlans = [
          { id: 17, name: 'Bronze Package', slug: 'bronze' },
          { id: 18, name: 'Silver Package', slug: 'silver' },
          { id: 19, name: 'Gold Package', slug: 'gold' },
          { id: 20, name: 'Platinum Package', slug: 'platinum' },
          { id: 22, name: 'Public Plan', slug: 'public' },
        ];
        setSubscriptionPlansData(fallbackPlans);
        setSubscriptionPackages(fallbackPlans.map(p => p.name));
        console.log('Using fallback subscription plans:', fallbackPlans);
      }
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      // Use hardcoded fallback values
      const fallbackPlans = [
        { id: 17, name: 'Bronze Package', slug: 'bronze' },
        { id: 18, name: 'Silver Package', slug: 'silver' },
        { id: 19, name: 'Gold Package', slug: 'gold' },
        { id: 20, name: 'Platinum Package', slug: 'platinum' },
        { id: 22, name: 'Public Plan', slug: 'public' },
      ];
      setSubscriptionPlansData(fallbackPlans);
      setSubscriptionPackages(fallbackPlans.map(p => p.name));
    }
  }, []); // Empty dependency array since we only use setState functions

  // Fetch subscription plans when modal opens
  useEffect(() => {
    if (visible) {
      fetchSubscriptionPlans();
    }
  }, [visible, fetchSubscriptionPlans]);

  // Animate modal in and out (slide up from bottom like CustomerDetailsModal)
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_WIDTH * 2); // Start off screen at bottom
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH * 2,
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        zip_code: '',
        subscription_package: '',
      });
      setErrors({});
      setShowPackageDropdown(false);
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    } else {
      // Initialize subscription packages when modal opens if not already set
      if (subscriptionPackages.length === 0) {
        setSubscriptionPackages(['Basic', 'Standard', 'Premium', 'Enterprise', 'Pro']);
      }
    }
  }, [visible]);

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

    // Handle address suggestions (basic implementation)
    if (field === 'address' && value.length > 2) {
      // You can integrate with a geocoding API here (e.g., Google Places, Mapbox)
      // For now, we'll just show a hint message
      setShowAddressSuggestions(true);
    } else if (field === 'address' && value.length <= 2) {
      setShowAddressSuggestions(false);
    }
  };

  const handlePackageSelect = (packageName) => {
    setFormData(prev => ({
      ...prev,
      subscription_package: packageName // Store the name for display
    }));
    setShowPackageDropdown(false);
    
    if (errors.subscription_package) {
      setErrors(prev => ({
        ...prev,
        subscription_package: ''
      }));
    }
  };

  // Get the ID, slug, or name for the selected subscription plan
  // Try ID first (most common), then slug, then name
  const getSubscriptionPlanValue = (planName) => {
    // Find the plan object by name
    const plan = subscriptionPlansData.find(p => 
      (p.name || p.Name) === planName || 
      (p.slug || p.Slug) === planName ||
      (p.title || p.Title) === planName
    );
    
    // Return ID first (most likely what API expects), then slug, then name
    if (plan) {
      // Try ID first (as number or string)
      if (plan.id !== undefined && plan.id !== null) {
        return plan.id.toString();
      }
      if (plan.Id !== undefined && plan.Id !== null) {
        return plan.Id.toString();
      }
      // Then try slug
      if (plan.slug || plan.Slug) {
        return plan.slug || plan.Slug;
      }
      // Finally fall back to name
      return plan.name || plan.Name || planName;
    }
    
    // Fallback: try to match by ID or slug from database values
    const idMap = {
      'Bronze Package': 17,
      'Silver Package': 18,
      'Gold Package': 19,
      'Platinum Package': 20,
      'Public Plan': 22,
    };
    
    const slugMap = {
      'Bronze Package': 'bronze',
      'Silver Package': 'silver',
      'Gold Package': 'gold',
      'Platinum Package': 'platinum',
      'Public Plan': 'public',
    };
    
    // Try ID first, then slug
    if (idMap[planName] !== undefined) {
      return idMap[planName].toString();
    }
    
    return slugMap[planName] || planName;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Basic phone validation - accepts numbers, spaces, dashes, parentheses
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    if (!formData.zip_code.trim()) {
      newErrors.zip_code = 'Zip code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zip_code)) {
      newErrors.zip_code = 'Please enter a valid zip code';
    }
    
    if (!formData.subscription_package.trim()) {
      newErrors.subscription_package = 'Subscription package is required';
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
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Prepare the data for API submission
      // Note: API expects PascalCase field names (Name, SubscriptionsPlan, etc.)
      // Get the correct subscription plan value (slug or ID)
      const subscriptionPlanValue = getSubscriptionPlanValue(formData.subscription_package);
      
      const apiData = {
        Name: formData.full_name.trim(),
        Email: formData.email.trim().toLowerCase(),
        Phone: formData.phone.trim(),
        Address: formData.address.trim(),
        ZipCode: formData.zip_code.trim(),
        SubscriptionsPlan: subscriptionPlanValue, // Send slug or ID instead of name
      };
      
      console.log('Sending API data:', apiData);
      console.log('Subscription plan mapping:', {
        selectedName: formData.subscription_package,
        sendingValue: subscriptionPlanValue,
        availablePlans: subscriptionPlansData
      });
    
      const response = await fetch('https://app.stormbuddi.com/api/mobile/clients', {
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
        console.log('API Error Response:', errorData);
        
        // Handle Laravel validation errors (422 status code typically)
        if (errorData.errors && typeof errorData.errors === 'object') {
          const validationErrors = {};
          
          // Map Laravel validation errors to form fields
          Object.keys(errorData.errors).forEach(field => {
            const fieldErrors = errorData.errors[field];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              // Map API field names to form field names
              const mappedField = field === 'full_name' || 
                                 field === 'name' || 
                                 field === 'Name' ? 'full_name' :
                                 field === 'email' || field === 'Email' ? 'email' :
                                 field === 'phone' || 
                                 field === 'phone_number' || 
                                 field === 'Phone' || 
                                 field === 'PhoneNumber' ? 'phone' :
                                 field === 'address' || field === 'Address' ? 'address' :
                                 field === 'zip_code' || 
                                 field === 'zip' || 
                                 field === 'ZipCode' || 
                                 field === 'Zip' ? 'zip_code' :
                                 field === 'subscription_package' || 
                                 field === 'package' || 
                                 field === 'SubscriptionsPlan' ||
                                 field === 'subscriptions_plan' ? 'subscription_package' :
                                 field;
              
              validationErrors[mappedField] = fieldErrors[0]; // Get first error message
            }
          });
          
          // Set validation errors on form
          if (Object.keys(validationErrors).length > 0) {
            console.log('Setting validation errors:', validationErrors);
            setErrors(validationErrors);
            showError(errorData.message || 'Please fix the validation errors above.');
            setLoading(false);
            return;
          }
        }
        
        // For other error responses, show the error message
        const errorMessage = errorData.message || 
                           errorData.error || 
                           `HTTP error! status: ${response.status}`;
        showError(errorMessage);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('API Success Response:', data);
      
      if (data.success) {
        console.log('Customer created successfully:', data);
        
        showSuccess('Customer created successfully!');
        onSubmit(data.data || apiData);
        handleClose();
      } else {
        // Handle non-success response
        if (data.errors && typeof data.errors === 'object') {
          const validationErrors = {};
          
          Object.keys(data.errors).forEach(field => {
            const fieldErrors = data.errors[field];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              const mappedField = field === 'full_name' || 
                                 field === 'name' || 
                                 field === 'Name' ? 'full_name' :
                                 field === 'email' || field === 'Email' ? 'email' :
                                 field === 'phone' || 
                                 field === 'phone_number' || 
                                 field === 'Phone' || 
                                 field === 'PhoneNumber' ? 'phone' :
                                 field === 'address' || field === 'Address' ? 'address' :
                                 field === 'zip_code' || 
                                 field === 'zip' || 
                                 field === 'ZipCode' || 
                                 field === 'Zip' ? 'zip_code' :
                                 field === 'subscription_package' || 
                                 field === 'package' || 
                                 field === 'SubscriptionsPlan' ||
                                 field === 'subscriptions_plan' ? 'subscription_package' :
                                 field;
              
              validationErrors[mappedField] = fieldErrors[0];
            }
          });
          
          if (Object.keys(validationErrors).length > 0) {
            console.log('Setting validation errors from non-success response:', validationErrors);
            setErrors(validationErrors);
            showError(data.message || 'Please fix the validation errors above.');
            setLoading(false);
            return;
          }
        }
        
        showError(data.message || 'Failed to create customer');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Customer creation error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      });
      
      showError(err.message || 'Failed to create customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      address: '',
      zip_code: '',
      subscription_package: '',
    });
    setErrors({});
    setShowPackageDropdown(false);
    setShowAddressSuggestions(false);
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
        {/* Background overlay */}
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Customer</Text>
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
            keyboardShouldPersistTaps="handled"
          >
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.full_name && styles.inputError
                ]}
                placeholder="Enter customer's full name"
                placeholderTextColor="#999"
                value={formData.full_name}
                onChangeText={(value) => handleInputChange('full_name', value)}
              />
              {errors.full_name && (
                <Text style={styles.errorText}>{errors.full_name}</Text>
              )}
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.email && styles.inputError
                ]}
                placeholder="Enter email address"
                placeholderTextColor="#999"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Phone Number Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.phone && styles.inputError
                ]}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
              />
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            {/* Address Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.address && styles.inputError
                ]}
                placeholder="Start typing address..."
                placeholderTextColor="#999"
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                multiline={true}
                numberOfLines={2}
                textAlignVertical="top"
              />
              {showAddressSuggestions && formData.address.length > 2 && (
                <View style={styles.addressHint}>
                  <Icon name="search" size={14} color={colors.textSecondary} />
                  <Text style={styles.addressHintText}>
                    Start typing to see address suggestions
                  </Text>
                </View>
              )}
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
            </View>

            {/* Zip Code Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Zip Code *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.zip_code && styles.inputError
                ]}
                placeholder="Enter zip code"
                placeholderTextColor="#999"
                value={formData.zip_code}
                onChangeText={(value) => handleInputChange('zip_code', value)}
                keyboardType="number-pad"
                maxLength={10}
              />
              {errors.zip_code && (
                <Text style={styles.errorText}>{errors.zip_code}</Text>
              )}
            </View>

            {/* Subscription Package Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subscription Package *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  errors.subscription_package && styles.inputError
                ]}
                onPress={() => setShowPackageDropdown(!showPackageDropdown)}
              >
                <Text style={[
                  styles.dropdownText,
                  !formData.subscription_package && styles.placeholderText
                ]}>
                  {formData.subscription_package || 'Choose a subscription package'}
                </Text>
                <Icon 
                  name={showPackageDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#666" 
                />
              </TouchableOpacity>
              
              {showPackageDropdown && (
                <ScrollView 
                  style={styles.dropdownList}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {subscriptionPackages.map((pkg, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dropdownItem,
                        formData.subscription_package === pkg && styles.dropdownItemSelected
                      ]}
                      onPress={() => handlePackageSelect(pkg)}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        formData.subscription_package === pkg && styles.dropdownItemTextSelected
                      ]}>
                        {pkg}
                      </Text>
                      {formData.subscription_package === pkg && (
                        <Icon name="check" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {errors.subscription_package && (
                <Text style={styles.errorText}>{errors.subscription_package}</Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creating...' : 'Create Customer'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
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
    maxHeight: '80%',
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
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    fontWeight: '500',
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 44,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    maxHeight: 200,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primaryBackground,
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  addressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  addressHintText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CreateCustomerModal;

