import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Animated,
  Easing,
  Dimensions,
  Image,
  ActionSheetIOS,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../utils/tokenStorage';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';
import FileSourceModal from './FileSourceModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Try to import DateTimePicker, fallback if not available
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  console.warn('DateTimePicker not available, using fallback inputs');
}

// Try to import react-native-image-crop-picker for photos
let ImageCropPicker = null;

try {
  ImageCropPicker = require('react-native-image-crop-picker').default;
  console.log('ImageCropPicker loaded successfully');
} catch (error) {
  console.warn('ImageCropPicker not available:', error.message);
}

// Try to import @react-native-documents/picker for documents
let DocumentPicker = null;

try {
  const docPicker = require('@react-native-documents/picker');
  DocumentPicker = {
    pick: docPicker.pick,
    types: docPicker.types,
  };
  console.log('DocumentPicker loaded successfully');
} catch (error) {
  console.warn('DocumentPicker not available:', error.message);
}

const UploadInspectionReportModal = ({ 
  visible, 
  onClose,
  onSubmit,
  jobId
}) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    data: '',
    date: '',
    files: [], // Changed to array for multiple files
    project: '',
    projectObject: null,
  });

  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showFileSourceModal, setShowFileSourceModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Animate modal in and out
  useEffect(() => {
    if (visible) {
      // Reset animation to start position before animating
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // Set today's date as default
      const today = new Date().toLocaleDateString('en-US');
      setFormData(prev => ({
        ...prev,
        date: today
      }));
      // Fetch projects when modal opens
      fetchProjects();
    }
  }, [visible]);

  // Auto-select project when jobId is provided and projects are loaded
  useEffect(() => {
    if (jobId && projects.length > 0) {
      const selectedProject = projects.find(project => project.id === jobId);
      if (selectedProject) {
        setFormData(prev => ({
          ...prev,
          project: selectedProject.title || selectedProject.name || `Project ${selectedProject.id}`,
          projectObject: selectedProject,
        }));
      }
    }
  }, [jobId, projects]);

  // Fetch projects from backend API
  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/jobs', {
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
        console.log('Projects fetched for inspection report upload. Count:', data.data.length);
        setProjects(data.data);
      } else {
        console.log('Failed to fetch projects:', data);
        setProjects([]);
      }
    } catch (error) {
      console.error('Projects fetch error:', error);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleDateSelect = (selectedDate) => {
    if (selectedDate) {
      // Format date as MM/DD/YYYY for display
      const formattedDate = selectedDate.toLocaleDateString('en-US');
      
      setFormData(prev => ({
        ...prev,
        date: formattedDate
      }));
      
      // Clear error when user selects date
      if (errors.date) {
        setErrors(prev => ({
          ...prev,
          date: ''
        }));
      }
    }
    setShowNativeDatePicker(false);
  };

  const handleFileSelect = () => {
    if (!ImageCropPicker && !DocumentPicker) {
      showError('File Picker Not Available. ImageCropPicker or DocumentPicker is not installed.');
      return;
    }

    setShowFileSourceModal(true);
  };

  const handleFileSourceSelect = (source) => {
    if (source === 'camera') {
      takePicture();
    } else if (source === 'gallery') {
      chooseFromGallery();
    } else if (source === 'document') {
      chooseDocument();
    }
  };

  // Request camera permission for Android
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs access to your camera to take photos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Camera permission error:', err);
      return false;
    }
  };

  // Request storage permission for Android
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      let permissions = [];
      
      if (Platform.Version >= 33) {
        // Android 13+ uses granular permissions
        permissions = [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ];
      } else {
        permissions = [
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ];
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      // Check if all permissions were granted
      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );
      
      return allGranted;
    } catch (err) {
      console.warn('Storage permission error:', err);
      return false;
    }
  };

  const takePicture = async () => {
    if (!ImageCropPicker) {
      showError('Camera not available. ImageCropPicker library is not installed.');
      return;
    }

    // Request camera permission on Android
    if (Platform.OS === 'android') {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        showError('Permission Denied. Camera permission is required to take photos.');
        return;
      }
    }

    try {
      const image = await ImageCropPicker.openCamera({
        width: 2000,
        height: 2000,
        cropping: false,
        includeBase64: false,
        compressImageQuality: 0.8,
      });
      
      console.log('Photo taken successfully:', image);
      // Append to files array instead of replacing
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, {
          file: image,
          fileName: image.filename || `photo_${Date.now()}.jpg`,
          fileType: image.mime || 'image/jpeg',
          fileSize: image.size || 0,
          fileUri: image.path,
        }]
      }));

      if (errors.file) {
        setErrors(prev => ({
          ...prev,
          file: ''
        }));
      }
    } catch (error) {
      if (error.message && error.message !== 'User cancelled image selection') {
        console.log('Camera error:', error);
        showError('Failed to launch camera. Please try again.');
      }
    }
  };

  const chooseFromGallery = async () => {
    if (!ImageCropPicker) {
      showError('Gallery not available. ImageCropPicker library is not installed.');
      return;
    }

    // Request storage permission on Android
    if (Platform.OS === 'android') {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        showError('Permission Denied. Storage permission is required to access images.');
        return;
      }
    }

    try {
      const image = await ImageCropPicker.openPicker({
        width: 2000,
        height: 2000,
        cropping: false,
        includeBase64: false,
        compressImageQuality: 0.8,
        multiple: true, // Enable multiple selection
      });
      
      console.log('Image(s) selected successfully:', image);
      
      // Handle both single and multiple selections
      const imagesArray = Array.isArray(image) ? image : [image];
      
      // Append all selected images to files array
      setFormData(prev => ({
        ...prev,
        files: [
          ...prev.files,
          ...imagesArray.map(img => ({
            file: img,
            fileName: img.filename || `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
            fileType: img.mime || 'image/jpeg',
            fileSize: img.size || 0,
            fileUri: img.path,
          }))
        ]
      }));

      if (errors.file) {
        setErrors(prev => ({
          ...prev,
          file: ''
        }));
      }
    } catch (error) {
      if (error.message && error.message !== 'User cancelled image selection') {
        console.log('Gallery error:', error);
        showError('Failed to launch gallery. Please try again.');
      }
    }
  };

  const chooseDocument = async () => {
    if (!DocumentPicker) {
      showError('Document picker not available. Document picker library is not installed.');
      return;
    }

    try {
      console.log('Opening document picker...');
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.doc, DocumentPicker.types.docx],
        allowMultiSelection: true, // Enable multiple selection
      });

      console.log('Document(s) picked:', results);

      if (results && results.length > 0) {
        // Append all selected documents to files array
        setFormData(prev => ({
          ...prev,
          files: [
            ...prev.files,
            ...results.map(file => ({
              file: file,
              fileName: file.name || `document_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`,
              fileType: file.type || 'application/pdf',
              fileSize: file.size || 0,
              fileUri: file.uri,
            }))
          ]
        }));

        if (errors.file) {
          setErrors(prev => ({
            ...prev,
            file: ''
          }));
        }
      }
    } catch (error) {
      if (error.message && !error.message.includes('cancel') && error.code !== 'DOCUMENT_PICKER_CANCEL') {
        console.error('Document picker error:', error);
        showError('Failed to pick document. Please try again.');
      }
    }
  };

  const handleProjectSelect = (project) => {
    setFormData(prev => ({
      ...prev,
      project: project.title || project.name || `Project ${project.id}`,
      projectObject: project,
    }));
    setShowProjectDropdown(false);
    
    if (errors.project) {
      setErrors(prev => ({
        ...prev,
        project: ''
      }));
    }
  };

  // Add function to remove a specific file
  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.project.trim()) {
      newErrors.project = 'Project is required';
    }
    
    if (!formData.data.trim()) {
      newErrors.data = 'Data is required';
    }
    
    if (!formData.date.trim()) {
      newErrors.date = 'Date is required';
    }
    
    // Check if at least one file is selected
    if (!formData.files || formData.files.length === 0) {
      newErrors.file = 'At least one file is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Use selected project ID or fallback to jobId prop
    const projectIdToUse = formData.projectObject?.id || jobId;
    
      if (!projectIdToUse) {
        showError('Project Required. Please select a project to upload inspection report.');
        return;
      }

    setLoading(true);

    try {
      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Add data field
      formDataToSend.append('data', formData.data.trim());
      
      // Add date field (convert to proper format)
      const dateParts = formData.date.split('/');
      const formattedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
      formDataToSend.append('date', formattedDate);
      
      // Add all files to FormData
      formData.files.forEach((fileItem, index) => {
        formDataToSend.append('files[]', {
          uri: fileItem.fileUri,
          type: fileItem.fileType,
          name: fileItem.fileName,
        });
        console.log(`Adding file ${index + 1} to upload:`, {
          fileName: fileItem.fileName,
          fileType: fileItem.fileType,
          fileSize: fileItem.fileSize,
        });
      });

      // Upload type is 'inspection_report'
      const type = 'inspectionReport';
    
      const response = await fetch(`https://app.stormbuddi.com/api/mobile/jobs/${projectIdToUse}/files/${type}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type, let FormData set it
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success || response.status === 200) {
        console.log('Inspection report uploaded successfully:', data);
        
        // Show success message
        showSuccess('Inspection report uploaded successfully!');
        if (onSubmit) onSubmit(formData);
        handleClose();
      } else {
        throw new Error(data.message || 'Failed to upload inspection report');
      }
    } catch (err) {
      console.error('Inspection report upload error:', err);
      
      // Show error message
      showError(err.message || 'Failed to upload inspection report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      data: '',
      date: '',
      files: [], // Reset to empty array
      project: '',
      projectObject: null,
    });
    setErrors({});
    setShowDatePicker(false);
    setShowNativeDatePicker(false);
    setShowProjectDropdown(false);
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        {/* Background overlay that closes modal when tapped */}
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}
          onStartShouldSetResponder={() => true}
        >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Inspection Report</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >

            {/* Warning when no jobId */}
            {!jobId && (
              <View style={styles.warningContainer}>
                <Icon name="info" size={20} color={colors.primary || '#007bff'} />
                <Text style={styles.warningText}>
                  Select a project below to upload inspection report. You can also upload reports from the job details page.
                </Text>
              </View>
            )}

            {/* Project Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Project</Text>
              {jobId ? (
                // Show read-only project name when jobId is provided
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyText}>
                    {formData.project || 'Loading project...'}
                  </Text>
                </View>
              ) : (
                // Show dropdown when no jobId is provided
                <>
                  <TouchableOpacity
                    style={[
                      styles.dropdownButton,
                      errors.project && styles.inputError
                    ]}
                    onPress={() => setShowProjectDropdown(!showProjectDropdown)}
                    disabled={projectsLoading}
                  >
                    <Text style={[
                      styles.dropdownText,
                      !formData.project && styles.placeholderText
                    ]}>
                      {projectsLoading ? 'Loading projects...' : (formData.project || 'Select project...')}
                    </Text>
                    <Icon 
                      name={showProjectDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                  {showProjectDropdown && (
                    <View style={styles.dropdownList}>
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {projects.map((project) => (
                          <TouchableOpacity
                            key={project.id}
                            style={styles.dropdownItem}
                            onPress={() => handleProjectSelect(project)}
                          >
                            <Text style={styles.dropdownItemText}>
                              {project.title || project.name || `Project ${project.id}`}
                            </Text>
                            {project.address && (
                              <Text style={styles.dropdownItemSubtext}>
                                {project.address}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
              {errors.project && (
                <Text style={styles.errorText}>{errors.project}</Text>
              )}
            </View>

            {/* File Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Files / Images / PDF</Text>
              
              {/* Initial File Selection Button */}
              {formData.files.length === 0 && (
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.file && styles.inputError
                  ]}
                  onPress={handleFileSelect}
                >
                  <Text style={[
                    styles.dropdownText,
                    styles.placeholderText
                  ]}>
                    Select file (Photo or PDF)...
                  </Text>
                  <Icon 
                    name="attach-file" 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              )}
              
              {/* Files Preview - Show all files */}
              {formData.files.length > 0 && (
                <View style={styles.filesPreviewContainer}>
                  {formData.files.map((fileItem, index) => (
                    <View key={index} style={styles.filePreviewContainer}>
                      {fileItem.fileType?.startsWith('image/') ? (
                        <View style={styles.imagePreviewContainer}>
                          <Image 
                            source={{ uri: fileItem.fileUri }} 
                            style={styles.imagePreview}
                            resizeMode="cover"
                          />
                          <View style={styles.fileInfoContainer}>
                            <Text style={styles.fileNameText} numberOfLines={1}>
                              {fileItem.fileName}
                            </Text>
                            <Text style={styles.fileSizeText}>
                              {fileItem.fileSize ? `${(fileItem.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeFileButton}
                            onPress={() => removeFile(index)}
                          >
                            <Icon name="close" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.documentPreviewContainer}>
                          <Icon name="description" size={32} color={colors.primary} />
                          <View style={styles.fileInfoContainer}>
                            <Text style={styles.fileNameText} numberOfLines={1}>
                              {fileItem.fileName}
                            </Text>
                            <Text style={styles.fileSizeText}>
                              {fileItem.fileSize ? `${(fileItem.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeFileButton}
                            onPress={() => removeFile(index)}
                          >
                            <Icon name="close" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                  
                  {/* Add More Images Button */}
                  <TouchableOpacity
                    style={styles.addMoreButton}
                    onPress={handleFileSelect}
                  >
                    <Icon name="add-circle-outline" size={24} color={colors.primary} />
                    <Text style={styles.addMoreButtonText}>Add More Images</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {errors.file && (
                <Text style={styles.errorText}>{errors.file}</Text>
              )}
              {formData.files.length === 0 && (
                <Text style={styles.hintText}>
                  Tap to take photo, choose from gallery, or select document
                </Text>
              )}
            </View>

            {/* Data Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[
                  styles.textArea,
                  errors.data && styles.inputError
                ]}
                placeholder="Enter short details"
                placeholderTextColor="#999"
                value={formData.data}
                onChangeText={(value) => handleInputChange('data', value)}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
              {errors.data && (
                <Text style={styles.errorText}>{errors.data}</Text>
              )}
            </View>

            {/* Date Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date</Text>
              {DateTimePicker ? (
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.date && styles.inputError
                  ]}
                  onPress={() => setShowNativeDatePicker(true)}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.date && styles.placeholderText
                  ]}>
                    {formData.date || 'Select date...'}
                  </Text>
                  <Icon 
                    name="calendar-today" 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.date && styles.inputError
                  ]}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.date && styles.placeholderText
                  ]}>
                    {formData.date || 'Select date...'}
                  </Text>
                  <Icon 
                    name="calendar-today" 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              )}
              
              {!DateTimePicker && showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  <View style={styles.dateOptions}>
                    <TouchableOpacity
                      style={styles.dateOption}
                      onPress={() => {
                        const today = new Date().toLocaleDateString();
                        setFormData(prev => ({
                          ...prev,
                          date: today
                        }));
                        setShowDatePicker(false);
                        if (errors.date) {
                          setErrors(prev => ({
                            ...prev,
                            date: ''
                          }));
                        }
                      }}
                    >
                      <Text style={styles.dateOptionText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dateOption}
                      onPress={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setFormData(prev => ({
                          ...prev,
                          date: tomorrow.toLocaleDateString()
                        }));
                        setShowDatePicker(false);
                        if (errors.date) {
                          setErrors(prev => ({
                            ...prev,
                            date: ''
                          }));
                        }
                      }}
                    >
                      <Text style={styles.dateOptionText}>Tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dateOption}
                      onPress={() => {
                        const nextWeek = new Date();
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        setFormData(prev => ({
                          ...prev,
                          date: nextWeek.toLocaleDateString()
                        }));
                        setShowDatePicker(false);
                        if (errors.date) {
                          setErrors(prev => ({
                            ...prev,
                            date: ''
                          }));
                        }
                      }}
                    >
                      <Text style={styles.dateOptionText}>Next Week</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {errors.date && (
                <Text style={styles.errorText}>{errors.date}</Text>
              )}
            </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.submitContainer}>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  loading && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Uploading...' : 'Upload Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
      </KeyboardAvoidingView>

      {/* DateTimePicker Component */}
      {DateTimePicker && showNativeDatePicker && (
        <DateTimePicker
          value={formData.date ? new Date(formData.date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              handleDateSelect(selectedDate);
            }
            setShowNativeDatePicker(false);
          }}
        />
      )}

      {/* File Source Selection Modal */}
      <FileSourceModal
        visible={showFileSourceModal}
        onClose={() => setShowFileSourceModal(false)}
        onSelectSource={handleFileSourceSelect}
      />
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
    height: '90%',
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
  modalContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    overflow: 'hidden',
    maxHeight: '90%',
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
  textArea: {
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
    minHeight: 100,
    maxHeight: 150,
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
    flex: 1,
  },
  dropdownList: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 150,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownScrollView: {
    maxHeight: 150,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  placeholderText: {
    color: colors.textLight,
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
  hintText: {
    color: colors.textLight,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffecb5',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  readOnlyField: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readOnlyText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  submitContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6,
  },
  datePickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  datePickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  dateOptions: {
    gap: 8,
  },
  dateOption: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateOptionText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  filesPreviewContainer: {
    marginTop: 8,
    gap: 12,
  },
  filePreviewContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  documentPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileInfoContainer: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  fileSizeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeFileButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  addMoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default UploadInspectionReportModal;

