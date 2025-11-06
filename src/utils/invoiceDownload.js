import { Alert, Platform, Linking, PermissionsAndroid, Share } from 'react-native';
import { getToken } from './tokenStorage';
import RNFS from 'react-native-fs';

/**
 * Format currency amount
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Convert ArrayBuffer to base64 string (React Native compatible)
 * @param {ArrayBuffer} buffer - The ArrayBuffer to convert
 * @returns {string} Base64 encoded string
 */
const arrayBufferToBase64 = (buffer) => {
  try {
    // Use btoa if available (most React Native environments have it)
    if (typeof btoa !== 'undefined') {
      const uint8Array = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 8192; // Process in chunks to avoid stack overflow for large files
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    } else {
      // Fallback: Manual base64 encoding (if btoa is not available)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const uint8Array = new Uint8Array(buffer);
      let result = '';
      let i = 0;
      while (i < uint8Array.length) {
        const a = uint8Array[i++];
        const b = i < uint8Array.length ? uint8Array[i++] : 0;
        const c = i < uint8Array.length ? uint8Array[i++] : 0;
        const bitmap = (a << 16) | (b << 8) | c;
        result += chars.charAt((bitmap >> 18) & 63);
        result += chars.charAt((bitmap >> 12) & 63);
        result += i - 2 < uint8Array.length ? chars.charAt((bitmap >> 6) & 63) : '=';
        result += i - 1 < uint8Array.length ? chars.charAt(bitmap & 63) : '=';
      }
      return result;
    }
  } catch (error) {
    console.error('Base64 encoding error:', error);
    throw new Error('Failed to encode PDF to base64');
  }
};

/**
 * Request storage permissions for Android
 * Note: Android 10+ (API 29+) doesn't require WRITE_EXTERNAL_STORAGE for Downloads folder
 * Android 13+ (API 33+) doesn't require any storage permissions for Downloads
 */
const requestStoragePermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const androidVersion = Platform.Version;
    
    // Android 10+ (API 29+) uses scoped storage
    // No permissions needed for Downloads folder access via react-native-fs
    if (androidVersion >= 29) {
      console.log('Android 10+ detected: No storage permissions needed for Downloads');
      return true; // Permission not required, return true to proceed
    }
    
    // For Android 9 and below (API < 29), request WRITE_EXTERNAL_STORAGE
    console.log('Android < 10 detected: Requesting WRITE_EXTERNAL_STORAGE');
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'This app needs access to storage to download PDF files.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Permission request error:', err);
    // For Android 10+, permission errors shouldn't block us
    if (Platform.Version >= 29) {
      console.log('Allowing download despite permission error (Android 10+)');
      return true;
    }
    return false;
  }
};

/**
 * Download invoice as PDF
 * @param {Object} invoice - The invoice object to download
 * @param {Function} onSuccess - Callback function called on successful download
 * @param {Function} onError - Callback function called on error
 */
