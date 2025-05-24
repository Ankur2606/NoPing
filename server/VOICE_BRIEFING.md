# Voice Briefing Feature

This feature generates audio briefings from critical and action emails using Nebius AI for summarization and ElevenLabs for text-to-speech conversion.

## Setup

1. Add the following environment variables to your **server/.env** file:

```
# Nebius AI API Configuration (for summarization)
NEBIUS_API_KEY=your_nebius_api_key_here

# ElevenLabs Voice API Configuration (for text-to-speech)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel voice (default)
```

2. Make sure the `mp3` directory exists in the server folder (it will be created automatically if it doesn't exist).

3. You can run the setup helper to verify your environment configuration:

```
node server/scripts/setup-voice-briefing.js
```

## Usage

### Testing the Feature

Run the test script to verify the voice briefing functionality:

```
node scripts/testVoiceBriefing.js
```

This will process sample emails and generate an MP3 file in the `mp3` directory.

### API Integration

To integrate with the rest of your application:

```javascript
const { generateVoiceBriefing } = require('./scripts/voiceBriefingGenerator');

// Get emails from your data source
const emails = [...]; // Array of emails with project schema

// Generate voice briefing
const audioFilePath = await generateVoiceBriefing(emails, {
  fileName: `briefing_${userId}_${Date.now()}.mp3`,
  maxEmails: 5
});

// The function returns the path to the generated audio file
console.log(`Voice briefing saved to: ${audioFilePath}`);
```

### Telegram Integration

To send voice briefings via Telegram:

1. Set up a Telegram bot and add the bot token to your `.env` file:
```
TELEGRAM_BOT_API_KEY=your_telegram_bot_token
ENABLE_SCHEDULED_BRIEFINGS=true  # Set to true to enable daily briefings
```

2. Use the existing Telegram integration:
```javascript
// Start the Telegram bot with voice briefing commands
const TelegramBot = require('node-telegram-bot-api');
const { addVoiceBriefingCommands } = require('./scripts/telegramVoiceBriefing');

// Initialize bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_KEY, { polling: true });

// Add voice briefing commands
addVoiceBriefingCommands(bot);
```

## Voice Options

By default, the system uses Rachel's voice from ElevenLabs. You can change to other voices by modifying the `ELEVENLABS_VOICE_ID` environment variable.

Some common voice IDs:
- `21m00Tcm4TlvDq8ikWAM` - Rachel (warm, natural female)
- `AZnzlk1XvdvUeBnXmlld` - Domi (soft male)
- `EXAVITQu4vr4xnSDxMaL` - Bella (warm female)
- `ErXwobaYiN019PkySvjV` - Antoni (well-rounded male)

## Scheduling Voice Briefings

The Telegram integration already includes scheduling functionality. To enable it:

1. Make sure you have the necessary environment variables in your `.env` file:
```
TELEGRAM_BOT_API_KEY=your_telegram_bot_token
ENABLE_SCHEDULED_BRIEFINGS=true
```

2. Start the bot with the script that includes the voice briefing commands:
```javascript
// This will automatically set up scheduled briefings
const { addVoiceBriefingCommands, scheduleDailyBriefings } = require('./scripts/telegramVoiceBriefing');

// Add commands to the bot
addVoiceBriefingCommands(bot);

// Schedule daily briefings (8 AM by default)
scheduleDailyBriefings(bot, '0 8 * * *'); // Cron format: minute hour day_of_month month day_of_week
``` 