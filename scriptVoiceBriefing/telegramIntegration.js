/**
 * Telegram Integration Example
 * 
 * This script demonstrates how to integrate the voice briefing generator
 * with Telegram to send voice briefings to users
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { generateVoiceBriefing } = require('./voiceBriefingGenerator');
const { sampleEmails } = require('./sampleEmails');
const fs = require('fs');

// This is just an example - in a real implementation, you'd use the actual Telegram bot from the server
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'your_telegram_bot_token';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'your_chat_id';

/**
 * Send voice briefing to a Telegram chat
 * @param {string} chatId - Telegram chat ID
 * @param {Array} emails - Email array with the project schema
 * @returns {Promise<Object>} - Result object
 */
async function sendVoiceBriefingToTelegram(chatId, emails) {
    try {
        console.log(`Preparing voice briefing for chat ID ${chatId}...`);

        // Initialize bot
        const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

        // Send initial message
        await bot.sendMessage(chatId, 'Generating your email briefing, please wait...');

        // Generate voice briefing
        const audioFilePath = await generateVoiceBriefing(emails, {
            maxEmails: 6,
            fileName: `telegram_briefing_${Date.now()}.mp3`
        });

        if (!audioFilePath) {
            await bot.sendMessage(chatId, 'No critical or action emails to brief at this time.');
            return { success: true, status: 'no_emails' };
        }

        // Count emails by priority
        const criticalCount = emails.filter(e => e.priority === 'critical').length;
        const actionCount = emails.filter(e => e.priority === 'action').length;

        // Create caption for voice message
        const caption = `📧 Email Briefing\n\n` +
            `${criticalCount} critical emails\n` +
            `${actionCount} action emails`;

        // Send voice message
        await bot.sendVoice(chatId, audioFilePath, {
            caption: caption
        });

        console.log(`Voice briefing sent successfully to chat ID ${chatId}`);
        return { success: true, status: 'sent', audioFilePath };

    } catch (error) {
        console.error('Error sending voice briefing to Telegram:', error);
        return { success: false, error: error.message };
    }
}

// Example usage (if run directly)
if (require.main === module) {
    // Check if environment is properly configured
    if (TELEGRAM_BOT_TOKEN === 'your_telegram_bot_token' ||
        TELEGRAM_CHAT_ID === 'your_chat_id') {
        console.log(`
⚠️ This is just a demonstration script.

To actually send messages via Telegram:
1. Create a .env file with:
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   ELEVENLABS_API_KEY=your_elevenlabs_key
   ELEVENLABS_VOICE_ID=your_voice_id

2. Install the required dependency:
   npm install node-telegram-bot-api

For now, we'll just generate the voice file without sending it.
`);

        // Just generate the file in this case
        generateVoiceBriefing(sampleEmails)
            .then(filePath => {
                if (filePath) {
                    console.log(`Voice briefing generated at: ${filePath}`);
                    console.log('In a real implementation, this would be sent to Telegram.');
                }
            })
            .catch(console.error);

    } else {
        // Actually attempt to send if environment is configured
        sendVoiceBriefingToTelegram(TELEGRAM_CHAT_ID, sampleEmails)
            .then(result => {
                console.log('Operation result:', result);
            })
            .catch(console.error);
    }
}

module.exports = { sendVoiceBriefingToTelegram };