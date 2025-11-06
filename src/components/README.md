# Reusable Components

This directory contains reusable UI components for the StormBuddi app.

## Components

### FileCard
A card component for displaying file information with action buttons.

**Props:**
- `fileName` (string): Name of the file
- `fileType` (string): Type of file (PDF, DOC, etc.)
- `onView` (function): Callback for view action
- `onDownload` (function): Callback for download action
- `onDelete` (function): Callback for delete action
- `showActions` (boolean): Whether to show action buttons

### UploadButton
A button component for file uploads with visual feedback.

**Props:**
- `title` (string): Button title
- `subtitle` (string): Button subtitle
- `supportedFormats` (string): Supported file formats text
- `onPress` (function): Callback for button press
- `isImageUpload` (boolean): Whether this is for image uploads

### ImageGallery
A gallery component for displaying images with delete functionality.

**Props:**
- `images` (array): Array of image objects with uri and name
- `onImageDelete` (function): Callback for image deletion
- `title` (string): Gallery title

### DataCard
A card component for displaying structured data with status badges.

**Props:**
- `title` (string): Card title
- `subtitle` (string): Card subtitle
- `details` (array): Array of detail strings
- `status` (string): Status badge text
- `onView` (function): Callback for view action
- `onDownload` (function): Callback for download action
- `onDelete` (function): Callback for delete action
- `showActions` (boolean): Whether to show action buttons

### SectionHeader
A header component for sections with optional edit button.

**Props:**
- `title` (string): Section title
- `onEdit` (function): Callback for edit action
- `showEdit` (boolean): Whether to show edit button

### InputField
A customizable input field component.

**Props:**
- `label` (string): Input label
- `placeholder` (string): Input placeholder
- `value` (string): Input value
- `onChangeText` (function): Callback for text changes
- `multiline` (boolean): Whether input is multiline
- `numberOfLines` (number): Number of lines for multiline input
- `style` (object): Additional styles

## Usage Example

```jsx
import FileCard from '../components/FileCard';
import UploadButton from '../components/UploadButton';

// In your component
<UploadButton
  title="Upload File"
  onPress={() => handleFileUpload()}
/>

<FileCard
  fileName="document.pdf"
  fileType="PDF"
  onView={() => handleView()}
  onDownload={() => handleDownload()}
  onDelete={() => handleDelete()}
/>
```
