/**
 * Helper functions for Telegram verification
 */
const { verificationCodes } = require('./verificationCodes');
const { db, admin } = require('../config/firebase');

/**
 * Verify a telegram verification code and link the account
 * 
 * @param {String} code - The verification code entered by the user
 * @param {String|Number} telegramId - The Telegram user ID
 * @param {String|Number} chatId - The Telegram chat ID
 * @param {String} username - The Telegram username (optional)
 * @returns {Promise<Object>} - Result of the verification
 */
const verifyAndLinkTelegramAccount = async (code, telegramId, chatId, username) => {
  try {
    if (!code || !telegramId || !chatId) {
      return { 
        success: false,
        error: 'Code, telegramId and chatId are required'
      };
    }
    
    const verification = verificationCodes.get(code);
    
    if (!verification) {
      return { 
        success: false,
        error: 'Invalid verification code'
      };
    }
    
    if (new Date() > new Date(verification.expiresAt)) {
      // Clean up expired code
      verificationCodes.delete(code);
      
      return { 
        success: false,
        error: 'Verification code has expired'
      };
    }
    
    // Code is valid, get user from verification
    const uid = verification.uid;
    const userRef = db.collection('users').doc(uid);
    
    // Update user with Telegram information
    await userRef.update({
      'profile.telegramId': telegramId,
      'profile.telegramChatId': chatId,
      'profile.telegramUsername': username || null,
      'profile.notificationPreferences.telegram': true,
      'profile.updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Clean up used code
    verificationCodes.delete(code);
    
    return {
      success: true,
      error: null,
      email: verification.email
    };
  } catch (error) {
    console.error('Error in telegram verification:', error);
    return { 
      success: false,
      error: error.message 
    };
  }
};

/**
 * Verify if a code is valid (without linking the account)
 * 
 * @param {String} code - The verification code to check
 * @param {String} uid - The user ID to validate against (optional)
 * @returns {Object} - Result of the verification
 */
const checkVerificationCode = (code, uid = null) => {
  try {
    if (!code) {
      return {
        success: false,
        error: 'Verification code is required',
      };
    }

    const verification = verificationCodes.get(code);

    if (!verification) {
      return {
        success: false,
        error: 'Invalid verification code',
      };
    }

    if (uid && verification.uid !== uid) {
      return {
        success: false,
        error: 'Code is not valid for this user',
      };
    }

    if (new Date() > new Date(verification.expiresAt)) {
      verificationCodes.delete(code);
      return {
        success: false,
        error: 'Verification code has expired',
      };
    }

    return {
      success: true,
      message: 'Valid code',
      verification
    };
  } catch (error) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  verifyAndLinkTelegramAccount,
  checkVerificationCode
};