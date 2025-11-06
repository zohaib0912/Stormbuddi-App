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
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../utils/tokenStorage';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';
import Button from './Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Try to import DateTimePicker
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  console.warn('DateTimePicker not available');
}

const CustomerDetailsModal = ({
  visible,
  onClose,
  customer,
  onUpdate,
}) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'property'
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Personal Details Form Data
  const [personalData, setPersonalData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    zip_code: '',
    subscription_package: '',
    _subscriptionPlanId: null, // Store original ID for reference
  });

  // Property Details Form Data
  const [propertyData, setPropertyData] = useState({
    owner_full_name: '',
    ownership_type: '',
    mailing_address: '',
    owner_occupied: '',
    last_sale_date: '',
    sale_price: '',
    assessed_value: '',
    year_built: '',
    property_type: '',
    lot_size: '',
    structure_size: '',
    car_vin: '',
    car_picture: null,
    apn: '',
    zoning_code: '',
  });

  const [subscriptionPackages, setSubscriptionPackages] = useState([]);
  const [subscriptionPlansData, setSubscriptionPlansData] = useState([]);
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [showOwnershipDropdown, setShowOwnershipDropdown] = useState(false);
  const [showOwnerOccupiedDropdown, setShowOwnerOccupiedDropdown] = useState(false);
  const [showPropertyTypeDropdown, setShowPropertyTypeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customerId, setCustomerId] = useState(null);

  const ownershipTypes = ['Individual', 'Joint', 'Trust', 'Corporation', 'LLC'];
  const ownerOccupiedOptions = ['Yes', 'No'];
  const propertyTypes = ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Mixed Use'];

  // Fetch full customer details including property details (optional - only if endpoint exists)
  const fetchCustomerDetails = useCallback(async (customerId) => {
    try {
      const token = await getToken();
      if (!token) return null;

      const response = await fetch(`https://app.stormbuddi.com/api/mobile/clients/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If endpoint doesn't exist (405) or other error, silently fail and use passed customer data
        if (response.status === 405 || response.status === 404) {
          console.log('Customer details endpoint not available, using passed customer data');
        } else {
          console.warn('Failed to fetch customer details:', response.status);
        }
        return null;
      }

      const data = await response.json();
      
      // Handle different response structures
      const customerDetails = data.success && data.data ? data.data : data.data || data;
      console.log('Full customer details fetched:', customerDetails);
      return customerDetails;
    } catch (error) {
      // Silently fail - use the customer data that was passed in
      console.log('Error fetching customer details, using passed customer data:', error.message);
      return null;
    }
  }, []);

  // Helper to get plan name from ID for dropdown display (define before fetchSubscriptionPlans)
  const getSubscriptionPlanName = useCallback((planIdOrName) => {
    // If already a name string (not numeric), return it
    if (typeof planIdOrName === 'string' && !/^\d+$/.test(planIdOrName)) {
      return planIdOrName;
    }

    // Convert ID (number or numeric string) to plan name
    const planId = typeof planIdOrName === 'number' ? planIdOrName : parseInt(planIdOrName, 10);
    if (isNaN(planId)) return planIdOrName?.toString() || '';

    // Check if we have the plan in our data
    const plan = subscriptionPlansData.find(p => 
      (p.id || p.Id) === planId ||
      (p.id || p.Id)?.toString() === planId?.toString()
    );
    
    if (plan) {
      return plan.name || plan.Name || plan.slug || plan.Slug || '';
    }
    
    // Fallback mapping
    const idToNameMap = {
      17: 'Bronze Package',
      18: 'Silver Package',
      19: 'Gold Package',
      20: 'Platinum Package',
      22: 'Public Plan',
    };
    
    return idToNameMap[planId] || planIdOrName?.toString() || '';
  }, [subscriptionPlansData]);

  const fetchSubscriptionPlans = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const fallbackPlans = [
        { id: 17, name: 'Bronze Package', slug: 'bronze' },
        { id: 18, name: 'Silver Package', slug: 'silver' },
        { id: 19, name: 'Gold Package', slug: 'gold' },
        { id: 20, name: 'Platinum Package', slug: 'platinum' },
        { id: 22, name: 'Public Plan', slug: 'public' },
      ];
      setSubscriptionPlansData(fallbackPlans);
      setSubscriptionPackages(fallbackPlans.map(p => p.name));
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
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
  }, []);

  // Animate modal in and out (slide up from bottom like CreateLeadModal)
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_WIDTH * 2); // Start off screen at bottom
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH * 2,
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Load customer data when modal opens
  useEffect(() => {
    if (visible && customer) {
      // Extract customer ID - try different possible field names
      const id = customer.id || customer.Id || customer.ID || customer.client_id || customer.ClientId;
      setCustomerId(id);
      console.log('Customer ID extracted:', id, 'from customer object:', customer);

      // First, load basic data from the customer object passed in
      // Then fetch full details from API
      const loadCustomerData = async () => {
        // Get subscription plan for display (convert ID to name if needed)
        const subscriptionPlanId = customer.SubscriptionsPlan || 
                                   customer.subscription_package || 
                                   customer.subscriptions_plan;
        
        // Convert subscription plan ID to name for dropdown display
        // We'll use getSubscriptionPlanName after subscriptionPlansData is loaded
        // For now, store it as-is and convert it in useEffect after plans are loaded
        const subscriptionPlanName = subscriptionPlanId && typeof subscriptionPlanId === 'number' 
          ? subscriptionPlanId // Store ID temporarily, will convert after plans load
          : subscriptionPlanId || '';

        // Load initial personal details from the passed customer object (match API PascalCase field names)
        setPersonalData({
          full_name: customer.Name || customer.full_name || customer.name || '',
          email: customer.Email || customer.email || customer.email_address || '',
          phone: customer.Phone || customer.phone || customer.phone_number || '',
          address: customer.address || customer.Address || customer.street_address || '',
          zip_code: customer.ZipCode || customer.zip_code || customer.zip || customer.postal_code || '',
          subscription_package: subscriptionPlanName, // Will be converted to name after plans load
          _subscriptionPlanId: subscriptionPlanId, // Store original ID for reference
        });

        // Load initial property details from the passed customer object (match API PascalCase field names)
        setPropertyData({
          owner_full_name: customer.Owner_Full_Name || customer.owner_full_name || customer.property_owner_name || '',
          ownership_type: customer.OwnershipType || customer.ownership_type || '',
          mailing_address: customer.MailingAddress || customer.mailing_address || customer.property_address || '',
          owner_occupied: customer.OwnerOccupied || customer.owner_occupied || '',
          last_sale_date: customer.LastSaleDate || customer.last_sale_date || customer.sale_date || '',
          sale_price: customer.SalePrice || customer.sale_price || customer.last_sale_price || '',
          assessed_value: customer.AssessedValue || customer.assessed_value || customer.assessed_value_property || '',
          year_built: customer.YearBuilt || customer.year_built || '',
          property_type: customer.PropertyType || customer.property_type || '',
          lot_size: customer.LotSize || customer.lot_size || customer.property_lot_size || '',
          structure_size: customer.StructureSize || customer.structure_size || customer.building_size || '',
          car_vin: customer.VinNumber || customer.Vin || customer.car_vin || customer.vehicle_vin || '',
          car_picture: customer.PictureUrl || customer.car_picture || customer.vehicle_picture || null,
          apn: customer.APN || customer.apn || '',
          zoning_code: customer.ZoningCode || customer.zoning_code || '',
        });

        // Fetch full customer details from API (includes property details)
        if (id) {
          const fullCustomerData = await fetchCustomerDetails(id);
          if (fullCustomerData) {
            // Update personal details with API response (match API PascalCase field names)
            setPersonalData(prev => ({
              full_name: fullCustomerData.Name || fullCustomerData.full_name || fullCustomerData.name || prev.full_name,
              email: fullCustomerData.Email || fullCustomerData.email || fullCustomerData.email_address || prev.email,
              phone: fullCustomerData.Phone || fullCustomerData.phone || fullCustomerData.phone_number || prev.phone,
              address: fullCustomerData.Address || fullCustomerData.address || fullCustomerData.street_address || prev.address,
              zip_code: fullCustomerData.ZipCode || fullCustomerData.zip_code || fullCustomerData.zip || fullCustomerData.postal_code || prev.zip_code,
              subscription_package: (() => {
                const planId = fullCustomerData.SubscriptionsPlan || 
                              fullCustomerData.subscription_package || 
                              fullCustomerData.subscriptions_plan;
                // Convert ID to name if it's a number
                if (planId) {
                  const idToNameMap = {
                    17: 'Bronze Package',
                    18: 'Silver Package',
                    19: 'Gold Package',
                    20: 'Platinum Package',
                    22: 'Public Plan',
                  };
                  const planIdNum = typeof planId === 'number' ? planId : parseInt(planId, 10);
                  return idToNameMap[planIdNum] || planId?.toString() || prev.subscription_package;
                }
                return prev.subscription_package;
              })(),
            }));

            // Update property details with API response (match API PascalCase field names)
            setPropertyData(prev => ({
              owner_full_name: fullCustomerData.Owner_Full_Name || fullCustomerData.owner_full_name || fullCustomerData.property_owner_name || prev.owner_full_name,
              ownership_type: fullCustomerData.OwnershipType || fullCustomerData.ownership_type || prev.ownership_type,
              mailing_address: fullCustomerData.MailingAddress || fullCustomerData.mailing_address || fullCustomerData.property_address || prev.mailing_address,
              owner_occupied: fullCustomerData.OwnerOccupied || fullCustomerData.owner_occupied || prev.owner_occupied,
              last_sale_date: fullCustomerData.LastSaleDate || fullCustomerData.last_sale_date || fullCustomerData.sale_date || prev.last_sale_date,
              sale_price: fullCustomerData.SalePrice || fullCustomerData.sale_price || fullCustomerData.last_sale_price || prev.sale_price,
              assessed_value: fullCustomerData.AssessedValue || fullCustomerData.assessed_value || fullCustomerData.assessed_value_property || prev.assessed_value,
              year_built: fullCustomerData.YearBuilt || fullCustomerData.year_built || prev.year_built,
              property_type: fullCustomerData.PropertyType || fullCustomerData.property_type || prev.property_type,
              lot_size: fullCustomerData.LotSize || fullCustomerData.lot_size || fullCustomerData.property_lot_size || prev.lot_size,
              structure_size: fullCustomerData.StructureSize || fullCustomerData.structure_size || fullCustomerData.building_size || prev.structure_size,
              car_vin: fullCustomerData.VinNumber || fullCustomerData.Vin || fullCustomerData.car_vin || fullCustomerData.vehicle_vin || prev.car_vin,
              car_picture: fullCustomerData.PictureUrl || fullCustomerData.car_picture || fullCustomerData.vehicle_picture || prev.car_picture,
              apn: fullCustomerData.APN || fullCustomerData.apn || prev.apn,
              zoning_code: fullCustomerData.ZoningCode || fullCustomerData.zoning_code || prev.zoning_code,
            }));
          }
        }

        // Fetch subscription plans first
        await fetchSubscriptionPlans();
        
        // After subscription plans are loaded, convert subscription plan ID to name
        // Use a small timeout to ensure state is updated
        setTimeout(() => {
          if (subscriptionPlanId) {
            // Use fallback mapping directly since plans might not be loaded yet
            const idToNameMap = {
              17: 'Bronze Package',
              18: 'Silver Package',
              19: 'Gold Package',
              20: 'Platinum Package',
              22: 'Public Plan',
            };
            const planId = typeof subscriptionPlanId === 'number' ? subscriptionPlanId : parseInt(subscriptionPlanId, 10);
            const planName = idToNameMap[planId] || subscriptionPlanId?.toString() || '';
            if (planName) {
              setPersonalData(prev => ({
                ...prev,
                subscription_package: planName,
              }));
            }
          }
        }, 100);
      };

      loadCustomerData();
    } else {
      // Reset customer ID when modal closes
      setCustomerId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, customer]);

  const handlePersonalChange = (field, value) => {
    setPersonalData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePropertyChange = (field, value) => {
    setPropertyData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getSubscriptionPlanValue = (planNameOrId) => {
    // If it's already a number (ID), return it as string
    if (typeof planNameOrId === 'number') {
      return planNameOrId.toString();
    }
    
    // If it's a numeric string (like "17"), return it directly
    if (typeof planNameOrId === 'string' && /^\d+$/.test(planNameOrId.trim())) {
      return planNameOrId.trim();
    }

    // Otherwise, treat it as a plan name and find the ID
    const plan = subscriptionPlansData.find(p =>
      (p.name || p.Name) === planNameOrId ||
      (p.slug || p.Slug) === planNameOrId
    );
    if (plan) {
      if (plan.id !== undefined && plan.id !== null) {
        return plan.id.toString();
      }
      return plan.slug || plan.Slug || planNameOrId;
    }
    
    // Fallback: map plan names to IDs
    const idMap = {
      'Bronze Package': 17,
      'Silver Package': 18,
      'Gold Package': 19,
      'Platinum Package': 20,
      'Public Plan': 22,
    };
    return idMap[planNameOrId]?.toString() || planNameOrId?.toString() || '';
  };


  const handleUpdatePersonal = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const subscriptionPlanValue = getSubscriptionPlanValue(personalData.subscription_package);
      
      // Ensure SubscriptionsPlan is sent as a number (not string) to match backend expectations
      const subscriptionsPlanId = subscriptionPlanValue ? parseInt(subscriptionPlanValue, 10) : null;
      
      if (!subscriptionsPlanId || isNaN(subscriptionsPlanId)) {
        showError('Please select a valid subscription package');
        setLoading(false);
        return;
      }
      
      // Prepare the data for API submission with PascalCase field names
      const apiData = {
        Name: personalData.full_name.trim(),
        Email: personalData.email?.trim().toLowerCase() || '',
        Phone: personalData.phone?.trim() || '',
        Address: personalData.address?.trim() || '',
        ZipCode: personalData.zip_code?.trim() || '',
        SubscriptionsPlan: subscriptionsPlanId, // Send as number
      };

      console.log('Updating personal details:', apiData);
      console.log('Using customer ID:', customerId, 'from customer:', customer);

      if (!customerId) {
        showError('Customer ID is missing. Cannot update customer.');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://app.stormbuddi.com/api/mobile/clients/${customerId}`, {
        method: 'PUT',
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
        if (errorData.errors && typeof errorData.errors === 'object') {
          const validationErrors = {};
          Object.keys(errorData.errors).forEach(field => {
            const fieldErrors = errorData.errors[field];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              const mappedField = field === 'Name' ? 'full_name' :
                                field === 'Email' ? 'email' :
                                field === 'Phone' ? 'phone' :
                                field === 'Address' ? 'address' :
                                field === 'ZipCode' ? 'zip_code' :
                                field === 'SubscriptionsPlan' ? 'subscription_package' : field;
              validationErrors[mappedField] = fieldErrors[0];
            }
          });
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            showError(errorData.message || 'Please fix the validation errors above.');
            setLoading(false);
            return;
          }
        }
        showError(errorData.message || 'Failed to update customer');
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.success) {
        showSuccess('Personal details updated successfully!');
        onUpdate && onUpdate();
        // Don't close modal - allow user to edit property details too
      } else {
        showError(data.message || 'Failed to update customer');
      }
    } catch (err) {
      console.error('Update error:', err);
      showError(err.message || 'Failed to update customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProperty = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Check if we need to upload a file (car picture)
      const hasFileUpload = propertyData.car_picture && typeof propertyData.car_picture !== 'string';

      if (hasFileUpload) {
        // Use POST with FormData for file uploads
        const formData = new FormData();
        
        // Add required personal details (backend validation requires these)
        formData.append('Name', personalData.full_name?.trim() || '');
        if (personalData.email) {
          formData.append('Email', personalData.email.trim().toLowerCase());
        }
        if (personalData.phone) {
          formData.append('Phone', personalData.phone.trim());
        }
        if (personalData.address) {
          formData.append('Address', personalData.address.trim());
        }
        if (personalData.zip_code) {
          formData.append('ZipCode', personalData.zip_code.trim());
        }
        const subscriptionPlanValue = getSubscriptionPlanValue(personalData.subscription_package);
        const subscriptionsPlanId = subscriptionPlanValue ? parseInt(subscriptionPlanValue, 10) : null;
        console.log('Subscription plan value for property update:', subscriptionsPlanId, 'from:', personalData.subscription_package);
        
        if (!subscriptionsPlanId || isNaN(subscriptionsPlanId)) {
          showError('Please select a valid subscription package');
          setLoading(false);
          return;
        }
        
        formData.append('SubscriptionsPlan', subscriptionsPlanId.toString());
        
        // Add property details to form data using PascalCase field names as expected by backend
        if (propertyData.owner_full_name) formData.append('Owner_Full_Name', propertyData.owner_full_name.trim());
        if (propertyData.ownership_type) formData.append('OwnershipType', propertyData.ownership_type);
        if (propertyData.mailing_address) formData.append('MailingAddress', propertyData.mailing_address.trim());
        if (propertyData.owner_occupied) formData.append('OwnerOccupied', propertyData.owner_occupied);
        if (propertyData.last_sale_date) formData.append('LastSaleDate', propertyData.last_sale_date);
        if (propertyData.sale_price) formData.append('SalePrice', propertyData.sale_price);
        if (propertyData.assessed_value) formData.append('AssessedValue', propertyData.assessed_value);
        if (propertyData.year_built) formData.append('YearBuilt', propertyData.year_built);
        if (propertyData.property_type) formData.append('PropertyType', propertyData.property_type);
        if (propertyData.lot_size) formData.append('LotSize', propertyData.lot_size);
        if (propertyData.structure_size) formData.append('StructureSize', propertyData.structure_size);
        if (propertyData.car_vin) formData.append('VinNumber', propertyData.car_vin.trim());
        if (propertyData.apn) formData.append('APN', propertyData.apn.trim());
        if (propertyData.zoning_code) formData.append('ZoningCode', propertyData.zoning_code);
        
        // Add file if it's an object with uri (backend expects 'Picture' field name)
        if (propertyData.car_picture && propertyData.car_picture.uri) {
          formData.append('Picture', {
            uri: propertyData.car_picture.uri,
            type: propertyData.car_picture.type || 'image/jpeg',
            name: propertyData.car_picture.name || 'car_picture.jpg',
          });
        }

        console.log('Updating property details with file upload');
        console.log('Using customer ID:', customerId);
        console.log('Personal data being sent:', {
          Name: personalData.full_name,
          Email: personalData.email,
          Phone: personalData.phone,
          Address: personalData.address,
          ZipCode: personalData.zip_code,
          SubscriptionsPlan: subscriptionPlanValue
        });

        if (!customerId) {
          showError('Customer ID is missing. Cannot update customer.');
          setLoading(false);
          return;
        }

        const response = await fetch(`https://app.stormbuddi.com/api/mobile/clients/${customerId}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type for FormData, let the browser set it with boundary
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Property update error response (FormData):', errorData);
          if (errorData.errors && typeof errorData.errors === 'object') {
            const errorMessages = Object.values(errorData.errors).flat().join(', ');
            showError(errorMessages || errorData.message || 'Failed to update property details');
          } else {
            showError(errorData.message || 'Failed to update property details');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('Property update success response (FormData):', data);
        if (data.success) {
          showSuccess('Property details updated successfully!');
          onUpdate && onUpdate();
        } else {
          showError(data.message || 'Failed to update property details');
        }
      } else {
        // Use PUT with JSON for updates without file upload (using PascalCase field names)
        const subscriptionPlanValue = getSubscriptionPlanValue(personalData.subscription_package);
        const subscriptionsPlanId = subscriptionPlanValue ? parseInt(subscriptionPlanValue, 10) : null;
        
        if (!subscriptionsPlanId || isNaN(subscriptionsPlanId)) {
          showError('Please select a valid subscription package');
          setLoading(false);
          return;
        }
        
        const apiData = {
          Name: personalData.full_name?.trim() || '', // Personal details are required for validation
          Email: personalData.email?.trim() || '',
          Phone: personalData.phone?.trim() || '',
          Address: personalData.address?.trim() || '',
          ZipCode: personalData.zip_code?.trim() || '',
          SubscriptionsPlan: subscriptionsPlanId, // Send as number
          Owner_Full_Name: propertyData.owner_full_name?.trim() || '',
          OwnershipType: propertyData.ownership_type || '',
          MailingAddress: propertyData.mailing_address?.trim() || '',
          OwnerOccupied: propertyData.owner_occupied || '',
          LastSaleDate: propertyData.last_sale_date || '',
          SalePrice: propertyData.sale_price || '',
          AssessedValue: propertyData.assessed_value || '',
          YearBuilt: propertyData.year_built || '',
          PropertyType: propertyData.property_type || '',
          LotSize: propertyData.lot_size || '',
          StructureSize: propertyData.structure_size || '',
          VinNumber: propertyData.car_vin?.trim() || '',
          APN: propertyData.apn?.trim() || '',
          ZoningCode: propertyData.zoning_code || '',
        };

        console.log('Updating property details:', apiData);
        console.log('Using customer ID:', customerId);
        console.log('Subscription plan value:', subscriptionsPlanId, 'from:', personalData.subscription_package);

        if (!customerId) {
          showError('Customer ID is missing. Cannot update customer.');
          setLoading(false);
          return;
        }

        const response = await fetch(`https://app.stormbuddi.com/api/mobile/clients/${customerId}`, {
          method: 'PUT',
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
          console.error('Property update error response:', errorData);
          if (errorData.errors && typeof errorData.errors === 'object') {
            const errorMessages = Object.values(errorData.errors).flat().join(', ');
            showError(errorMessages || errorData.message || 'Failed to update property details');
          } else {
            showError(errorData.message || 'Failed to update property details');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('Property update success response:', data);
        if (data.success) {
          showSuccess('Property details updated successfully!');
          onUpdate && onUpdate();
        } else {
          showError(data.message || 'Failed to update property details');
        }
      }
    } catch (err) {
      console.error('Update error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      });
      showError(err.message || 'Failed to update property details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Early return should be after all hooks
  if (!customer) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        {/* Background overlay that closes modal when tapped */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
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
            <Text style={styles.modalTitle}>Edit Customer</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
              onPress={() => setActiveTab('personal')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'personal' && styles.activeTabText
              ]}>
                Personal Details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'property' && styles.activeTab]}
              onPress={() => setActiveTab('property')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'property' && styles.activeTabText
              ]}>
                Property Details
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === 'personal' ? (
              <View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.full_name && styles.inputError
                    ]}
                    placeholder="Enter customer's full name"
                    placeholderTextColor="#999"
                    value={personalData.full_name}
                    onChangeText={(value) => handlePersonalChange('full_name', value)}
                  />
                  {errors.full_name && (
                    <Text style={styles.errorText}>{errors.full_name}</Text>
                  )}
                </View>

                {/* Email Address */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.email && styles.inputError
                    ]}
                    placeholder="Enter email address"
                    placeholderTextColor="#999"
                    value={personalData.email}
                    onChangeText={(value) => handlePersonalChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                {/* Phone Number */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.phone && styles.inputError
                    ]}
                    placeholder="Enter phone number"
                    placeholderTextColor="#999"
                    value={personalData.phone}
                    onChangeText={(value) => handlePersonalChange('phone', value)}
                    keyboardType="phone-pad"
                  />
                  {errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}
                </View>

                {/* Address */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Address *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.address && styles.inputError
                    ]}
                    placeholder="Enter address"
                    placeholderTextColor="#999"
                    value={personalData.address}
                    onChangeText={(value) => handlePersonalChange('address', value)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {errors.address && (
                    <Text style={styles.errorText}>{errors.address}</Text>
                  )}
                </View>

                {/* Zip Code */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Zip Code *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      errors.zip_code && styles.inputError
                    ]}
                    placeholder="Enter zip code"
                    placeholderTextColor="#999"
                    value={personalData.zip_code}
                    onChangeText={(value) => handlePersonalChange('zip_code', value)}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  {errors.zip_code && (
                    <Text style={styles.errorText}>{errors.zip_code}</Text>
                  )}
                </View>

                {/* Subscription Package */}
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
                      !personalData.subscription_package && styles.placeholderText
                    ]}>
                      {personalData.subscription_package || 'Choose a subscription package'}
                    </Text>
                    <Icon
                      name={showPackageDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                  {showPackageDropdown && (
                    <View style={styles.dropdownList}>
                      {subscriptionPackages.map((pkg, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dropdownItem,
                            personalData.subscription_package === pkg && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            handlePersonalChange('subscription_package', pkg);
                            setShowPackageDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            personalData.subscription_package === pkg && styles.dropdownItemTextSelected
                          ]}>
                            {pkg}
                          </Text>
                          {personalData.subscription_package === pkg && (
                            <Icon name="check" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {errors.subscription_package && (
                    <Text style={styles.errorText}>{errors.subscription_package}</Text>
                  )}
                </View>

                <Button
                  title={loading ? 'Updating...' : 'Update Personal Details'}
                  onPress={handleUpdatePersonal}
                  loading={loading}
                  style={styles.updateButton}
                />
              </View>
            ) : (
              <View>
                {/* Owner Full Name */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Owner Full Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter property owner's full name"
                    placeholderTextColor="#999"
                    value={propertyData.owner_full_name}
                    onChangeText={(value) => handlePropertyChange('owner_full_name', value)}
                  />
                </View>

                {/* Ownership Type */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Ownership Type</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowOwnershipDropdown(!showOwnershipDropdown)}
                  >
                    <Text style={[
                      styles.dropdownText,
                      !propertyData.ownership_type && styles.placeholderText
                    ]}>
                      {propertyData.ownership_type || 'Select ownership type'}
                    </Text>
                    <Icon
                      name={showOwnershipDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                  {showOwnershipDropdown && (
                    <View style={styles.dropdownList}>
                      {ownershipTypes.map((type, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dropdownItem,
                            propertyData.ownership_type === type && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            handlePropertyChange('ownership_type', type);
                            setShowOwnershipDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            propertyData.ownership_type === type && styles.dropdownItemTextSelected
                          ]}>
                            {type}
                          </Text>
                          {propertyData.ownership_type === type && (
                            <Icon name="check" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Mailing Address */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Mailing Address</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter complete mailing address"
                    placeholderTextColor="#999"
                    value={propertyData.mailing_address}
                    onChangeText={(value) => handlePropertyChange('mailing_address', value)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* Owner Occupied */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Owner Occupied</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowOwnerOccupiedDropdown(!showOwnerOccupiedDropdown)}
                  >
                    <Text style={[
                      styles.dropdownText,
                      !propertyData.owner_occupied && styles.placeholderText
                    ]}>
                      {propertyData.owner_occupied || 'Select option'}
                    </Text>
                    <Icon
                      name={showOwnerOccupiedDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                  {showOwnerOccupiedDropdown && (
                    <View style={styles.dropdownList}>
                      {ownerOccupiedOptions.map((option, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dropdownItem,
                            propertyData.owner_occupied === option && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            handlePropertyChange('owner_occupied', option);
                            setShowOwnerOccupiedDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            propertyData.owner_occupied === option && styles.dropdownItemTextSelected
                          ]}>
                            {option}
                          </Text>
                          {propertyData.owner_occupied === option && (
                            <Icon name="check" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Last Sale Date */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Last Sale Date</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={[
                      styles.dropdownText,
                      !propertyData.last_sale_date && styles.placeholderText
                    ]}>
                      {propertyData.last_sale_date || 'mm/dd/yyyy'}
                    </Text>
                    <Icon name="calendar-today" size={20} color="#666" />
                  </TouchableOpacity>
                  {showDatePicker && DateTimePicker && Platform.OS === 'android' && (
                    <DateTimePicker
                      value={propertyData.last_sale_date ? new Date(propertyData.last_sale_date) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          const formatted = selectedDate.toLocaleDateString('en-US');
                          handlePropertyChange('last_sale_date', formatted);
                        }
                      }}
                    />
                  )}
                </View>

                {/* Sale Price */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Sale Price</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    value={propertyData.sale_price}
                    onChangeText={(value) => handlePropertyChange('sale_price', value)}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Assessed Value */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Assessed Value</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    value={propertyData.assessed_value}
                    onChangeText={(value) => handlePropertyChange('assessed_value', value)}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Year Built */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Year Built</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY"
                    placeholderTextColor="#999"
                    value={propertyData.year_built}
                    onChangeText={(value) => handlePropertyChange('year_built', value)}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>

                {/* Property Type */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Property Type</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowPropertyTypeDropdown(!showPropertyTypeDropdown)}
                  >
                    <Text style={[
                      styles.dropdownText,
                      !propertyData.property_type && styles.placeholderText
                    ]}>
                      {propertyData.property_type || 'Select property type'}
                    </Text>
                    <Icon
                      name={showPropertyTypeDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                  {showPropertyTypeDropdown && (
                    <View style={styles.dropdownList}>
                      {propertyTypes.map((type, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dropdownItem,
                            propertyData.property_type === type && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            handlePropertyChange('property_type', type);
                            setShowPropertyTypeDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            propertyData.property_type === type && styles.dropdownItemTextSelected
                          ]}>
                            {type}
                          </Text>
                          {propertyData.property_type === type && (
                            <Icon name="check" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Lot Size */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Lot Size (sq ft)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    value={propertyData.lot_size}
                    onChangeText={(value) => handlePropertyChange('lot_size', value)}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Structure Size */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Structure Size (sq ft)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    value={propertyData.structure_size}
                    onChangeText={(value) => handlePropertyChange('structure_size', value)}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Car VIN */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Car VIN</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter VIN Number"
                    placeholderTextColor="#999"
                    value={propertyData.car_vin}
                    onChangeText={(value) => handlePropertyChange('car_vin', value)}
                  />
                </View>

                <Button
                  title={loading ? 'Updating...' : 'Update Property Details'}
                  onPress={handleUpdateProperty}
                  loading={loading}
                  style={styles.updateButton}
                />
              </View>
            )}
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
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
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  updateButton: {
    marginTop: 20,
    marginBottom: 20,
  },
});

export default CustomerDetailsModal;

