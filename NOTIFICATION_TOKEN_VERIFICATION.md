# NotificationToken Table Verification

## ✅ Your Setup
You have a separate `notificationToken` table with `user_id` column - this is the correct approach!

## 🔍 How It Works

### Frontend Sends:
```json
{
  "fcm_token": "dGhpcyBpcyBhIGZha2UgdG9rZW4...",
  "device_type": "android"
}
```

### Backend Should:
1. Get `user_id` from the authenticated user (from the Bearer token)
2. Insert/update record in `notificationToken` table:
   ```sql
   INSERT INTO notificationToken (user_id, fcm_token, device_type, created_at, updated_at)
   VALUES (1, 'dGhpcyBpcyBhIGZha2UgdG9rZW4...', 'android', NOW(), NOW())
   ON DUPLICATE KEY UPDATE 
   fcm_token = VALUES(fcm_token),
   device_type = VALUES(device_type),
   updated_at = NOW()
   ```

## 🧪 Testing Steps

### 1. Check Console Logs
When you login, you should see:
```
Sending FCM token to backend: dGhpcyBpcyBhIGZha2UgdG9rZW4...
Device type: android
FCM token length: 163
Request data: {fcm_token: "...", device_type: "android"}
Sending to notificationToken table with user_id from auth token
FCM token updated successfully: {success: true, message: 'FCM token updated successfully'}
```

### 2. Check Database
Query your `notificationToken` table:
```sql
SELECT * FROM notificationToken WHERE user_id = 1;
```

You should see:
- `user_id`: 1 (your user ID)
- `fcm_token`: The actual FCM token
- `device_type`: "android"
- `created_at`/`updated_at`: Timestamps

### 3. Use Debug Component
Add this to any screen:
```jsx
import FCMDebugTest from '../components/FCMDebugTest';

// In your component:
<FCMDebugTest />
```

## 🔧 If FCM Token is Not Saving

### Check Backend Controller
Your `updateFCMToken` method should look like:
```php
public function updateFCMToken(Request $request)
{
    $user = Auth::user();
    
    // Insert or update in notificationToken table
    DB::table('notificationToken')->updateOrInsert(
        ['user_id' => $user->id],
        [
            'fcm_token' => $request->fcm_token,
            'device_type' => $request->device_type,
            'updated_at' => now(),
            'created_at' => now()
        ]
    );
    
    return response()->json([
        'success' => true,
        'message' => 'FCM token updated successfully'
    ]);
}
```

### Check Database Table Structure
```sql
DESCRIBE notificationToken;
```

Should have columns:
- `id` (primary key)
- `user_id` (foreign key to users table)
- `fcm_token` (text/varchar)
- `device_type` (varchar)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## 🚀 Next Steps

1. **Login to your app** and check the new debug logs
2. **Check your database** to see if the FCM token is being saved
3. **Use the debug component** to test step by step
4. **Verify the notificationToken table** has the correct structure

The frontend is now properly configured to work with your notificationToken table structure!
