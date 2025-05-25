const cron = require('node-cron');
const { db } = require('../config/firebase');
const { generateVoiceBriefing } = require('./voiceBriefingGenerator');
const telegramService = require('../services/telegramService');
const fs = require('fs');
const path = require('path');

// Log messages with timestamp
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Voice Briefing Cron: ${message}`);
};

/**
 * Get all users with Telegram integration enabled
 * @returns {Promise<Array>} Array of user objects with userId and telegramChatId
 */
async function getUsersWithTelegram() {
  try {
    const usersSnapshot = await db.collection('users')
      .where('profile.telegramChatId', '!=', null)
      .get();
    
    const users = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.profile && userData.profile.telegramChatId) {
        users.push({
          userId: doc.id,
          telegramChatId: userData.profile.telegramChatId,
          profile: userData.profile
        });
      }
    });
    
    log(`Found ${users.length} users with Telegram integration`);
    return users;
  } catch (error) {
    log(`Error fetching users with Telegram: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch messages from the last 12 hours for a specific user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of messages from the last 12 hours
 */
async function getMessagesFromLast12Hours(userId) {
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    
    const messagesSnapshot = await db.collection('messages')
      .doc(userId)
      .collection('userMessages')
      .where('timestamp', '>=', twelveHoursAgo)
      .orderBy('timestamp', 'desc')
      .get();
    
    const messages = [];
    messagesSnapshot.forEach(doc => {
      const messageData = doc.data();
      messages.push({
        id: doc.id,
        ...messageData
      });
    });
    
    log(`Found ${messages.length} messages from last 12 hours for user ${userId}`);
    return messages;
  } catch (error) {
    log(`Error fetching messages for user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Convert Firebase messages to email-like format for voice briefing generator
 * @param {Array} messages - Array of Firebase messages
 * @returns {Array} Array of email-like objects
 */
function convertMessagesToEmailFormat(messages) {
  return messages.map(message => ({
    id: message.id,
    subject: message.subject || message.title || 'No Subject',
    from: {
      name: message.senderName || message.from || 'Unknown Sender',
      email: message.senderEmail || message.fromEmail || 'unknown@example.com'
    },
    content: message.content || message.body || message.text || '',
    priority: message.priority || 'normal',
    timestamp: message.timestamp,
    type: 'message'
  }));
}

/**
 * Process voice briefing for a single user
 * @param {Object} user - User object with userId and telegramChatId
 * @returns {Promise<Object>} Result object with success status
 */
async function processUserVoiceBriefing(user) {
  try {
    log(`Processing voice briefing for user ${user.userId}...`);
    
    // Get messages from last 12 hours
    const messages = await getMessagesFromLast12Hours(user.userId);
    
    if (messages.length === 0) {
      log(`No messages found for user ${user.userId} in the last 12 hours`);
      return {
        success: true,
        userId: user.userId,
        messageCount: 0,
        briefingSent: false
      };
    }
    
    // Convert messages to email format for voice briefing generator
    const emailFormatMessages = convertMessagesToEmailFormat(messages);
    
    // Generate voice briefing with no email limit and increased voice speed
    const audioFilePath = await generateVoiceBriefing(emailFormatMessages, {
      maxEmails: messages.length, // No limit - use all messages
      fileName: `briefing_${user.userId}_${Date.now()}.mp3`,
      voiceSettings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 1.2 // Maximum allowed by ElevenLabs API
      }
    });
    
    if (!audioFilePath) {
      log(`No voice briefing generated for user ${user.userId} (no critical/action messages)`);
      return {
        success: true,
        userId: user.userId,
        messageCount: messages.length,
        briefingSent: false
      };
    }
    
    // Send voice briefing via Telegram
    const briefingText = `🎧 Your 12-hour briefing is ready! ${messages.length} messages processed.`;
    await telegramService.sendMP3ToUser(user.telegramChatId, audioFilePath, briefingText);
    
    log(`Voice briefing sent successfully to user ${user.userId}`);
    
    // Clean up audio file after sending
    try {
      fs.unlinkSync(audioFilePath);
      log(`Cleaned up audio file: ${audioFilePath}`);
    } catch (cleanupError) {
      log(`Warning: Could not clean up audio file ${audioFilePath}: ${cleanupError.message}`);
    }
    
    return {
      success: true,
      userId: user.userId,
      messageCount: messages.length,
      briefingSent: true
    };
    
  } catch (error) {
    log(`Error processing voice briefing for user ${user.userId}: ${error.message}`);
    return {
      success: false,
      userId: user.userId,
      error: error.message
    };
  }
}

/**
 * Main function to run the voice briefing job
 * @returns {Promise<Object>} Summary of the job execution
 */
async function runVoiceBriefingJob() {
  try {
    log('Starting 12-hour voice briefing job...');
    
    // Get all users with Telegram integration
    const users = await getUsersWithTelegram();
    
    if (users.length === 0) {
      log('No users with Telegram integration found');
      return {
        success: true,
        totalUsers: 0,
        processedUsers: 0,
        briefingsSent: 0,
        errors: []
      };
    }
    
    const results = [];
    let briefingsSent = 0;
    const errors = [];
    
    // Process each user sequentially to avoid rate limiting
    for (const user of users) {
      const result = await processUserVoiceBriefing(user);
      results.push(result);
      
      if (result.success && result.briefingSent) {
        briefingsSent++;
      } else if (!result.success) {
        errors.push(`User ${result.userId}: ${result.error}`);
      }
      
      // Add a small delay between users to be respectful to APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    log(`Voice briefing job completed. ${briefingsSent} briefings sent out of ${users.length} users`);
    
    return {
      success: true,
      totalUsers: users.length,
      processedUsers: results.length,
      briefingsSent,
      errors,
      results
    };
    
  } catch (error) {
    log(`Error in voice briefing job: ${error.message}`);
    throw error;
  }
}

/**
 * Standalone function to run the job directly for testing
 * @returns {Promise<Object>} Job execution result
 */
async function runJobDirectly() {
  try {
    log('Running voice briefing job directly for testing...');
    const result = await runVoiceBriefingJob();
    log('Job completed successfully:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    log(`Job failed: ${error.message}`);
    console.error(error);
    throw error;
  }
}

// Schedule the cron job to run every 12 hours (at 8 AM and 8 PM)
const scheduleVoiceBriefingJob = () => {
  // Cron expression: "0 8,20 * * *" = At minute 0 past hour 8 and 20 every day
  cron.schedule('0 8,20 * * *', async () => {
    try {
      await runVoiceBriefingJob();
    } catch (error) {
      log(`Cron job failed: ${error.message}`);
      console.error(error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });
  
  log('Voice briefing cron job scheduled to run every 12 hours at 8 AM and 8 PM UTC');
};

module.exports = {
  runVoiceBriefingJob,
  runJobDirectly,
  scheduleVoiceBriefingJob,
  getUsersWithTelegram,
  getMessagesFromLast12Hours,
  processUserVoiceBriefing
};

// If this file is run directly, execute the job for testing
if (require.main === module) {
  runJobDirectly()
    .then(() => {
      log('Direct job execution completed');
      process.exit(0);
    })
    .catch((error) => {
      log(`Direct job execution failed: ${error.message}`);
      process.exit(1);
    });
}
