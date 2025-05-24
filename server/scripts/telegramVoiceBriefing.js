/**
 * Telegram Voice Briefing Integration
 * 
 * This script provides integration between the voice briefing generator
 * and the existing Telegram bot, adding a /briefing command.
 */

// Load environment variables from server root
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const TelegramBot = require('node-telegram-bot-api');
const { generateVoiceBriefing } = require('./voiceBriefingGenerator');
const { db, admin } = require('../config/firebase');
const path = require('path');
const fs = require('fs');

// This function should be called from the main bot initialization
function addVoiceBriefingCommands(bot) {
    if (!bot) {
        throw new Error('Bot instance is required');
    }

    // Handle /briefing command
    bot.onText(/\/briefing/, async(msg) => {
        try {
            const chatId = msg.chat.id;
            const telegramId = msg.from.id;

            console.log(`Received /briefing command from Telegram user ${msg.from.username || msg.from.id}`);

            // Find user by Telegram ID
            const usersSnapshot = await db.collection('users')
                .where('profile.telegramId', '==', telegramId)
                .limit(1)
                .get();

            if (usersSnapshot.empty) {
                bot.sendMessage(chatId, 'Your Telegram account is not linked to FlowSync. Use /link your@email.com to link your account.');
                return;
            }

            const userDoc = usersSnapshot.docs[0];
            const userId = userDoc.id;

            // Send initial message
            await bot.sendMessage(chatId, '🔊 Generating your voice briefing, please wait...');

            // Get user's emails from the last 24 hours
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const messagesSnapshot = await db.collection('messages')
                .where('userId', '==', userId)
                .where('timestamp', '>=', yesterday)
                .where('priority', 'in', ['critical', 'action'])
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            if (messagesSnapshot.empty) {
                bot.sendMessage(chatId, 'No critical or action emails found in the last 24 hours.');
                return;
            }

            // Convert Firestore documents to email objects
            const emails = messagesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id
                };
            });

            console.log(`Found ${emails.length} important emails for user ${userId}`);

            // Generate voice briefing
            const fileName = `briefing_${userId}_${Date.now()}.mp3`;
            const audioFilePath = await generateVoiceBriefing(emails, { fileName });

            if (!audioFilePath) {
                bot.sendMessage(chatId, 'Sorry, I could not generate a voice briefing at this time.');
                return;
            }

            // Count emails by priority
            const criticalCount = emails.filter(e => e.priority === 'critical').length;
            const actionCount = emails.filter(e => e.priority === 'action').length;

            // Create caption
            const caption = `📧 Email Briefing\n\n${criticalCount} critical, ${actionCount} action emails`;

            // Send voice message
            await bot.sendVoice(chatId, audioFilePath, { caption });
            console.log(`Sent voice briefing to user ${userId}`);

            // Mark emails as read (optional)
            // This part can be commented out if you don't want to mark emails as read automatically
            for (const doc of messagesSnapshot.docs) {
                await doc.ref.update({
                    read: true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // Optionally clean up old audio files
            cleanupOldAudioFiles();

        } catch (error) {
            console.error('Error handling /briefing command:', error);
            try {
                bot.sendMessage(msg.chat.id, 'An error occurred while generating your briefing. Please try again later.');
            } catch (sendError) {
                console.error('Failed to send error message:', sendError);
            }
        }
    });

    // Handle /briefing_help command
    bot.onText(/\/briefing_help/, (msg) => {
        const helpText =
            "🔊 *Voice Briefing Commands* 🔊\n\n" +
            "/briefing - Get a voice summary of your critical and action emails\n" +
            "/briefing_help - Show this help message\n\n" +
            "The voice briefing summarizes your important emails and delivers them as an audio message.";

        bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
    });

    console.log('Voice briefing commands registered with Telegram bot');
}

/**
 * Clean up old audio files (older than 24 hours)
 */
function cleanupOldAudioFiles() {
    try {
        const mp3Dir = path.join(__dirname, '..', 'mp3');

        if (!fs.existsSync(mp3Dir)) {
            return;
        }

        const files = fs.readdirSync(mp3Dir);
        const now = Date.now();
        const yesterday = now - (24 * 60 * 60 * 1000);

        let cleanedCount = 0;

        for (const file of files) {
            if (file.startsWith('briefing_') && file.endsWith('.mp3')) {
                const filePath = path.join(mp3Dir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtimeMs < yesterday) {
                    fs.unlinkSync(filePath);

                    // Also remove the text file if it exists
                    const textFilePath = filePath.replace('.mp3', '.txt');
                    if (fs.existsSync(textFilePath)) {
                        fs.unlinkSync(textFilePath);
                    }

                    cleanedCount++;
                }
            }
        }

        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} old audio files from mp3 directory`);
        }
    } catch (error) {
        console.error('Error cleaning up old audio files:', error);
    }
}

/**
 * Schedule daily voice briefings for all users
 * @param {Object} bot - Telegram bot instance
 * @param {String} cronSchedule - Cron schedule expression (e.g. '0 8 * * *' for 8 AM daily)
 */
async function scheduleDailyBriefings(bot, cronSchedule = '0 8 * * *') {
    const cron = require('node-cron');

    cron.schedule(cronSchedule, async() => {
        try {
            console.log(`Running scheduled voice briefings at ${new Date().toISOString()}`);

            // Get all users with Telegram integration
            const usersSnapshot = await db.collection('users')
                .where('profile.telegramChatId', '!=', null)
                .where('profile.notificationPreferences.voiceBriefings', '==', true)
                .get();

            console.log(`Found ${usersSnapshot.size} users with voice briefings enabled`);

            for (const userDoc of usersSnapshot.docs) {
                try {
                    const userData = userDoc.data();
                    const userId = userDoc.id;
                    const chatId = userData.profile && userData.profile.telegramChatId;

                    if (!chatId) continue;

                    console.log(`Generating scheduled briefing for user ${userId}...`);

                    // Get user's unread important emails
                    const messagesSnapshot = await db.collection('messages')
                        .where('userId', '==', userId)
                        .where('read', '==', false)
                        .where('priority', 'in', ['critical', 'action'])
                        .orderBy('timestamp', 'desc')
                        .limit(10)
                        .get();

                    if (messagesSnapshot.empty) {
                        console.log(`No important unread emails for user ${userId}`);
                        continue;
                    }

                    // Convert to email objects
                    const emails = messagesSnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            ...data,
                            id: doc.id
                        };
                    });

                    // Generate briefing
                    const fileName = `scheduled_${userId}_${Date.now()}.mp3`;
                    const audioFilePath = await generateVoiceBriefing(emails, { fileName });

                    if (!audioFilePath) {
                        console.log(`Failed to generate briefing for user ${userId}`);
                        continue;
                    }

                    // Send briefing
                    const criticalCount = emails.filter(e => e.priority === 'critical').length;
                    const actionCount = emails.filter(e => e.priority === 'action').length;

                    await bot.sendVoice(chatId, audioFilePath, {
                        caption: `📅 Daily Briefing\n\n${criticalCount} critical, ${actionCount} action emails`
                    });

                    console.log(`Sent scheduled briefing to user ${userId}`);

                } catch (userError) {
                    console.error(`Error processing user ${userDoc.id}:`, userError);
                    // Continue with next user
                }
            }

            // Clean up old files
            cleanupOldAudioFiles();

        } catch (error) {
            console.error('Error in scheduled voice briefings job:', error);
        }
    });

    console.log(`Daily voice briefings scheduled for ${cronSchedule}`);
}

module.exports = {
    addVoiceBriefingCommands,
    scheduleDailyBriefings
};