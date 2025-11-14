import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';

const ImageGallery = ({ 
  images = [],
  onImageDelete,
  onImagePress,
  title = 'Images'
}) => {
  const renderImage = (image, index) => (
    <View key={index} style={styles.imageContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onImagePress && onImagePress(image)}
      >
        <Image source={{ uri: image.uri }} style={styles.image} />
      </TouchableOpacity>
      {onImageDelete && (
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => onImageDelete(index)}
        >
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.imageName} numberOfLines={1}>
        {image.name || `Image ${index + 1}`}
      </Text>
    </View>
  );

  if (images.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.gallery}>
        {images.map((image, index) => renderImage(image, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    marginBottom: 8,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageName: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ImageGallery;
