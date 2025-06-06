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
 * Email Fetching and Processing Service
 * 
 * Retrieves emails from Gmail API and processes them:
 * 1. Fetches emails with appropriate filters
 * 2. Parses email content
 * 3. Sends them for classification
 * 4. Stores results in Firebase
 */

const { classifyEmailToMessage } = require('./classifyEmailToMessage');
const { parseEmailBody } = require('../utils/emailParser');

/**
 * Process a single email
 * @param {Object} gmail - Gmail API client instance
 * @param {string} messageId - Email message ID
 * @returns {Promise<Object>} - Processed email object
 */
async function processEmail(gmail, emailId) {
    try {
        const email = await gmail.users.messages.get({
            userId: 'me',
            id: emailId,
            format: 'full',
        });
        const headers = email.data.payload.headers;
        const subject = headers.find((header) => header.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((header) => header.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find((header) => header.name === 'Date')?.value || new Date().toISOString();
        const to = headers.find((header) => header.name === 'To')?.value || '';

        // Parse email body using the emailParser utility
        const parsedEmail = parseEmailBody(email.data);

        // Ensure we always have content, even if parsing fails
        let bodyText = '';

        if (parsedEmail && parsedEmail.text && parsedEmail.text.trim() !== '') {
            bodyText = parsedEmail.text;
        } else if (parsedEmail && parsedEmail.html && parsedEmail.html.trim() !== '') {
            bodyText = parsedEmail.html;
        } else {
            // Fallback: Use snippet provided by Gmail API
            bodyText = email.data.snippet || 'No content available';
        }

        // Final content check - if all fails, provide default content
        if (!bodyText || bodyText.trim() === '') {
            bodyText = `Email from ${from} with subject "${subject}" - Content unavailable`;
        }

        // Create email object for classification
        const emailForClassification = {
            subject,
            from,
            body: bodyText,
        };

        // Classify the email
        const { label, reasoning } = await classifyEmailToMessage(emailForClassification);
        // console.log(` 111111 Email ${emailId} classified with priority: ${label}, reasoning: ${reasoning}`);
        // Extract sender name and email
        const fromName = extractNameFromEmail(from);
        const fromEmail = extractEmailAddress(from);

        // Extract email recipients as an array (if available)
        const toArray = to ? to.split(',').map(email => email.trim()) : [];

        // Check for attachments
        const attachments = [];
        if (email.data.payload.parts) {
            email.data.payload.parts.forEach(part => {
                if (part.filename && part.filename.length > 0) {
                    attachments.push({
                        filename: part.filename,
                        mimeType: part.mimeType,
                        size: part.body.size || 0,
                    });
                }
            });
        }

        // Convert priority to Firebase schema format
        const priorityMap = {
            'FLOW_CRITICAL': 'critical',
            'FLOW_ACTION': 'action',
            'FLOW_INFO': 'info'
        };

        const prioriti = priorityMap[label] || 'info';
        console.log(`Processed email ${emailId} with priority: ${label}`);
        return {
            // Required common fields with fallbacks
            type: 'email',
            content: bodyText,
            timestamp: new Date(date),
            priority: prioriti, // Default to 'info' if classification fails
            read: false, // Always false for new emails
            sourceId: emailId || `email-${Date.now()}`, // Fallback using timestamp if ID is missing
            reasoning: reasoning || 'No reasoning provided',
            from: {
                name: fromName || 'Unknown Sender',
                email: fromEmail || 'unknown@example.com'
            },
            to: Array.isArray(toArray) ? toArray : [],
            subject: subject || 'No Subject',
            attachments: Array.isArray(attachments) ? attachments : [],
            messageTimestamp: new Date(date)
        };

    } catch (error) {
        console.error(`Error processing email ${emailId}:`, error);

        // Create a valid placeholder object even in case of errors
        return {
            type: 'email',
            content: `Error retrieving email content: ${error.message}`,
            timestamp: new Date(),
            priority: 'info',
            read: false,
            sourceId: emailId || `error-${Date.now()}`,
            from: {
                name: 'Error Processing',
                email: 'error@example.com'
            },
            to: [],
            subject: 'Error retrieving email',
            attachments: []
        };
    }
}

/**
 * Extract name from an email string like "John Doe <john@example.com>"
 * 
 * @param {string} emailString - Email string
 * @returns {string} - Extracted name or a default value
 */
function extractNameFromEmail(emailString) {
    if (!emailString) return 'Unknown';

    const match = emailString.match(/^"?([^"<]+)"?\s*<?[^>]*>?$/);
    return match ? match[1].trim() : emailString;
}

/**
 * Extract email address from an email string like "John Doe <john@example.com>"
 * 
 * @param {string} emailString - Email string
 * @returns {string} - Extracted email address or the original string
 */
function extractEmailAddress(emailString) {
    if (!emailString) return 'unknown@example.com';

    const match = emailString.match(/<([^>]+)>/);
    return match ? match[1] : emailString;
}

module.exports = { processEmail };