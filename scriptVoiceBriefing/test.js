/**
 * Voice Briefing Test Script
 * 
 * This script tests the voice briefing generator with the sample emails
 */

const { generateVoiceBriefing } = require('./voiceBriefingGenerator');
const { sampleEmails } = require('./sampleEmails');

// Run test with custom options
async function runTest() {
    try {
        console.log('Starting voice briefing test...');
        console.log(`Found ${sampleEmails.length} sample emails to process`);

        // Filter and log counts by priority
        const critical = sampleEmails.filter(e => e.priority === 'critical');
        const action = sampleEmails.filter(e => e.priority === 'action');
        const info = sampleEmails.filter(e => e.priority === 'info');

        console.log(`Email counts by priority:`);
        console.log(`- Critical: ${critical.length}`);
        console.log(`- Action: ${action.length}`);
        console.log(`- Info: ${info.length} (these will be skipped)`);

        // Custom options
        const options = {
            outputDir: './output',
            fileName: `test_briefing_${new Date().toISOString().replace(/[:.]/g, '-')}.mp3`,
            maxEmails: 6, // Include more emails for testing
            includeIntro: true,
            includeOutro: true,
        };

        // Generate voice briefing
        const result = await generateVoiceBriefing(sampleEmails, options);

        if (result) {
            console.log('✅ Test completed successfully!');
            console.log(`Voice briefing saved to: ${result}`);
        } else {
            console.log('⚠️ Test completed but no audio was generated.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
runTest();