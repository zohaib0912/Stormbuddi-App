# Backend FCM Token Test Script

## Test Your Backend Endpoint

Use this cURL command to test your backend endpoint directly:

```bash
curl -X POST https://app.stormbuddi.com/api/mobile/fcm-token \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{
    "fcm_token": "test_fcm_token_12345",
    "device_type": "android"       
  }'
```

## Expected Response

**Success:**
```json
{
  "success": true,
  "message": "FCM token updated successfully",
  "data": {
    "fcm_token": "test_fcm_token_12345",
    "device_type": "android"
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "fcm_token": ["The fcm token field is required."]
  }
}
```

## Debugging Steps

### 1. Check if FCM Token is Generated
- Look for "FCM Token:" in your console logs
- The token should be a long string (usually 100+ characters)
- If token is null/empty, Firebase might not be configured properly

### 2. Check Backend Response
- Look for "FCM token updated successfully" in console
- Check the response data structure
- Verify the backend is actually saving to database

### 3. Check Database
- Open your database management tool
- Check the `users` table
- Look for `fcm_token` column
- Verify the token was saved for your user ID

### 4. Common Issues

**Issue 1: FCM Token is null**
- Firebase not configured properly
- Missing `google-services.json` (Android) or `GoogleService-Info.plist` (iOS)
- App not requesting notification permissions

**Issue 2: Backend responds with success but doesn't save**
- Database columns missing (`fcm_token`, `device_type`)
- User model not updated with fillable fields
- Database migration not run

**Issue 3: 404 Error**
- Route not defined in `routes/api.php`
- Controller method not implemented
- Middleware not working properly

## Quick Fixes

### If FCM Token is null:
1. Add Firebase configuration files
2. Request notification permissions
3. Check Firebase project setup

### If Backend doesn't save:
1. Run database migration:
   ```bash
   php artisan make:migration add_fcm_token_to_users_table
   ```
2. Update User model fillable fields
3. Check controller method implementation

### If 404 Error:
1. Add route to `routes/api.php`
2. Implement controller method
3. Check middleware configuration

## Test Component Usage

Add this to any screen to test:

```jsx
import FCMDebugTest from '../components/FCMDebugTest';

// In your component:
<FCMDebugTest />
```

This will help you identify exactly where the issue is occurring.
