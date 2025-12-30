import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';
import { getToken } from '../utils/tokenStorage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const InspectionReportCard = ({ 
  report, 
  onPress 
}) => {
  const { showError, showSuccess, showInfo } = useToast();
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const imageScrollViewRef = useRef(null);
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return { bg: '#D4EDDA', text: '#155724' };
      case 'pending':
        return { bg: '#FFF3CD', text: '#856404' };
      case 'draft':
        return { bg: '#E2E3E5', text: '#383D41' };
      case 'in-progress':
        return { bg: '#CCE5FF', text: '#004085' };
      default:
        return { bg: '#F8F9FA', text: '#6C757D' };
    }
  };

  const statusStyle = getStatusColor(report.status);

  // Truncate long file names to prevent overflow
  const truncateFileName = (fileName, maxLength = 40) => {
    if (!fileName) return 'Untitled Report';
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength) + '...';
  };

  // Get files array - check if report has files array, or create one from single file
  const getFiles = () => {
    if (report.files && Array.isArray(report.files) && report.files.length > 0) {
      return report.files;
    }
    // If no files array but has single file properties, create array
    if (report.file_url || report.file_path || report.file_name) {
      return [{
        file_url: report.file_url,
        file_path: report.file_path,
        file_name: report.file_name || report.original_name,
        file_type: report.file_type,
        id: report.id,
      }];
    }
    return [];
  };

  const files = getFiles();
  const hasMultipleFiles = files.length > 1;
  const fileName = report.file_name || report.original_name || report.title || 'Inspection Report';
  const displayFileName = hasMultipleFiles ? `${files.length} files` : truncateFileName(fileName);

  // Check if file is an image
  const isImage = (file) => {
    const fileType = file.file_type || file.type || '';
    return fileType.startsWith('image/');
  };

  // Get file URL/thumbnail
  const getFileUrl = (file) => {
    return file.url || file.file_url || file.file_path || file.thumbnail_url || '';
  };

  // Get images only (for viewer)
  const imageFiles = files.filter(file => isImage(file));
  
  // Get documents only (PDFs, etc.)
  const documentFiles = files.filter(file => !isImage(file));

  // Open PDF or document file
  const openDocument = async (file) => {
    try {
      let fileUrl = getFileUrl(file);
      
      if (!fileUrl) {
        showError('File URL not available');
        return;
      }

      // Construct full URL if it's a relative path
      if (fileUrl && !fileUrl.startsWith('http')) {
        fileUrl = `https://app.stormbuddi.com/${fileUrl}`;
      }

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
      console.error('Error opening document:', error);
      showError('Unable to open file. Please check if you have an app installed to view this file type.');
    }
  };

  // Download file function
  const handleDownload = async (file) => {
    try {
      let fileUrl = getFileUrl(file);
      
      if (!fileUrl) {
        showError('File URL not available');
        return;
      }

      // Construct full URL if it's a relative path
      if (fileUrl && !fileUrl.startsWith('http')) {
        fileUrl = `https://app.stormbuddi.com/${fileUrl}`;
      }

      const fileName = file.file_name || file.original_name || file.name || `InspectionReport_${Date.now()}`;
      const fileType = file.file_type || file.type || 'pdf';
      const fileExtension = fileType.includes('/') ? fileType.split('/')[1] : 'pdf';
      
      // Show download started message
      showInfo(`Downloading ${fileName}...`);

      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Determine file path - use Downloads folder for Android or Documents for iOS
      const fullFileName = fileName.includes('.') ? fileName : `${fileName}.${fileExtension.toLowerCase()}`;
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

  // Handle card click - show image viewer from start or open first document
  const handleCardPress = () => {
    if (imageFiles.length > 0) {
      // Show from the first image
      setSelectedImageIndex(0);
      setImageViewerVisible(true);
    } else if (documentFiles.length > 0) {
      // If no images but has documents, open the first document
      openDocument(documentFiles[0]);
    } else {
      // If no files, call the original onPress handler
      if (onPress) {
        onPress();
      }
    }
  };

  // Handle thumbnail click - show image viewer or open document
  const handleThumbnailPress = (fileIndex) => {
    const file = files[fileIndex];
    if (isImage(file)) {
      // Find the image index in the imageFiles array
      const imageIndex = imageFiles.findIndex(img => {
        const imgUrl = getFileUrl(img);
        const fileUrl = getFileUrl(file);
        return img.id === file.id || imgUrl === fileUrl;
      });
      if (imageIndex >= 0) {
        setSelectedImageIndex(imageIndex);
        setImageViewerVisible(true);
      }
    } else {
      // Open document (PDF, etc.)
      openDocument(file);
    }
  };

  // Render thumbnail for a file
  const renderFileThumbnail = (file, index) => {
    const fileUrl = getFileUrl(file);
    const imageFile = isImage(file);
    
    return (
      <TouchableOpacity
        key={file.id || index}
        style={styles.thumbnailContainer}
        onPress={() => handleThumbnailPress(index)}
        activeOpacity={0.7}
      >
        {imageFile && fileUrl ? (
          <Image 
            source={{ uri: fileUrl }} 
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.documentThumbnail}>
            <Icon name="description" size={32} color={colors.primary} />
          </View>
        )}
        {!imageFile && (
          <View style={styles.documentBadge}>
            <Text style={styles.documentBadgeText}>
              {file.file_type?.split('/')[1]?.toUpperCase() || 'PDF'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Navigate to previous image
  const goToPreviousImage = () => {
    if (selectedImageIndex > 0) {
      const newIndex = selectedImageIndex - 1;
      setSelectedImageIndex(newIndex);
      if (imageScrollViewRef.current) {
        imageScrollViewRef.current.scrollTo({
          x: newIndex * SCREEN_WIDTH,
          animated: true,
        });
      }
    } else {
      const lastIndex = imageFiles.length - 1;
      setSelectedImageIndex(lastIndex); // Loop to last
      if (imageScrollViewRef.current) {
        imageScrollViewRef.current.scrollTo({
          x: lastIndex * SCREEN_WIDTH,
          animated: true,
        });
      }
    }
  };

  // Navigate to next image
  const goToNextImage = () => {
    if (selectedImageIndex < imageFiles.length - 1) {
      const newIndex = selectedImageIndex + 1;
      setSelectedImageIndex(newIndex);
      if (imageScrollViewRef.current) {
        imageScrollViewRef.current.scrollTo({
          x: newIndex * SCREEN_WIDTH,
          animated: true,
        });
      }
    } else {
      setSelectedImageIndex(0); // Loop to first
      if (imageScrollViewRef.current) {
        imageScrollViewRef.current.scrollTo({
          x: 0,
          animated: true,
        });
      }
    }
  };

  // Scroll to selected image when index changes
  useEffect(() => {
    if (imageViewerVisible && imageScrollViewRef.current && selectedImageIndex >= 0) {
      imageScrollViewRef.current.scrollTo({
        x: selectedImageIndex * SCREEN_WIDTH,
        animated: false,
      });
    }
  }, [imageViewerVisible, selectedImageIndex]);

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="description" size={24} color={colors.primary} />
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {displayFileName}
          </Text>
        </View>
        {hasMultipleFiles && (
          <View style={[styles.fileCountBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.fileCountText, { color: statusStyle.text }]}>
              {files.length}
          </Text>
        </View>
        )}
        {!hasMultipleFiles && report.file_type && (
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {report.file_type.split('/')[1]?.toUpperCase() || 'PDF'}
            </Text>
          </View>
        )}
      </View>

      {/* Thumbnail Gallery */}
      {files.length > 0 && (
        <View style={styles.thumbnailsSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.thumbnailsScrollContent}
            style={styles.thumbnailsScrollView}
            nestedScrollEnabled={true}
            bounces={true}
            alwaysBounceHorizontal={false}
          >
            {files.map((file, index) => renderFileThumbnail(file, index))}
          </ScrollView>
        </View>
      )}

      <View style={styles.content}>
        {report.job_title && (
          <View style={styles.detailRow}>
            <Icon name="folder" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={1}>
              {report.job_title}
            </Text>
          </View>
        )}

        {report.job_address && (
          <View style={styles.detailRow}>
            <Icon name="location-on" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={2}>
              {report.job_address}
            </Text>
          </View>
        )}
        
        {report.data && (
          <View style={styles.detailRow}>
            <Icon name="work" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {report.data}
            </Text>
          </View>
        )}

        {report.uploaded_by && (
          <View style={styles.detailRow}>
            <Icon name="account-circle" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              Uploaded by: {report.uploaded_by}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Icon name="calendar-today" size={16} color={colors.textSecondary} />
          <Text style={styles.dateText} numberOfLines={1} ellipsizeMode="tail">
            {formatDate(report.date || report.created_at)}
          </Text>
        </View>
        
        <View style={styles.footerRight}>
          <View style={styles.fileInfo}>
            {hasMultipleFiles ? (
              <Text style={styles.fileCountInfo}>
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </Text>
            ) : (
              <>
            {report.file_size && (
              <Text style={styles.fileSizeText} numberOfLines={1} ellipsizeMode="tail">
                {report.formatted_size || `${(parseInt(report.file_size) / 1024).toFixed(2)} KB`}
              </Text>
            )}
           {report.file_type && (
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]} numberOfLines={1} ellipsizeMode="tail">
                {report.file_type.split('/')[1]?.toUpperCase() || 'PDF'}
              </Text>
            </View>
          )}
              </>
            )}
          </View>
          
          {/* Download button - only show if there are files */}
          {files.length > 0 && (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent card press
                // Download first document if available, otherwise first file
                const fileToDownload = documentFiles.length > 0 ? documentFiles[0] : files[0];
                handleDownload(fileToDownload);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.downloadIcon}>⬇️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Full-Screen Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <SafeAreaView style={styles.imageViewerContainer}>
          <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />
          
          {/* Header */}
          <View style={styles.imageViewerHeader}>
            <Text style={styles.imageViewerTitle}>
              {selectedImageIndex + 1} / {imageFiles.length}
            </Text>
            <TouchableOpacity
              style={styles.imageViewerCloseButton}
              onPress={() => setImageViewerVisible(false)}
            >
              <Icon name="close" size={28} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Image Container */}
          <View style={styles.imageViewerContent}>
            {imageFiles.length > 0 && (
              <>
                <ScrollView
                  ref={imageScrollViewRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setSelectedImageIndex(index);
                  }}
                >
                  {imageFiles.map((file, index) => {
                    const fileUrl = getFileUrl(file);
                    return (
                      <View key={file.id || index} style={styles.fullImageContainer}>
                        <Image
                          source={{ uri: fileUrl }}
                          style={styles.fullImage}
                          resizeMode="contain"
                        />
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Navigation Arrows */}
                {imageFiles.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={[styles.navArrow, styles.navArrowLeft]}
                      onPress={goToPreviousImage}
                    >
                      <Icon name="chevron-left" size={32} color={colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.navArrow, styles.navArrowRight]}
                      onPress={goToNextImage}
                    >
                      <Icon name="chevron-right" size={32} color={colors.white} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>

          {/* Footer - File name */}
          {imageFiles[selectedImageIndex] && (
            <View style={styles.imageViewerFooter}>
              <Text style={styles.imageViewerFileName} numberOfLines={1}>
                {imageFiles[selectedImageIndex].file_name || `Image ${selectedImageIndex + 1}`}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    minWidth: 0, // Ensure flex child can shrink below its content size
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
    flexShrink: 1, // Allow text to shrink
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fileCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  fileCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  thumbnailsSection: {
    marginBottom: 12,
    paddingVertical: 8,
    width: '100%',
  },
  thumbnailsScrollView: {
    width: '100%',
  },
  thumbnailsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    gap: 8,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 8,
    flexShrink: 0,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    marginBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0, // Ensure flex child can shrink below its content size
    marginRight: 8,
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1, // Allow text to shrink
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1, // Allow container to shrink
    minWidth: 0, // Ensure flex child can shrink below its content size
  },
  downloadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  downloadIcon: {
    fontSize: 14,
  },
  fileIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  fileText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  fileCountInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  fileSizeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginRight: 4,
    flexShrink: 1, // Allow text to shrink
    maxWidth: 60, // Limit width to prevent overflow
  },
  // Image Viewer Modal Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  imageViewerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  imageViewerCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    marginTop: -25,
  },
  navArrowLeft: {
    left: 16,
  },
  navArrowRight: {
    right: 16,
  },
  imageViewerFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  imageViewerFileName: {
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
  },
});

export default InspectionReportCard;

