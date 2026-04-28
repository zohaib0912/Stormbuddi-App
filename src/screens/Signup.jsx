import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Import reusable components
import PageLoader from '../components/PageLoader';
import usePageLoader from '../hooks/usePageLoader';

const { width, height } = Dimensions.get('window');

const Signup = ({ navigation }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Use the page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(false);

  // Handle keyboard show/hide
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (error) {
      setError(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (text) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (value) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phone', formatted);
  };

  // API call to register user and send email
  const registerUser = async (userData) => {
    startLoading();
    setError(null);
    
    try {
      const response = await fetch('https://app.stormbuddi.com/api/pricing/free-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          plan_id: 1, // Free plan ID
          first_name: userData.firstName.trim(),
          last_name: userData.lastName.trim(),
          email: userData.email.trim().toLowerCase(),
          phone: userData.phone.trim(),
          password: userData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from API
        if (data.errors && typeof data.errors === 'object') {
          const apiErrors = {};
          Object.keys(data.errors).forEach(field => {
            const fieldErrors = data.errors[field];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              const mappedField = 
                field === 'first_name' ? 'firstName' :
                field === 'last_name' ? 'lastName' :
                field === 'plan_id' ? 'planId' :
                field;
              apiErrors[mappedField] = fieldErrors[0];
            }
          });
          setErrors(apiErrors);
          throw new Error(data.message || 'Please fix the validation errors above.');
        } else {
          throw new Error(data.message || data.error || 'Registration failed. Please try again.');
        }
      }

      // Success
      if (data.success) {
        return {
          success: true,
          message: data.message || 'Registration successful! Please check your email.',
          data: data.data || null,
        };
      } else {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      throw err;
    } finally {
      stopLoading();
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const result = await registerUser(formData);
      if (result.success) {
        setSuccess(true);
        setError(null);
        // Navigate to login after 2 seconds
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const handleResendEmail = () => {
    setSuccess(false);
    setError(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setErrors({});
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Global Page Loader */}
        <PageLoader 
          visible={shouldShowLoader}
          message="Registering..."
        />

        {/* Only show content when not loading */}
        {!shouldShowLoader && (
          <>
            {/* Background Image with Construction Worker */}
            <ImageBackground
              source={require('../assets/images/login.jpg')}
              style={styles.backgroundImage}
              resizeMode="cover"
            >
              {/* Overlay for better text readability */}
              <View style={styles.overlay} />
              
              <KeyboardAvoidingView 
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                enabled
              >
                {/* Header - Fixed at top */}
                <View style={[styles.headerContainer, keyboardHeight > 0 && styles.headerContainerSmall]}>
                  <Text style={styles.freeTrialText}>START FREE TRIAL</Text>
                  <Text style={[styles.title, keyboardHeight > 0 && styles.titleSmall]}>Create Your Account</Text>
                  {keyboardHeight === 0 && (
                    <Text style={styles.subtitle}>
                      Get started with StormBuddi today. No credit card required.
                    </Text>
                  )}
                </View>

                {/* Scrollable Form Container */}
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={[styles.formContainer, { paddingBottom: keyboardHeight > 0 ? 20 : 20 }]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {!success ? (
                    <>
                      {/* First Name Input */}
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={[styles.input, errors.firstName && styles.inputError]}
                          placeholder="First Name"
                          placeholderTextColor="#666"
                          value={formData.firstName}
                          onChangeText={(value) => handleInputChange('firstName', value)}
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                        {errors.firstName && (
                          <Text style={styles.fieldErrorText}>{errors.firstName}</Text>
                        )}
                      </View>

                      {/* Last Name Input */}
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={[styles.input, errors.lastName && styles.inputError]}
                          placeholder="Last Name"
                          placeholderTextColor="#666"
                          value={formData.lastName}
                          onChangeText={(value) => handleInputChange('lastName', value)}
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                        {errors.lastName && (
                          <Text style={styles.fieldErrorText}>{errors.lastName}</Text>
                        )}
                      </View>

                      {/* Email Input */}
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={[styles.input, errors.email && styles.inputError]}
                          placeholder="Email"
                          placeholderTextColor="#666"
                          value={formData.email}
                          onChangeText={(value) => handleInputChange('email', value)}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="email-address"
                        />
                        {errors.email && (
                          <Text style={styles.fieldErrorText}>{errors.email}</Text>
                        )}
                      </View>

                      {/* Phone Input */}
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={[styles.input, errors.phone && styles.inputError]}
                          placeholder="Phone"
                          placeholderTextColor="#666"
                          value={formData.phone}
                          onChangeText={handlePhoneChange}
                          keyboardType="phone-pad"
                          maxLength={14}
                        />
                        {errors.phone && (
                          <Text style={styles.fieldErrorText}>{errors.phone}</Text>
                        )}
                      </View>

                      {/* Password Input */}
                      <View style={styles.inputContainer}>
                        <View style={styles.passwordInputContainer}>
                          <TextInput
                            style={[styles.passwordInput, errors.password && styles.inputError]}
                            placeholder="Password"
                            placeholderTextColor="#666"
                            value={formData.password}
                            onChangeText={(value) => handleInputChange('password', value)}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(!showPassword)}
                          >
                            <Icon
                              name={showPassword ? 'eye-off' : 'eye'}
                              size={20}
                              color="#666"
                            />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.passwordHint}>Minimum 8 characters</Text>
                        {errors.password && (
                          <Text style={styles.fieldErrorText}>{errors.password}</Text>
                        )}
                      </View>

                      {/* Confirm Password Input */}
                      <View style={styles.inputContainer}>
                        <View style={styles.passwordInputContainer}>
                          <TextInput
                            style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
                            placeholder="Confirm Password"
                            placeholderTextColor="#666"
                            value={formData.confirmPassword}
                            onChangeText={(value) => handleInputChange('confirmPassword', value)}
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            <Icon
                              name={showConfirmPassword ? 'eye-off' : 'eye'}
                              size={20}
                              color="#666"
                            />
                          </TouchableOpacity>
                        </View>
                        {errors.confirmPassword && (
                          <Text style={styles.fieldErrorText}>{errors.confirmPassword}</Text>
                        )}
                      </View>

                      {/* Error Message */}
                      {error && (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{error}</Text>
                        </View>
                      )}

                      {/* Register Button */}
                      <TouchableOpacity
                        style={[styles.registerButton, shouldShowLoader && styles.registerButtonDisabled]}
                        onPress={handleRegister}
                        disabled={shouldShowLoader}
                        activeOpacity={shouldShowLoader ? 1 : 0.7}
                      >
                        <View style={styles.registerButtonContent}>
                          <Text style={styles.registerButtonText}>Register</Text>
                          <Icon name="arrow-forward" size={20} color="#ffffff" style={styles.registerButtonIcon} />
                        </View>
                      </TouchableOpacity>

                      {/* Already Have Account Link */}
                      <View style={styles.loginLinkContainer}>
                        <Text style={styles.loginLinkText}>Already Have an account? </Text>
                        <TouchableOpacity onPress={handleBackToLogin} activeOpacity={0.7}>
                          <Text style={styles.loginLink}>Login</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      {/* Success Message */}
                      <View style={styles.successContainer}>
                        <Icon name="checkmark-circle" size={60} color="#4CAF50" />
                        <Text style={styles.successTitle}>Registration Successful!</Text>
                        <Text style={styles.successText}>
                          We've sent a confirmation email to{'\n'}
                          <Text style={styles.emailText}>{formData.email}</Text>
                        </Text>
                        <Text style={styles.successInstructions}>
                          Please check your email and verify your account. You can now login with your credentials.
                        </Text>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                          style={styles.resendButton}
                          onPress={handleResendEmail}
                        >
                          <Text style={styles.resendButtonText}>Register Another Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.backToLoginButton}
                          onPress={handleBackToLogin}
                        >
                          <Text style={styles.backToLoginButtonText}>Go to Login</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </KeyboardAvoidingView>
            </ImageBackground>
          </>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingTop: 10,
  },
  headerContainer: {
    paddingTop: height * 0.08,
    paddingHorizontal: 30,
    paddingBottom: 15,
    alignItems: 'center',
  },
  headerContainerSmall: {
    paddingTop: 10,
    paddingBottom: 5,
  },
  freeTrialText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D32F2F',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  titleSmall: {
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.5)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    minHeight: 50,
  },
  inputError: {
    borderColor: '#D32F2F',
    borderWidth: 2,
  },
  passwordInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingRight: 50,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.5)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    minHeight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 20,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordHint: {
    fontSize: 11,
    color: '#ffffff',
    marginTop: 4,
    marginLeft: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#D32F2F',
    marginTop: 4,
    marginLeft: 20,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 235, 235, 0.9)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderRadius: 26,
    paddingVertical: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    alignSelf: 'center',
    minWidth: 160,
    minHeight: 50,
    marginTop: 8,
    marginBottom: 10,
  },
  registerButtonDisabled: {
    opacity: 0.6,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  registerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  registerButtonIcon: {
    marginLeft: 8,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  backToLoginButton: {
    backgroundColor: 'transparent',
    borderRadius: 26,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    alignSelf: 'center',
    minWidth: 160,
    minHeight: 50,
  },
  backToLoginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  successText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emailText: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  successInstructions: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButtonsContainer: {
    gap: 15,
  },
  resendButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default Signup;

