/**
 * Gmail API Authentication Module
 * 
 * Provides OAuth 2.0 authentication for accessing Gmail API
 * Uses out-of-band flow for command line applications
 */

const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

// OAuth 2.0 scopes for Gmail API access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

// File paths for credentials and token storage
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.resolve(process.env.CREDENTIALS_PATH || path.join(__dirname, 'credentials.json'));

/**
 * Authorize Gmail API access using OAuth 2.0
 * @returns {Promise<OAuth2Client>} OAuth client for API requests
 */
async function authorize() {
  try {
    // Load client secrets from credentials file
    const content = await fs.readFile(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    
    // Create OAuth client
    const { client_secret, client_id } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      // Use 'urn:ietf:wg:oauth:2.0:oob' for out-of-band (command line) flow
      'urn:ietf:wg:oauth:2.0:oob'
    );
    
    try {
      // Try to load existing token
      const token = await fs.readFile(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
      return oAuth2Client;
    } catch (err) {
      // If token doesn't exist or is invalid, get a new one
      return await getNewToken(oAuth2Client);
    }
  } catch (error) {
    console.error('Error loading client credentials:', error);
    throw error;
  }
}

/**
 * Get a new OAuth 2.0 token via command line authorization flow
 * @param {OAuth2Client} oAuth2Client - OAuth client for generating auth URL
 * @returns {Promise<OAuth2Client>} Authorized OAuth client
 */
async function getNewToken(oAuth2Client) {
  // Generate authorization URL with out-of-band option
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    // Force approval prompt to ensure getting a refresh token
    prompt: 'consent'
  });
  
  console.log('Authorize this app by visiting this URL:', authUrl);
  console.log('After approval, you will receive a code to paste here.');
  
  // Wait for user to enter authorization code from browser
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  // Get authorization code from user
  const code = await new Promise((resolve) => {
    rl.question('Enter the code shown on the page: ', (code) => {
      rl.close();
      resolve(code);
    });
  });
  
  try {
    // Exchange authorization code for access token
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    
    // Save token for future use
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token stored to', TOKEN_PATH);
    
    return oAuth2Client;
  } catch (error) {
    console.error('Error retrieving access token:', error);
    throw error;
  }
}

module.exports = {
  authorize,
};