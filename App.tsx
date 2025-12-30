/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar, StyleSheet, useColorScheme, Platform } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { isAuthenticated } from './src/utils/tokenStorage';
import LoadingSpinner from './src/components/LoadingSpinner';
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
import Canvassing from './src/screens/Canvassing';
import DrawerContent from './src/components/DrawerContent';
import NotificationService from './src/services/NotificationService';
import usePageLoader from './src/hooks/usePageLoader';
import { ToastProvider } from './src/contexts/ToastContext';


const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Wrapper function to automatically wrap all screens with SafeAreaView
// Header handles top safe area, wrapper handles bottom safe area
const withSafeArea = (Component: React.ComponentType<any>) => {
  return (props: any) => (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Component {...props} />
    </SafeAreaView>
  );
};

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
              duration: 500,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 500,
            },
          },
        },
      }}
    >
      <Stack.Screen name="Dashboard" component={withSafeArea(Dashboard)} />
      <Stack.Screen name="Profile" component={withSafeArea(Profile)} />
      <Stack.Screen name="Leads" component={withSafeArea(Leads)} />
      <Stack.Screen name="Jobs" component={withSafeArea(Jobs)} />
      <Stack.Screen name="Appointment" component={withSafeArea(Appointment)} />
      <Stack.Screen name="Proposal" component={withSafeArea(Proposal)} />
      <Stack.Screen name="Invoice" component={withSafeArea(Invoice)} />
      <Stack.Screen name="Settings" component={withSafeArea(Settings)} />
      <Stack.Screen name="JobDetails" component={withSafeArea(JobDetails)} />
      <Stack.Screen name="InspectionReport" component={withSafeArea(InspectionReport)} />
      <Stack.Screen name="Customers" component={withSafeArea(Customers)} />
      <Stack.Screen name="Canvassing" component={withSafeArea(Canvassing)} />
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
  
  // Use the new page loader hook for app initialization
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
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
  };

  const checkAuthStatus = async () => {
    try {
      const authenticated = await isAuthenticated();
      setIsLoggedIn(authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoggedIn(false);
    } finally {
      stopLoading();
    }
  };

  if (shouldShowLoader) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <PageLoader 
          visible={shouldShowLoader}
          message="Initializing app..."
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
            <Stack.Screen name="Login" component={withSafeArea(Login)} />
            <Stack.Screen name="ForgotPassword" component={withSafeArea(ForgotPassword)} />
            <Stack.Screen name="ResetPassword" component={withSafeArea(ResetPassword)} />
            <Stack.Screen name="Main" component={DrawerNavigator} />
          </Stack.Navigator>
        </NavigationContainer>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

export default App;
