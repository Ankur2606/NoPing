import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { messagesApi } from '../../services/api';
import { Message } from '../../services/types';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

/**
 * Example component that demonstrates API integration between client and server
 * This component shows how to:
 * 1. Use the authentication context
 * 2. Make authenticated API calls to the server
 * 3. Handle loading and error states
 */
const MessagesDataLoader = () => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to load messages from the server
  const loadMessages = useCallback(async () => {
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await messagesApi.getMessages();
      console.log('API response:', response); // Debug the response structure
      
      // Ensure we have an array of messages
      let messageArray: Message[] = [];
      
      if (Array.isArray(response)) {
        messageArray = response;
      } else if (response && typeof response === 'object' && 'messages' in response) {
        // This handles the case where the API returns {messages: Message[]}
        messageArray = (response as {messages: Message[]}).messages;
      }
      
      setMessages(messageArray);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load messages when component mounts
  useEffect(() => {
    if (currentUser) {
      loadMessages();
    }
  }, [currentUser, loadMessages]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
        <CardDescription>
          {userProfile ? `Welcome, ${userProfile.displayName}` : 'Loading profile...'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="p-4 text-center">Loading messages...</div>
        ) : error ? (
          <div className="p-4 text-red-500">{error}</div>
        ) : (
          <div>
            {messages.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No messages found</div>
            ) : (
              <ul className="space-y-2">
                {messages?.map((message) => (
                  <li key={message.id} className="border p-3 rounded">
                    <div className="font-medium">
                      {message.type === 'email' && `From: ${message.from.name}`}
                      {message.type === 'slack' && `From: ${message.sender.name} in ${message.channel}`}
                      {message.type === 'teams' && `From: ${message.sender.name} in ${message.channel}`}
                    </div>
                    <p className="text-sm text-gray-600">{message.content}</p>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(message.timestamp).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button 
              onClick={loadMessages} 
              className="mt-4"
              disabled={loading}
            >
              Refresh Messages
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MessagesDataLoader;