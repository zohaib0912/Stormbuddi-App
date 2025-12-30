import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
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

const { width, height } = Dimensions.get('window');

const ForgotPassword = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Use the page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(false);

  // API call to send password reset email
  const sendPasswordResetEmail = async (email) => {
    startLoading();
    setError(null);
    
    try {
      const result = await PasswordResetService.sendPasswordResetEmail(email);
      return result;
    } catch (err) {
      throw err;
    } finally {
      stopLoading();
    }
  };

  const handleSendResetEmail = async () => {
    // Validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const result = await sendPasswordResetEmail(email);
      if (result.success) {
        setSuccess(true);
        setError(null);
        console.log('Password reset email sent successfully:', result);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  const handleResendEmail = () => {
    setSuccess(false);
    setError(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Sending reset email..."
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
                  onPress={handleBackToLogin}
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
                      <Text style={styles.instructionsTitle}>Forgot your password?</Text>
                      <Text style={styles.instructionsText}>
                        No worries! Enter your email address and we'll send you a link to reset your password.
                      </Text>
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        placeholderTextColor="#666"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        returnKeyType="done"
                        onSubmitEditing={handleSendResetEmail}
                      />
                    </View>

                    {/* Error Message */}
                    {error && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Send Reset Email Button */}
                    <TouchableOpacity
                      style={[styles.resetButton, shouldShowLoader && styles.resetButtonDisabled]}
                      onPress={handleSendResetEmail}
                      disabled={shouldShowLoader}
                      activeOpacity={shouldShowLoader ? 1 : 0.7}
                    >
                      <Text style={styles.resetButtonText}>Send Reset Link</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Success Message */}
                    <View style={styles.successContainer}>
                      <Icon name="checkmark-circle" size={60} color="#4CAF50" />
                      <Text style={styles.successTitle}>Email Sent!</Text>
                      <Text style={styles.successText}>
                        We've sent a password reset link to{'\n'}
                        <Text style={styles.emailText}>{email}</Text>
                      </Text>
                      <Text style={styles.successInstructions}>
                        Please check your email and click the link to reset your password. The link will expire in 1 hour.
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity
                        style={styles.resendButton}
                        onPress={handleResendEmail}
                      >
                        <Text style={styles.resendButtonText}>Send Another Email</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.backToLoginButton}
                        onPress={handleBackToLogin}
                      >
                        <Text style={styles.backToLoginButtonText}>Back to Login</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </KeyboardAvoidingView>
          </ImageBackground>
        </>
      )}
    </View>
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
    marginBottom: height * 0.06,
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
    marginBottom: 30,
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
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 18,
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
  backToLoginButton: {
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  backToLoginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ForgotPassword;
