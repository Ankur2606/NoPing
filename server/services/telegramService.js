const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const fetch = require('node-fetch');
const { db, admin } = require('../config/firebase');
const { verificationCodes } = require('../utils/verificationCodes');
const { verifyAndLinkTelegramAccount, checkVerificationCode } = require('../utils/telegramVerificationHelpers');

/**
 * Telegram Bot Service
 * This service handles Telegram bot functionality, including:
 * - User registration via /start command
 * - Sending MP3 files to users
 */
class TelegramService {
  constructor() {
    // Check if the API token is available
    if (!process.env.TELEGRAM_BOT_API_KEY) {
      console.error('TELEGRAM_BOT_API_KEY is not defined in the environment variables');
      return;
    }

    // Create a bot instance
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_API_KEY, { polling: false });
    this.setupCommandHandlers();
    console.log('Telegram bot service initialized');
  }

  /**
   * Set up command handlers for the bot
   */
  setupCommandHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const username = msg.from.username || 'User';
        
        // Save the user's chat ID to Firebase
        await this.saveTelegramUser(msg.from.id, chatId, username);
        
        // Reply to the user
        this.bot.sendMessage(chatId, `Hi @${username}, you're now subscribed!`);
      } catch (error) {
        console.error('Error handling /start command:', error);
      }
    });
        
    // Handle /status command to check account linkage
    this.bot.onText(/\/status/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = msg.from.id;
        
        // Check if this Telegram user is linked to a Firebase user
        const usersSnapshot = await db.collection('users')
          .where('profile.telegramId', '==', telegramId)
          .limit(1)
          .get();
        
        if (usersSnapshot.empty) {
          this.bot.sendMessage(
            chatId,
            `Your Telegram account is not linked to FlowSync. Please use /link your@email.com to connect your accounts.`
          );
          return;
        }
        
        const userData = usersSnapshot.docs[0].data();
        const profile = userData.profile || {};
        
        // Send user info
        this.bot.sendMessage(
          chatId,
          `✅ Account Status: Linked\n` + 
          `📧 Email: ${profile.email || 'Unknown'}\n` +
          `👤 Name: ${profile.displayName || 'Unknown'}\n` +
          `🔔 Telegram Notifications: ${profile.notificationPreferences?.telegram ? 'Enabled' : 'Disabled'}\n\n` +
          `Use /help to see available commands.`
        );
      } catch (error) {
        console.error('Error handling /status command:', error);
        this.bot.sendMessage(msg.chat.id, 'An error occurred while checking your account status. Please try again later.');
      }
    });
    
    // Handle /verify command for secure verification with both code and email
    this.bot.onText(/\/verify\s+(\S+)\s+(\S+@\S+)/, async (msg, match) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = msg.from.id;
        const username = msg.from.username;
        const code = match[1].trim();
        const email = match[2].trim();
        
        console.log(`Verifying code: ${code} for user: ${username} (ID: ${telegramId}) with email: ${email}`);
        
        try {
          // Use the helper function with email parameter
          const result = await verifyAndLinkTelegramAccount(code, telegramId, chatId, username, email);
          
          if (result.success) {
            this.bot.sendMessage(
              chatId, 
              `✅ *Verification Successful!*\n\nYour Telegram account has been linked to FlowSync account with email: ${result.email}\n\nYou will now receive notifications through Telegram.`,
              { parse_mode: 'Markdown' }
            );
            console.log(`User ${username} (ID: ${telegramId}) successfully linked with email: ${result.email}`);
          } else {
            this.bot.sendMessage(
              chatId,
              `❌ Verification failed: ${result.error || 'Unknown error'}\n\nPlease try again with a new code.`
            );
            console.log(`Verification failed for user ${username}: ${result.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error during verification:', error);
          this.bot.sendMessage(
            chatId, 
            `⚠️ Error verifying code: ${error.message}\n\nPlease try again later or contact support if the issue persists.`
          );
        }
      } catch (error) {
        console.error('Error handling /verify command:', error);
        this.bot.sendMessage(msg.chat.id, 'An error occurred processing your verification code. Please try again.');
      }
    });
    

    // Update help command to include the new verification format
    this.bot.onText(/\/help/, (msg) => {
      const helpText = 
        "🤖 *FlowSync Telegram Bot* 🤖\n\n" +
        "Available commands:\n\n" +
        "/start - Subscribe to notifications\n" +
        "/verify CODE - Link your account using a verification code from the web app\n" +
        "/verify CODE EMAIL - Link your account using a verification code and email\n" +
        "/status - Check your account linkage status\n" +
        "/help - Show this help message\n\n" +
        "Once linked, you'll receive notifications and audio files from FlowSync.";
      
      this.bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
    });
  }

  /**
   * Save a Telegram user to Firebase
   * @param {number} userId - Telegram user ID
   * @param {number} chatId - Telegram chat ID
   * @param {string} username - Telegram username
   * @returns {Promise<void>}
   */
  async saveTelegramUser(userId, chatId, username) {
    try {
      // Check if there is a user with Telegram ID
      const telegramUsersSnapshot = await db.collection('telegramUsers').where('telegramId', '==', userId).get();
      
      if (!telegramUsersSnapshot.empty) {
        // User exists, update the chat ID
        const telegramUserDoc = telegramUsersSnapshot.docs[0];
        await telegramUserDoc.ref.update({
          chatId,
          username,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Updated Telegram user ${username} with chatId ${chatId}`);
        return;
      }
      
      // New user, create record
      await db.collection('telegramUsers').add({
        telegramId: userId,
        chatId,
        username,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Added new Telegram user ${username} with chatId ${chatId}`);
    } catch (error) {
      console.error('Error saving Telegram user:', error);
      throw error;
    }
  }

  /**
   * Link a Telegram user to a Firebase user by email
   * @param {string} email - Email of the Firebase user
   * @param {number} telegramId - Telegram user ID
   * @param {number} chatId - Telegram chat ID
   * @param {string} username - Telegram username
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async linkUserByEmail(email, telegramId, chatId, username) {
    try {
      // Find Firebase user by email
      const usersSnapshot = await db.collection('users')
        .where('profile.email', '==', email)
        .limit(1)
        .get();
      
      if (usersSnapshot.empty) {
        return { 
          success: false, 
          error: 'No user found with this email address. Please make sure you have registered on FlowSync.' 
        };
      }
      
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      
      // Update user with Telegram information
      await userDoc.ref.update({
        'profile.telegramId': telegramId,
        'profile.telegramChatId': chatId,
        'profile.telegramUsername': username,
        'profile.notificationPreferences.telegram': true,
        'profile.updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Make sure we have an entry in telegramUsers collection too
      await this.saveTelegramUser(telegramId, chatId, username);
      
      console.log(`Linked Telegram user ${username} with FirebaseUser ${email}`);
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error linking Telegram user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send an MP3 file to a specific Telegram user
   * @param {number} chatId - Telegram chat ID
   * @param {string} filePath - Path to the MP3 file
   * @param {string} caption - Optional caption for the audio file
   * @returns {Promise<boolean>} - Whether the file was sent successfully
   */
  async sendMP3ToUser(chatId, filePath, caption = '') {
    try {
      if (!chatId) {
        console.error('No chat ID provided for sending MP3');
        return false;
      }
      
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return false;
      }
      
      // Create a readable stream for the file
      const fileStream = fs.createReadStream(filePath);
      
      // Get the file name from the path
      const fileName = filePath.split('/').pop() || 'audio.mp3';
      
      // Send the audio file with optional caption
      await this.bot.sendAudio(chatId, fileStream, {
        caption: caption || undefined,
        filename: fileName,
        parse_mode: 'Markdown'
      });
      
      console.log(`MP3 file sent to chatId ${chatId}`);
      return true;
    } catch (error) {
      console.error(`Error sending MP3 file to chatId ${chatId}:`, error);
      
      // Try sending an error message to the user
      try {
        await this.bot.sendMessage(
          chatId, 
          '⚠️ There was an error sending the audio file. Please try again later.'
        );
      } catch (msgError) {
        console.error('Could not send error message to user:', msgError);
      }
      
      return false;
    }
  }
  
  /**
   * Send a document file to a specific Telegram user
   * @param {number} chatId - Telegram chat ID
   * @param {string} filePath - Path to the file
   * @param {string} caption - Optional caption for the document
   * @returns {Promise<boolean>} - Whether the file was sent successfully
   */
  async sendDocumentToUser(chatId, filePath, caption = '') {
    try {
      if (!chatId) {
        console.error('No chat ID provided for sending document');
        return false;
      }
      
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return false;
      }
      
      // Create a readable stream for the file
      const fileStream = fs.createReadStream(filePath);
      
      // Get the file name from the path
      const fileName = filePath.split('/').pop() || 'document';
      
      // Send the document
      await this.bot.sendDocument(chatId, fileStream, {
        caption: caption || undefined,
        filename: fileName,
        parse_mode: 'Markdown'
      });
      
      console.log(`Document sent to chatId ${chatId}`);
      return true;
    } catch (error) {
      console.error(`Error sending document to chatId ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Find a user by their Firebase UID and send them an MP3 file
   * @param {string} uid - Firebase user ID
   * @param {string} filePath - Path to the MP3 file 
   * @returns {Promise<boolean>} - Whether the file was sent successfully
   */
  async sendMP3ToUserByUid(uid, filePath) {
    try {
      // Get the user from Firebase
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.error(`User with UID ${uid} not found`);
        return false;
      }
      
      const userData = userDoc.data();
      
      // Check if the user has a telegramId
      if (!userData.telegramId) {
        console.error(`User with UID ${uid} has no associated Telegram ID`);
        return false;
      }
      
      // Find the Telegram user info
      const telegramUsersSnapshot = await db.collection('telegramUsers')
        .where('telegramId', '==', userData.telegramId)
        .get();
      
      if (telegramUsersSnapshot.empty) {
        console.error(`No Telegram user found for telegramId ${userData.telegramId}`);
        return false;
      }
      
      const telegramUserData = telegramUsersSnapshot.docs[0].data();
      
      // Send the MP3 file
      return await this.sendMP3ToUser(telegramUserData.chatId, filePath);
    } catch (error) {
      console.error('Error sending MP3 to user by UID:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
const telegramService = new TelegramService();
module.exports = telegramService;
