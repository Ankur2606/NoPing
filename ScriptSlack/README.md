# ScriptSlack Testing Guide

## Prerequisites

- A Slack workspace with admin access
- A Slack bot token with appropriate permissions

## Setup Instructions

1. **Configure your Slack bot token:**

   - Edit the `.env` file and replace `xoxb-YOUR_SLACK_BOT_TOKEN_HERE` with your actual bot token
   - Your bot needs the following scopes:
     - `channels:history`
     - `channels:read`
     - `users:read`
     - `files:read`

2. **Invite Your Bot to the Channel:**

   - This is critical! The error `not_in_channel` means your bot isn't a member of the channel
   - In Slack, open the channel you want to test
   - Type `/invite @YourBotName` replacing YourBotName with your actual bot's name
   - Alternatively, use the conversations.join method in the test script (see Option 2 below)

3. **Get a valid Channel ID:**

   - Open your Slack workspace in a browser
   - Navigate to the channel you want to test
   - The channel ID is in the URL: `https://app.slack.com/client/TEAM_ID/CHANNEL_ID`
   - Copy the CHANNEL_ID part

4. **Edit the test script:**
   - Open `testChannels.js`
   - Replace `YOUR_CHANNEL_ID` with the actual channel ID from step 3

## Running the Test

```bash
node testChannels.js
```

This will return messages from the specified channel using both regular and paginated methods.

## Troubleshooting

- **Error: An API error occurred: not_authed**

  - Your bot token is invalid or missing
  - Check the `.env` file and ensure SLACK_BOT_TOKEN is properly set

- **Error: An API error occurred: not_in_channel**

  - Your bot isn't a member of the channel you're trying to access
  - Invite the bot to the channel using `/invite @YourBotName` in Slack
  - Or modify the test script to use conversations.join (see Option 2 in the docs)

- **Error: An API error occurred: channel_not_found**
  - The channel ID is incorrect
  - Make sure you're using a channel ID that your bot has been invited to
