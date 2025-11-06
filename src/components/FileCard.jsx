import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const FileCard = ({ 
  fileName, 
  fileType = 'PDF',
  onView,
  onDownload,
  onDelete,
  showActions = true 
}) => {
  const getFileIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'png':
        return '🖼️';
      default:
        return '📄';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.fileIcon}>{getFileIcon(fileType)}</Text>
        <Text style={styles.fileName} numberOfLines={2}>
          {fileName}
        </Text>
      </View>
      
      {showActions && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={onView}>
            <Text style={styles.actionIcon}>👁️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDownload}>
            <Text style={styles.actionIcon}>⬇️</Text>
          </TouchableOpacity>
          {onDelete && (
            <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fileName: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  actionIcon: {
    fontSize: 14,
  },
});

export default FileCard;
