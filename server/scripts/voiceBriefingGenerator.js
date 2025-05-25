/**
 * Voice Briefing Generator
 * 
 * Analyzes emails and generates audio briefings using Nebius AI for summarization
 * and ElevenLabs for text-to-speech conversion.
 * Focus is on critical and action priority emails.
 */

// Load environment variables from server root if not already loaded
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI client with Nebius AI endpoint
const client = new OpenAI({
    baseURL: "https://api.studio.nebius.com/v1/",
    apiKey: process.env.NEBIUS_API_KEY
});

/**
 * Main function to generate voice briefing from emails
 * @param {Array} emails - List of emails following the project schema
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Path to the generated audio file
 */
async function generateVoiceBriefing(emails, options = {}) {
    try {
        // Default options
        const config = {
            outputDir: path.join(__dirname, '..', 'mp3'),
            fileName: `briefing_${Date.now()}.mp3`,
            maxEmails: 5,
            voice: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Default to Rachel voice
            voiceSettings: {
                stability: 0.5,
                similarity_boost: 0.75,
                speed: 1.2 // Maximum allowed speed by ElevenLabs API (1.0-1.2 range)
            },
            ...options
        };

        console.log(`Generating voice briefing from ${emails.length} emails...`);

        // Create output directory if it doesn't exist
        if (!fs.existsSync(config.outputDir)) {
            fs.mkdirSync(config.outputDir, { recursive: true });
        }

        // Filter emails by priority (critical first, then action if needed)
        const filteredEmails = filterAndSortEmails(emails, config.maxEmails);

        if (filteredEmails.length === 0) {
            console.log('No critical or action emails to brief.');
            return null;
        }

        // Generate a summary of the emails using Nebius AI
        const summary = await generateEmailSummary(filteredEmails);

        // Generate an audio briefing from the summary
        const audioFilePath = await generateAudio(summary, config);

        // Save text summary for reference
        const textFilePath = path.join(config.outputDir, config.fileName.replace('.mp3', '.txt'));
        fs.writeFileSync(textFilePath, summary);

        console.log(`Voice briefing generated and saved to: ${audioFilePath}`);
        return audioFilePath;
    } catch (error) {
        console.error('Error generating voice briefing:', error);
        throw error;
    }
}

/**
 * Filter emails by priority and sort by timestamp
 * @param {Array} emails - List of emails
 * @param {Number} maxEmails - Maximum number of emails to include
 * @returns {Array} - Filtered and sorted emails
 */
function filterAndSortEmails(emails, maxEmails) {
    if (!emails || !Array.isArray(emails)) {
        console.error('Invalid emails input:', emails);
        return [];
    }

    // First, separate critical and action emails
    const criticalEmails = emails.filter(email => email.priority === 'critical');
    const actionEmails = emails.filter(email => email.priority === 'action');

    // Sort each group by timestamp (newest first)
    const sortByTimestamp = (a, b) => new Date(b.timestamp) - new Date(a.timestamp);

    criticalEmails.sort(sortByTimestamp);
    actionEmails.sort(sortByTimestamp);

    // Combine critical emails first, then action emails if there's space
    const result = [...criticalEmails];

    // If we haven't filled the max email count with critical emails, add action emails
    if (result.length < maxEmails) {
        result.push(...actionEmails.slice(0, maxEmails - result.length));
    } else {
        // Truncate to max emails if we have more critical emails than the limit
        return result.slice(0, maxEmails);
    }

    return result;
}

/**
 * Generate a summary of the emails using Nebius AI
 * @param {Array} emails - Filtered list of emails
 * @returns {Promise<string>} - Summarized briefing text
 */
async function generateEmailSummary(emails) {
    try {
        // Prepare context from emails for the AI
        const emailContext = prepareEmailContext(emails);

        // Build prompt for the AI
        const prompt = buildSummaryPrompt(emailContext);

        // Call Nebius AI for the summary
        const response = await callNebiusAI(prompt);

        return response.trim();
    } catch (error) {
        console.error('Error generating email summary with AI:', error);

        // Fallback: Generate a basic summary without AI
        return generateBasicSummary(emails);
    }
}

/**
 * Prepare context from emails for the AI
 * @param {Array} emails - Filtered list of emails
 * @returns {Object} - Context object
 */
function prepareEmailContext(emails) {
    return {
        emailCount: emails.length,
        criticalCount: emails.filter(e => e.priority === 'critical').length,
        actionCount: emails.filter(e => e.priority === 'action').length,
        emails: emails.map(email => ({
            subject: email.subject,
            sender: email.from && email.from.name,
            senderEmail: email.from && email.from.email,
            priority: email.priority,
            content: email.content,
            timestamp: email.timestamp
        }))
    };
}

/**
 * Build the prompt for the AI to generate a voice-friendly summary
 * @param {Object} context - Email context
 * @returns {String} - AI prompt
 */
function buildSummaryPrompt(context) {
    return `
You are an AI assistant specializing in creating concise, clear spoken briefings that summarize important emails.

EMAIL CONTEXT:
- Total emails for briefing: ${context.emailCount}
- Critical priority emails: ${context.criticalCount}
- Action priority emails: ${context.actionCount}

EMAILS TO SUMMARIZE:
${context.emails.map((email, index) => `
EMAIL ${index + 1}:
Priority: ${email.priority.toUpperCase()}
From: ${email.sender} <${email.senderEmail}>
Subject: ${email.subject}
Time: ${new Date(email.timestamp).toLocaleString()}
Content: ${email.content}
`).join('\n')}

TASK:
Create a spoken briefing that summarizes these emails in a clear, conversational way.

GUIDELINES:
1. Start with a friendly greeting and overview (e.g., "Good [time of day]. You have [number] critical/important emails.")
2. Present critical emails first, followed by action emails
3. For each email, include:
   - Who it's from (name only)
   - A concise summary of the subject and key points
   - Any deadlines or urgent actions needed
4. Be concise but informative, focusing on what the recipient needs to know and do
5. Use natural, spoken language that sounds good when read aloud
6. End with a brief conclusion

The briefing should be easy to follow when listened to, not read. Aim for a professional but conversational tone that conveys urgency for critical items without causing unnecessary stress.
`;
}

