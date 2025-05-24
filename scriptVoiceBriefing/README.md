# Voice Briefing Generator

This module generates audio briefings from emails using the ElevenLabs text-to-speech API. It filters emails by priority (critical first, then action) and converts the most important content into spoken audio.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `env.example` to `.env`:
   ```
   cp env.example .env
   ```

3. Sign up for an account at [ElevenLabs](https://elevenlabs.io) and get your API key

4. Edit `.env` and add your ElevenLabs API key and voice ID

## Usage

### Run the test script

This will use the sample emails included in the module:

```
npm test
```

### Integrate with your code

```javascript
const { generateVoiceBriefing } = require('./voiceBriefingGenerator');
const emails = [...]; // Your email array with the project schema

// Generate voice briefing
generateVoiceBriefing(emails, {
  outputDir: './output',
  maxEmails: 5,
  includeIntro: true,
  includeOutro: true,
  voice: process.env.ELEVENLABS_VOICE_ID || 'Rachel'
})
  .then(audioPath => {
    console.log(`Voice briefing saved to: ${audioPath}`);
  })
  .catch(error => {
    console.error('Error generating voice briefing:', error);
  });
```

## Configuration Options

- `outputDir`: Directory where audio files will be saved (default: `./output`)
- `fileName`: Name of the output audio file (default: `briefing_[timestamp].mp3`)
- `maxEmails`: Maximum number of emails to include in briefing (default: 5)
- `includeIntro`: Include introductory greeting (default: true)
- `includeOutro`: Include closing message (default: true)
- `voice`: ElevenLabs voice ID to use (default: from .env or 'Rachel')

## Email Schema

The module expects emails in the following format:

```javascript
{
  type: 'email',
  content: 'Email body text...',
  timestamp: new Date(), // Date object representing when email was received
  priority: 'critical', // one of: 'critical', 'action', 'info'
  read: false, // boolean indicating if email has been read
  sourceId: 'unique-id',
  from: {
    name: 'Sender Name',
    email: 'sender@example.com'
  },
  to: ['recipient@example.com'],
  subject: 'Email Subject',
  attachments: [] // array of attachment objects
}
```

Only emails with priority 'critical' or 'action' will be included in the briefing. 