# Backend Setup for FCM Token Management

## ✅ Your Route Structure
Based on your existing route, you need to add the DELETE route as well:

```php
Route::middleware('mobile.auth')->group(function () {
    Route::post('fcm-token', 'Mobile\MobileAuthController@updateFCMToken');
    Route::delete('fcm-token', 'Mobile\MobileAuthController@removeFCMToken'); // Add this line
    Route::post('fcm-token/remove', 'Mobile\MobileAuthController@removeFCMToken'); // Optional fallback if DELETE isn't available
});
```

## 🔧 Required Backend Setup

### 1. Add the DELETE Route

You already have the POST route, just add the DELETE route to your existing `mobile.auth` middleware group.

> **Can't add DELETE?**  
> Temporarily register `Route::post('fcm-token/remove', ...)` so the app can fall back to a POST request when your server blocks DELETE requests (common on some shared hosts/proxies).

### 2. Update Your Controller Method

In your `MobileAuthController`, add the `removeFCMToken` method:

```php
<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class MobileAuthController extends Controller
{
    /**
     * Update FCM token for the authenticated user
     */
    public function updateFCMToken(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'fcm_token' => 'required|string|max:255',
                'device_type' => 'required|string|in:android,ios',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            
            // Update or create FCM token record
            $user->update([
                'fcm_token' => $request->fcm_token,
                'device_type' => $request->device_type,
                'last_token_update' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'FCM token updated successfully',
                'data' => [
                    'fcm_token' => $request->fcm_token,
                    'device_type' => $request->device_type,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update FCM token',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove FCM token for the authenticated user
     */
    public function removeFCMToken(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Clear FCM token
            $user->update([
                'fcm_token' => null,
                'device_type' => null,
                'last_token_update' => null,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'FCM token removed successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove FCM token',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
```

### 3. Database Migration (if needed)

If your users table doesn't have FCM token columns, create a migration:

```bash
php artisan make:migration add_fcm_token_to_users_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddFcmTokenToUsersTable extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('fcm_token')->nullable()->after('remember_token');
            $table->string('device_type')->nullable()->after('fcm_token');
            $table->timestamp('last_token_update')->nullable()->after('device_type');
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['fcm_token', 'device_type', 'last_token_update']);
        });
    }
}
```

### 4. Update User Model (if needed)

Add these fields to your User model's `$fillable` array:

```php
protected $fillable = [
    'name',
    'email',
    'password',
    'fcm_token',        // Add this
    'device_type',       // Add this
    'last_token_update', // Add this
];
```

## 🧪 Testing the Backend

### Test with cURL:

```bash
# Test FCM token update
curl -X POST https://app.stormbuddi.com/api/mobile/fcm-token \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{
    "fcm_token": "test_token_123",
    "device_type": "android"
  }'

# Test FCM token removal
curl -X DELETE https://app.stormbuddi.com/api/mobile/fcm-token \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Requested-With: XMLHttpRequest"
```

## 📱 Expected Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "FCM token updated successfully",
  "data": {
    "fcm_token": "dGhpcyBpcyBhIGZha2UgdG9rZW4...",
    "device_type": "android"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "fcm_token": ["The fcm token field is required."]
  }
}
```

## 🔍 Debugging Steps

1. **Check Route Registration:**
   ```bash
   php artisan route:list | grep fcm-token
   ```

2. **Test Route Exists:**
   ```bash
   php artisan route:list --path=api/mobile
   ```

3. **Check Controller Method:**
   Make sure both `updateFCMToken` and `removeFCMToken` methods exist in your `MobileAuthController`

4. **Verify Middleware:**
   Ensure the route is protected by your `mobile.auth` middleware

## 🚀 After Backend Setup

Once you've added the backend routes:

1. **Test the routes** using cURL or Postman
2. **Restart your Laravel server** if needed
3. **Test the mobile app** - the FCM token should now be stored successfully
4. **Check the database** to verify the FCM token is being saved

## 📋 Quick Checklist

- [ ] DELETE route added to existing `mobile.auth` group
- [ ] `removeFCMToken` method implemented in controller
- [ ] Database migration run (if needed)
- [ ] User model updated (if needed)
- [ ] Backend server restarted
- [ ] Routes tested with cURL
- [ ] Mobile app tested

The mobile app will now work correctly once you add the DELETE route and implement the `removeFCMToken` method!