/**
 * Call Nebius AI API for summary generation
 * @param {String} prompt - AI prompt
 * @returns {Promise<String>} - AI response
 */
async function callNebiusAI(prompt) {
  try {
    const response = await client.chat.completions.create({
      model: "Qwen/Qwen2.5-32B-Instruct",
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: 'You are a professional briefing assistant that creates concise spoken summaries optimized for voice delivery.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling Nebius AI API:', error.message);
    throw new Error('Failed to get response from AI service');
  }
}

/**
 * Generate a basic summary without AI as fallback
 * @param {Array} emails - Filtered list of emails
 * @returns {String} - Basic briefing text
 */
function generateBasicSummary(emails) {
  const currentTime = new Date();
  const hour = currentTime.getHours();
  
  let greeting = "Good morning";
  if (hour >= 12 && hour < 18) {
    greeting = "Good afternoon";
  } else if (hour >= 18) {
    greeting = "Good evening";
  }
  
  const criticalEmails = emails.filter(e => e.priority === 'critical');
  const actionEmails = emails.filter(e => e.priority === 'action');
  
  let summary = `${greeting}. Here's your email briefing.\n\n`;
  
  if (criticalEmails.length > 0) {
    summary += `You have ${criticalEmails.length} critical emails that require immediate attention.\n\n`;
    
    criticalEmails.forEach((email, index) => {
      const sender = email.from ? email.from.name : 'Unknown sender';
      summary += `Critical email ${index + 1}: From ${sender}. Subject: ${email.subject}.\n`;
      
      // Include a brief excerpt of the content
      const contentPreview = email.content.length > 100 ? 
        email.content.substring(0, 100) + '...' : 
        email.content;
      
      summary += `${contentPreview}\n\n`;
    });
  }
  
  if (actionEmails.length > 0) {
    summary += `You also have ${actionEmails.length} action emails.\n\n`;
    
    actionEmails.forEach((email, index) => {
      const sender = email.from ? email.from.name : 'Unknown sender';
      summary += `Action email ${index + 1}: From ${sender}. Subject: ${email.subject}.\n\n`;
    });
  }
  
  summary += "This concludes your email briefing.";
  return summary;
}

/**
 * Generate audio file using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} - Path to generated audio file
 */
async function generateAudio(text, config) {
  try {
    console.log('Generating audio with ElevenLabs API...');
    
    const outputPath = path.join(config.outputDir, config.fileName);
    
    // Check for ElevenLabs API key
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not defined in .env file');
    }
    
    // Make API request to ElevenLabs
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${config.voice}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      data: {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: config.voiceSettings.stability,
          similarity_boost: config.voiceSettings.similarity_boost,
          speed: config.voiceSettings.speed
        }
      },
      responseType: 'arraybuffer'
    });
    
    // Write response to file
    fs.writeFileSync(outputPath, response.data);
    console.log(`Audio file saved to: ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating audio:', error.message);
    
    if (error.response) {
      console.error('ElevenLabs API error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data ? error.response.data.toString() : 'No data'
      });
    }
    
    throw error;
  }
}

/**
 * Test function to generate a voice briefing from sample emails
 * @param {String} samplePath - Path to sample emails file
 * @returns {Promise<String>} - Path to generated audio file
 */
async function testWithSampleEmails(samplePath = '../scriptVoiceBriefing/sampleEmails.js') {
  try {
    let sampleEmails;
    try {
      // Try to load sample emails from the provided path
      sampleEmails = require(samplePath).sampleEmails;
    } catch (error) {
      console.error(`Failed to load sample emails from ${samplePath}:`, error.message);
      console.log('Using hardcoded sample emails instead...');
      
      // Fallback to hardcoded sample emails
      sampleEmails = [
        {
          type: 'email',
          content: 'We need to urgently fix the payment processing system. Multiple customers are reporting failures.',
          timestamp: new Date(),
          priority: 'critical',
          read: false,
          sourceId: 'email-001',
          from: { name: 'System Alert', email: 'alerts@example.com' },
          subject: 'URGENT: Payment System Down'
        },
        {
          type: 'email',
          content: 'Security audit deadline has been moved up. We need all teams to complete security reviews by end of week.',
          timestamp: new Date(),
          priority: 'critical',
          read: false,
          sourceId: 'email-002',
          from: { name: 'Security Team', email: 'security@example.com' },
          subject: 'Security Audit Timeline Change'
        }
      ];
    }
    
    console.log(`Using ${sampleEmails.length} sample emails for testing...`);
    return await generateVoiceBriefing(sampleEmails, {
      fileName: `test_briefing_${Date.now()}.mp3`
    });
  } catch (error) {
    console.error('Test failed:', error);
    return null;
  }
}

// If called directly (for testing)
if (require.main === module) {
  testWithSampleEmails()
    .then(filePath => {
      if (filePath) {
        console.log(`Test completed successfully. Audio file saved to: ${filePath}`);
      } else {
        console.log('Test completed but no audio file was generated.');
      }
    })
    .catch(error => {
      console.error('Test failed:', error);
    });
}

module.exports = { 
  generateVoiceBriefing,
  testWithSampleEmails
};