# Email Criticality Engine

A robust system for categorizing emails into three urgency levels based on content analysis:

1. **Critical**: Urgent messages requiring immediate attention
2. **Action Needed**: Messages requiring action but not immediate response
3. **Informational**: FYI messages requiring no immediate action

## Features

- **Email Retrieval**: Fetches emails from Gmail API with appropriate filtering
- **Content Analysis**: Uses the Qwen 2.5 32B model from Nebius AI for advanced classification
- **Firebase Integration**: Stores processed emails in the Firebase Firestore database
- **Scheduled Processing**: Runs periodically to process new emails

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- A Google Cloud Platform account with Gmail API enabled
- A Firebase project
- A Nebius AI Studio account (for access to the Qwen 2.5 model)

### Installation

1. Clone the repository
2. Navigate to the `scriptEmail` directory
3. Install dependencies: `npm install`

### Configuration

1. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   cp .env.example .env
   ```

2. Obtain OAuth 2.0 credentials from Google Cloud Console:
   - Go to Google Cloud Console > APIs & Services > Credentials
   - Create OAuth client ID for Desktop application
   - Download the credentials JSON file and save it as `credentials.json` in the `scriptEmail` directory

3. Configure Firebase:
   - Create a service account in Firebase Console
   - Download the service account key JSON file
   - Save it as `serviceAccountKey.json` in the `config` directory
   - OR set the appropriate environment variables in `.env`

4. Obtain a Nebius AI API key and add it to the `.env` file

### Usage

Run the application:
```
npm start
```

On first run, you'll need to authorize access to your Gmail account by:
1. Opening the provided URL in a browser
2. Signing in and granting permissions
3. Copying the authorization code back to the terminal

## How It Works

1. **Authentication**: Authenticates with Gmail API using OAuth 2.0
2. **Email Fetching**: Retrieves emails that match the specified filters
3. **Content Processing**: Extracts and parses email content
4. **Classification**: Analyzes emails with the Qwen 2.5 32B model
5. **Storage**: Stores processed emails in Firebase with appropriate labels
6. **Scheduled Processing**: Runs on a configurable interval (default: 2 hours)

## Classification Criteria

The system uses the following factors to determine email urgency:

- Urgency language ("urgent", "ASAP", "immediately")
- Explicit deadlines mentioned in the email
- Sender's role and relationship to recipient
- Direct requests vs. indirect FYI content
- Consequence of delayed response
- Time-sensitivity of the subject matter

## Integration

This system stores classified emails in the Firebase Firestore database, making them available for the FlowSync application's frontend to display in prioritized order.