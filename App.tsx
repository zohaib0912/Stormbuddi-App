/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar, useColorScheme, Linking, AppState } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { isAuthenticated, getToken, clearAuthData } from './src/utils/tokenStorage';
import PageLoader from './src/components/PageLoader';
import Login from './src/screens/Login';
import ForgotPassword from './src/screens/ForgotPassword';
import ResetPassword from './src/screens/ResetPassword';
import Dashboard from './src/screens/Dashboard';
import Invoice from './src/screens/Invoice';
import Leads from './src/screens/Leads';
import Jobs from './src/screens/Jobs';
import Appointment from './src/screens/Appointment';
import Proposal from './src/screens/Proposal';
import Profile from './src/screens/Profile';
import Settings from './src/screens/Settings';
import JobDetails from './src/screens/JobDetails';
import InspectionReport from './src/screens/InspectionReport';
import Customers from './src/screens/Customers';
import DrawerContent from './src/components/DrawerContent';
import NotificationService from './src/services/NotificationService';
import usePageLoader from './src/hooks/usePageLoader';
import { ToastProvider } from './src/contexts/ToastContext';
import SubscriptionExpiredModal from './src/components/SubscriptionExpiredModal';
import { subscribe, emit } from './src/utils/eventBus';


const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'inactive',
  'expired',
  'ended',
  'cancelled',
  'canceled',
  'paused',
  'suspended',
  'trial_expired',
  'past_due',
]);

// Custom transition configuration for slide from top
const slideFromTopTransition = {
  cardStyleInterpolator: ({ current, layouts }: { current: any; layouts: any }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-layouts.screen.height, 0],
            }),
          },
        ],
      },
    };
  },
};

// Main Stack Navigator with all screens
function MainStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        ...slideFromTopTransition,
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
        },
      }}
    >
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Leads" component={Leads} />
      <Stack.Screen name="Jobs" component={Jobs} />
      <Stack.Screen name="Appointment" component={Appointment} />
      <Stack.Screen name="Proposal" component={Proposal} />
      <Stack.Screen name="Invoice" component={Invoice} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="JobDetails" component={JobDetails} />
      <Stack.Screen name="InspectionReport" component={InspectionReport} />
      <Stack.Screen name="Customers" component={Customers} />
    </Stack.Navigator>
  );
}

