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
async function classifyEmailToMessage(email) {
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
            max_tokens: 100,
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `You're an expert email classifier for productivity workflows. Analyze each email and classify it strictly using ONLY these labels:

FLOW_CRITICAL = Critical (Immediate action required, time-sensitive consequences)  
FLOW_ACTION = Action Needed (Requires follow-up but not urgent)  
FLOW_INFO = Informational (No action needed, FYI only)

Consider the following factors in your reasoning:
- Urgency language ("urgent", "ASAP", "immediately", "by EOD")
- Explicit deadlines mentioned
- Sender's role/authority and relationship to recipient
- Direct requests vs indirect FYI
- Consequence of inaction or delayed response
- Whether the email requires a response
- Presence of actionable items or tasks
- Time-sensitivity of the subject matter

Respond ONLY with a JSON object in this exact format:
{"label": "FLOW_CRITICAL|FLOW_ACTION|FLOW_INFO", "reasoning": "brief explanation"}`
                },
                {
                    role: "user",
                    content: emailContent
                }
            ]
        });

        // Extract and parse the classification result
        const rawResponse = response.choices[0].message.content.trim();
        console.log(`Raw classification response: ${rawResponse}`);

        try {
            const classification = JSON.parse(rawResponse);
            
            // Validate that we got the expected structure
            if (!classification.label || !classification.reasoning) {
                throw new Error('Invalid response structure');
            }

            const validLabels = ['FLOW_CRITICAL', 'FLOW_ACTION', 'FLOW_INFO'];
            if (!validLabels.includes(classification.label)) {
                throw new Error(`Invalid label: ${classification.label}`);
            }

            // console.log(`Email classified as: ${classification.label} - ${classification.reasoning}`);
            return classification;

        } catch (parseError) {
            console.warn(`Failed to parse classification response: ${rawResponse}. Error: ${parseError.message}`);
            // Default fallback
            return {
                label: 'FLOW_INFO',
                reasoning: 'Classification failed, defaulted to informational'
            };
        }
    } catch (error) {
        console.error('Email classification error:', error);
        // Default to FLOW_INFO for any errors to avoid blocking the pipeline
        return {
                label: 'FLOW_INFO',
                reasoning: 'Classification failed, defaulted to informational'
            };
    }
}

module.exports = { classifyEmailToMessage };