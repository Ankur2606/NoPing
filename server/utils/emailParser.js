/**
 * Email Parser Utility
 * 
 * Extracts text content from Gmail API message objects.
 * Handles different MIME types and parts of the email.
 */

/**
 * Parse email body from Gmail API message data
 * @param {Object} message - Gmail API message object
 * @returns {Object} - Email content with text and html parts
 */
function parseEmailBody(message) {
  const result = {
    text: '',
    html: ''
  };

  if (!message.payload) {
    return result;
  }

  // Extract parts and process content based on MIME types
  extractParts(message.payload, result);
  
  // Clean up the text content
  result.text = cleanTextContent(result.text);

  return result;
}

/**
 * Extract parts from message payload recursively
 * @param {Object} part - Message part from Gmail API
 * @param {Object} result - Object to accumulate extracted content
 */
function extractParts(part, result) {
  // Check if this part has a body with data
  if (part.body && part.body.data) {
    const content = Buffer.from(part.body.data, 'base64').toString('utf-8');
    
    // Assign content to appropriate result property based on MIME type
    if (part.mimeType === 'text/plain') {
      result.text += content;
    } else if (part.mimeType === 'text/html') {
      result.html += content;
    }
  }

  // If this part has nested parts, process them recursively
  if (part.parts && Array.isArray(part.parts)) {
    part.parts.forEach(subpart => {
      extractParts(subpart, result);
    });
  }
}

/**
 * Clean up text content by removing excessive whitespace and normalizing line breaks
 * @param {string} text - Raw text content
 * @returns {string} - Cleaned text content
 */
function cleanTextContent(text) {
  if (!text) return '';
  
  return text
    // Replace multiple line breaks with two line breaks
    .replace(/(\r\n|\r|\n){3,}/g, '\n\n')
    // Replace tabs with spaces
    .replace(/\t/g, ' ')
    // Replace multiple spaces with a single space
    .replace(/ {2,}/g, ' ')
    // Trim whitespace from the beginning and end
    .trim();
}

module.exports = {
  parseEmailBody
};