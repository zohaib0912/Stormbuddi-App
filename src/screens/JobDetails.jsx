import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  BackHandler,
  Linking,
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  ActionSheetIOS,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../components/Header';
import SectionHeader from '../components/SectionHeader';
import NotificationListModal from '../components/NotificationListModal';
import CreateAppointmentModal from '../components/CreateAppointmentModal';
import UploadInspectionReportModal from '../components/UploadInspectionReportModal';
import FileSourceModal from '../components/FileSourceModal';
import InputField from '../components/InputField';
import UploadButton from '../components/UploadButton';
import FileCard from '../components/FileCard';
import DataCard from '../components/DataCard';
import ImageGallery from '../components/ImageGallery';
import InspectionReportCard from '../components/InspectionReportCard';
import PageLoader from '../components/PageLoader';
import ErrorMessage from '../components/ErrorMessage';
import { getToken } from '../utils/tokenStorage';
import usePageLoader from '../hooks/usePageLoader';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';
import RNFS from 'react-native-fs';

// Safe import for DocumentPicker and ImageCropPicker
let DocumentPicker;
let ImageCropPicker;

try {
  const docPicker = require('@react-native-documents/picker');
  DocumentPicker = {
    pick: docPicker.pick,
    types: docPicker.types,
  };
  console.log('DocumentPicker loaded successfully');
} catch (error) {
  console.log('DocumentPicker not available:', error.message);
  DocumentPicker = null;
}

try {
  ImageCropPicker = require('react-native-image-crop-picker').default;
  console.log('ImageCropPicker loaded successfully');
} catch (error) {
  console.log('ImageCropPicker not available:', error.message);
  ImageCropPicker = null;
}

