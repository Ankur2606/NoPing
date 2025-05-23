/**
 * Task Generator Service
 * 
 * Analyzes messages from various sources (email, Slack, Teams) and generates appropriate tasks.
 * Uses AI to extract relevant task information from message content.
 */

const axios = require('axios');
require('dotenv').config();
const { OpenAI } = require('openai');

// Initialize OpenAI client with Nebius AI endpoint
const client = new OpenAI({
    baseURL: "https://api.studio.nebius.com/v1/",
    apiKey: process.env.NEBIUS_API_KEY
});

/**
 * Main function to generate a task from a message
 * @param {Object} message - Message object following the message schema
 * @returns {Promise<Object>} - Task object following the task schema
 */
async function generateTaskFromMessage(message) {
    try {
        // Validate input message
        if (!message || !message.type || !message.content) {
            throw new Error('Invalid message object provided');
        }

        // Extract key information based on message type
        const sourceInfo = extractSourceInfo(message);

        // Generate task content using AI
        const taskContent = await generateTaskContentWithAI(message);

        // Merge the AI-generated content with basic task information
        const task = {
            title: taskContent.title || generateDefaultTitle(message),
            description: taskContent.description || generateDefaultDescription(message),
            dueDate: taskContent.dueDate || calculateDefaultDueDate(),
            createdOn: new Date(),
            priority: taskContent.priority || "medium",
            completed: false,
            source: message.type,
            sourceMessageId: message.sourceId || "",
            tags: taskContent.tags || generateDefaultTags(message),
            assignedTo: []
        };

        return task;
    } catch (error) {
        console.error('Error generating task from message:', error);

        // Return a default task on error
        return createDefaultErrorTask(message);
    }
}

/**
 * Extract source-specific information from different message types
 * @param {Object} message - Message object
 * @returns {Object} - Source information
 */
function extractSourceInfo(message) {
    switch (message.type) {
        case 'email':
            return {
                sender: message.from && message.from.name || 'Unknown',
                senderEmail: message.from && message.from.email || '',
                subject: message.subject || '',
                hasAttachments: Array.isArray(message.attachments) && message.attachments.length > 0
            };

        case 'slack':
            return {
                sender: message.sender && message.sender.name || 'Unknown',
                channel: message.channel || '',
                hasMentions: message.mentions || false
            };

        case 'teams':
            return {
                sender: message.sender && message.sender.name || 'Unknown',
                senderEmail: message.sender && message.sender.email || '',
                channel: message.channel || '',
                hasMentions: message.mentions || false
            };

        default:
            return { sender: 'Unknown' };
    }
}

/**
 * Use AI to analyze message content and generate appropriate task details
 * @param {Object} message - Message object
 * @returns {Promise<Object>} - Task content with title, description, priority, etc.
 */
async function generateTaskContentWithAI(message) {
    try {
        // Prepare context from message
        const context = prepareContextForAI(message);

        // Build AI prompt
        const prompt = buildAIPrompt(context);

        // Call Nebius AI API
        const response = await callNebiusAI(prompt);

        // Parse the AI response
        return parseAIResponse(response);
    } catch (error) {
        console.error('Error generating task content with AI:', error);
        return {}; // Return empty object, defaults will be used
    }
}

/**
 * Prepare context for AI processing
 * @param {Object} message - Message object
 * @returns {Object} - Context object
 */
function prepareContextForAI(message) {
    let context = {
        messageType: message.type,
        content: message.content,
        priority: message.priority,
    };

    switch (message.type) {
        case 'email':
            context.subject = message.subject;
            context.sender = message.from && message.from.name;
            context.senderEmail = message.from && message.from.email;
            break;

        case 'slack':
        case 'teams':
            context.sender = message.sender && message.sender.name;
            context.channel = message.channel;
            context.hasMentions = message.mentions;
            break;
    }

    return context;
}

/**
 * Build the prompt for the AI based on message context
 * @param {Object} context - Context object
 * @returns {String} - Formatted AI prompt
 */
function buildAIPrompt(context) {
    // Building a detailed prompt to get quality task generation
    return `
You are an AI assistant specialized in turning communication messages into actionable tasks.

CONTEXT:
- Message Type: ${context.messageType}
- Message Priority: ${context.priority}
- Sender: ${context.sender || 'Unknown'}
${context.subject ? `- Subject: ${context.subject}` : ''}
${context.channel ? `- Channel: ${context.channel}` : ''}
${context.hasMentions !== undefined ? `- Has Mentions: ${context.hasMentions}` : ''}

CONTENT:
${context.content}

Based on this message, create a task with the following attributes:
1. Title: A clear, concise title for the task (max 100 characters)
2. Description: Detailed description of what needs to be done
3. Priority: "high", "medium", or "low" (consider the urgency and importance)
4. Tags: 1-5 relevant keywords that categorize this task
5. Due Date: Suggested due date in ISO format (YYYY-MM-DD) or null if no date is implied

Respond in JSON format only:
{
  "title": "Task title",
  "description": "Task description",
  "priority": "high|medium|low",
  "tags": ["tag1", "tag2"],
  "dueDate": "YYYY-MM-DD" or null
}
`;
}

