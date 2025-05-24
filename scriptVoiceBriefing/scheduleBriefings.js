/**
 * Voice Briefing Scheduler
 * 
 * This script demonstrates how to schedule voice briefings using node-cron
 * to send periodic updates to users via Telegram
 */

require('dotenv').config();
const cron = require('node-cron');
const { sendVoiceBriefingToTelegram } = require('./telegramIntegration');
const { sampleEmails } = require('./sampleEmails');

// In a real implementation, this would fetch emails from Firebase or another data source
async function fetchUserEmails(userId) {
    // Simulate some delay in fetching emails
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`Fetched emails for user ${userId}`);
    return sampleEmails;
}

/**
 * Schedule voice briefings for users
 * @param {string} morningSchedule - Cron schedule for morning briefing
 * @param {string} eveningSchedule - Cron schedule for evening briefing
 */
function scheduleBriefings(morningSchedule = '0 8 * * *', eveningSchedule = '0 18 * * *') {
    console.log(`Scheduling voice briefings:`);
    console.log(`- Morning: ${morningSchedule}`);
    console.log(`- Evening: ${eveningSchedule}`);

    // Schedule morning briefing
    cron.schedule(morningSchedule, () => {
        console.log('Running morning voice briefing job...');
        runBriefingJob('morning');
    });

    // Schedule evening briefing
    cron.schedule(eveningSchedule, () => {
        console.log('Running evening voice briefing job...');
        runBriefingJob('evening');
    });

    console.log('Voice briefing jobs scheduled successfully');
}

/**
 * Run the briefing job for all users
 * @param {string} timeOfDay - 'morning' or 'evening'
 */
async function runBriefingJob(timeOfDay) {
    try {
        console.log(`Starting ${timeOfDay} voice briefing job at ${new Date().toISOString()}`);

        // In a real implementation, this would fetch users from Firebase
        const users = [
            { userId: 'user1', telegramChatId: process.env.TELEGRAM_CHAT_ID || 'chat_id_1' },
            { userId: 'user2', telegramChatId: process.env.TELEGRAM_CHAT_ID || 'chat_id_2' }
        ];

        console.log(`Found ${users.length} users for briefing`);

        // Process each user
        for (const user of users) {
            try {
                console.log(`Processing user ${user.userId}...`);

                // Fetch user's emails
                const emails = await fetchUserEmails(user.userId);

                if (!emails || emails.length === 0) {
                    console.log(`No emails found for user ${user.userId}`);
                    continue;
                }

                // Filter only unread critical/action emails
                const importantEmails = emails.filter(email =>
                    !email.read && (email.priority === 'critical' || email.priority === 'action'));

                if (importantEmails.length === 0) {
                    console.log(`No important unread emails for user ${user.userId}`);
                    continue;
                }

                console.log(`Sending briefing with ${importantEmails.length} important emails to user ${user.userId}`);

                // Send briefing to user's Telegram chat
                if (user.telegramChatId) {
                    const result = await sendVoiceBriefingToTelegram(user.telegramChatId, importantEmails);
                    console.log(`Briefing result for user ${user.userId}:`, result.success ? 'Success' : 'Failed');
                }
            } catch (userError) {
                console.error(`Error processing user ${user.userId}:`, userError);
                // Continue with next user
            }
        }

        console.log(`Completed ${timeOfDay} voice briefing job`);

    } catch (error) {
        console.error(`Error in ${timeOfDay} briefing job:`, error);
    }
}

// If run directly, start the scheduling
if (require.main === module) {
    // For testing purposes, use more frequent schedules
    if (process.env.NODE_ENV === 'development') {
        // Run every 2 minutes for testing
        scheduleBriefings('*/2 * * * *', '*/3 * * * *');
        console.log('Development mode: Briefings scheduled every 2 and 3 minutes for testing');
    } else {
        // Normal schedules: 8 AM and 6 PM
        scheduleBriefings('0 8 * * *', '0 18 * * *');
    }

    // Also run immediately for testing
    console.log('Running initial briefing job for testing...');
    runBriefingJob('initial');
}

module.exports = {
    scheduleBriefings,
    runBriefingJob
};