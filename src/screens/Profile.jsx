import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  BackHandler,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import reusable components
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import PageLoader from '../components/PageLoader';
import ErrorMessage from '../components/ErrorMessage';
import NotificationListModal from '../components/NotificationListModal';
import { getToken } from '../utils/tokenStorage';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { emit } from '../utils/eventBus';
import { setUserProfile } from '../utils/userProfileStorage';
import { getUserProfile } from '../utils/userProfileStorage';
import usePageLoader from '../hooks/usePageLoader';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';

const Profile = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showSuccess, showError, showInfo } = useToast();
  const [formData, setFormData] = useState({
    businessName: '',
    streetAddress: '',
    city: '',
    country: '',
    state: '',
    postalCode: '',
    website: '',
    phoneNumber: '',
    emailAddress: '',
    password: '',
    confirmPassword: '',
    subscriptionPlan: '',
    subscriptionStatus: '',
  });

  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Use the new page loader hook - start with false, only show when screen is focused
  const { shouldShowLoader, startLoading, stopLoading, resetLoader } = usePageLoader(false);

  const { uploading: avatarUploading, error: avatarError, uploadedUrl, pickAndUpload, upload, selected } = useAvatarUpload({
    onUploaded: (url) => {
      if (url) setAvatarUrl(url);
    },
    showError,
  });

  // Handle device back button
  React.useEffect(() => {
    const backAction = () => {
      navigation.navigate('Dashboard');
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [navigation]);

  // Fetch profile data from backend API
  const fetchProfile = async () => {
    startLoading();
    setError(null);
    
    try {
      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      

      const response = await fetch('https://app.stormbuddi.com/api/mobile/profile', {
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
        console.log('Profile fetched successfully:', data.data);
        
        // Map API response to form data
        const profileData = data.data;
        setFormData({
          businessName: profileData.name || '',
          streetAddress: profileData.address || '',
          city: profileData.city || '', // Try to get from API, fallback to empty
          country: profileData.country || '', // Try to get from API, fallback to empty
          state: profileData.state || '', // Try to get from API, fallback to empty
          postalCode: profileData.postal_code || '', // Try to get from API, fallback to empty
          website: profileData.website || '', // Try to get from API, fallback to empty
          phoneNumber: profileData.phone || '',
          emailAddress: profileData.email || '',
          password: '', // Don't populate password fields
          confirmPassword: '',
          subscriptionPlan: profileData.subscription?.plan_name || '',
          subscriptionStatus: profileData.subscription_status || '',
        });
        // attempt to read avatar url
        if (profileData.avatar_url || profileData.avatar) {
          setAvatarUrl(profileData.avatar_url || profileData.avatar);
        }
      } else {
        console.log('API response structure different, using empty form');
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      
      // Handle different error types
      if (err.message.includes('404')) {
        setError('Profile API endpoint not found. Using default form.');
        console.log('Profile API not implemented yet, using empty form');
      } else if (err.message.includes('500')) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load profile data.');
      }
    } finally {
      stopLoading();
    }
  };

  // Only fetch data and show loader when Profile screen is focused
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          const cached = await getUserProfile();
          if (cached?.avatarUrl) {
            setAvatarUrl(cached.avatarUrl);
          }
        } catch (_) {}
        fetchProfile();
      })();
      
      // Cleanup: stop loader when screen loses focus
      return () => {
        resetLoader();
      };
    }, [])
  );

  // Handle avatar upload errors with toast
  useEffect(() => {
    if (avatarError) {
      showError(avatarError);
    }
  }, [avatarError, showError]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field validation - only validate fields that are actually used by the API
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business Name is required';
    }
    if (!formData.streetAddress.trim()) {
      newErrors.streetAddress = 'Street Address is required';
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone Number is required';
    }
    // Email validation removed - email cannot be changed by user
    
    // Password validation - only required if password is being changed
    if (formData.password.trim() || formData.confirmPassword.trim()) {
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required if you want to change it';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Confirm Password is required';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) {
      showError('Please fix the errors before submitting.');
      return;
    }

    startLoading();
    setError(null);
    
    try {
      // If user has selected a new avatar but hasn't uploaded it yet, upload first
      if (selected && !uploadedUrl) {
        const result = await upload(selected);
        if (result?.url) {
          setAvatarUrl(result.url);
        }
      }

      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Prepare data for API - include all fields that might be supported
      const updateData = {
        name: formData.businessName,
        address: formData.streetAddress,
        phone: formData.phoneNumber,
        email: formData.emailAddress,
        // Include additional fields that might be supported by the API
        city: formData.city,
        country: formData.country,
        state: formData.state,
        postal_code: formData.postalCode,
        website: formData.website,
      };

      // If we have an avatar URL from the upload step, include it when supported
      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      // Only include password if it's provided
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      console.log('Sending profile update data:', updateData);

      const response = await fetch('https://app.stormbuddi.com/api/mobile/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // persist latest profile
        try { await setUserProfile({ name: formData.businessName, avatarUrl: avatarUrl || '' }); } catch (_) {}
        showSuccess('Profile updated successfully!');
        // Notify other components that profile (including avatar) might have changed
        emit('profile:updated', {
          avatarUrl: avatarUrl || null,
          name: formData.businessName,
        });
        // Stay on profile page after update
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Handle different error types
      if (error.message.includes('404')) {
        setError('Profile update API not available yet.');
        showInfo('Profile update feature is not available yet. Please contact support.');
      } else if (error.message.includes('500')) {
        setError('Server error. Please try again later.');
        showError('Server error occurred. Please try again later.');
      } else {
        setError('Failed to update profile. Please try again.');
        showError('Failed to update profile. Please try again.');
      }
    } finally {
      stopLoading();
    }
  };

  const handleChangeAvatar = async () => {
    const result = await pickAndUpload();
    if (result?.url) {
      showSuccess('Avatar updated successfully!');
    }
  };

  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading profile..."
      />
      
      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={styles.contentContainer}>
          {/* Header */}
          <Header
            title="Profile"
            onMenuPress={() => navigation.openDrawer()}
            onNotificationPress={handleNotificationPress}
            showNotification={true}
            showMenu={true}
            showBack={false}
          />

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 20 }
            ]}
          >
        {/* Error State */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={fetchProfile}
            retryText="Retry"
          />
        )}

        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Update Profile</Text>
          {/* Avatar Section */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarPreviewWrap}>
              {(() => {
                const localPreviewUri = selected && selected.uri
                  ? (Platform.OS === 'ios'
                      ? (selected.uri.startsWith('file://') ? selected.uri : `file://${selected.uri}`)
                      : selected.uri)
                  : null;
                const preview = localPreviewUri || avatarUrl;
                return preview ? (
                  <Image source={{ uri: preview }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderText}>No Avatar</Text>
                  </View>
                );
              })()}
            </View>
            <View style={styles.avatarActions}>
              <TouchableOpacity onPress={handleChangeAvatar} style={styles.avatarButton} disabled={avatarUploading}>
                <Text style={styles.avatarButtonText}>{avatarUploading ? 'Uploading...' : 'Change Avatar'}</Text>
              </TouchableOpacity>
              {avatarError ? <Text style={styles.avatarError}>{avatarError}</Text> : null}
            </View>
          </View>
          
          {/* Business Name */}
          <InputField
            label="Business Name"
            value={formData.businessName}
            onChangeText={(value) => handleInputChange('businessName', value)}
            placeholder="Enter your business name"
            error={errors.businessName}
            required
          />

          {/* Street Address */}
          <InputField
            label="Street Address"
            value={formData.streetAddress}
            onChangeText={(value) => handleInputChange('streetAddress', value)}
            placeholder="Enter street address"
            error={errors.streetAddress}
            required
          />

          {/* City */}
          <InputField
            label="City"
            value={formData.city}
            onChangeText={(value) => handleInputChange('city', value)}
            placeholder="Enter city"
            error={errors.city}
          />

          {/* Country */}
          <InputField
            label="Country"
            value={formData.country}
            onChangeText={(value) => handleInputChange('country', value)}
            placeholder="Enter country"
            error={errors.country}
          />

          {/* State */}
          <InputField
            label="State"
            value={formData.state}
            onChangeText={(value) => handleInputChange('state', value)}
            placeholder="Enter state/province"
            error={errors.state}
          />

          {/* Postal Code */}
          <InputField
            label="Postal Code"
            value={formData.postalCode}
            onChangeText={(value) => handleInputChange('postalCode', value)}
            placeholder="Enter postal code"
            error={errors.postalCode}
          />

          {/* Website */}
          <InputField
            label="Website"
            value={formData.website}
            onChangeText={(value) => handleInputChange('website', value)}
            placeholder="Enter website URL"
            error={errors.website}
            keyboardType="url"
          />

          {/* Phone Number */}
          <InputField
            label="Phone Number"
            value={formData.phoneNumber}
            onChangeText={(value) => handleInputChange('phoneNumber', value)}
            placeholder="Enter phone number"
            error={errors.phoneNumber}
            keyboardType="phone-pad"
            required
          />

          {/* Email Address */}
          <InputField
            label="Email Address (Cannot be changed)"
            value={formData.emailAddress}
            onChangeText={(value) => handleInputChange('emailAddress', value)}
            placeholder="Enter email address"
            error={errors.emailAddress}
            keyboardType="email-address"
            autoCapitalize="none"
            required
            editable={false}
          />

          {/* Password */}
          <InputField
            label="Password (Leave blank to keep current)"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholder="Enter new password"
            error={errors.password}
            secureTextEntry
          />

          {/* Confirm Password */}
          <InputField
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            placeholder="Confirm new password"
            error={errors.confirmPassword}
            secureTextEntry
          />

          {/* Subscription Plan */}
          <InputField
            label="Subscription Plan"
            value={formData.subscriptionPlan}
            onChangeText={(value) => handleInputChange('subscriptionPlan', value)}
            placeholder="Enter subscription plan"
            error={errors.subscriptionPlan}
          />

          {/* Subscription Status */}
          <InputField
            label="Subscription Status"
            value={formData.subscriptionStatus}
            onChangeText={(value) => handleInputChange('subscriptionStatus', value)}
            placeholder="Enter subscription status"
            error={errors.subscriptionStatus}
          />

          {/* Update Profile Button */}
          <Button
            title="Update Profile"
            onPress={handleUpdateProfile}
            loading={shouldShowLoader}
            style={styles.updateButton}
          />
          </Card>
        </ScrollView>

        {/* Notification List Modal */}
        <NotificationListModal
          visible={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
        />
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formCard: {
    margin: 16,
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPreviewWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: colors.border,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  avatarActions: {
    flex: 1,
  },
  avatarButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  avatarButtonText: {
    color: colors.textOnPrimary,
    fontWeight: '500',
  },
  avatarError: {
    marginTop: 6,
    color: colors.error,
    fontSize: 12,
  },
  updateButton: {
    marginTop: 20,
    marginBottom: 20,
  },
});

export default Profile;