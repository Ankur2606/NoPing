const { google } = require('googleapis');
const { admin, db } = require('../config/firebase');
const { getOAuthToken } = require('../models/oauthTokenModel');

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
    const emails = await Promise.all(
      response.data.messages.map(async (message) => {
        try {
          const messageDetails = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });
          
          // Parse headers
          const headers = messageDetails.data.payload.headers;
          const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const to = headers.find(h => h.name === 'To')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';
          
          // Extract body content
          let body = '';
          if (messageDetails.data.payload.parts) {
            // Multi-part message
            const textPart = messageDetails.data.payload.parts.find(
              part => part.mimeType === 'text/plain'
            );
            
            if (textPart && textPart.body.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
            }
          } else if (messageDetails.data.payload.body.data) {
            // Simple message
            body = Buffer.from(messageDetails.data.payload.body.data, 'base64').toString('utf8');
          }
          
          return {
            id: message.id,
            threadId: message.threadId,
            labelIds: messageDetails.data.labelIds,
            snippet: messageDetails.data.snippet,
            subject,
            from,
            to,
            date,
            body,
            receivedAt: new Date(date)
          };
        } catch (error) {
          console.error(`Error fetching email details for ${message.id}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any null results from failed fetches
    const validEmails = emails.filter(email => email !== null);
    
    return {
      success: true,
      emails: validEmails
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
const saveEmailsToFirestore = async (userId, emails) => {
  try {
    const batch = db.batch();
    const userEmailsRef = db.collection('users').doc(userId).collection('emails');
    
    let savedCount = 0;
    
    // Process each email
    for (const email of emails) {
      // Check if this email already exists
      const emailDoc = await userEmailsRef.doc(email.id).get();
      
      if (!emailDoc.exists) {
        // Add email to batch if it doesn't exist yet
        
        
        batch.set(userEmailsRef.doc(email.id), emailData);
        savedCount++;
      }
    }
    
    // Commit the batch if we have any new emails
    if (savedCount > 0) {
      await batch.commit();
    }
    
    return {
      success: true,
      savedCount,
      totalProcessed: emails.length
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
