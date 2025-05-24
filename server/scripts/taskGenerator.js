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
 * Main function to analyze a message and determine if a task should be generated
 * @param {Object} message - Message object following the message schema
 * @returns {Promise<Object>} - Response object with isGenerateTask flag and task object(s) if needed
 */
async function generateTaskFromMessage(message) {
    try {
        // Validate input message
        if (!message || !message.type || !message.content) {
            throw new Error('Invalid message object provided');
        }

        // Extract key information based on message type
        const sourceInfo = extractSourceInfo(message);

        // Generate task content using AI and determine if task is needed
        const aiResult = await generateTaskContentWithAI(message);

        // If AI determines no task is needed, return early with isGenerateTask = false
        if (!aiResult.isGenerateTask) {
            return {
                isGenerateTask: false
            };
        }

        // Check if we have multiple tasks or a single task
        if (aiResult.generateTask && aiResult.generateTask.isMultiple === true) {
            // Handle multiple tasks case
            const taskList = (aiResult.generateTask.task || []).map(taskContent => {
                // Ensure date is properly formatted for Firestore
                const dueDate = taskContent.dueDate ? 
                    (taskContent.dueDate instanceof Date ? 
                        taskContent.dueDate : new Date(taskContent.dueDate)) : 
                    calculateDefaultDueDate();
                
                return {
                    title: taskContent.title || generateDefaultTitle(message),
                    description: taskContent.description || generateDefaultDescription(message),
                    dueDate: dueDate,
                    createdOn: new Date(),
                    priority: taskContent.priority || "medium",
                    completed: false,
                    source: message.type,
                    sourceMessageId: message.sourceId || "",
                    tags: Array.isArray(taskContent.tags) ? taskContent.tags : generateDefaultTags(message),
                    assignedTo: []
                };
            });

            return {
                isGenerateTask: true,
                isMultiple: true,
                tasks: taskList
            };
        } else {
            // Handle single task case
            const taskContent = aiResult.generateTask && aiResult.generateTask.task || {};
            
            // Ensure date is properly formatted for Firestore
            const dueDate = taskContent.dueDate ? 
                (taskContent.dueDate instanceof Date ? 
                    taskContent.dueDate : new Date(taskContent.dueDate)) : 
                calculateDefaultDueDate();

            const task = {
                title: taskContent.title || generateDefaultTitle(message),
                description: taskContent.description || generateDefaultDescription(message),
                dueDate: dueDate,
                createdOn: new Date(),
                priority: taskContent.priority || "medium",
                completed: false,
                source: message.type,
                sourceMessageId: message.sourceId || "",
                tags: Array.isArray(taskContent.tags) ? taskContent.tags : generateDefaultTags(message),
                assignedTo: []
            };

            return {
                isGenerateTask: true,
                isMultiple: false,
                tasks: task
            };
        }
    } catch (error) {
        console.error('Error generating task from message:', error);

        // Return a default task on error, marking it as requiring attention
        const errorTask = createDefaultErrorTask(message);
        return {
            isGenerateTask: true,
            isMultiple: false,
            task: errorTask
        };
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
You are an AI assistant specialized in analyzing communication messages and determining if they should be converted into actionable tasks.

CONTEXT:
- Message Type: ${context.messageType}
- Message Priority: ${context.priority}
- Sender: ${context.sender || 'Unknown'}
${context.subject ? `- Subject: ${context.subject}` : ''}
${context.channel ? `- Channel: ${context.channel}` : ''}
${context.hasMentions !== undefined ? `- Has Mentions: ${context.hasMentions}` : ''}

CONTENT:
${context.content}

TASK EVALUATION GUIDELINES:
First, evaluate whether this message should be converted into a task. A message should become a task if it:
1. Contains an explicit or implicit request for action
2. Requires follow-up or response from the recipient
3. Represents work that needs to be tracked or completed
4. Includes deadlines, commitments, or deliverables
5. Is marked as important/high priority by the sender

Messages that should NOT become tasks typically:
1. Are purely informational with no action required
2. Are casual conversation or greetings
3. Are automated notifications without actionable content
4. Are already completed/resolved issues
5. Are spam or promotional content

MULTIPLE TASKS ANALYSIS:
After determining if a task should be created, analyze if the message contains MULTIPLE distinct actionable items. Examples:
- "Please review the report, schedule a meeting with the team, and update the dashboard"
- "Need three things: 1) Complete the design, 2) Send me the files, 3) Call the client"
- "Fix bugs in login page AND update color scheme on homepage AND deploy to production"

If separate tasks are clearly identifiable, create MULTIPLE atomic tasks instead of one large task.

TASK CREATION GUIDELINES:
- Create ATOMIC tasks (single focused action per task)
- Keep titles brief and action-oriented (start with a verb)
- Focus on the specific action required, not lengthy descriptions
- Prioritize based on urgency and importance
- Include only relevant tags (1-3 tags maximum)
- Assume todays date as ${new Date()} to generate due dates like tomorrow use ${new Date(new Date().getTime() + 24 * 60 * 60 * 1000)} etc.
- Specify due dates only if clearly indicated in the message

Respond in JSON format only:
If NO task should be generated:
{
  "isGenerateTask": false
}

If a SINGLE atomic task should be generated:
{
  "isGenerateTask": true,
  "generateTask": {
    "isMultiple": false,
    "task": {
      "title": "Brief action-oriented title",
      "description": "Concise description of what needs to be done",
      "priority": "high|medium|low",
      "tags": ["tag1", "tag2"],
      "dueDate": "YYYY-MM-DD" or null
    }
  }
}

If MULTIPLE tasks should be generated:
{
  "isGenerateTask": true,
  "generateTask": {
    "isMultiple": true,
    "task": [
      {
        "title": "First atomic task title",
        "description": "Concise description",
        "priority": "high|medium|low",
        "tags": ["tag1", "tag2"],
        "dueDate": "YYYY-MM-DD" or null
      },
      {
        "title": "Second atomic task title",
        "description": "Concise description",
        "priority": "high|medium|low",
        "tags": ["tag1", "tag2"],
        "dueDate": "YYYY-MM-DD" or null
      }
      // Additional tasks as needed
    ]
  }
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
        max_tokens: 500,
        temperature: 0,
        messages: [
            {
                role: "system",
                content: 'You are a professional assistant that analyzes messages and determines if they should become tasks. You can differentiate between actionable requests and informational messages. You provide structured JSON responses only.'
            },
            {
                role: 'user',
                content: prompt
            }
        ]
      }
    );
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling Nebius AI API:', error.message);
    throw new Error('Failed to get response from AI service');
  }
}

