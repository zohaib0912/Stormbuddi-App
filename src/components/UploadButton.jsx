import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';

const UploadButton = ({ 
  title = 'Upload Files',
  subtitle = 'Click here to upload files',
  supportedFormats = 'Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG',
  onPress,
  isImageUpload = false,
  disabled = false
}) => {
  const getUploadIcon = () => {
    return isImageUpload ? '📷' : '📤';
  };

  const getFormats = () => {
    return isImageUpload ? 'JPG, PNG' : supportedFormats.replace('Supported formats: ', '');
  };

  const getFormatsLabel = () => {
    return 'Supported formats:';
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, disabled && styles.containerDisabled]} 
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={styles.containerContent}>
      <View style={[styles.iconContainer, disabled && styles.iconContainerDisabled]}>
        <Text style={styles.uploadIcon}>{getUploadIcon()}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, disabled && styles.textDisabled]}>{title}</Text>
        <Text style={[styles.subtitle, disabled && styles.textDisabled]}>{subtitle}</Text>
        <Text style={[styles.formatsLabel, disabled && styles.textDisabled]}>{getFormatsLabel()}</Text>
        <Text style={[styles.formats, disabled && styles.textDisabled]}>{getFormats()}</Text>
      </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  containerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  uploadIcon: {
    fontSize: 20,
    color: colors.textOnPrimary,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'left',
  },
  formatsLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 2,
    textAlign: 'left',
  },
  formats: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'left',
  },
  containerDisabled: {
    opacity: 0.5,
    backgroundColor: colors.borderLight,
  },
  iconContainerDisabled: {
    backgroundColor: colors.textLight,
  },
  textDisabled: {
    color: colors.textLight,
  },
});

export default UploadButton;
