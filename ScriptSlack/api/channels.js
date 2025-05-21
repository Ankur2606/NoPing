module.exports = (client) => ({
    getChannelHistory: async (channelId) => {
      try {
        return await client.conversations.history({ channel: channelId });
      } catch (error) {
        console.error('Channel Error:', error);
        throw new Error('Failed to fetch channel history');
      }
    },
    
    getPaginatedHistory: async (channelId) => {
      let allMessages = [];
      let cursor = null;
      
      do {
        const response = await client.conversations.history({
          channel: channelId,
          cursor: cursor,
          limit: 200
        });
        
        allMessages = [...allMessages, ...response.messages];
        cursor = response.response_metadata?.next_cursor;
      } while (cursor);
  
      return allMessages;
    }
  });
  