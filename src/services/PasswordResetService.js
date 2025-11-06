/**
 * Password Reset Service
 * Handles all password reset related API calls
 */

class PasswordResetService {
  constructor() {
    this.baseURL = 'https://app.stormbuddi.com/api/mobile/auth';
  }

  /**
   * Send password reset email
   * @param {string} email - User's email address
   * @returns {Promise<Object>} API response
   */
  async sendPasswordResetEmail(email) {
    try {
      const response = await fetch(`${this.baseURL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send password reset email');
      }

      return {
        success: true,
        message: data.message || 'Password reset email sent successfully',
        data: data.data || null,
      };
    } catch (error) {
      console.error('Password reset email error:', error);
      
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  /**
   * Reset password using token
   * @param {string} token - Password reset token
   * @param {string} password - New password
   * @param {string} confirmPassword - Password confirmation
   * @returns {Promise<Object>} API response
   */
  async resetPassword(token, password, confirmPassword) {
    try {
      const response = await fetch(`${this.baseURL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          password: password,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to reset password');
      }

      return {
        success: true,
        message: data.message || 'Password reset successfully',
        data: data.data || null,
      };
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  /**
   * Validate password reset token
   * @param {string} token - Password reset token
   * @returns {Promise<Object>} API response
   */
  async validateResetToken(token) {
    try {
      const response = await fetch(`${this.baseURL}/validate-reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Invalid or expired token');
      }

      return {
        success: true,
        message: data.message || 'Token is valid',
        data: data.data || null,
      };
    } catch (error) {
      console.error('Token validation error:', error);
      
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  /**
   * Resend password reset email
   * @param {string} email - User's email address
   * @returns {Promise<Object>} API response
   */
  async resendPasswordResetEmail(email) {
    try {
      const response = await fetch(`${this.baseURL}/resend-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to resend password reset email');
      }

      return {
        success: true,
        message: data.message || 'Password reset email resent successfully',
        data: data.data || null,
      };
    } catch (error) {
      console.error('Resend password reset email error:', error);
      
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      
      throw error;
    }
  }
}

// Create and export a singleton instance
const passwordResetService = new PasswordResetService();
export default passwordResetService;
