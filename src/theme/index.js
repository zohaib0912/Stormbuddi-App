/**
 * Theme System
 * Centralized colors, spacing, and styling constants
 */

export { colors, default as colorsDefault } from './colors';

// Typography constants
export const typography = {
  // Font Family
  fontFamily: {
    regular: 'System',           // Default system font
    ios: 'System',               // SF Pro on iOS
    android: 'sans-serif',       // Roboto on Android
    monospace: 'monospace',      // Fixed-width font for code/FCM tokens
  },
  
  // Font Sizes
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 18,
  h5: 16,
  body: 14,
  small: 12,
  tiny: 10,
  
  // Font Weights
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  
  // Line Heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightLoose: 1.8,
};

// Spacing constants
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

// Border Radius constants
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  full: 9999,
  round: 50,
};

// Shadows
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Helper functions
export const getTheme = () => ({
  colors: require('./colors').default || require('./colors').colors,
  typography,
  spacing,
  borderRadius,
  shadows,
});

export default {
  colors: require('./colors').default,
  typography,
  spacing,
  borderRadius,
  shadows,
  getTheme,
};