// Drawer Navigator Component (now just contains the main stack)
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="MainStack"
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: 270,
        },
        drawerType: 'slide',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        drawerHideStatusBarOnOpen: false, // Keep status bar visible when drawer opens
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="MainStack" component={MainStackNavigator} />
    </Drawer.Navigator>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('unknown');
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  
  // Use the new page loader hook for app initialization
  const { shouldShowLoader, stopLoading } = usePageLoader(true);

  const initializeApp = useCallback(async () => {
    try {
      // Check authentication status
      const authenticated = await isAuthenticated();
      setIsLoggedIn(authenticated);

      // Initialize notifications
      await NotificationService.setupNotificationHandlers();
      
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsLoggedIn(false);
    } finally {
      stopLoading();
    }
  }, [stopLoading]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const normalizeSubscriptionStatus = useCallback((profileData) => {
    const candidates = [
      profileData?.subscription_status,
      profileData?.subscription?.status,
      profileData?.subscription?.subscription_status,
      profileData?.subscription?.state,
    ];

    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) continue;
      if (typeof candidate === 'boolean') {
        return candidate ? 'active' : 'inactive';
      }
      if (typeof candidate === 'number') {
        return candidate === 1 ? 'active' : 'inactive';
      }
      const normalized = candidate.toString().trim().toLowerCase();
      if (normalized.length > 0) {
        return normalized;
      }
    }

    if (profileData?.subscription?.ends_at) {
      const endsAt = new Date(profileData.subscription.ends_at);
      if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() < Date.now()) {
        return 'expired';
      }
    }

    return 'unknown';
  }, []);

  const fetchSubscriptionStatus = useCallback(async () => {
    setSubscriptionLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setSubscriptionStatus('unknown');
        return;
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/subscription/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        console.warn('Subscription status request unauthorized. Clearing auth.');
        await clearAuthData();
        emit('auth:logout');
        setIsLoggedIn(false);
        setSubscriptionStatus('unknown');
        setSubscriptionChecked(true);
        return;
      }

      if (response.status === 404 || response.status === 204) {
        const fallbackResponse = await fetch('https://app.stormbuddi.com/api/mobile/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (fallbackResponse.status === 401) {
          console.warn('Fallback profile request unauthorized. Clearing auth.');
          await clearAuthData();
          emit('auth:logout');
          setIsLoggedIn(false);
          setSubscriptionStatus('unknown');
          setSubscriptionChecked(true);
          return;
        }

        if (!fallbackResponse.ok) {
          throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
        }

        const fallbackPayload = await fallbackResponse.json();
        const fallbackStatusSource = fallbackPayload?.data || fallbackPayload;
        const normalizedFallback = normalizeSubscriptionStatus(fallbackStatusSource);
        setSubscriptionStatus(normalizedFallback);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const payload = await response.json();
      const statusSource = payload?.data || payload;
      const normalized = normalizeSubscriptionStatus(statusSource);
      setSubscriptionStatus(normalized);
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
      if (error?.message?.includes('401')) {
        await clearAuthData();
        emit('auth:logout');
        setIsLoggedIn(false);
        setSubscriptionStatus('unknown');
      } else {
        setSubscriptionStatus('active');
      }
    } finally {
      setSubscriptionLoading(false);
      setSubscriptionChecked(true);
    }
  }, [normalizeSubscriptionStatus]);

  useEffect(() => {
    const unsubscribeLogin = subscribe('auth:login-success', () => {
      setIsLoggedIn(true);
      setSubscriptionChecked(false);
      fetchSubscriptionStatus();
    });

    const unsubscribeLogout = subscribe('auth:logout', () => {
      setIsLoggedIn(false);
      setSubscriptionStatus('unknown');
      setSubscriptionChecked(true);
      setSubscriptionLoading(false);
    });

    return () => {
      unsubscribeLogin && unsubscribeLogin();
      unsubscribeLogout && unsubscribeLogout();
    };
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isLoggedIn) {
        fetchSubscriptionStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [fetchSubscriptionStatus, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      setSubscriptionChecked(false);
      fetchSubscriptionStatus();
    } else {
      setSubscriptionStatus('unknown');
      setSubscriptionChecked(true);
    }
  }, [isLoggedIn, fetchSubscriptionStatus]);

  const handleRenewPress = useCallback(() => {
    Linking.openURL('https://app.stormbuddi.com/login').catch((error) => {
      console.error('Failed to open renew URL:', error);
    });
  }, []);

  const subscriptionInactive =
    subscriptionChecked &&
    INACTIVE_SUBSCRIPTION_STATUSES.has((subscriptionStatus || '').toLowerCase());

  const showBootLoader =
    shouldShowLoader || (!subscriptionChecked && subscriptionLoading);

  const loaderMessage = shouldShowLoader ? 'Initializing app...' : 'Checking subscription...';

  if (showBootLoader) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <PageLoader 
          visible={showBootLoader}
          message={loaderMessage}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName={isLoggedIn ? "Main" : "Login"}
            screenOptions={{
              headerShown: false,
              ...slideFromTopTransition,
              transitionSpec: {
                open: {
                  animation: 'timing',
                  config: {
                    duration: 300,
                  },
                },
                close: {
                  animation: 'timing',
                  config: {
                    duration: 300,
                  },
                },
              },
            }}
          >
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
            <Stack.Screen name="ResetPassword" component={ResetPassword} />
            <Stack.Screen name="Main" component={DrawerNavigator} />
          </Stack.Navigator>
        </NavigationContainer>
        <SubscriptionExpiredModal
          visible={subscriptionInactive}
          onRenew={handleRenewPress}
        />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

export default App;
