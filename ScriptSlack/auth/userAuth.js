/**
 * User Authentication Handler
 * This file handles user authentication for direct API access without bots
 */

const { WebClient } = require("@slack/web-api");
const fs = require("fs").promises;
const path = require("path");
const readline = require("readline");
const open = require("open");

// Path to store user token for persistence
const TOKEN_PATH = path.join(__dirname, "../.user_token");

/**
 * Handles obtaining and storing a user token through OAuth
 */
class UserAuth {
  constructor() {
    this.clientId = process.env.SLACK_CLIENT_ID;
    this.clientSecret = process.env.SLACK_CLIENT_SECRET;
    this.redirectUri =
      process.env.REDIRECT_URI || "http://localhost:3000/oauth_callback";
    this.scopes = [
      "channels:history",
      "channels:read",
      "groups:history",
      "im:history",
      "mpim:history",
      "users:read",
    ];
  }

  /**
   * Get the authorization URL for user to grant access
   */
  getAuthUrl() {
    const scopeString = this.scopes.join(",");
    return `https://slack.com/oauth/v2/authorize?client_id=${this.clientId}&scope=${scopeString}&redirect_uri=${this.redirectUri}`;
  }

  /**
   * Start the authentication flow
   */
  async authenticate() {
    try {
      // Check if we already have a token saved
      const existingToken = await this.loadSavedToken();
      if (existingToken) {
        return existingToken;
      }

      // No saved token, start OAuth flow
      const authUrl = this.getAuthUrl();
      console.log("Please visit this URL to authorize the application:");
      console.log(authUrl);

      // Open the browser to the auth URL
      await open(authUrl);

      // Prompt for the authorization code
      const code = await this.promptForCode();

      // Exchange the code for a token
      const token = await this.exchangeCodeForToken(code);

      // Save the token for future use
      await this.saveToken(token);

      return token;
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  }

  /**
   * Prompt user to enter the authorization code
   */
  async promptForCode() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question("Enter the code from the redirect URL: ", (code) => {
        rl.close();
        resolve(code);
      });
    });
  }

  /**
   * Exchange an authorization code for an access token
   */
  async exchangeCodeForToken(code) {
    const client = new WebClient();
    const response = await client.oauth.v2.access({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.error}`);
    }

    return response.authed_user.access_token;
  }

  /**
   * Save the token to a file for persistence
   */
  async saveToken(token) {
    await fs.writeFile(TOKEN_PATH, token);
    console.log(`Token saved to ${TOKEN_PATH}`);
  }

  /**
   * Load a previously saved token
   */
  async loadSavedToken() {
    try {
      const token = await fs.readFile(TOKEN_PATH, "utf8");
      return token;
    } catch (error) {
      // No saved token
      return null;
    }
  }
}

module.exports = new UserAuth();
