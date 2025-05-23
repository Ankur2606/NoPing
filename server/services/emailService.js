const { google } = require('googleapis');
const { admin, db } = require('../config/firebase');
const { getOAuthToken } = require('../models/oauthTokenModel');
const { processEmail } = require('../scripts/processEmail');

/**
 * Create a Gmail API client with user's access token
 * @param {Object} tokenData - OAuth token data
 * @returns {Object} - Gmail API client
 */
const createGmailClient = (tokenData) => {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oAuth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: new Date(tokenData.expires_at._seconds * 1000).getTime()
    });

    return google.gmail({ version: 'v1', auth: oAuth2Client });
};

/**
 * Fetch emails for a user
 * @param {string} userId - User's Firebase ID
 * @param {Object} options - Options for fetching emails
 * @returns {Promise<Array>} - Array of emails
 */
const fetchUserEmails = async (userId, options = {}) => {
    try {

        // Get the user's Google OAuth token
        const tokenData = await getOAuthToken(userId, 'google');

        if (!tokenData || tokenData.isExpired) {
            console.error(`No valid Google token found for user ${userId}`);
            return { success: false, error: 'No valid token', emails: [] };
        }

        // Check if we have Gmail API access
        if (!tokenData.scopes.includes('https://www.googleapis.com/auth/gmail.readonly')) {
            console.error(`User ${userId} doesn't have Gmail access scope`);
            return { success: false, error: 'No Gmail scope', emails: [] };
        }

        // Create Gmail client
        const gmail = createGmailClient(tokenData);

        // Default query parameters
        const maxResults = options.maxResults || 10;
        const query = options.query || '';

        // Get messages that match query
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults,
            q: query
        });

        if (!response.data.messages || response.data.messages.length === 0) {
            return { success: true, emails: [] };
        }

        // Get full message details
        const emails = response.data.messages

        return {
            success: true,
            emails: emails,
            gmailClient: gmail
        };

    } catch (error) {
        console.error(`Error fetching emails for user ${userId}:`, error);
        return {
            success: false,
            error: error.message,
            emails: []
        };
    }
};

/**
 * Save fetched emails to the database
 * @param {string} userId - User's Firebase ID
 * @param {Array} emails - Array of emails to save
 * @returns {Promise<Object>} - Result of the operation
 */
const saveEmailsToFirestore = async (userId, emailResults,tasksResults) => {
    try {
        // Validate inputs
        if (!emailResults || emailResults.length === 0) {
            return {
                success: false,
                error: 'No emails provided',
                savedCount: 0,
                totalProcessed: 0
            };
        }
        const batch = db.batch();
        const messagesRef = db.collection('messages').doc(userId).collection('userMessages');
        let savedCount = 0;

        // Process each email - ensure we're iterating through the actual emails array
        for (const email of emailResults) {
            // Make sure email has a valid id
            if (!email || !email.sourceId) {
                console.error('Invalid email object or missing ID:', email);
                continue;
            }
            
            // Check if this email already exists
            const emailDoc = await messagesRef.doc(email.sourceId).get();

            if (!emailDoc.exists) {
                // Add email to batch if it doesn't exist yet
                // Note: We're using the actual email object directly
                batch.set(messagesRef.doc(email.sourceId), email);
                savedCount++;
            }
        }

        // Commit the batch if we have any new emails
        if (savedCount > 0) {
            await batch.commit();
        }


         if (!emailResults || emailResults.length === 0) {
            return {
                success: false,
                error: 'No emails provided',
                savedCount: 0,
                totalProcessed: 0
            };
        }
        const batchTasks = db.batch();
        const TasksRef = db.collection('tasks').doc(userId).collection('userTasks');
        let TasksSavedCount = 0;

        // Process each email - ensure we're iterating through the actual emails array
        for (const task of tasksResults) {
            // Make sure email has a valid id
            if (!task || !task.sourceMessageId) {
                console.error('Invalid email object or missing ID:', task);
                continue;
            }
            
            // Check if this email already exists
            const taskDoc = await TasksRef.doc(task.sourceMessageId).get();

            if (!taskDoc.exists) {
                // Add email to batch if it doesn't exist yet
                // Note: We're using the actual email object directly
                batchTasks.set(TasksRef.doc(task.sourceMessageId), task);
                TasksSavedCount++;
            }
        }

        // Commit the batch if we have any new emails
        if (TasksSavedCount > 0) {
            await batch.commit();
        }

        return {
            success: true,
            savedCount,
            savedTasksCount: TasksSavedCount,
            totalMessages: emailResults.length,
            totalsTasks: tasksResults.length,
        };
    } catch (error) {
        console.error(`Error saving emails for user ${userId}:`, error);
        return {
            success: false,
            error: error.message,
            savedCount: 0,
            totalProcessed: emails.length
        };
    }
};

module.exports = {
    fetchUserEmails,
    saveEmailsToFirestore
};
