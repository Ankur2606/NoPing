/**
 * Test Script for Voice Briefing Generator
 * 
 * This script tests the voice briefing generator with sample emails
 * and saves the output to the mp3 directory.
 */

// Load environment variables from server root
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { generateVoiceBriefing } = require('./voiceBriefingGenerator');
const path = require('path');
const fs = require('fs');

// Sample emails for testing (similar to the structure in scriptVoiceBriefing/sampleEmails.js)
const sampleEmails = [{
        type: 'email',
        content: 'We need to urgently fix the payment processing system. Multiple customers are reporting failures when trying to complete transactions. This is impacting our revenue significantly. Please address this as soon as possible.',
        timestamp: new Date(),
        priority: 'critical',
        read: false,
        sourceId: 'email-10001',
        from: {
            name: 'Sarah Chen',
            email: 'sarah.chen@example.com'
        },
        to: ['dev-team@company.com'],
        subject: 'URGENT: Payment System Down',
        attachments: [{
            filename: 'error_logs.txt',
            mimeType: 'text/plain',
            size: 25600
        }]
    },
    {
        type: 'email',
        content: 'Security audit deadline has been moved up. We need all teams to complete their security reviews by end of week instead of next month. Please prioritize this task as we need to submit compliance documentation to regulators.',
        timestamp: new Date(),
        priority: 'critical',
        read: false,
        sourceId: 'email-10003',
        from: {
            name: 'Alex Wong',
            email: 'security@example.com'
        },
        to: ['all-staff@company.com'],
        subject: 'URGENT: Security Audit Timeline Change',
        attachments: [{
            filename: 'security_checklist.pdf',
            mimeType: 'application/pdf',
            size: 1048576
        }]
    },
    {
        type: 'email',
        content: 'Server downtime alert: Our main production server has been experiencing intermittent outages in the past hour. The DevOps team is currently investigating. Please pause any deployments until further notice.',
        timestamp: new Date(),
        priority: 'critical',
        read: false,
        sourceId: 'email-10007',
        from: {
            name: 'System Alert',
            email: 'alerts@example.com'
        },
        to: ['it-staff@company.com', 'management@company.com'],
        subject: 'CRITICAL: Production Server Issues',
        attachments: []
    },
    {
        type: 'email',
        content: 'A critical security vulnerability has been identified in our authentication system. We need to implement the patch immediately. Please coordinate with the security team for deployment details.',
        timestamp: new Date(),
        priority: 'critical',
        read: false,
        sourceId: 'email-10010',
        from: {
            name: 'Security Officer',
            email: 'security-alerts@example.com'
        },
        to: ['development@company.com', 'ops@company.com'],
        subject: 'CRITICAL: Security Vulnerability - Immediate Action Required',
        attachments: [{
            filename: 'patch_details.txt',
            mimeType: 'text/plain',
            size: 15360
        }]
    },
    {
        type: 'email',
        content: 'The client meeting for the new project has been moved to tomorrow at 2 PM. Please make sure you\'ve reviewed the proposal documents I sent earlier this week. The client is particularly interested in our implementation timeline.',
        timestamp: new Date(),
        priority: 'action',
        read: false,
        sourceId: 'email-10002',
        from: {
            name: 'Michael Rodriguez',
            email: 'michael.r@example.com'
        },
        to: ['you@company.com'],
        subject: 'Client Meeting Rescheduled - Action Required',
        attachments: []
    },
    {
        type: 'email',
        content: 'We need to prepare the quarterly financial report by Friday. Please send me your department\'s expenditure data by Wednesday EOD. This is particularly important as we have the board meeting next week.',
        timestamp: new Date(),
        priority: 'action',
        read: false,
        sourceId: 'email-10005',
        from: {
            name: 'Finance Director',
            email: 'finance@example.com'
        },
        to: ['department-heads@company.com'],
        subject: 'Quarterly Financial Report Due',
        attachments: [{
            filename: 'financial_template.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: 768000
        }]
    }
];

/**
 * Run test for voice briefing generator
 */
async function runTest() {
    try {
        console.log('Starting voice briefing test...');

        // Check if required environment variables are set
        if (!process.env.NEBIUS_API_KEY) {
            console.warn('Warning: NEBIUS_API_KEY is not set. Falling back to basic summary.');
        }

        if (!process.env.ELEVENLABS_API_KEY) {
            console.error('Error: ELEVENLABS_API_KEY is not set. Voice generation will fail.');
            console.error('Please set this environment variable in your .env file.');
            process.exit(1);
        }

        // Custom file name for test
        const fileName = `test_briefing_${new Date().toISOString().replace(/[:.]/g, '-')}.mp3`;

        // Log what we're about to do
        const criticalEmails = sampleEmails.filter(e => e.priority === 'critical');
        const actionEmails = sampleEmails.filter(e => e.priority === 'action');

        console.log(`Processing ${sampleEmails.length} sample emails:`);
        console.log(`- ${criticalEmails.length} critical emails`);
        console.log(`- ${actionEmails.length} action emails`);
        console.log(`Output will be saved to: ${path.join(__dirname, '../mp3', fileName)}`);

        // Generate the briefing
        const result = await generateVoiceBriefing(sampleEmails, {
            fileName: fileName,
            maxEmails: 5
        });

        // Check the result
        if (result) {
            console.log('\n✅ Test completed successfully!');
            console.log(`Voice briefing saved to: ${result}`);

            // Also print the text version if available
            const textPath = result.replace('.mp3', '.txt');
            if (fs.existsSync(textPath)) {
                console.log('\nGenerated briefing text:');
                console.log('----------------------');
                console.log(fs.readFileSync(textPath, 'utf8'));
                console.log('----------------------');
            }
        } else {
            console.log('\n⚠️ Test completed but no audio file was generated.');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error);
    }
}

// Run the test
runTest();