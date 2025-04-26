/**
 * Firebase Data Service
 * 
 * Handles validation and writing of email data to Firebase
 * following the specified schema structure
 */
const { getFirestore } = require('../config/firebase');

/**
 * Schema validation rules for message data
 * Based on the provided message schema
 */
const schemaValidation = {
  // Common fields for all message types
  common: {
    type: (value) => ['email', 'slack', 'teams'].includes(value),
    content: (value) => typeof value === 'string',
    timestamp: (value) => value instanceof Date,
    priority: (value) => ['critical', 'action', 'info'].includes(value),
    read: (value) => typeof value === 'boolean',
    sourceId: (value) => typeof value === 'string'
  },
  
  // Email-specific fields validation
  email: {
    from: {
      name: (value) => typeof value === 'string',
      email: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    },
    to: (value) => Array.isArray(value),
    subject: (value) => typeof value === 'string',
    attachments: (value) => Array.isArray(value)
  }
};

/**
 * Validates the message data against the schema
 * 
 * @param {Object} data - Message data to validate
 * @returns {Object} - Validation result { valid: boolean, errors: Array }
 */
function validateMessageData(data) {
  const errors = [];
  const commonValidation = schemaValidation.common;
  
  // Validate common fields
  Object.keys(commonValidation).forEach(field => {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`Missing required field: ${field}`);
    } else if (!commonValidation[field](data[field])) {
      errors.push(`Invalid value for field: ${field}`);
    }
  });
  
  // Validate type-specific fields
  if (data.type === 'email') {
    const emailValidation = schemaValidation.email;
    
    // Validate from object
    if (!data.from || typeof data.from !== 'object') {
      errors.push('Missing or invalid from object');
    } else {
      if (!data.from.name || !emailValidation.from.name(data.from.name)) {
        errors.push('Invalid from.name value');
      }
      if (!data.from.email || !emailValidation.from.email(data.from.email)) {
        errors.push('Invalid from.email value');
      }
    }
    
    // Validate other email fields
    if (!emailValidation.to(data.to)) {
      errors.push('Invalid to value, must be an array');
    }
    
    if (!emailValidation.subject(data.subject)) {
      errors.push('Invalid subject value');
    }
    
    if (!emailValidation.attachments(data.attachments)) {
      errors.push('Invalid attachments value, must be an array');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Convert email data from fetchEmail.js format to Firebase schema format
 * Use this for data that needs to be transformed from the original email format
 * 
 * @param {Object} emailData - Email data from fetchEmail.js
 * @returns {Object} - Data in Firebase schema format
 */
function convertEmailToFirebaseFormat(emailData) {
  // Extract name and email address from the 'from' string if not already parsed
  const fromName = emailData.from && emailData.from.name ? 
                   emailData.from.name : 
                   (typeof emailData.from === 'string' ? extractNameFromEmail(emailData.from) : 'Unknown');
                   
  const fromEmail = emailData.from && emailData.from.email ? 
                    emailData.from.email : 
                    (typeof emailData.from === 'string' ? extractEmailAddress(emailData.from) : 'unknown@example.com');
  
  // Convert priority format if needed
  const priorityMap = {
    'FLOW_CRITICAL': 'critical',
    'FLOW_ACTION': 'action',
    'FLOW_INFO': 'info'
  };
  
  const priority = emailData.priority ? 
    (priorityMap[emailData.priority] || emailData.priority) : 'info';
  
  // Convert to Firebase schema format
  return {
    type: 'email',
    content: emailData.body || emailData.content || '',
    timestamp: emailData.date instanceof Date ? emailData.date : 
               emailData.timestamp instanceof Date ? emailData.timestamp : 
               new Date(),
    priority: priority,
    read: emailData.read === undefined ? false : !!emailData.read,
    sourceId: emailData.emailId || emailData.sourceId || '',
    from: {
      name: fromName,
      email: fromEmail
    },
    to: Array.isArray(emailData.to) ? emailData.to : [],
    subject: emailData.subject || 'No Subject',
    attachments: Array.isArray(emailData.attachments) ? emailData.attachments : []
  };
}

/**
 * Extract name from an email string like "John Doe <john@example.com>"
 * 
 * @param {string} emailString - Email string
 * @returns {string} - Extracted name or a default value
 */
function extractNameFromEmail(emailString) {
  if (!emailString || typeof emailString !== 'string') return 'Unknown';
  
  const match = emailString.match(/^"?([^"<]+)"?\s*<?[^>]*>?$/);
  return match ? match[1].trim() : emailString.split('@')[0];
}

/**
 * Extract email address from an email string like "John Doe <john@example.com>"
 * 
 * @param {string} emailString - Email string
 * @returns {string} - Extracted email address or the original string
 */
function extractEmailAddress(emailString) {
  if (!emailString || typeof emailString !== 'string') return 'unknown@example.com';
  
  const match = emailString.match(/<([^>]+)>/);
  if (match) return match[1];
  
  // If no angle brackets, check if the string contains @ symbol
  if (emailString.includes('@')) {
    return emailString.trim();
  }
  
  return 'unknown@example.com';
}

/**
 * Write a single message to Firebase
 * 
 * @param {string} userId - User ID
 * @param {Object} messageData - Message data to write
 * @returns {Promise<string>} - Document ID of the written message
 */
async function writeMessageToFirebase(userId, messageData) {
  try {
    // Validate data before writing
    const validation = validateMessageData(messageData);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      throw new Error(`Invalid message data: ${validation.errors.join(', ')}`);
    }
    
    const db = getFirestore();
    const messagesRef = db.collection('messages').doc(userId).collection('items');
    
    // If sourceId is provided, use it as the document ID
    const docRef = messageData.sourceId 
      ? messagesRef.doc(messageData.sourceId)
      : messagesRef.doc();
    
    await docRef.set(messageData, { merge: true });
    
    return docRef.id;
  } catch (error) {
    console.error('Error writing message to Firebase:', error);
    throw error;
  }
}