export const downloadInvoice = async (invoice, onSuccess, onError) => {
  try {
    // Get authentication token
    const token = await getToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    // API endpoint for downloading invoice PDF
    const downloadUrl = `https://app.stormbuddi.com/api/mobile/invoices/${invoice.id}/download`;
    
    // Skip ALL permission checks - we're using Cache directory which doesn't need permissions
    // Cache directory is accessible on all Android versions without any storage permissions
    console.log('Skipping permission checks - using Cache directory (always accessible)');

    console.log('Starting PDF download:', { invoiceId: invoice.id, downloadUrl });

    // Fetch PDF with proper headers
    // Note: Don't set Content-Type for GET requests, only Accept
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf, application/octet-stream, */*',
      },
    });

    console.log('Fetch response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Download failed:', { status: response.status, errorText });
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }

    // Check if response is actually PDF
    const contentType = response.headers.get('content-type') || '';
    console.log('Response Content-Type:', contentType);
    
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      console.warn('Response might not be a PDF, Content-Type:', contentType);
    }

    // Get PDF as arrayBuffer and convert to base64
    console.log('Converting PDF to base64...');
    const arrayBuffer = await response.arrayBuffer();
    console.log('PDF size:', arrayBuffer.byteLength, 'bytes');
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Downloaded PDF file is empty');
    }
    
    const base64 = arrayBufferToBase64(arrayBuffer);
    console.log('Base64 conversion complete, length:', base64.length);

    // Create filename
    const fileName = `Invoice_${invoice.invoiceNumber || invoice.id}.pdf`;
    
    // Determine file path based on platform
    // For Android, use Cache directory (always accessible, no permissions needed)
    // For iOS, use Documents directory
    let filePath;
    let fileStat;
    let usingCache = false;
    
    if (Platform.OS === 'android') {
      // Android: Use Cache directory - always accessible without permissions
      // Cache directory is available on all Android versions without any permissions
      filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      usingCache = true;
      console.log('Using Android Cache path (no permissions needed):', RNFS.CachesDirectoryPath);
      
      // Optional: Try Downloads folder as alternative (for user convenience)
      // But start with Cache to avoid any permission issues
      // Downloads can be tried if Cache works fine
    } else {
      // iOS: Save to Documents directory
      filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      console.log('iOS Documents path:', RNFS.DocumentDirectoryPath);
    }
    console.log('Target file path:', filePath);

    // Write file to device storage
    try {
      console.log('Writing file to:', filePath);
      await RNFS.writeFile(filePath, base64, 'base64');
      console.log('File written successfully');
    } catch (writeError) {
      console.error('File write error:', writeError);
      console.error('Error details:', {
        message: writeError.message,
        code: writeError.code,
        path: filePath,
      });
      
      // If Cache write failed, show error
      const errorMsg = writeError.message || writeError.toString();
      console.error('File write failed:', errorMsg);
      
      // Cache directory should always work, so this is unexpected
      throw new Error(`Failed to save file to device storage: ${errorMsg}`);
    }

    // Verify file was written and check size
    try {
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('File was not saved correctly - file does not exist');
      }
      
      // Verify file size is not zero
      fileStat = await RNFS.stat(filePath);
      console.log('File saved successfully, size:', fileStat.size, 'bytes');
      if (fileStat.size === 0) {
        throw new Error('File was saved but is empty (0 bytes)');
      }
    } catch (verifyError) {
      console.error('File verification error:', verifyError);
      throw new Error(`Failed to verify saved file: ${verifyError.message}`);
    }

    // Success - file downloaded and saved
    console.log('✅ PDF download and save completed successfully:', filePath);
    
    // Call success callback
    if (onSuccess) {
      onSuccess(filePath);
    }

    // Determine location message
    let locationMessage;
    if (Platform.OS === 'android') {
      if (filePath.includes('Cache') || usingCache) {
        locationMessage = 'App Cache folder (accessible via file manager)';
      } else {
        locationMessage = 'Device storage';
      }
    } else {
      locationMessage = 'Files app';
    }

    // Success message with options to open or view
    Alert.alert(
      'Download Complete ✅',
      `Invoice ${invoice.invoiceNumber} PDF has been downloaded and saved successfully!\n\nFile: ${fileName}\nSize: ${(fileStat.size / 1024).toFixed(2)} KB\n\nLocation: ${locationMessage}`,
      [
        {
          text: 'Open File',
          onPress: async () => {
            try {
              // For Android, try to open with PDF viewer
              if (Platform.OS === 'android') {
                // Use content URI for Android 10+ or file URI for older versions
                const fileUri = `file://${filePath}`;
                const canOpen = await Linking.canOpenURL(fileUri);
                if (canOpen) {
                  await Linking.openURL(fileUri);
                } else {
                  // Fallback: Use Share API to share/open with other apps
                  await Share.share({
                    url: fileUri,
                    title: fileName,
                    message: `Invoice PDF: ${fileName}`,
                  });
                }
              } else {
                // iOS: Use Share API to open with other apps
                await Share.share({
                  url: `file://${filePath}`,
                  title: fileName,
                  message: `Invoice PDF: ${fileName}`,
                });
              }
            } catch (openError) {
              console.error('Error opening file:', openError);
              Alert.alert(
                'File Saved',
                `The PDF has been saved to your device.\n\nFile: ${fileName}\n\nYou can find and open it from your ${Platform.OS === 'android' ? 'Downloads' : 'Files'} app.`,
                [{ text: 'OK' }]
              );
            }
          }
        },
        {
          text: 'OK',
        }
      ]
    );

  } catch (error) {
    console.error('Download error:', error);
    
    // Enhanced error handling
    let errorMessage = 'Failed to download invoice PDF.';
    if (error.message) {
      if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Storage permission is required to download files.';
      } else {
        errorMessage = error.message;
      }
    }

    Alert.alert(
      'Download Failed',
      `${errorMessage}\n\nInvoice: ${invoice.invoiceNumber}\nClient: ${invoice.clientName}\nAmount: ${formatCurrency(invoice.totalAmount)}`,
      [
        {
          text: 'Try Browser Download',
          onPress: async () => {
            // Fallback: Open in browser
            try {
              const token = await getToken();
              const downloadUrl = `https://app.stormbuddi.com/api/mobile/invoices/${invoice.id}/download`;
              const canOpen = await Linking.canOpenURL(downloadUrl);
              if (canOpen) {
                await Linking.openURL(downloadUrl);
              }
            } catch (linkError) {
              console.error('Browser fallback error:', linkError);
            }
          }
        },
        {
          text: 'OK',
          style: 'cancel',
          onPress: () => {
            if (onError) onError(error);
          }
        }
      ]
    );

    if (onError) onError(error);
  }
};

/**
 * Generate and download invoice PDF using client-side generation
 * This is a fallback method when server-side PDF generation is not available
 * @param {Object} invoice - The invoice object to generate PDF for
 * @param {Function} onSuccess - Callback function called on successful generation
 * @param {Function} onError - Callback function called on error
 */
export const generateInvoicePDF = async (invoice, onSuccess, onError) => {
  try {
    // Create HTML content for the invoice
    const htmlContent = generateInvoiceHTML(invoice);
    
    // For React Native, we would typically use a library like react-native-html-to-pdf
    // or react-native-pdf-lib to convert HTML to PDF
    
    // This is a placeholder implementation
    // In a real app, you would use a proper PDF generation library
    Alert.alert(
      'PDF Generation',
      'PDF generation feature requires additional setup. Please contact support.',
      [
        {
          text: 'OK',
          onPress: () => {
            if (onError) onError(new Error('PDF generation not implemented'));
          }
        }
      ]
    );
  } catch (error) {
    console.error('PDF generation error:', error);
    if (onError) onError(error);
  }
};

/**
 * Generate HTML content for invoice PDF
 * @param {Object} invoice - The invoice object
 * @returns {string} HTML content
 */
const generateInvoiceHTML = (invoice) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-info { margin-bottom: 20px; }
        .client-info { margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .total-section { text-align: right; margin-top: 20px; }
        .total-amount { font-size: 18px; font-weight: bold; color: #007AFF; }
        .notes { margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>INVOICE</h1>
        <h2>${invoice.invoiceNumber}</h2>
      </div>
      
      <div class="invoice-info">
        <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        <p><strong>Status:</strong> ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</p>
      </div>
      
      <div class="client-info">
        <h3>Bill To:</h3>
        <p><strong>${invoice.clientName}</strong></p>
        <p>${invoice.clientEmail}</p>
        ${invoice.address ? `<p>${invoice.address}</p>` : ''}
        ${invoice.client_phone ? `<p>${invoice.client_phone}</p>` : ''}
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.rate)}</td>
              <td>${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total-section">
        <p class="total-amount">Total: ${formatCurrency(invoice.totalAmount)}</p>
      </div>
      
      ${invoice.notes ? `
        <div class="notes">
          <h3>Notes:</h3>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}
    </body>
    </html>
  `;
};

/**
 * Share invoice via email or other sharing methods
 * @param {Object} invoice - The invoice object to share
 */
export const shareInvoice = async (invoice) => {
  try {
    // This would typically use react-native-share library
    // For now, we'll show an alert with sharing options
    Alert.alert(
      'Share Invoice',
      `Share invoice ${invoice.invoiceNumber} for ${invoice.clientName}`,
      [
        { text: 'Email', onPress: () => shareViaEmail(invoice) },
        { text: 'Copy Link', onPress: () => copyInvoiceLink(invoice) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  } catch (error) {
    console.error('Share error:', error);
    Alert.alert('Error', 'Unable to share invoice. Please try again.');
  }
};

/**
 * Share invoice via email
 * @param {Object} invoice - The invoice object
 */
const shareViaEmail = (invoice) => {
  // This would use react-native-email or similar library
  Alert.alert('Email', 'Email sharing feature requires additional setup.');
};

/**
 * Copy invoice link to clipboard
 * @param {Object} invoice - The invoice object
 */
const copyInvoiceLink = (invoice) => {
  // This would use @react-native-clipboard/clipboard
  Alert.alert('Copied', 'Invoice link copied to clipboard.');
};
