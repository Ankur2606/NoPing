const cron = require('node-cron');
const { getUsersWithValidTokens } = require('../models/oauthTokenModel');
const { fetchUserEmails, saveEmailsToFirestore } = require('../services/emailService');
const { classifyEmailToMessage } = require('./classifyEmailToMessage');
const { generateTaskFromMessage } = require('./taskGenerator');
const { processEmail } = require('./processEmail');
const { db } = require('../config/firebase');

// Log messages with timestamp
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

// Run email fetching for a specific user
const processUserEmails = async (userId, tokenData) => {
  try {
    log(`Fetching emails for user ${userId}...`);

    // Fetch recent emails (adjust query as needed)
    const fetchResult = await fetchUserEmails(userId, {
      maxResults: 5,
      query: 'is:inbox newer_than:7d' // Get inbox emails from last 7 days
    });

    if (!fetchResult.success) {
      log(`Failed to fetch emails for user ${userId}: ${fetchResult.error}`);
      return {
        success: false,
        error: fetchResult.error
      };
    }

    log(`Found ${fetchResult.emails.length} emails for user ${userId}`);
    // Skip saving if no emails found
    if (fetchResult.emails.length === 0) {
      return {
        success: true,
        savedCount: 0,
        fetchedCount: 0
      };
    }
    const emailResults = [];
    const tasksResults = [];
    let count = 0;
    const messagesRef = db.collection('messages').doc(userId).collection('userMessages');

    for (const email of [fetchResult.emails[0]]) {
      const isEmailProcessed = await messagesRef.doc(email.id).get();
      if (isEmailProcessed.exists) {
        log(`Email ${email.id} already processed for user ${userId}, skipping...`);
        continue; // Skip already processed emails
      }
  
      const processedEmail =  await processEmail(fetchResult.gmailClient, email.id);
      emailResults.push(processedEmail);
      const taskResult = await generateTaskFromMessage(processedEmail);
      if(taskResult.isGenerateTask){
        if(taskResult.isMultiple){
          tasksResults.push(...taskResult.tasks);
        }else{
          tasksResults.push(taskResult.tasks);
        }
      }

      log(`Processed email ${count + 1}/${fetchResult.emails.length} for user ${userId}`);
      count++;
    }
   if(emailResults.length === 0) {
      log(`No new emails to save for user ${userId}`);
      return {
        success: true,
        savedCount: 0,
        fetchedCount: fetchResult.emails.length
      };
   }
    const saveResult = await saveEmailsToFirestore(userId, emailResults, tasksResults);

    if (!saveResult.success) {
      log(`Failed to save emails for user ${userId}: ${saveResult.error}`);
      return {
        success: false,
        error: saveResult.error
      };
    }

    log(`Saved ${saveResult.savedCount} new emails for user ${userId}`);

    return {
      success: true,
      savedCount: saveResult.savedCount,
      fetchedCount: fetchResult.emails.length
    };
  } catch (error) {
    log(`Error processing emails for user ${userId}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

// Main function that runs the cron job
const runEmailCronJob = async () => {
  try {
    log('Starting email fetch cron job...');

    // Get all users with valid Google tokens
    const usersWithTokens = await getUsersWithValidTokens('google');

    log(`Found ${usersWithTokens.length} users with valid Google tokens`);

    if (usersWithTokens.length === 0) {
      log('No users to process. Ending job.');
      return;
    }

    // Process each user's emails
    const results = await Promise.all(
      [usersWithTokens[0]].map(({ userId, tokenData }) =>
        processUserEmails(userId, tokenData)
      )
    );

    // Summarize results
    const successCount = results.filter(r => r.success).length;
    const totalSaved = results.reduce((sum, r) => sum + (r.savedCount || 0), 0);

    log(`Email fetch job completed: ${successCount}/${usersWithTokens.length} users processed successfully`);
    log(`Total new emails saved: ${totalSaved}`);

  } catch (error) {
    log(`Error in email cron job: ${error.message}`);
  }
};

// Schedule the cron job (every hour by default)
const scheduleEmailCronJob = (schedule = '0 * * * *') => {
  log(`Scheduling email fetch cron job with schedule: ${schedule}`);

  cron.schedule(schedule, runEmailCronJob);
  log('Email fetch cron job scheduled successfully');

  // Return a function that can be used to run the job manually
  return runEmailCronJob;
};

module.exports = {
  scheduleEmailCronJob,
  runEmailCronJob
};
