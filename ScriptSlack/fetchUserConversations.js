require("dotenv").config();
const { WebClient } = require("@slack/web-api");
const userAuth = require("./auth/userAuth");

/**
 * Fetch and process conversation history using user-based authentication
 * This approach doesn't require a bot to be added to channels
 */
class UserConversationFetcher {
  constructor() {
    this.client = null;
  }

  /**
   * Initialize the WebClient with user token
   */
  async initialize() {
    try {
      // Get user token through authentication process
      const token = await userAuth.authenticate();
      this.client = new WebClient(token);
      console.log("Slack client initialized with user token");
    } catch (error) {
      console.error("Failed to initialize Slack client:", error);
      throw error;
    }
  }

  /**
   * List all conversations accessible to the user
   */
  async listConversations() {
    try {
      const result = await this.client.conversations.list({
        types: "public_channel,private_channel,im,mpim",
        exclude_archived: true,
        limit: 1000,
      });

      console.log(`Found ${result.channels.length} conversations`);
      return result.channels;
    } catch (error) {
      console.error("Error listing conversations:", error);
      throw error;
    }
  }

  /**
   * Get history for a specific conversation
   */
  async getConversationHistory(channelId, options = {}) {
    try {
      const result = await this.client.conversations.history({
        channel: channelId,
        limit: options.limit || 100,
        oldest: options.oldest,
        latest: options.latest,
      });

      return result.messages;
    } catch (error) {
      console.error(`Error fetching history for channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Get full paginated history for a specific conversation
   */
  async getPaginatedHistory(channelId, options = {}) {
    try {
      let allMessages = [];
      let cursor = null;
      let limit = options.limit || 200;
      let maxMessages = options.maxMessages || 1000;

      do {
        const response = await this.client.conversations.history({
          channel: channelId,
          cursor: cursor,
          limit: limit,
          oldest: options.oldest,
          latest: options.latest,
        });

        if (response.messages && response.messages.length > 0) {
          allMessages = [...allMessages, ...response.messages];
        }

        cursor = response.response_metadata?.next_cursor;

        // Break if we've reached our target message count
        if (allMessages.length >= maxMessages) {
          break;
        }
      } while (cursor);

      return allMessages;
    } catch (error) {
      console.error(
        `Error fetching paginated history for channel ${channelId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Fetch user info to enrich message data
   */
  async getUserInfo(userId) {
    try {
      const result = await this.client.users.info({
        user: userId,
      });
      return result.user;
    } catch (error) {
      console.error(`Error fetching user info for ${userId}:`, error);
      return { id: userId, name: "Unknown User" };
    }
  }

  /**
   * Process messages to add user details
   */
  async enrichMessagesWithUserData(messages) {
    const userCache = new Map();
    const enrichedMessages = [];

    for (const message of messages) {
      let userData;

      // Skip messages without a user (like bot messages or system messages)
      if (!message.user) {
        enrichedMessages.push(message);
        continue;
      }

      // Check cache first
      if (userCache.has(message.user)) {
        userData = userCache.get(message.user);
      } else {
        userData = await this.getUserInfo(message.user);
        userCache.set(message.user, userData);
      }

      // Add user data to message
      enrichedMessages.push({
        ...message,
        userData: {
          name: userData.real_name || userData.name,
          display_name: userData.profile?.display_name,
          image: userData.profile?.image_72,
        },
      });
    }

    return enrichedMessages;
  }
}

// Example usage
async function main() {
  try {
    const fetcher = new UserConversationFetcher();
    await fetcher.initialize();

    // List available conversations
    const conversations = await fetcher.listConversations();

    if (conversations.length === 0) {
      console.log("No conversations found");
      return;
    }

    // Display conversation options
    console.log("\nAvailable conversations:");
    conversations.forEach((channel, index) => {
      console.log(
        `${index + 1}. ${channel.name || channel.user || "Unknown"} (${
          channel.id
        })`
      );
    });

    // For demo purposes, use the first channel
    const selectedChannel = conversations[0];
    console.log(
      `\nFetching history for ${
        selectedChannel.name || "the selected conversation"
      } (${selectedChannel.id})`
    );

    // Get messages
    const messages = await fetcher.getPaginatedHistory(selectedChannel.id, {
      maxMessages: 50,
    });
    console.log(`Retrieved ${messages.length} messages`);

    // Enrich with user data
    const enrichedMessages = await fetcher.enrichMessagesWithUserData(messages);

    // Display some messages as example
    console.log("\nSample messages:");
    enrichedMessages.slice(0, 3).forEach((msg, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log(`From: ${msg.userData?.name || "Unknown"}`);
      console.log(`Text: ${msg.text || "(No text content)"}`);
      console.log(
        `Time: ${new Date(parseInt(msg.ts) * 1000).toLocaleString()}`
      );
    });
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

if (require.main === module) {
  main();
}

module.exports = UserConversationFetcher;
