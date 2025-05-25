import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { messagesApi } from "@/services/api";
import { Message } from "@/services/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MessageDetailsDialog } from "@/components/MessageDetailsDialog";

// Helper function to format dates
type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

const formatTimeAgo = (timestamp: FirestoreTimestamp) => {
  const date = new Date(timestamp._seconds * 1000); // Convert to JavaScript Date
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  console.log('timestamp:', timestamp);
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
};


// Helper function to get sender name from different message types
const getMessageSender = (message: Message): string => {
  switch (message.type) {
    case "email":
      return message.from.name;
    case "slack":
      return message.sender.name;
    case "teams":
      return message.sender.name;
    default:
      return "Unknown";
  }
};

// Helper function to get subject/title from different message types
const getMessageSubject = (message: Message): string => {
  switch (message.type) {
    case "email":
      return message.subject;
    case "slack":
      return `${message.channel}`;
    case "teams":
      return `${message.channel}`;
    default:
      return "";
  }
};

// Helper function to get preview text
const getMessagePreview = (message: Message): string => {
  return message.content.length > 80 ? `${message.content.substring(0, 80)}...` : message.content;
};

export function PriorityMessages() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const priorityIcons = {
    critical: "🔴",
    action: "🟠",
    info: "🟢"
  };
  
  const sourceIcons = {
    email: "✉️",
    slack: "💬",
    teams: "👥"
  };
  
  // Load priority messages from API
  useEffect(() => {
    const fetchPriorityMessages = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await messagesApi.getPriorityMessages();
        setMessages(response.messages || []);
      } catch (err) {
        console.error("Error fetching priority messages:", err);
        setError("Failed to load priority messages");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPriorityMessages();
  }, [currentUser]);
  
  // Handle marking all messages as read
  const handleMarkAllRead = async () => {
    setLoading(true);
    
    try {
      // Process each message sequentially
      for (const message of messages.filter(m => !m.read)) {
        await messagesApi.markAsRead(message.id, true);
      }
      
      // Update local state after all API calls succeed
      setMessages(prevMessages => 
        prevMessages.map(message => ({ ...message, read: true }))
      );
      
      toast({
        title: "Success",
        description: "All messages marked as read",
      });
    } catch (err) {
      console.error("Error marking messages as read:", err);
      toast({
        title: "Error",
        description: "Failed to mark messages as read",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle marking a single message as read
  const handleMarkRead = async (id: string) => {
    try {
      await messagesApi.markAsRead(id, true);
      
      // Update local state
      setMessages(prevMessages => 
        prevMessages.map(message => 
          message.id === id ? { ...message, read: true } : message
        )
      );
      
      toast({
        title: "Success",
        description: "Message marked as read",
      });
    } catch (err) {
      console.error("Error marking message as read:", err);
      toast({
        title: "Error",
        description: "Failed to mark message as read",
        variant: "destructive"
      });
    }
  };
  
  // Handle opening message details dialog
  const handleViewDetails = (messageId: string) => {
    setSelectedMessageId(messageId);
    setIsDialogOpen(true);
  };

  // Handle closing message details dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedMessageId(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Priority Messages</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1"
          disabled={loading || !messages.some(m => !m.read)}
          onClick={handleMarkAllRead}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          <span>Mark all read</span>
        </Button>
      </CardHeader>
      <CardContent>
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No priority messages found
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "relative flex flex-col space-y-1 rounded-lg border p-4 animate-fade-in",
                  message.priority === "critical" && "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10",
                  message.priority === "action" && "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10",
                  message.priority === "info" && "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/5",
                  !message.read && "border-l-2 border-l-flowsync-purple"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span>{priorityIcons[message.priority || "info"]}</span>
                    <span>{sourceIcons[message.type]}</span>
                  </div>
                  <span className={cn(
                    "font-medium",
                    message.priority === "critical" && "priority-critical",
                    message.priority === "action" && "priority-action",
                    message.priority === "info" && "priority-info"
                  )}>
                    {getMessageSender(message)}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatTimeAgo(message.timestamp)}
                  </span>
                </div>
                <div className="font-medium">{getMessageSubject(message)}</div>
                {/* <div className="text-sm text-muted-foreground">{getMessagePreview(message)}</div> */}
                <div className="mt-2 flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/inbox?message=${message.id}`}>View</a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewDetails(message.id)}
                    className="gap-1"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Details
                  </Button>
                  {!message.read && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleMarkRead(message.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Message Details Dialog */}
      <MessageDetailsDialog
        messageId={selectedMessageId}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </Card>
  );
}
