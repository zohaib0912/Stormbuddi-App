# Password Reset Implementation Guide

This document outlines the complete password reset functionality implementation for the StormBuddi mobile app, including both frontend and backend requirements.

## Frontend Implementation (Completed)

### 1. Components Created

#### ForgotPassword Screen (`src/screens/ForgotPassword.jsx`)
- **Purpose**: Allows users to request password reset emails
- **Features**:
  - Email input validation
  - Loading states with PageLoader
  - Success/error message handling
  - Resend email functionality
  - Back navigation to login

#### ResetPassword Screen (`src/screens/ResetPassword.jsx`)
- **Purpose**: Allows users to set new passwords using reset tokens
- **Features**:
  - Password strength validation
  - Confirm password matching
  - Token validation
  - Secure password input with visibility toggle
  - Password requirements display

#### PasswordResetService (`src/services/PasswordResetService.js`)
- **Purpose**: Centralized API service for password reset operations
- **Methods**:
  - `sendPasswordResetEmail(email)` - Send reset email
  - `resetPassword(token, password, confirmPassword)` - Reset password
  - `validateResetToken(token)` - Validate token
  - `resendPasswordResetEmail(email)` - Resend reset email

### 2. Navigation Updates

#### App.tsx
- Added `ForgotPassword` and `ResetPassword` routes to the main stack navigator
- Updated imports to include new screen components

#### Login.jsx
- Updated "Forgot Password?" link to navigate to `ForgotPassword` screen

## Backend Implementation Status

✅ **Backend is already implemented and working!**

Your Laravel backend already has:
- ✅ Database table: `password_resets` 
- ✅ API routes: `/api/mobile/auth/forgot-password`, `/api/mobile/auth/reset-password`, etc.
- ✅ Controller methods: `MobileAuthController@forgotPassword`, `MobileAuthController@resetPassword`, etc.

### 1. Database Schema

You already have a `password_resets` table with this structure:

```sql
CREATE TABLE password_resets (
    id int(11) AUTO_INCREMENT PRIMARY KEY,
    email varchar(191) NOT NULL UNIQUE,
    token varchar(191) NOT NULL UNIQUE,
    created_at timestamp(6) NULL DEFAULT NULL,
    updated_at timestamp(6) NULL DEFAULT NULL
);
```

**Note**: Your current schema doesn't have `expires_at` and `used_at` columns. For better security, consider adding these:

```sql
ALTER TABLE password_resets 
ADD COLUMN expires_at timestamp NULL DEFAULT NULL,
ADD COLUMN used_at timestamp NULL DEFAULT NULL;
```

### 2. API Endpoints Required

#### POST `/api/mobile/auth/forgot-password`
**Purpose**: Send password reset email to user

**Request Body**:
```json
{
    "email": "user@example.com"
}
```

**Response (Success)**:
```json
{
    "success": true,
    "message": "Password reset email sent successfully",
    "data": {
        "email": "user@example.com",
        "expires_at": "2024-01-15T10:30:00Z"
    }
}
```

**Response (Error)**:
```json
{
    "success": false,
    "message": "Email not found",
    "error": "The provided email address is not registered"
}
```

