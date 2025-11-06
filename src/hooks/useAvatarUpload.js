import { useCallback, useMemo, useState } from 'react';
import { launchImageLibrary } from 'react-native-image-picker';
import { Alert, Platform } from 'react-native';
import { getToken } from '../utils/tokenStorage';

/**
 * Reusable hook for selecting and uploading an avatar image.
 * - Opens the image library
 * - Validates basic constraints (size/type)
 * - Uploads via multipart/form-data with Bearer token
 */
const DEFAULT_MAX_MB = 8; // hard cap to avoid giant uploads

export function useAvatarUpload(options = {}) {
  const {
    uploadUrl = 'https://app.stormbuddi.com/api/mobile/profile/avatar',
    method = 'POST',
    fieldName = 'avatar',
    maxSizeMb = DEFAULT_MAX_MB,
    allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/heif'],
    onUploaded,
    showError, // Optional toast error function
  } = options;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // { uri, fileName, type, fileSize }
  const [uploadedUrl, setUploadedUrl] = useState(null);

  const sizeLimitBytes = useMemo(() => maxSizeMb * 1024 * 1024, [maxSizeMb]);

  const pickImage = useCallback(async () => {
    setError(null);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
        quality: 0.9,
      });

      if (result.didCancel) return null;
      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Image picker error');
      }

      const asset = result.assets && result.assets[0];
      if (!asset) return null;

      const mime = asset.type || 'image/jpeg';
      if (allowedMimeTypes.length && !allowedMimeTypes.includes(mime)) {
        throw new Error('Unsupported image type. Please select a PNG or JPEG image.');
      }

      if (asset.fileSize && asset.fileSize > sizeLimitBytes) {
        throw new Error(`Image too large. Max ${maxSizeMb}MB allowed.`);
      }

      const normalized = {
        uri: Platform.OS === 'ios' ? asset.uri?.replace('file://', '') : asset.uri,
        fileName: asset.fileName || `avatar_${Date.now()}.jpg`,
        type: mime,
        fileSize: asset.fileSize || 0,
      };

      setSelected(normalized);
      return normalized;
    } catch (e) {
      setError(e.message);
      if (showError) {
        showError(`Image Selection Failed: ${e.message}`);
      } else {
        Alert.alert('Image Selection Failed', e.message);
      }
      return null;
    }
  }, [allowedMimeTypes, maxSizeMb, sizeLimitBytes]);

  const upload = useCallback(async (fileOverride) => {
    setError(null);
    const file = fileOverride || selected;
    if (!file) {
      if (showError) {
        showError('No Image. Please select an image first.');
      } else {
        Alert.alert('No Image', 'Please select an image first.');
      }
      return null;
    }

    try {
      setUploading(true);
      const token = await getToken();
      if (!token) throw new Error('No authentication token found. Please login again.');

      const form = new FormData();
      form.append(fieldName, {
        uri: file.uri,
        name: file.fileName,
        type: file.type,
      });

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: form,
      });

      if (!response.ok) {
        let detail = '';
        try { detail = await response.text(); } catch (_) {}
        console.error('Avatar upload failed (non-OK response):', {
          status: response.status,
          uploadUrl,
          detail,
        });
        throw new Error(`Upload failed (${response.status}). ${detail}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }

      // try common response shapes: {success, data:{avatar_url}} or {url}
      const urlFromResponse =
        data?.data?.avatar_url || data?.avatar_url || data?.url || null;

      if (!urlFromResponse) {
        // still consider success, but no URL returned
        console.warn('Avatar uploaded but no URL returned in response payload');
        setUploadedUrl(null);
      } else {
        setUploadedUrl(urlFromResponse);
      }

      if (typeof onUploaded === 'function') {
        try { onUploaded(urlFromResponse, data); } catch (_) {}
      }

      return { url: urlFromResponse, response: data };
    } catch (e) {
      setError(e.message);
      console.error('Avatar upload error:', e);
      if (showError) {
        showError(`Avatar Upload Failed: ${e.message}`);
      } else {
        Alert.alert('Avatar Upload Failed', e.message);
      }
      return null;
    } finally {
      setUploading(false);
    }
  }, [fieldName, onUploaded, selected, uploadUrl]);

  const pickAndUpload = useCallback(async () => {
    const file = await pickImage();
    if (!file) return null;
    return await upload(file);
  }, [pickImage, upload]);

  return {
    // state
    uploading,
    error,
    selected,
    uploadedUrl,
    // actions
    pickImage,
    upload,
    pickAndUpload,
  };
}

export default useAvatarUpload;


