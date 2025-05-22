/**
 * Email Classification Service
 * 
 * Uses Qwen 2.5 32B model from Nebius AI to classify emails into three categories:
 * - FLOW_CRITICAL: Urgent messages requiring immediate attention
 * - FLOW_ACTION: Messages requiring action but not immediate response
 * - FLOW_INFO: FYI messages requiring no immediate action
 */

require('dotenv').config();
const { OpenAI } = require('openai');

// Initialize OpenAI client with Nebius AI endpoint
const client = new OpenAI({
    baseURL: "https://api.studio.nebius.com/v1/",
    apiKey: process.env.NEBIUS_API_KEY
});

/**
 * Classifies email content using the Qwen 2.5 32B model
 * 
 * @param {Object} email - Email object containing metadata and content
 * @param {string} email.from - Email sender
 * @param {string} email.subject - Email subject
 * @param {string} email.body - Email body text
 * @returns {Promise<string>} - Returns classification label: FLOW_CRITICAL, FLOW_ACTION, or FLOW_INFO
 */
async function classifyEmail(email) {
    try {
        // Create a comprehensive prompt with email metadata and content
        const emailContent = `
From: ${email.from}
Subject: ${email.subject}
---
${email.body.substring(0, 4000)} // Limiting to 4000 chars to avoid token limits
`;

        // console.log(`Classifying email: "${email.subject.substring(0, 50)}${email.subject.length > 50 ? '...' : ''}"`);
        
        const response = await client.chat.completions.create({
            model: "Qwen/Qwen2.5-32B-Instruct",
            max_tokens: 10,
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `You're an expert email classifier for productivity workflows. Analyze each email and classify it strictly using ONLY these labels:

FLOW_CRITICAL = Critical (Immediate action required, time-sensitive consequences)
FLOW_ACTION = Action Needed (Requires follow-up but not urgent)
FLOW_INFO = Informational (No action needed, FYI only)

Consider these factors when classifying:
- Urgency language ("urgent", "ASAP", "immediately", "by EOD")
- Explicit deadlines mentioned in the email
- Sender's role/authority and relationship to recipient
- Direct requests vs indirect FYI
- Consequence of inaction or delayed response
- Whether the email requires a response or is just informational
- Presence of actionable items or requests
- Time-sensitivity of the subject matter

Respond ONLY with one of these labels: FLOW_CRITICAL, FLOW_ACTION, or FLOW_INFO. Provide NO other text.`
                },
                {
                    role: "user",
                    content: emailContent
                }
            ]
        });

        // Extract and validate the classification result
        const classification = response.choices[0].message.content.trim();
        
        // Validate that we got one of the expected classification labels
        const validLabels = ['FLOW_CRITICAL', 'FLOW_ACTION', 'FLOW_INFO'];
        if (!validLabels.includes(classification)) {
            console.warn(`Unexpected classification result: ${classification}. Defaulting to FLOW_INFO.`);
            return 'FLOW_INFO';
        }
        
        return classification;
    } catch (error) {
        console.error('Email classification error:', error);
        // Default to FLOW_INFO for any errors to avoid blocking the pipeline
        return 'FLOW_INFO';
    }
}

module.exports = { classifyEmail };