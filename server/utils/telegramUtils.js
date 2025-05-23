/**
 * Telegram utility functions to easily send messages and files to users
 */
const telegramService = require('../services/telegramService');
const { db } = require('../config/firebase');

/**
 * Send an MP3 file to a user by Firebase UID
 * @param {string} uid - Firebase user ID
 * @param {string} filePath - Path to the MP3 file
 * @param {string} caption - Optional caption for the audio file
 * @returns {Promise<boolean>} - Whether the file was sent successfully
 */
const sendMP3ToUserByUid = async (uid, filePath, caption = '') => {
  try {
    // Get the user's Telegram chat ID from Firebase
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error(`User with UID ${uid} not found`);
      return false;
    }
    
    const userData = userDoc.data();
    const profile = userData.profile || {};
    
    // Check if the user has Telegram info
    if (!profile.telegramChatId) {
      console.error(`User with UID ${uid} has no Telegram chat ID`);
      return false;
    }
    
    // Check if Telegram notifications are enabled for this user
    if (profile.notificationPreferences && profile.notificationPreferences.telegram === false) {
      console.warn(`User ${uid} has Telegram notifications disabled`);
      return false;
    }
    
    // Send the MP3 file using the service
    return await telegramService.sendMP3ToUser(profile.telegramChatId, filePath, caption);
  } catch (error) {
    console.error('Error in sendMP3ToUserByUid:', error);
    return false;
  }
};

/**
 * Send an MP3 file to all subscribed Telegram users
 * @param {string} filePath - Path to the MP3 file
 * @returns {Promise<{success: number, failed: number}>} - Count of successful and failed sends
 */
const broadcastMP3 = async (filePath) => {
  try {
    // Get all users with Telegram notifications enabled
    const usersSnapshot = await db.collection('users')
      .where('profile.notificationPreferences.telegram', '==', true)
      .where('profile.telegramChatId', '!=', null)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('No users with Telegram notifications enabled');
      return { success: 0, failed: 0 };
    }
    
    const results = {
      success: 0,
      failed: 0
    };
    
    // Send MP3 to each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const success = await telegramService.sendMP3ToUser(
        userData.profile.telegramChatId, 
        filePath
      );
      
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error broadcasting MP3:', error);
    return { success: 0, failed: error.message };
  }
};

/**
 * Send a document to a user by Firebase UID
 * @param {string} uid - Firebase user ID
 * @param {string} filePath - Path to the file
 * @param {string} caption - Optional caption for the document
 * @returns {Promise<boolean>} - Whether the file was sent successfully
 */
const sendDocumentToUserByUid = async (uid, filePath, caption = '') => {
  try {
    // Get the user's Telegram chat ID from Firebase
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error(`User with UID ${uid} not found`);
      return false;
    }
    
    const userData = userDoc.data();
    const profile = userData.profile || {};
    
    // Check if the user has Telegram info
    if (!profile.telegramChatId) {
      console.error(`User with UID ${uid} has no Telegram chat ID`);
      return false;
    }
    
    // Send the document using the service
    return await telegramService.sendDocumentToUser(profile.telegramChatId, filePath, caption);
  } catch (error) {
    console.error('Error in sendDocumentToUserByUid:', error);
    return false;
  }
};

/**
 * Send a text message to a user by Firebase UID
 * @param {string} uid - Firebase user ID
 * @param {string} message - Message text to send
 * @param {Object} options - Additional options for the message
 * @returns {Promise<boolean>} - Whether the message was sent successfully
 */
const sendMessageToUserByUid = async (uid, message, options = {}) => {
  try {
    // Get the user's Telegram chat ID from Firebase
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error(`User with UID ${uid} not found`);
      return false;
    }
    
    const userData = userDoc.data();
    const profile = userData.profile || {};
    
    // Check if the user has Telegram info
    if (!profile.telegramChatId) {
      console.error(`User with UID ${uid} has no Telegram chat ID`);
      return false;
    }
    
    // Check if Telegram notifications are enabled
    if (profile.notificationPreferences && profile.notificationPreferences.telegram === false) {
      console.warn(`User ${uid} has Telegram notifications disabled`);
      return false;
    }
    
    // Send the message
    await telegramService.bot.sendMessage(profile.telegramChatId, message, options);
    return true;
  } catch (error) {
    console.error('Error in sendMessageToUserByUid:', error);
    return false;
  }
};

module.exports = {
  sendMP3ToUserByUid,
  sendDocumentToUserByUid,
  sendMessageToUserByUid,
  broadcastMP3
};
