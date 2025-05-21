require("dotenv").config();
const slackClient = require("./slackClient");

async function testChannelHistory() {
  try {
    // Replace with a valid channel ID from your Slack workspace
    const channelId = "C08PBJETN79";

    // First try to join the channel to handle the not_in_channel error automatically
    console.log(`Attempting to join channel ${channelId}...`);
    try {
      await slackClient.client.conversations.join({ channel: channelId });
      console.log("Successfully joined the channel or was already a member");
    } catch (joinError) {
      console.warn(`Warning: Could not join channel: ${joinError.message}`);
      if (joinError.data?.error === "method_not_supported_for_channel_type") {
        console.log(
          "Note: You cannot programmatically join private channels or DMs."
        );
        console.log(
          "For private channels, manually add the bot using /invite @YourBotName"
        );
      }
    }

    console.log("\nTesting getChannelHistory:");
    const history = await slackClient.channels.getChannelHistory(channelId);
    console.log(`Retrieved ${history.messages?.length || 0} messages`);

    console.log("\nTesting getPaginatedHistory:");
    const paginatedHistory = await slackClient.channels.getPaginatedHistory(
      channelId
    );
    console.log(`Total messages retrieved: ${paginatedHistory.length}`);

    // Display the first message as a sample
    if (paginatedHistory.length > 0) {
      console.log("\nSample message:");
      console.log(JSON.stringify(paginatedHistory[0], null, 2));
    }
  } catch (error) {
    console.error("Error testing channel API:", error.message);

    if (error.data?.error === "not_in_channel") {
      console.error("\nThe bot is not a member of this channel!");
      console.error(
        "Please invite the bot to the channel using /invite @YourBotName in Slack"
      );
    } else {
      console.error(error);
    }
  }
}

testChannelHistory();