/**
 * Write multiple messages to Firebase in a batch
 * 
 * @param {string} userId - User ID
 * @param {Array<Object>} messagesData - Array of message data to write
 * @returns {Promise<Array<string>>} - Array of document IDs
 */
async function writeMessagesToFirebase(userId, messagesData) {
  if (!Array.isArray(messagesData) || messagesData.length === 0) {
    console.warn('No messages to write to Firebase');
    return [];
  }
  
  try {
    const db = getFirestore();
    const batch = db.batch();
    const messagesRef = db.collection('messages').doc(userId).collection('items');
    const docIds = [];
    const validMessages = [];
    
    for (const messageData of messagesData) {
      // Skip null or undefined messages
      if (!messageData) continue;

      // Validation step
      const validation = validateMessageData(messageData);
      if (!validation.valid) {
        console.error(`Validation errors for message ${messageData.sourceId || 'unknown'}:`, validation.errors);
        continue; // Skip invalid messages
      }
      
      // If sourceId is provided, use it as the document ID
      const docRef = messageData.sourceId 
        ? messagesRef.doc(messageData.sourceId)
        : messagesRef.doc();
      
      batch.set(docRef, messageData, { merge: true });
      docIds.push(docRef.id);
      validMessages.push(messageData);
    }
    
    if (docIds.length > 0) {
      await batch.commit();
      console.log(`Successfully wrote ${docIds.length} messages to Firebase`);
      
      // Log the first few valid messages for debugging
      if (validMessages.length > 0) {
        console.log('Sample of saved messages:');
        validMessages.slice(0, 2).forEach(msg => {
          console.log(`- Subject: "${msg.subject}", Priority: ${msg.priority}`);
        });
      }
    } else {
      console.warn('No valid messages to write to Firebase');
    }
    
    return docIds;
  } catch (error) {
    console.error('Error writing messages to Firebase:', error);
    throw error;
  }
}

module.exports = {
  validateMessageData,
  convertEmailToFirebaseFormat,
  writeMessageToFirebase,
  writeMessagesToFirebase
};