/**
 * Parse the AI response into structured task content
 * @param {String} response - AI response text
 * @returns {Object} - Parsed task content with isGenerateTask flag and nested generateTask object if needed
 */
function parseAIResponse(response) {
  try {
    // Extract JSON from response (in case there's additional text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsedContent = JSON.parse(jsonMatch[0]);
      
      // Handle the isGenerateTask property, default to true if not present for backward compatibility
      if (parsedContent.isGenerateTask === undefined) {
        parsedContent.isGenerateTask = true;
        
        // If using older formats, migrate to new format
        if (!parsedContent.generateTask) {
          // Create the generateTask structure
          parsedContent.generateTask = {
            isMultiple: false,
            task: {}
          };
          
          // If old format had direct task properties, move them to task object
          if (parsedContent.title || parsedContent.description) {
            parsedContent.generateTask.task = {
              title: parsedContent.title,
              description: parsedContent.description,
              priority: parsedContent.priority,
              tags: parsedContent.tags,
              dueDate: parsedContent.dueDate
            };
            
            // Delete the old properties
            delete parsedContent.title;
            delete parsedContent.description;
            delete parsedContent.priority;
            delete parsedContent.tags;
            delete parsedContent.dueDate;
          }
        }
        // Handle intermediary format where task properties were directly under generateTask
        else if (parsedContent.generateTask && !parsedContent.generateTask.task && 
                 (parsedContent.generateTask.title || parsedContent.generateTask.description)) {
          const taskContent = {
            title: parsedContent.generateTask.title,
            description: parsedContent.generateTask.description,
            priority: parsedContent.generateTask.priority,
            tags: parsedContent.generateTask.tags,
            dueDate: parsedContent.generateTask.dueDate
          };
          
          // Set isMultiple to false by default
          parsedContent.generateTask.isMultiple = false;
          // Add task under the task property
          parsedContent.generateTask.task = taskContent;
          
          // Delete the old direct properties
          delete parsedContent.generateTask.title;
          delete parsedContent.generateTask.description;
          delete parsedContent.generateTask.priority;
          delete parsedContent.generateTask.tags;
          delete parsedContent.generateTask.dueDate;
        }
      }
      
      // Make sure isMultiple is defined
      if (parsedContent.isGenerateTask && parsedContent.generateTask && 
          parsedContent.generateTask.isMultiple === undefined) {
        parsedContent.generateTask.isMultiple = false;
      }
      
      // Process due dates for all tasks
      if (parsedContent.isGenerateTask && parsedContent.generateTask) {
        if (parsedContent.generateTask.isMultiple && Array.isArray(parsedContent.generateTask.task)) {
          // Process due dates for multiple tasks
          parsedContent.generateTask.task.forEach(task => {
            if (task.dueDate && typeof task.dueDate === 'string') {
              const dateObj = new Date(task.dueDate);
              if (!isNaN(dateObj.getTime())) {
                task.dueDate = dateObj;
              } else {
                task.dueDate = null;
              }
            }
          });
        } 
        else if (!parsedContent.generateTask.isMultiple && parsedContent.generateTask.task) {
          // Process due date for a single task
          const task = parsedContent.generateTask.task;
          if (task.dueDate && typeof task.dueDate === 'string') {
            const dateObj = new Date(task.dueDate);
            if (!isNaN(dateObj.getTime())) {
              task.dueDate = dateObj;
            } else {
              task.dueDate = null;
            }
          }
        }
      }
      
      return parsedContent;
    }
    
    throw new Error('Could not extract valid JSON from AI response');
  } catch (error) {
    console.error('Error parsing AI response:', error);
    // Return object with isGenerateTask true as fallback
    return { 
      isGenerateTask: true,
      generateTask: {
        isMultiple: false,
        task: {}
      }
    }; 
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