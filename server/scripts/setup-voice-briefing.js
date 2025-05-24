/**
 * Voice Briefing Setup Helper
 * 
 * This script checks if the necessary environment variables for voice briefing
 * are present in the server's .env file and provides guidance if they aren't.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server root
const envPath = path.resolve(__dirname, '../.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
    console.error('❌ No .env file found in the server directory.');
    console.error('Please create a .env file in the server directory.');
    process.exit(1);
}

// Load .env file
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Check for required voice briefing environment variables
const missingVars = [];
const requiredVars = [
    'NEBIUS_API_KEY',
    'ELEVENLABS_API_KEY'
];

for (const varName of requiredVars) {
    if (!envConfig[varName] && !process.env[varName]) {
        missingVars.push(varName);
    }
}

// Check if ELEVENLABS_VOICE_ID is set, suggest default if not
if (!envConfig['ELEVENLABS_VOICE_ID'] && !process.env['ELEVENLABS_VOICE_ID']) {
    console.log('ℹ️ ELEVENLABS_VOICE_ID not found. Will use Rachel voice by default.');
    console.log('To specify a different voice, add ELEVENLABS_VOICE_ID to your .env file.');
}

// If any required variables are missing, show help
if (missingVars.length > 0) {
    console.error(`❌ The following required environment variables are missing from your .env file:`);
    missingVars.forEach(varName => console.error(`   - ${varName}`));

    console.log('\n📝 Please add these variables to your .env file in the server directory:');

    if (missingVars.includes('NEBIUS_API_KEY')) {
        console.log('\n# Nebius AI API for summarization (https://nebius.ai)');
        console.log('NEBIUS_API_KEY=your_nebius_api_key_here');
    }

    if (missingVars.includes('ELEVENLABS_API_KEY')) {
        console.log('\n# ElevenLabs for voice synthesis (https://elevenlabs.io)');
        console.log('ELEVENLABS_API_KEY=your_elevenlabs_api_key_here');
        console.log('# Rachel voice ID (warm, natural female voice)');
        console.log('ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM');
    }

    console.log('\n❓ For more information, see server/VOICE_BRIEFING.md');
    process.exit(1);
} else {
    console.log('✅ All required environment variables for voice briefing are present.');
    console.log('You can run the test script with: node scripts/testVoiceBriefing.js');
}