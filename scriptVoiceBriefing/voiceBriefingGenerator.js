/**
 * Voice Briefing Generator
 * 
 * Processes emails by priority (critical first, then action)
 * and generates audio briefings using ElevenLabs API
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sampleEmails } = require('./sampleEmails');

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
            outputDir: path.join(__dirname, 'output'),
            fileName: `briefing_${Date.now()}.mp3`,
            maxEmails: 5,
            includeIntro: true,
            includeOutro: true,
            voice: process.env.ELEVENLABS_VOICE_ID || 'Rachel', // Default to 'Rachel' if not specified
            ...options
        };

        // Create output directory if it doesn't exist
        if (!fs.existsSync(config.outputDir)) {
            fs.mkdirSync(config.outputDir, { recursive: true });
        }

        // Filter emails by priority and sort by timestamp (newest first)
        const filteredEmails = filterAndSortEmails(emails, config.maxEmails);

        if (filteredEmails.length === 0) {
            console.log('No critical or action emails to brief.');
            return null;
        }

        // Generate briefing text
        const briefingText = generateBriefingText(filteredEmails, config);

        console.log('Generated briefing text:', briefingText);

        // Save text version (for debugging)
        const textFilePath = path.join(config.outputDir, config.fileName.replace('.mp3', '.txt'));
        fs.writeFileSync(textFilePath, briefingText);

        // Generate audio using ElevenLabs API
        const audioFilePath = await generateAudio(briefingText, config);

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
    // First, separate critical and action emails
    const criticalEmails = emails.filter(email => email.priority === 'critical');
    const actionEmails = emails.filter(email => email.priority === 'action');

    // Sort each group by timestamp (newest first)
    const sortByTimestamp = (a, b) => new Date(b.timestamp) - new Date(a.timestamp);

    criticalEmails.sort(sortByTimestamp);
    actionEmails.sort(sortByTimestamp);

    // Combine, with critical emails first, and limit to maxEmails
    return [...criticalEmails, ...actionEmails].slice(0, maxEmails);
}

/**
 * Generate briefing text from filtered emails
 * @param {Array} emails - Filtered list of emails
 * @param {Object} config - Configuration options
 * @returns {string} - Formatted briefing text
 */
function generateBriefingText(emails, config) {
    let briefingText = '';

    // Add intro if enabled
    if (config.includeIntro) {
        const currentTime = new Date();
        const greeting = getTimeBasedGreeting(currentTime);
        briefingText += `${greeting}. Here's your email briefing for ${currentTime.toLocaleDateString()}.\n\n`;
    }

    // Group emails by priority for better organization
    const criticalEmails = emails.filter(email => email.priority === 'critical');
    const actionEmails = emails.filter(email => email.priority === 'action');

    // Add critical emails section
    if (criticalEmails.length > 0) {
        briefingText += `You have ${criticalEmails.length} critical emails that require immediate attention.\n\n`;

        criticalEmails.forEach((email, index) => {
            briefingText += `Critical email ${index + 1}: From ${email.from.name}. Subject: ${email.subject}.\n`;
            briefingText += `${summarizeContent(email.content)}\n\n`;
        });
    }

    // Add action emails section
    if (actionEmails.length > 0) {
        briefingText += `You have ${actionEmails.length} action emails that require your attention.\n\n`;

        actionEmails.forEach((email, index) => {
            briefingText += `Action email ${index + 1}: From ${email.from.name}. Subject: ${email.subject}.\n`;
            briefingText += `${summarizeContent(email.content)}\n\n`;
        });
    }

    // Add outro if enabled
    if (config.includeOutro) {
        briefingText += "That's all for your current email briefing. Thank you for listening.";
    }

    return briefingText;
}

/**
 * Get time-appropriate greeting
 * @param {Date} date - Current date
 * @returns {string} - Greeting
 */
function getTimeBasedGreeting(date) {
    const hour = date.getHours();

    if (hour < 12) {
        return "Good morning";
    } else if (hour < 18) {
        return "Good afternoon";
    } else {
        return "Good evening";
    }
}

/**
 * Summarize email content to a reasonable length
 * @param {string} content - Email content
 * @param {number} maxLength - Maximum length of summary
 * @returns {string} - Summarized content
 */
function summarizeContent(content, maxLength = 200) {
    if (content.length <= maxLength) {
        return content;
    }

    // Find a good breakpoint (end of a sentence)
    const breakpoint = content.substring(0, maxLength).lastIndexOf('.');
    if (breakpoint > 0) {
        return content.substring(0, breakpoint + 1);
    }

    // If no good breakpoint, just truncate
    return content.substring(0, maxLength) + '...';
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
                    stability: 0.5,
                    similarity_boost: 0.75
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

// If called directly (for testing)
if (require.main === module) {
    // Create a sample .env file with instructions if it doesn't exist
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        const envContent = `# ElevenLabs API Configuration
# Sign up at https://elevenlabs.io/ to get an API key
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
`;
        fs.writeFileSync(envPath, envContent);
        console.log(`Created sample .env file at ${envPath}`);
        console.log('Please fill in your ElevenLabs API key before running.');
    }

    // Check if API key is set
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY === 'your_api_key_here') {
        console.error('Please set your ELEVENLABS_API_KEY in the .env file');
        process.exit(1);
    }

    // Run the briefing generator with sample emails
    generateVoiceBriefing(sampleEmails)
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

module.exports = { generateVoiceBriefing };