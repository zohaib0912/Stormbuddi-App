# Push Notifications Setup Guide

## What We've Implemented

✅ **Installed React Native Firebase Messaging**
✅ **Configured Android manifest with permissions and services**
✅ **Configured iOS capabilities and AppDelegate**
✅ **Created NotificationService for handling notifications**
✅ **Created useNotifications hook for components**
✅ **Integrated notifications into main App component**
✅ **Created NotificationSettings component**

## Next Steps You Need to Complete

### 1. Firebase Project Setup (REQUIRED)

**Go to Firebase Console**: https://console.firebase.google.com/

1. **Create a new project** (or use existing)
2. **Add Android app**:
   - Package name: `com.stormbuddi`
   - App nickname: `StormBuddi Android`
   - Download `google-services.json` → Place in `android/app/`
3. **Add iOS app**:
   - Bundle ID: `org.reactjs.native.example.StormBuddi`
   - App nickname: `StormBuddi iOS`
   - Download `GoogleService-Info.plist` → Place in `ios/StormBuddi/`

### 2. iOS Setup (REQUIRED)

**Run CocoaPods**:
```bash
cd ios
pod install
```

**Enable Push Notifications in Xcode**:
1. Open `ios/StormBuddi.xcworkspace` in Xcode
2. Select your project → Signing & Capabilities
3. Click "+ Capability" → Add "Push Notifications"
4. Add "Background Modes" → Check "Remote notifications"

### 3. Android Build Configuration

**Update android/build.gradle** (Already done):
```gradle
dependencies {
    classpath("com.google.gms:google-services:4.4.0")
}
```

**Update android/app/build.gradle** (Already done):
```gradle
apply plugin: "com.google.gms.google-services"
```

### 4. Testing Push Notifications

#### Method 1: Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and text
4. Click "Send test message"
5. Enter your FCM token (check console logs)

#### Method 2: Using cURL
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "FCM_TOKEN_FROM_CONSOLE",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test message"
    }
  }'
```

### 5. Using Notifications in Your App

#### Add to Settings Screen:
```jsx
import NotificationSettings from '../components/NotificationSettings';

// In your Settings component:
<NotificationSettings />
```

#### Use the Hook in Any Component:
```jsx
import useNotifications from '../hooks/useNotifications';

const MyComponent = () => {
  const { fcmToken, isPermissionGranted, subscribeToTopic } = useNotifications();
  
  // Use notification features
};
```

### 6. Customizing Notifications

#### Send Notifications with Custom Data:
```json
{
  "to": "FCM_TOKEN",
  "notification": {
    "title": "New Appointment",
    "body": "You have a new appointment scheduled"
  },
  "data": {
    "type": "appointment",
    "id": "123",
    "screen": "Appointment"
  }
}
```

#### Handle Custom Data in NotificationService:
The service already handles custom data and can navigate to specific screens based on the `type` field.

## Troubleshooting

### Common Issues:

1. **"Firebase not configured" error**:
   - Make sure `google-services.json` is in `android/app/`
   - Make sure `GoogleService-Info.plist` is in `ios/StormBuddi/`

2. **iOS notifications not working**:
   - Check if Push Notifications capability is enabled in Xcode
   - Make sure you're testing on a real device (simulator doesn't support push notifications)

3. **Android notifications not showing**:
   - Check if notification permission is granted
   - Verify the notification channel is created

4. **FCM token is null**:
   - Check Firebase configuration files
   - Make sure the app has internet connection
   - Check console for error messages

## Testing Checklist

- [ ] Firebase project created and configured
- [ ] `google-services.json` added to Android
- [ ] `GoogleService-Info.plist` added to iOS
- [ ] iOS capabilities enabled in Xcode
- [ ] CocoaPods installed (`pod install`)
- [ ] App builds successfully on both platforms
- [ ] FCM token appears in console logs
- [ ] Test notification sent from Firebase Console
- [ ] Notification appears on device
- [ ] Notification tap navigates correctly

## Next Steps After Setup

1. **Backend Integration**: Set up your backend to send notifications using FCM
2. **User Preferences**: Allow users to customize notification settings
3. **Rich Notifications**: Add images, actions, and custom layouts
4. **Analytics**: Track notification open rates and engagement
5. **Scheduling**: Implement scheduled notifications for appointments

## Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all configuration files are in place
3. Test on real devices (not simulators)
4. Check Firebase Console for delivery status