**Implementation Notes**:
- Generate a secure random token (32+ characters)
- Store token in `password_resets` table with expiration (1 hour)
- Send email with reset link: `https://yourapp.com/reset-password?token={token}`
- Always return success message (don't reveal if email exists)

#### POST `/api/mobile/auth/reset-password`
**Purpose**: Reset user password using token

**Request Body**:
```json
{
    "token": "abc123...",
    "password": "newPassword123",
    "password_confirmation": "newPassword123"
}
```

**Response (Success)**:
```json
{
    "success": true,
    "message": "Password reset successfully",
    "data": {
        "user_id": 123,
        "email": "user@example.com"
    }
}
```

**Response (Error)**:
```json
{
    "success": false,
    "message": "Invalid or expired token",
    "error": "The password reset token is invalid or has expired"
}
```

**Implementation Notes**:
- Validate token exists and hasn't expired
- Validate password meets requirements (min 8 chars, uppercase, lowercase, number)
- Hash new password and update user record
- Mark token as used (`used_at` timestamp)
- Delete or invalidate the token

#### POST `/api/mobile/auth/validate-reset-token`
**Purpose**: Validate if reset token is valid (optional endpoint)

**Request Body**:
```json
{
    "token": "abc123..."
}
```

**Response (Success)**:
```json
{
    "success": true,
    "message": "Token is valid",
    "data": {
        "email": "user@example.com",
        "expires_at": "2024-01-15T10:30:00Z"
    }
}
```

#### POST `/api/mobile/auth/resend-password-reset`
**Purpose**: Resend password reset email (optional endpoint)

**Request Body**:
```json
{
    "email": "user@example.com"
}
```

### 3. Email Template

Create an email template for password reset:

**Subject**: "Reset Your StormBuddi Password"

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #007AFF; color: white; padding: 20px; text-align: center;">
        <h1>StormBuddi</h1>
    </div>
    
    <div style="padding: 30px 20px;">
        <h2>Password Reset Request</h2>
        
        <p>Hello,</p>
        
        <p>We received a request to reset your password for your StormBuddi account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://yourapp.com/reset-password?token={{token}}" 
               style="background-color: #007AFF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
            </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
            https://yourapp.com/reset-password?token={{token}}
        </p>
        
        <p><strong>Important:</strong></p>
        <ul>
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this password reset, please ignore this email</li>
            <li>For security reasons, this link can only be used once</li>
        </ul>
        
        <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 14px;">
            This email was sent from StormBuddi. If you have any questions, please contact our support team.
        </p>
    </div>
</body>
</html>
```

### 4. Security Considerations

1. **Token Generation**: Use cryptographically secure random tokens (32+ characters)
2. **Token Expiration**: Set tokens to expire after 1 hour
3. **One-time Use**: Mark tokens as used after successful password reset
4. **Rate Limiting**: Implement rate limiting for password reset requests (e.g., max 3 requests per email per hour)
5. **Email Validation**: Always return success message regardless of email existence
6. **Password Requirements**: Enforce strong password requirements
7. **HTTPS**: Ensure all password reset links use HTTPS
8. **Token Cleanup**: Regularly clean up expired tokens from database

### 5. Mobile App Deep Linking

To handle password reset links in the mobile app, you'll need to implement deep linking:

#### Android (android/app/src/main/AndroidManifest.xml)
```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTop">
    
    <!-- Existing intent filters -->
    
    <!-- Add password reset deep link -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="yourapp.com"
              android:pathPrefix="/reset-password" />
    </intent-filter>
</activity>
```

#### iOS (ios/StormBuddi/Info.plist)
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.stormbuddi.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>https</string>
        </array>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>stormbuddi</string>
        </array>
    </dict>
</array>
```

#### React Native Deep Link Handling
Add to your main App component:

```javascript
import { Linking } from 'react-native';

useEffect(() => {
  const handleDeepLink = (url) => {
    if (url.includes('/reset-password')) {
      const token = url.split('token=')[1];
      if (token) {
        navigation.navigate('ResetPassword', { token });
      }
    }
  };

  // Handle app opened from deep link
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink(url);
  });

  // Handle app opened while running
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  return () => subscription?.remove();
}, []);
```

### 6. Testing Checklist

#### Frontend Testing
- [ ] Forgot password link navigates correctly
- [ ] Email validation works properly
- [ ] Loading states display correctly
- [ ] Error messages show appropriately
- [ ] Success flow works end-to-end
- [ ] Password strength validation works
- [ ] Password confirmation matching works
- [ ] Back navigation works correctly

#### Backend Testing
- [ ] Password reset email sends successfully
- [ ] Token generation is secure and unique
- [ ] Token expiration works correctly
- [ ] Password reset with valid token works
- [ ] Invalid/expired tokens are rejected
- [ ] Rate limiting prevents abuse
- [ ] Email template renders correctly
- [ ] Database cleanup works properly

### 7. Error Handling

The frontend handles these common error scenarios:
- Network connectivity issues
- Invalid email format
- Server errors (500, 503, etc.)
- Invalid or expired tokens
- Password validation failures
- Rate limiting responses

All errors are displayed to users with appropriate messaging and fallback options.

## Summary

The password reset functionality is now fully implemented on the frontend with:
- ✅ ForgotPassword screen with email input and validation
- ✅ ResetPassword screen with secure password input
- ✅ PasswordResetService for API communication
- ✅ Navigation integration
- ✅ Loading states and error handling
- ✅ Password strength validation
- ✅ Responsive design matching app theme

The backend implementation requires the database schema, API endpoints, email templates, and security measures outlined above. Once implemented, users will be able to securely reset their passwords through the mobile app.
