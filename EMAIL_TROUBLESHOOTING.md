# Email Not Sending - Troubleshooting Guide

## ✅ **API is Working Correctly**

Your API response shows:
- ✅ Success: `true`
- ✅ Message: "If the email address is registered, a password reset link has been sent."
- ✅ Data: Email and expiration time included

The issue is with **email sending configuration**, not the API or frontend.

## 🔧 **Laravel Email Configuration Issues**

### **1. Check Your Laravel `.env` File**

Make sure your email configuration is set up in your Laravel `.env` file:

```env
# Email Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME="StormBuddi"
```

### **2. Common Email Service Configurations**

#### **Gmail SMTP:**
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-app-password  # Use App Password, not regular password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-gmail@gmail.com
MAIL_FROM_NAME="StormBuddi"
```

#### **Outlook/Hotmail SMTP:**
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_USERNAME=your-email@outlook.com
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-email@outlook.com
MAIL_FROM_NAME="StormBuddi"
```

#### **Custom SMTP Server:**
```env
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-server.com
MAIL_PORT=587
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="StormBuddi"
```

### **3. Gmail App Password Setup**

If using Gmail, you need to create an **App Password**:

1. **Enable 2-Factor Authentication** on your Google account
2. **Go to Google Account Settings** → Security → App passwords
3. **Generate App Password** for "Mail"
4. **Use the App Password** (not your regular password) in `.env`

### **4. Test Email Configuration**

Create a test route in your Laravel `web.php` to test email:

```php
Route::get('/test-email', function () {
    try {
        Mail::raw('Test email from StormBuddi', function ($message) {
            $message->to('muhammadzohaib912@gmail.com')
                   ->subject('Test Email');
        });
        return 'Email sent successfully!';
    } catch (\Exception $e) {
        return 'Email failed: ' . $e->getMessage();
    }
});
```

Visit `https://app.stormbuddi.com/test-email` to test.

### **5. Check Laravel Logs**

Check your Laravel logs for email errors:

```bash
# In your Laravel project directory
tail -f storage/logs/laravel.log
```

Look for email-related errors when you try to send a password reset.

### **6. Alternative: Use Mailtrap for Testing**

For development/testing, you can use Mailtrap:

```env
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-mailtrap-username
MAIL_PASSWORD=your-mailtrap-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=test@stormbuddi.com
MAIL_FROM_NAME="StormBuddi"
```

### **7. Check Your Controller**

Make sure your `MobileAuthController@forgotPassword` method is actually calling the Mail facade:

```php
// In your MobileAuthController@forgotPassword method
try {
    Mail::send('emails.password-reset', [
        'token' => $token,
        'email' => $email
    ], function ($message) use ($email) {
        $message->to($email)
               ->subject('Reset Your StormBuddi Password');
    });
    
    \Log::info('Password reset email sent to: ' . $email);
} catch (\Exception $e) {
    \Log::error('Password reset email failed: ' . $e->getMessage());
    // Don't throw error - continue with success response
}
```

### **8. Create Email Template**

Make sure you have the email template at `resources/views/emails/password-reset.blade.php`:

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
            <a href="https://app.stormbuddi.com/reset-password?token={{$token}}" 
               style="background-color: #007AFF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
            </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
            https://app.stormbuddi.com/reset-password?token={{$token}}
        </p>
        
        <p><strong>Important:</strong></p>
        <ul>
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this password reset, please ignore this email</li>
            <li>For security reasons, this link can only be used once</li>
        </ul>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 14px;">
            This email was sent from StormBuddi. If you have any questions, please contact our support team.
        </p>
    </div>
</body>
</html>
```

## 🚀 **Quick Fix Steps:**

1. **Check your `.env` file** for email configuration
2. **Test email** using the test route above
3. **Check Laravel logs** for errors
4. **Create email template** if missing
5. **Use App Password** if using Gmail

## 📧 **Expected Result:**

Once configured correctly, you should receive an email at `muhammadzohaib912@gmail.com` with a password reset link.

Let me know what you find in the logs or if you need help with any specific email service configuration!