const JobDetails = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { showSuccess, showError, showInfo } = useToast();
  // Get project data from navigation params
  const project = route?.params?.project;
  // State management for all sections
  const [jobDetails, setJobDetails] = useState({
    title: project?.title || '',
    description: project?.description || '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [jobStatus, setJobStatus] = useState(project?.status || 'Pending');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showInspectionReportModal, setShowInspectionReportModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showFileSourceModal, setShowFileSourceModal] = useState(false);
  const [currentUploadSection, setCurrentUploadSection] = useState(null);
  
  // Refs for scroll navigation
  const sectionRefs = useRef({});
  const scrollViewRef = useRef(null);
  
  // Use the new page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(true);

  const [inspectionReports, setInspectionReports] = useState([]);

  const [measurements, setMeasurements] = useState([]);

  const [proposals, setProposals] = useState([]);

  const [workOrders, setWorkOrders] = useState([]);

  const [appointments, setAppointments] = useState([]);

  const [invoices, setInvoices] = useState([]);

  const [beforeImages, setBeforeImages] = useState([]);

  const [afterImages, setAfterImages] = useState([]);

  const [documents, setDocuments] = useState([]);

  // Fetch job details from backend API
  const fetchJobDetails = async (jobId) => {
    if (!jobId) return;
    
    startLoading();
    setError(null);
    
    try {
      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await fetch(`https://app.stormbuddi.com/api/mobile/jobs/${jobId}`, {
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
        console.log('Job details fetched successfully:', data.data);
        
        // Map API response to job details
        const jobData = data.data;
        console.log('Job data:', jobData);
        console.log('Invoices from API:', jobData.invoices);
        console.log('Additional files from API:', jobData.additional_files);
        console.log('File uploads from API:', jobData.file_uploads);
        console.log('Work orders from API:', jobData.work_orders);
        
        // Debug: Check file structure if additional_files exist
        if (jobData.additional_files && jobData.additional_files.length > 0) {
          console.log('Sample additional file structure:', jobData.additional_files[0]);
          console.log('Additional file categories:', jobData.additional_files.map(f => ({
            id: f.id,
            name: f.original_name || f.file_name,
            category: f.category,
            file_category: f.file_category,
            section: f.section,
            type: f.type,
            upload_type: f.upload_type,
            storage_path: f.storage_path
          })));
        }
        
        setJobDetails({
          title: jobData.title || '',
          description: jobData.description || '',
        });
        
        // Update job status if available
        if (jobData.status) {
          setJobStatus(jobData.status);
        }
        
        // Handle inspection reports - check multiple sources
        const inspectionReportFiles = [];
        
        // Check dedicated inspection_reports field if backend returns it
        if (jobData.inspection_reports && jobData.inspection_reports.length > 0) {
          jobData.inspection_reports.forEach(file => {
            inspectionReportFiles.push({
              id: file.id,
              fileName: file.original_name || file.file_name || 'Unknown',
              fileType: file.file_type ? file.file_type.split('/')[1]?.toUpperCase() : 'PDF',
              url: file.url || file.file_url,
              file_type: file.file_type,
              data: file.data || file.description || '',
              uploaded_by: file.uploaded_by || file.user?.name || '',
              date: file.date || file.created_at,
              fileSize: file.file_size || file.size || 0,
              status: file.status || 'completed'
            });
          });
        }
        
        // Check additional_files for inspection reports only (filter by category)
        // Backend stores inspection reports with category 'inspectionReport' or 'inspection_report'
        if (jobData.additional_files && jobData.additional_files.length > 0) {
          const inspectionReportUploads = jobData.additional_files.filter(file => 
            file.category === 'inspectionReport' || file.category === 'inspection_report' ||
            file.file_category === 'inspectionReport' || file.file_category === 'inspection_report' ||
            file.section === 'inspectionReport' || file.section === 'inspection_report' ||
            file.upload_type === 'inspectionReport' || file.upload_type === 'inspection_report' ||
            file.type === 'inspectionReport' || file.type === 'inspection_report' ||
            file.storage_path?.includes('inspection-report') || file.storage_path?.includes('inspection-reports')
          );
          
          inspectionReportUploads.forEach(file => {
            inspectionReportFiles.push({
              id: file.id,
              fileName: file.original_name || file.file_name || 'Unknown',
              fileType: file.file_type ? file.file_type.split('/')[1]?.toUpperCase() : 'PDF',
              url: file.url || file.file_url,
              file_type: file.file_type,
              data: file.data || file.description || '',
              uploaded_by: file.uploaded_by || file.user?.name || '',
              date: file.date || file.created_at,
              fileSize: file.file_size || file.size || 0,
              status: file.status || 'completed'
            });
          });
        }
        
        // Also check file_uploads array (backend might store inspection reports there)
        if (jobData.file_uploads && jobData.file_uploads.length > 0) {
          const inspectionReportUploadFiles = jobData.file_uploads.filter(file => 
            file.category === 'inspectionReport' || file.category === 'inspection_report' ||
            file.file_category === 'inspectionReport' || file.file_category === 'inspection_report' ||
            file.upload_type === 'inspectionReport' || file.upload_type === 'inspection_report' ||
            file.type === 'inspectionReport' || file.type === 'inspection_report' ||
            file.storage_path?.includes('inspection-report') || file.storage_path?.includes('inspection-reports')
          );
          
          inspectionReportUploadFiles.forEach(file => {
            inspectionReportFiles.push({
              id: file.id,
              fileName: file.original_name || file.file_name || 'Unknown',
              fileType: file.file_type ? file.file_type.split('/')[1]?.toUpperCase() : 'PDF',
              url: file.url || file.file_url,
              file_type: file.file_type,
              data: file.data || file.description || '',
              uploaded_by: file.uploaded_by || file.user?.name || '',
              date: file.date || file.created_at,
              fileSize: file.file_size || file.size || 0,
              status: file.status || 'completed'
            });
          });
        }
        
        // Always set inspection reports (even if empty) to avoid stale data
        setInspectionReports(inspectionReportFiles);
        
        if (jobData.measurements && jobData.measurements.length > 0) {
          const mappedMeasurements = jobData.measurements.map(file => ({
            id: file.id,
            fileName: file.original_name || file.file_name || 'Unknown',
            fileType: file.file_type ? file.file_type.split('/')[1].toUpperCase() : 'PDF',
            url: file.url || file.file_url,
            file_type: file.file_type
          }));
          setMeasurements(mappedMeasurements);
        }
        
        // Handle proposals - check both proposals array and additional_files
        const proposalFiles = [];
        
        // Check proposals array (for actual proposals)
        if (jobData.proposals && jobData.proposals.length > 0) {
          jobData.proposals.forEach(proposal => {
            proposalFiles.push({
              id: proposal.id,
              fileName: proposal.title || `Proposal #${proposal.id}`,
              fileType: 'PDF',
              url: proposal.file_url || proposal.url
            });
          });
        }
        
        // Also check additional_files for uploaded proposal files
        // Backend stores proposals with category 'proposal'
        if (jobData.additional_files && jobData.additional_files.length > 0) {
          const proposalUploads = jobData.additional_files.filter(file => 
            file.category === 'proposal' || file.file_category === 'proposal' ||
            file.section === 'proposal' || file.upload_type === 'proposal' ||
            file.type === 'proposal' || file.storage_path?.includes('proposals')
          );
          
          proposalUploads.forEach(file => {
            proposalFiles.push({
              id: file.id,
              fileName: file.original_name || file.file_name || `Proposal #${file.id}`,
              fileType: file.file_type ? file.file_type.split('/')[1]?.toUpperCase() : 'PDF',
              url: file.url || file.file_url,
              file_type: file.file_type
            });
          });
        }
        
        // Also check file_uploads array (backend might store proposals there)
        if (jobData.file_uploads && jobData.file_uploads.length > 0) {
          const proposalUploadFiles = jobData.file_uploads.filter(file => 
            file.category === 'proposal' || file.file_category === 'proposal' ||
            file.upload_type === 'proposal' || file.type === 'proposal' ||
            file.storage_path?.includes('proposals')
          );
          
          proposalUploadFiles.forEach(file => {
            proposalFiles.push({
              id: file.id,
              fileName: file.original_name || file.file_name || `Proposal #${file.id}`,
              fileType: file.file_type ? file.file_type.split('/')[1]?.toUpperCase() : 'PDF',
              url: file.url || file.file_url,
              file_type: file.file_type
            });
          });
        }
        
        if (proposalFiles.length > 0) {
          setProposals(proposalFiles);
        }
        
        if (jobData.work_orders && jobData.work_orders.length > 0) {
          const mappedWorkOrders = jobData.work_orders.map(file => ({
            id: file.id,
            fileName: file.original_name || file.file_name || 'Unknown',
            fileType: file.file_type ? file.file_type.split('/')[1].toUpperCase() : 'PDF',
            url: file.url || file.file_url,
            file_type: file.file_type
          }));
          setWorkOrders(mappedWorkOrders);
        }
        
        if (jobData.schedules && jobData.schedules.length > 0) {
          // Map schedules to appointments format
          const mappedAppointments = jobData.schedules.map(schedule => ({
            id: schedule.id,
            title: schedule.title || 'Appointment',
            subtitle: schedule.type || 'Appointment',
            details: [
              `Date: ${schedule.start_date_time ? schedule.start_date_time.split(' ')[0] : 'N/A'}`,
              `Start Time: ${schedule.start_date_time ? schedule.start_date_time.split(' ')[1] : 'N/A'}`,
              `End Time: ${schedule.end_date_time ? schedule.end_date_time.split(' ')[1] : 'N/A'}`,
              `Status: ${schedule.status || 'Pending'}`
            ],
            status: schedule.status || 'Pending',
            // Additional fields for editing
            start_date_time: schedule.start_date_time,
            end_date_time: schedule.end_date_time,
            type: schedule.type,
            location: schedule.location,
            client_name: schedule.client_name,
            client_phone: schedule.client_phone,
            project_id: schedule.project_id || jobData.id, // Use job ID as fallback
            job_id: jobData.id, // Explicitly include job_id
            client_id: schedule.client_id,
            customer_id: schedule.customer_id
          }));
          setAppointments(mappedAppointments);
        }
        
        // Handle invoices - check both invoices array and additional_files
        const invoiceFiles = [];
        
        // Check invoices array (for actual invoices)
        if (jobData.invoices && jobData.invoices.length > 0) {
          jobData.invoices.forEach(invoice => {
            invoiceFiles.push({
              id: invoice.id,
              fileName: `Invoice #${invoice.id}`,
              fileType: 'PDF',
              url: invoice.file_url || invoice.url,
              amount: invoice.formatted_amount || invoice.amount,
              status: invoice.paid_status || invoice.status
            });
          });
        }
        
        // Also check additional_files for uploaded invoice files
        // Backend stores invoices with category 'invoice'
        if (jobData.additional_files && jobData.additional_files.length > 0) {
          const invoiceUploads = jobData.additional_files.filter(file => 
            file.category === 'invoice' || file.file_category === 'invoice' ||
            file.section === 'invoice' || file.upload_type === 'invoice' ||
            file.type === 'invoice' || file.storage_path?.includes('invoices')
          );
          
          invoiceUploads.forEach(file => {
            invoiceFiles.push({
              id: file.id,
              fileName: file.original_name || file.file_name || `Invoice #${file.id}`,
              fileType: file.file_type ? file.file_type.split('/')[1]?.toUpperCase() : 'PDF',
              url: file.url || file.file_url,
              amount: file.amount || 'N/A',
              status: file.status || 'pending',
              file_type: file.file_type
            });
          });
        }
        
        // Also check file_uploads array (backend might store invoices there)
        if (jobData.file_uploads && jobData.file_uploads.length > 0) {
          const invoiceUploadFiles = jobData.file_uploads.filter(file => 
            file.category === 'invoice' || file.file_category === 'invoice' ||
            file.upload_type === 'invoice' || file.type === 'invoice' ||
            file.storage_path?.includes('invoices')
          );
          
          invoiceUploadFiles.forEach(file => {
            invoiceFiles.push({
              id: file.id,
              fileName: file.original_name || file.file_name || `Invoice #${file.id}`,
              fileType: file.file_type ? file.file_type.split('/')[1]?.toUpperCase() : 'PDF',
              url: file.url || file.file_url,
              amount: file.amount || 'N/A',
              status: file.status || 'pending',
              file_type: file.file_type
            });
          });
        }
        
        if (invoiceFiles.length > 0) {
          setInvoices(invoiceFiles);
        }
        
        // Handle before pictures
        if (jobData.before_pictures && jobData.before_pictures.length > 0) {
          const mappedBeforeImages = jobData.before_pictures.map(file => ({
            id: file.id,
            uri: file.url || file.file_url || 'https://via.placeholder.com/80x80/007AFF/ffffff?text=Before',
            name: file.original_name || file.file_name || 'Unknown'
          }));
          setBeforeImages(mappedBeforeImages);
        }

        // Handle after pictures
        if (jobData.after_pictures && jobData.after_pictures.length > 0) {
          const mappedAfterImages = jobData.after_pictures.map(file => ({
            id: file.id,
            uri: file.url || file.file_url || 'https://via.placeholder.com/80x80/34C759/ffffff?text=After',
            name: file.original_name || file.file_name || 'Unknown'
          }));
          setAfterImages(mappedAfterImages);
        }

        if (jobData.file_uploads && jobData.file_uploads.length > 0) {
          // Map file_uploads to documents only (not images)
          const documentFiles = jobData.file_uploads.filter(file => 
            !file.file_type || (!file.file_type.includes('image') && !file.file_type.includes('jpg') && !file.file_type.includes('png'))
          );
          
          if (documentFiles.length > 0) {
            const mappedDocs = documentFiles.map(file => ({
              id: file.id,
              fileName: file.original_name || file.file_name || 'Unknown',
              fileType: file.file_type ? file.file_type.split('/')[1].toUpperCase() : 'PDF',
              url: file.url || file.file_url,
              file_type: file.file_type
            }));
            setDocuments(mappedDocs);
          }
        }
      } else {
        console.log('API response structure different, using existing data');
      }
    } catch (err) {
      console.error('Job details fetch error:', err);
      
      // Handle different error types
      if (err.message.includes('404')) {
        setError('Job details not found.');
        console.log('Job details API not implemented yet, using existing data');
      } else if (err.message.includes('500')) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load job details.');
      }
    } finally {
      stopLoading();
    }
  };

  // useEffect for API calls
  useEffect(() => {
    // Fetch job details from API
    fetchJobDetails(project?.id);
    
    // Update job details if project data is available (fallback)
    if (project) {
      setJobDetails({
        title: project.title || '',
        description: project.description || '',
      });
      
      // Set status from project data if available
      if (project.status) {
        setJobStatus(project.status);
      }
    }
  }, [project]);

  // Handle device back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Jobs');
        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [navigation])
  );

  // Helper function to get user-friendly section name
  const getSectionDisplayName = (section) => {
    const sectionNames = {
      'inspectionReports': 'Inspection Report',
      'inspectionReport': 'Inspection Report',
      'measurements': 'Measurement',
      'measurement': 'Measurement',
      'proposals': 'Proposal',
      'proposal': 'Proposal',
      'invoices': 'Invoice',
      'invoice': 'Invoice',
      'workOrders': 'Work Order',
      'workOrder': 'Work Order',
      'beforeImages': 'Before Image',
      'beforePictures': 'Before Image',
      'afterImages': 'After Image',
      'afterPictures': 'After Image',
      'documents': 'Document',
      'fileupload': 'Document',
      'other': 'File'
    };
    return sectionNames[section] || 'File';
  };

  // File upload functions with API connectivity
  const uploadDocument = async (fileUri, fileName, fileType, apiSection, originalSection = null) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Show upload started toast
      const sectionName = getSectionDisplayName(originalSection || apiSection);
      showInfo(`Uploading ${sectionName}...`);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('files[]', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      });

      console.log('Uploading document:', { fileName, fileType, apiSection, originalSection, jobId: project?.id });
      console.log('API Section mapping:', { section: originalSection, apiSection });
      console.log('FormData created:', formData);

      // Make API call to upload document
      const apiUrl = `https://app.stormbuddi.com/api/mobile/jobs/${project?.id}/files/${apiSection}`;
      console.log('API URL:', apiUrl);
      console.log('File info:', { fileName, fileType, uri: fileUri });
      
      // Test network connectivity first
      try {
        const testResponse = await fetch(`https://app.stormbuddi.com/api/mobile/jobs/${project?.id}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('Network test response status:', testResponse.status);
      } catch (testError) {
        console.log('Network test failed:', testError.message);
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type, let FormData set it
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload API Error Response:', errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload API Success Response:', result);
      console.log('Uploaded file data:', result.data);

      if (result.success) {
        // Add the uploaded file to the appropriate section
        const newFile = {
          id: result.data?.id || Date.now(),
          fileName: fileName,
          fileType: fileType.split('/')[1]?.toUpperCase() || 'PDF',
          url: result.data?.url || result.data?.file_url,
        };

        // Update the appropriate section based on the originalSection or apiSection
        const updateSection = originalSection || apiSection;
        switch (updateSection) {
          case 'inspectionReports':
          case 'inspectionReport':
            setInspectionReports(prev => [...prev, newFile]);
            break;
          case 'measurements':
          case 'measurement':
            setMeasurements(prev => [...prev, newFile]);
            break;
          case 'proposals':
          case 'proposal':
            setProposals(prev => [...prev, newFile]);
            // Refresh job details to get latest data from database
            setTimeout(() => {
              fetchJobDetails(project?.id);
            }, 1000);
            break;
          case 'invoices':
          case 'invoice':
            setInvoices(prev => [...prev, newFile]);
            // Refresh job details to get latest data from database
            setTimeout(() => {
              fetchJobDetails(project?.id);
            }, 1000);
            break;
          case 'workOrders':
          case 'workOrder':
            setWorkOrders(prev => [...prev, newFile]);
            break;
          case 'beforeImages':
            setBeforeImages(prev => [...prev, {
              id: result.data?.id || Date.now(),
              uri: fileUri,
              name: fileName,
            }]);
            break;
          case 'afterImages':
            setAfterImages(prev => [...prev, {
              id: result.data?.id || Date.now(),
              uri: fileUri,
              name: fileName,
            }]);
            break;
          case 'documents':
          case 'fileupload':
          default:
            setDocuments(prev => [...prev, newFile]);
            console.log('Updated documents for section:', updateSection);
        }

        // Show success toast with section name
        const sectionName = getSectionDisplayName(originalSection || apiSection);
        showSuccess(`${sectionName} uploaded successfully!`);
        return result.data;
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      
      // Show error toast
      const sectionName = getSectionDisplayName(originalSection || apiSection);
      
      // Check if it's a network error
      if (error.message === 'Network request failed') {
        showError(`Failed to upload ${sectionName}. Check your internet connection.`);
      } else {
        showError(`Failed to upload ${sectionName}. ${error.message}`);
      }
      throw error;
    }
  };

  // Helper function to convert section names to API format
  const getApiSectionName = (section) => {
    const sectionMap = {
      'inspectionReports': 'inspectionReport',
      'measurements': 'measurement',
      'proposals': 'proposal',
      'invoices': 'invoice',
      'workOrders': 'workOrder',
      'documents': 'fileupload',
      'beforeImages': 'beforePictures',
      'afterImages': 'afterPictures',
    };
    return sectionMap[section] || 'other';
  };

  // Helper function to get API section name
  const getApiSection = (section) => {
    return getApiSectionName(section);
  };

  // Camera handler
  const handleTakePicture = async (section) => {
    if (!ImageCropPicker) {
      showError('Camera not available. ImageCropPicker is not installed.');
      return;
    }

    if (Platform.OS === 'android') {
      const hasPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs access to your camera to take photos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (hasPermission !== PermissionsAndroid.RESULTS.GRANTED) {
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

      const apiSection = getApiSection(section);
      await uploadDocument(image.path, image.filename || `photo_${Date.now()}.jpg`, image.mime || 'image/jpeg', apiSection, section);
    } catch (error) {
      // Handle cancel - check multiple possible cancel messages
      const isCancel = 
        error.message === 'User cancelled image selection' ||
        error.message === 'User canceled image selection' ||
        error.message?.includes('cancel') ||
        error.message?.includes('Cancel') ||
        error.code === 'E_PICKER_CANCELLED';
      
      if (!isCancel) {
        console.error('Camera error:', error);
        const sectionName = getSectionDisplayName(section);
        showError(`Failed to take picture for ${sectionName}. Please try again.`);
      }
      // If cancelled, silently return (don't show error)
    }
  };

  // Gallery handler
  const handleChooseFromGallery = async (section) => {
    if (!ImageCropPicker) {
      showError('Gallery not available. ImageCropPicker is not installed.');
      return;
    }

    if (Platform.OS === 'android') {
      let permissions = [];
      if (Platform.Version >= 33) {
        permissions = [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES];
      } else {
        permissions = [
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ];
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
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
      });

      const apiSection = getApiSection(section);
      await uploadDocument(image.path, image.filename || `image_${Date.now()}.jpg`, image.mime || 'image/jpeg', apiSection, section);
    } catch (error) {
      // Handle cancel - check multiple possible cancel messages
      const isCancel = 
        error.message === 'User cancelled image selection' ||
        error.message === 'User canceled image selection' ||
        error.message?.includes('cancel') ||
        error.message?.includes('Cancel') ||
        error.code === 'E_PICKER_CANCELLED';
      
      if (!isCancel) {
        console.error('Gallery error:', error);
        const sectionName = getSectionDisplayName(section);
        showError(`Failed to select image from gallery for ${sectionName}. Please try again.`);
      }
      // If cancelled, silently return (don't show error)
    }
  };

  // Document picker handler
  const handleChooseDocument = async (section) => {
    if (!DocumentPicker) {
      showError('Document picker not available. Document picker library is not installed.');
      return;
    }

    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.doc, DocumentPicker.types.docx],
        allowMultiSelection: false,
      });

      if (result && result.length > 0) {
        const selectedFile = result[0];
        const apiSection = getApiSection(section);
        await uploadDocument(selectedFile.uri, selectedFile.name, selectedFile.type, apiSection, section);
      }
    } catch (error) {
      // Handle cancel - check multiple possible cancel codes/messages
      const isCancel = 
        error.code === 'DOCUMENT_PICKER_CANCEL' ||
        error.code === 'E_DOCUMENT_PICKER_CANCELED' ||
        error.message?.includes('cancel') ||
        error.message?.includes('Cancel') ||
        error.message?.includes('User cancelled') ||
        error.message === 'User canceled document picker';
      
      if (!isCancel) {
        console.error('Document picker error:', error);
        const sectionName = getSectionDisplayName(section);
        showError(`Failed to select document for ${sectionName}. Please try again.`);
      }
      // If cancelled, silently return (don't show error)
    }
  };

  // Main file upload handler
  const handleFileUpload = async (section, file) => {
    if (!ImageCropPicker && !DocumentPicker) {
      showError('File Picker Not Available. ImageCropPicker or DocumentPicker is not installed.');
      return;
    }

    // Set current section and show custom modal
    setCurrentUploadSection(section);
    setShowFileSourceModal(true);
  };

  // Handle file source selection from modal
  const handleFileSourceSelect = (source) => {
    if (!currentUploadSection) return;

    if (source === 'camera') {
      handleTakePicture(currentUploadSection);
    } else if (source === 'gallery') {
      handleChooseFromGallery(currentUploadSection);
    } else if (source === 'document') {
      handleChooseDocument(currentUploadSection);
    }
    
    setCurrentUploadSection(null);
  };

  const handleFileView = async (file) => {
    try {
      // Handle different file types
      if (typeof file === 'string') {
        // Legacy support for string file names
        showInfo(`Viewing ${file}`);
        return;
      }

      // Get file URL - construct full URL if it's a relative path
      let fileUrl = file.url || file.file_url || file.uri;
      
      if (fileUrl && !fileUrl.startsWith('http')) {
        // If it's a relative path, construct full URL
        fileUrl = `https://app.stormbuddi.com/${fileUrl}`;
      }

      if (!fileUrl) {
        showError('File URL not available');
        return;
      }

      const fileName = file.fileName || file.original_name || file.name || 'Unknown';
      const fileType = file.fileType || (file.file_type ? file.file_type.split('/')[1] : 'unknown');

      console.log('Opening file:', { fileName, fileType, fileUrl });

      // Check if the URL can be opened
      const canOpen = await Linking.canOpenURL(fileUrl);
      
      if (canOpen) {
        // Open the file with the default app
        await Linking.openURL(fileUrl);
      } else {
        // Fallback: try to open in browser
        const browserUrl = fileUrl.startsWith('http') ? fileUrl : `https://app.stormbuddi.com/${fileUrl}`;
        await Linking.openURL(browserUrl);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      showError('Unable to open file. Please check if you have an app installed to view this file type.');
    }
  };

  const handleFileDownload = async (file) => {
    try {
      // Handle different file types
      if (typeof file === 'string') {
        showInfo(`Downloading ${file}`);
        return;
      }

      // Get file URL - construct full URL if it's a relative path
      let fileUrl = file.url || file.file_url || file.uri;
      
      if (fileUrl && !fileUrl.startsWith('http')) {
        fileUrl = `https://app.stormbuddi.com/${fileUrl}`;
      }

      if (!fileUrl) {
        showError('File URL not available');
        return;
      }

      const fileName = file.fileName || file.original_name || file.name || `file_${Date.now()}`;
      const fileType = file.fileType || (file.file_type ? file.file_type.split('/')[1] : 'pdf');
      
      // Show download started message
      showInfo(`Downloading ${fileName}...`);

      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Determine file path and extension
      const fileExtension = fileType.toLowerCase() || 'pdf';
      const fullFileName = fileName.includes('.') ? fileName : `${fileName}.${fileExtension}`;
      
      // Use Downloads folder for Android or Documents for iOS
      let filePath;
      if (Platform.OS === 'android') {
        // Try DownloadDirectoryPath first, if not available, construct Downloads path
        if (RNFS.DownloadDirectoryPath) {
          filePath = `${RNFS.DownloadDirectoryPath}/${fullFileName}`;
        } else {
          // Construct Downloads folder path manually
          const downloadsPath = `${RNFS.ExternalStorageDirectoryPath}/Download`;
          // Ensure Downloads directory exists
          const dirExists = await RNFS.exists(downloadsPath);
          if (!dirExists) {
            await RNFS.mkdir(downloadsPath);
          }
          filePath = `${downloadsPath}/${fullFileName}`;
        }
      } else {
        // iOS: Save to Documents directory
        filePath = `${RNFS.DocumentDirectoryPath}/${fullFileName}`;
      }

      // Use RNFS.downloadFile for better binary file handling
      const downloadResult = await RNFS.downloadFile({
        fromUrl: fileUrl,
        toFile: filePath,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*',
        },
      }).promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(`Download failed: ${downloadResult.statusCode}`);
      }

      // Verify file was saved
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('File was not saved correctly');
      }

      // Check file size
      const fileStat = await RNFS.stat(filePath);
      if (fileStat.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Show success message
      const locationMessage = Platform.OS === 'android' 
        ? 'Downloads folder' 
        : 'Files app';
      
      showSuccess(`${fileName} downloaded successfully!\nSaved to: ${locationMessage}`);
      
      console.log('File downloaded successfully:', filePath, 'Size:', fileStat.size, 'bytes');
    } catch (error) {
      console.error('Download error:', error);
      showError(`Download failed: ${error.message || 'Unable to download file'}`);
    }
  };

  const handleFileDelete = (section, fileId) => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement file deletion logic
            console.log(`Delete file ${fileId} from ${section}`);
          }
        }
      ]
    );
  };

  const handleImageDelete = (section, imageId) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            if (section === 'before') {
              setBeforeImages(prev => prev.filter(img => img.id !== imageId));
            } else {
              setAfterImages(prev => prev.filter(img => img.id !== imageId));
            }
          }
        }
      ]
    );
  };

  const handleInspectionReportUpload = () => {
    setShowInspectionReportModal(true);
  };

  const handleInspectionReportSubmit = async (uploadData) => {
    console.log('Inspection report uploaded:', uploadData);
    
    // Modal already shows its own toast, so we don't need to show another one here
    // Just close the modal and refresh data
    setShowInspectionReportModal(false);
    
    // Refresh job details to get updated inspection reports
    if (project?.id) {
      await fetchJobDetails(project.id);
    }
  };

  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const handleAppointmentEdit = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handleAppointmentCreate = () => {
    setSelectedAppointment(null);
    setShowAppointmentModal(true);
  };

  const handleAppointmentSubmit = (formData) => {
    // Refresh appointments after create/edit
    fetchJobDetails(project?.id);
    // Close the modal
    setShowAppointmentModal(false);
    setSelectedAppointment(null);
  };

  const handleEditJobDetails = () => {
    setIsEditing(true);
  };

  const handleSaveJobDetails = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // Prepare data for API - use the new description endpoint
      const updateData = {
        description: jobDetails.description,
      };

      console.log('Sending job description update:', updateData);

      const response = await fetch(`https://app.stormbuddi.com/api/mobile/jobs/${project?.id}/description`, {
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
    setIsEditing(false);
        showSuccess('Job description updated successfully');
      } else {
        throw new Error(data.message || 'Failed to update job description');
      }
    } catch (error) {
      console.error('Job description update error:', error);
      
      // Handle different error types
      if (error.message.includes('404')) {
        setError('Job description update API not available yet.');
        showInfo('Job description update feature is not available yet. Please contact support.');
      } else if (error.message.includes('500')) {
        setError('Server error. Please try again later.');
        showError('Server error occurred. Please try again later.');
      } else {
        setError('Failed to update job description. Please try again.');
        showError('Failed to update job description. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setJobDetails({
      title: project?.title || '',
      description: project?.description || '',
    });
    setIsEditing(false);
  };

  const getStatusStyle = (status) => {
    const normalizedStatus = (status || '').toLowerCase().replace(/\s+/g, '-');
    
    // Status color mapping based on the provided color scheme
    const statusColors = {
      'new-job': '#4DA3FF',           // Light Blue
      'in-progress': '#28A745',       // Medium Green
      'proposal-sent': '#FFC107',     // Amber
      'proposal-signed': '#FF9800',   // Orange
      'material-ordered': '#7E57C2',  // Purple
      'work-order': '#0D47A1',        // Navy Blue
      'appointment-scheduled': '#26A69A', // Teal
      'invoicing-payment': '#C7921E', // Deep Gold
      'job-completed': '#2E7D32',     // Dark Green
      'completed': '#2E7D32',         // Dark Green (alias)
      'lost': '#E53935',               // Red
      'unqualified': '#757575',       // Gray
      // Legacy support
      'pending': '#FFC107',           // Amber (proposal-sent)
      'cancelled': '#E53935',         // Red (lost)
      'canceled': '#E53935',          // Red (lost)
    };
    
    const backgroundColor = statusColors[normalizedStatus] || colors.primary;
    
    return {
      backgroundColor,
      textColor: '#ffffff'
    };
  };

  const scrollToSection = (sectionName) => {
    const sectionRef = sectionRefs.current[sectionName];
    
    if (sectionRef && scrollViewRef.current) {
      sectionRef.measureLayout(
        scrollViewRef.current,
        (x, y, width, height) => {
          scrollViewRef.current?.scrollTo({ y: y - 80, animated: true });
        },
        () => console.log('Failed to measure layout')
      );
    }
  };

  const renderStatusTag = () => {
    const statusStyle = getStatusStyle(jobStatus);
    const isDarkNavy = statusStyle.backgroundColor === colors.primary;
    
    // Scroll to appointments section when vertical status bar is clicked
    const scrollToAppointments = () => {
      scrollToSection('appointments');
    };
    
    return (
      <TouchableOpacity 
        style={styles.statusTagContainer}
        onPress={scrollToAppointments}
        activeOpacity={0.7}
      >
        <View style={styles.statusTagContainerInner}>
          <View style={[
            styles.statusTag, 
            { backgroundColor: statusStyle.backgroundColor },
            isDarkNavy && styles.statusTagWithShadow
          ]}>
            <Text style={[styles.statusTagText, { color: statusStyle.textColor }]}>
              {jobStatus}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFileSection = (title, files, sectionName, isImageUpload = false, useModal = false) => {
    // Special handling for Inspection Reports with modal
    if (sectionName === 'inspectionReports' && useModal) {
      // Group all inspection reports into one card
      if (files.length === 0) {
        return (
          <View>
            <SectionHeader title={title} />
            <UploadButton
              title="Upload File"
              subtitle="Click here to upload files"
              supportedFormats="Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG"
              onPress={handleInspectionReportUpload}
              isImageUpload={false}
            />
          </View>
        );
      }

      // Group files by upload session (same date and data/description) or show all in one card
      const groupedFiles = files.map(file => ({
        id: file.id,
        file_url: file.url || file.file_url,
        file_path: file.url || file.file_url,
        file_name: file.fileName,
        original_name: file.fileName,
        file_type: file.file_type || `application/${file.fileType?.toLowerCase() || 'pdf'}`,
        file_size: file.fileSize || file.size,
        url: file.url || file.file_url,
        type: file.file_type || `application/${file.fileType?.toLowerCase() || 'pdf'}`,
      }));

      // Use the first file's metadata for the card header, but include all files
      const firstFile = files[0];
      const reportData = {
        id: firstFile.id || 'inspection-report-group',
        file_name: files.length > 1 ? `${files.length} files` : firstFile.fileName,
        original_name: firstFile.fileName,
        file_type: firstFile.file_type || `application/${firstFile.fileType?.toLowerCase() || 'pdf'}`,
        job_title: project?.title,
        job_address: project?.address,
        data: firstFile.description || firstFile.data || '',
        uploaded_by: firstFile.uploaded_by || 'Unknown',
        date: firstFile.date || firstFile.created_at,
        file_size: firstFile.fileSize || firstFile.size || 0,
        url: firstFile.url || firstFile.file_url,
        status: firstFile.status || 'completed',
        // Add files array for thumbnails
        files: groupedFiles,
      };

      return (
        <View>
          <SectionHeader title={title} />
          <UploadButton
            title="Upload File"
            subtitle="Click here to upload files"
            supportedFormats="Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG"
            onPress={handleInspectionReportUpload}
            isImageUpload={false}
          />
          <InspectionReportCard
            key={reportData.id}
            report={reportData}
            onPress={() => {
              // The card's handleCardPress will handle opening images or documents
              // This onPress is only called as a fallback if no files exist
            }}
          />
        </View>
      );
    }
    
    // Default rendering for other sections
    // Show toast message for proposals instead of allowing upload
    const isProposalSection = sectionName === 'proposals';
    
    const handleUploadPress = () => {
      if (isProposalSection) {
        showInfo('Proposal can only be uploaded from Web CRM');
      } else {
        handleFileUpload(sectionName, null);
      }
    };
    
    return (
      <View>
        <SectionHeader title={title} />
        <UploadButton
          title={isImageUpload ? `Upload ${title}` : 'Upload File'}
          subtitle="Click here to upload files"
          supportedFormats={isImageUpload ? 'Supported formats: JPG, PNG' : 'Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG'}
          onPress={handleUploadPress}
          isImageUpload={isImageUpload}
        />
        {files.map((file) => (
          <FileCard
            key={file.id}
            fileName={file.fileName}
            fileType={file.fileType}
            onView={() => handleFileView(file)}
            onDownload={() => handleFileDownload(file)}
          />
        ))}
      </View>
    );
  };

  const renderDataSection = (title, data, sectionName, showActions = true, cardType = 'default', showAddButton = false, onAddPress = null) => (
    <View>
      <SectionHeader title={title} />
      {showAddButton && onAddPress && (
        <TouchableOpacity
          style={styles.addAppointmentButton}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <Icon name="add" size={20} color={colors.white} />
          <Text style={styles.addAppointmentButtonText}>Add Appointment</Text>
        </TouchableOpacity>
      )}
      {data.map((item) => (
        <DataCard
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          details={item.details}
          status={item.status}
          onView={showActions ? () => handleFileView(item) : undefined}
          onDownload={showActions ? () => handleFileDownload(item) : undefined}
          onEdit={cardType === 'appointment' ? () => handleAppointmentEdit(item) : undefined}
          showActions={showActions}
          cardType={cardType}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading job details..."
      />
      
      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
          {/* Vertical Status Tag */}
          {renderStatusTag()}
          
          <Header 
            title={project?.title || "Job Details"} 
            showBack={true}
            showMenu={false}
            showNotification={true}
            onBackPress={() => navigation.navigate('Jobs')}
            onNotificationPress={handleNotificationPress}
          />
          
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
          >

        {/* Error State */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => fetchJobDetails(project?.id)}
            retryText="Retry"
          />
        )}

        {/* Job Details Section */}
        <View ref={(ref) => sectionRefs.current['jobDetails'] = ref} style={styles.section}>
          <SectionHeader 
            title="Job Details" 
            showEdit={!isEditing}
            onEdit={handleEditJobDetails}
          />
          
          <View style={styles.jobDetailsCard}>
            <InputField
              placeholder="Title.."
              value={jobDetails.title}
              onChangeText={(text) => setJobDetails(prev => ({ ...prev, title: text }))}
              style={isEditing ? styles.titleInput : styles.titleInputDefault}
              showUnderline={isEditing}
              editable={isEditing}
            />
            <InputField
              placeholder="Description.."
              value={jobDetails.description}
              onChangeText={(text) => setJobDetails(prev => ({ ...prev, description: text }))}
              multiline={true}
              numberOfLines={4}
              style={styles.descriptionInput}
              showUnderline={isEditing}
              editable={isEditing}
            />
            
            {isEditing && (
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                  onPress={handleSaveJobDetails}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Inspection Report Section */}
        <View ref={(ref) => sectionRefs.current['inspection'] = ref}>
          {renderFileSection('Inspection Report', inspectionReports, 'inspectionReports', false, true)}
        </View>

        {/* Measurements Section */}
        {renderFileSection('Measurements', measurements, 'measurements')}

        {/* Proposals Section */}
        {renderFileSection('Proposals', proposals, 'proposals')}

        {/* Work Order Section */}
        <View ref={(ref) => sectionRefs.current['workOrder'] = ref}>
          {renderFileSection('Work Order', workOrders, 'workOrders')}
        </View>

        {/* Appointment Schedule Section */}
        <View ref={(ref) => sectionRefs.current['appointments'] = ref}>
          {renderDataSection('Appointment Schedule', appointments, 'appointments', true, 'appointment', true, handleAppointmentCreate)}
        </View>

        {/* Invoices Section */}
        <View ref={(ref) => sectionRefs.current['invoices'] = ref}>
          <SectionHeader title="Invoices" />
          <UploadButton
            title="Upload Invoice"
            subtitle="Click here to upload invoice files"
            supportedFormats="Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG"
            onPress={() => handleFileUpload('invoices', null)}
            isImageUpload={false}
          />
          {invoices.map((file) => (
            <FileCard
              key={file.id}
              fileName={file.fileName}
              fileType={file.fileType}
              onView={() => handleFileView(file)}
              onDownload={() => handleFileDownload(file)}
            />
          ))}
        </View>

        {/* Before & After Images Section */}
        <View style={styles.section}>
          <SectionHeader title="Before & After Images" />
          
          <UploadButton
            title="Upload Before Images"
            subtitle="Click here to upload files"
            supportedFormats="Supported formats: JPG, PNG"
            onPress={() => handleFileUpload('beforeImages', null)}
            isImageUpload={true}
          />
          <ImageGallery
            images={beforeImages}
            title="Before Images"
          />

          <UploadButton
            title="Upload After Images"
            subtitle="Click here to upload files"
            supportedFormats="Supported formats: JPG, PNG"
            onPress={() => handleFileUpload('afterImages', null)}
            isImageUpload={true}
          />
          <ImageGallery
            images={afterImages}
            title="After Images"
          />
        </View>

        {/* Documents Section */}
        <View ref={(ref) => sectionRefs.current['documents'] = ref}>
          {renderFileSection('Documents', documents, 'documents')}
        </View>
      </ScrollView>
        </View>
      )}

      {/* Notification Modal */}
      <NotificationListModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Appointment Edit Modal */}
      <CreateAppointmentModal
        visible={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setSelectedAppointment(null);
        }}
        onSubmit={handleAppointmentSubmit}
        appointment={selectedAppointment}
        projectId={project?.id}
        forceInspectionType={false} // Allow user to select any type when creating from JobDetails
      />

      {/* Inspection Report Upload Modal */}
      <UploadInspectionReportModal
        visible={showInspectionReportModal}
        onClose={() => setShowInspectionReportModal(false)}
        onSubmit={handleInspectionReportSubmit}
        jobId={project?.id}
      />

      {/* File Source Selection Modal */}
      <FileSourceModal
        visible={showFileSourceModal}
        onClose={() => setShowFileSourceModal(false)}
        onSelectSource={handleFileSourceSelect}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  statusTagContainer: {
    position: 'absolute',
    right: 0,
    top: '30%',
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  statusTagContainerInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTag: {
    width: 120,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    transform: [{ rotate: '90deg' }],
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTagWithShadow: {
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 8,
  },
  jobDetailsCard: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  titleInput: {
    marginBottom: 16,
  },
  titleInputDefault: {
    marginBottom: 16,
  },
  descriptionInput: {
    marginBottom: 0,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  addAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  addAppointmentButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButtonContainer: {
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  uploadButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  uploadButtonSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  uploadButtonFormats: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default JobDetails;

