import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Import reusable components
import Button from '../components/Button';
import PageLoader from '../components/PageLoader';
import PasswordResetService from '../services/PasswordResetService';
import usePageLoader from '../hooks/usePageLoader';
import { useToast } from '../contexts/ToastContext';

const { width, height } = Dimensions.get('window');

const ResetPassword = ({ navigation, route }) => {
  const { showError } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Get token from route params
  const { token } = route.params || {};
  
  // Use the page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(false);

  useEffect(() => {
    // Validate token exists
    if (!token) {
      showError('Invalid Link. This password reset link is invalid or has expired. Please request a new one.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    }
  }, [token, navigation, showError]);

  // API call to reset password
  const resetPassword = async (passwordData) => {
    startLoading();
    setError(null);
    
    try {
      const result = await PasswordResetService.resetPassword(
        passwordData.token,
        passwordData.password,
        passwordData.confirmPassword
      );
      return result;
    } catch (err) {
      throw err;
    } finally {
      stopLoading();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validatePassword = (password) => {
    // Password must be at least 8 characters long
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    // Password must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    
    // Password must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    
    // Password must contain at least one number
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    
    return null;
  };

  const handleResetPassword = async () => {
    // Validation
    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please enter both password fields');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const result = await resetPassword({ 
        token, 
        password, 
        confirmPassword 
      });
      
      if (result.success) {
        setSuccess(true);
        setError(null);
        console.log('Password reset successfully:', result);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBackToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  if (!token) {
    return null; // Will redirect via useEffect
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Resetting password..."
      />

      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <>
          {/* Background Image with Construction Worker */}
          <ImageBackground
            source={require('../assets/images/sdf.jpg')}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            {/* Overlay for better text readability */}
            <View style={styles.overlay} />
            
            <KeyboardAvoidingView 
              style={styles.keyboardAvoidingView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              {/* Header with Back Button */}
              <View style={styles.headerContainer}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Icon name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reset Password</Text>
              </View>

              {/* StormBuddi Logo */}
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>StormBuddi</Text>
              </View>

              {/* Form Container */}
              <View style={styles.formContainer}>
                {!success ? (
                  <>
                    {/* Instructions */}
                    <View style={styles.instructionsContainer}>
                      <Text style={styles.instructionsTitle}>Create New Password</Text>
                      <Text style={styles.instructionsText}>
                        Please enter your new password below. Make sure it's secure and easy for you to remember.
                      </Text>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        placeholderTextColor="#666"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={togglePasswordVisibility}
                      >
                        <Icon
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm New Password"
                        placeholderTextColor="#666"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleResetPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={toggleConfirmPasswordVisibility}
                      >
                        <Icon
                          name={showConfirmPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Password Requirements */}
                    <View style={styles.requirementsContainer}>
                      <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                      <Text style={styles.requirementText}>• At least 8 characters long</Text>
                      <Text style={styles.requirementText}>• Contains uppercase and lowercase letters</Text>
                      <Text style={styles.requirementText}>• Contains at least one number</Text>
                    </View>

                    {/* Error Message */}
                    {error && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Reset Password Button */}
                    <TouchableOpacity
                      style={[styles.resetButton, shouldShowLoader && styles.resetButtonDisabled]}
                      onPress={handleResetPassword}
                      disabled={shouldShowLoader}
                      activeOpacity={shouldShowLoader ? 1 : 0.7}
                    >
                      <Text style={styles.resetButtonText}>Reset Password</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Success Message */}
                    <View style={styles.successContainer}>
                      <Icon name="checkmark-circle" size={60} color="#4CAF50" />
                      <Text style={styles.successTitle}>Password Reset!</Text>
                      <Text style={styles.successText}>
                        Your password has been successfully reset. You can now log in with your new password.
                      </Text>
                    </View>

                    {/* Back to Login Button */}
                    <TouchableOpacity
                      style={styles.backToLoginButton}
                      onPress={handleBackToLogin}
                    >
                      <Text style={styles.backToLoginButtonText}>Back to Login</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </KeyboardAvoidingView>
          </ImageBackground>
        </>
      )}
    </SafeAreaView>
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
    justifyContent: 'space-between',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: height * 0.02,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: height * 0.04,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#007AFF',
    // fontFamily is handled by System by default in React Native
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingBottom: 80,
    paddingTop: 10,
  },
  instructionsContainer: {
    marginBottom: 25,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  instructionsText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingRight: 50,
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
    minHeight: 56,
  },
  eyeIcon: {
    position: 'absolute',
    right: 20,
    top: 18,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  requirementText: {
    fontSize: 13,
    color: '#ffffff',
    marginBottom: 4,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 235, 235, 0.9)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderRadius: 26,
    paddingVertical: 14,
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
    minWidth: 180,
    minHeight: 56,
  },
  resetButtonDisabled: {
    opacity: 0.6,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  resetButtonText: {
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
  backToLoginButton: {
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    minWidth: 180,
  },
  backToLoginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ResetPassword;
