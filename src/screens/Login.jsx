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
import { storeToken, storeUserData } from '../utils/tokenStorage';
import NotificationService from '../services/NotificationService';
import usePageLoader from '../hooks/usePageLoader';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  
  // Use the new page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(false);

  // API call to backend authentication endpoint
  const authenticateUser = async (credentials) => {
    startLoading();
    setError(null);
    
    try {
      const response = await fetch('https://app.stormbuddi.com/api/mobile/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API error responses
        console.log('Login failed:', data.message || data.error || 'Login failed');
        throw new Error(data.message || data.error || 'Login failed');
      }

      // Successful authentication
      return { 
        success: data.success,
        message: data.message,
        user: data.data?.user,
        token: data.data?.token?.access_token,
        tokenType: data.data?.token?.token_type,
        expiresAt: data.data?.token?.expires_at,
        ...data
      };
    } catch (err) {
      // Handle network errors or other exceptions
      if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
        console.log('Unable to connect to server. Please check your internet connection.');
      }
      throw new Error(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      stopLoading();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const result = await authenticateUser({ email, password });
      if (result.success) {
        // Store authentication token and user data
        await storeToken(result.token);
        await storeUserData(result.user);
        
        // Update FCM token in backend after successful login
        try {
          await NotificationService.updateFCMTokenAfterLogin();
          console.log('FCM token updated after login');
        } catch (error) {
          console.error('Failed to update FCM token after login:', error);
          // Don't fail login if FCM token update fails
        }
        
        console.log('Login successful:', result);
        console.log('User data:', result.user);
        console.log('Access token:', result.token);
        
        // Reset navigation stack to prevent going back to login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Signing in..."
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
              {/* StormBuddi Logo */}
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>StormBuddi</Text>
              </View>

              {/* Login Form */}
              <View style={styles.formContainer}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
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

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Forgot Password Link */}
                <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, shouldShowLoader && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={shouldShowLoader}
                  activeOpacity={shouldShowLoader ? 1 : 0.7}
                >
                  <Text style={styles.loginButtonText}>Login</Text>
                </TouchableOpacity>
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
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.06,
    marginBottom: height * 0.08,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
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
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
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
  eyeIcon: {
    position: 'absolute',
    right: 20,
    top: 18,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  loginButton: {
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
    minWidth: 160,
    minHeight: 56,
  },
  loginButtonDisabled: {
    opacity: 0.6,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default Login;