/**
 * Call Nebius AI API for task generation
 * @param {String} prompt - AI prompt
 * @returns {Promise<String>} - AI response
 */
async function callNebiusAI(prompt) {
  try {
    const response = await client.chat.completions.create({
        model: "Qwen/Qwen2.5-32B-Instruct",
        max_tokens: 10,
        temperature: 0,
        messages: [
            {
            role: "system",
            text: 'You are a professional task creation assistant that creates structured tasks from message content.'
          },
          {
            role: 'user',
            text: prompt
          }
        ]
      }
    );
console.log('AI Response:', response.choices[0].message);
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling Nebius AI API:', error.message);
    throw new Error('Failed to get response from AI service');
  }
}

/**
 * Parse the AI response into structured task content
 * @param {String} response - AI response text
 * @returns {Object} - Parsed task content
 */
function parseAIResponse(response) {
  try {
    console.log('AI Response:', response);
    // Extract JSON from response (in case there's additional text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const taskContent = JSON.parse(jsonMatch[0]);
      
      // Convert date string to Date object if present
      if (taskContent.dueDate && typeof taskContent.dueDate === 'string') {
        const dateObj = new Date(taskContent.dueDate);
        if (!isNaN(dateObj.getTime())) {
          taskContent.dueDate = dateObj;
        } else {
          taskContent.dueDate = null;
        }
      }
      
      return taskContent;
    }
    
    throw new Error('Could not extract valid JSON from AI response');
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {}; // Return empty object, defaults will be used
  }
}

/**
 * Generate a default title if AI generation fails
 * @param {Object} message - Message object
 * @returns {String} - Default title
 */
function generateDefaultTitle(message) {
  switch (message.type) {
    case 'email':
      return message.subject || `Email from ${message.from && message.from.name || 'Unknown'}`;
      
    case 'slack':
      return `Slack message in ${message.channel || 'channel'}`;
      
    case 'teams':
      return `Teams message in ${message.channel || 'channel'}`;
      
    default:
      return `Task from ${message.type} message`;
  }
}

/**
 * Generate a default description if AI generation fails
 * @param {Object} message - Message object
 * @returns {String} - Default description
 */
function generateDefaultDescription(message) {
  let sender = '';
  
  switch (message.type) {
    case 'email':
      sender = (message.from && message.from.name) || (message.from && message.from.email) || 'Unknown';
      break;
      
    case 'slack':
    case 'teams':
      sender = message.sender && message.sender.name || 'Unknown';
      break;
      
    default:
      sender = 'Unknown';
  }
  
  return `Review the following message from ${sender}:\n\n${message.content}`;
}

/**
 * Calculate a default due date if AI doesn't provide one
 * @returns {Date} - Default due date (tomorrow)
 */
function calculateDefaultDueDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * Generate default tags based on message type and content
 * @param {Object} message - Message object
 * @returns {Array} - Array of tags
 */
function generateDefaultTags(message) {
  const tags = [message.type]; // Always include the message type as a tag
  
  if (message.priority) {
    tags.push(message.priority);
  }
  
  switch (message.type) {
    case 'email':
      if (message.attachments && message.attachments.length > 0) {
        tags.push('attachment');
      }
      break;
      
    case 'slack':
    case 'teams':
      if (message.mentions) {
        tags.push('mention');
      }
      if (message.channel) {
        tags.push(`channel-${message.channel.toLowerCase().replace(/\s+/g, '-')}`);
      }
      break;
  }
  
  return tags;
}

/**
 * Create a default task for error cases
 * @param {Object} message - Message object
 * @returns {Object} - Default error task
 */
function createDefaultErrorTask(message) {
  return {
    title: `Review ${message.type || 'message'}`,
    description: `Error creating task automatically. Please review the original message:\n\n${message.content || 'Content unavailable'}`,
    dueDate: calculateDefaultDueDate(),
    createdOn: new Date(),
    priority: "medium",
    completed: false,
    source: message.type || 'unknown',
    sourceMessageId: message.sourceId || "",
    tags: [message.type || 'unknown', 'error-task'],
    assignedTo: []
  };
}

module.exports = { generateTaskFromMessage };