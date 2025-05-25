import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Clock, User, Mail, MessageSquare, Users } from "lucide-react";
import { Message } from "@/services/types";
import { messagesApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface MessageDetailsDialogProps {
  messageId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to format dates
type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

const formatDate = (timestamp: FirestoreTimestamp) => {
  const date = new Date(timestamp._seconds * 1000);
  return date.toLocaleString();
};

// Helper function to get sender info
const getSenderInfo = (message: Message) => {
  switch (message.type) {
    case "email":
      return {
        name: message.from.name,
        detail: message.from.email,
        icon: <Mail className="h-4 w-4" />
      };
    case "slack":
      return {
        name: message.sender.name,
        detail: `#${message.channel}`,
        icon: <MessageSquare className="h-4 w-4" />
      };
    case "teams":
      return {
        name: message.sender.name,
        detail: `${message.channel} • ${message.sender.email}`,
        icon: <Users className="h-4 w-4" />
      };
    default:
      return {
        name: "Unknown",
        detail: "",
        icon: <User className="h-4 w-4" />
      };
  }
};

// Helper function to get priority color
const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "action":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "info":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function MessageDetailsDialog({ messageId, isOpen, onClose }: MessageDetailsDialogProps) {
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMessageDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const messageData = await messagesApi.getMessage(id);
      setMessage(messageData);
    } catch (err) {
      console.error("Error fetching message details:", err);
      setError("Failed to load message details");
      toast({
        title: "Error",
        description: "Failed to load message details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (messageId && isOpen) {
      fetchMessageDetails(messageId);
    }
  }, [messageId, isOpen, fetchMessageDetails]);

  const handleClose = () => {
    setMessage(null);
    setError(null);
    onClose();
  };

  if (!messageId) return null;

  const senderInfo = message ? getSenderInfo(message) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Message Details</span>
            {message && (
              <Badge variant="outline" className={getPriorityColor(message.priority)}>
                {message.priority || "info"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Detailed information about this message including AI classification reasoning
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading message details...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            {error}
          </div>
        ) : message ? (
          <div className="space-y-6">
            {/* Header Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {senderInfo?.icon}
                <div>
                  <div className="font-medium">{senderInfo?.name}</div>
                  <div className="text-sm text-muted-foreground">{senderInfo?.detail}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatDate(message.timestamp)}
              </div>

              {message.type === "email" && (
                <div>
                  <div className="font-semibold text-lg">{message.subject}</div>
                  {message.to && message.to.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      To: {message.to.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Message Content */}
            {/* <div className="space-y-2">
              <h4 className="font-medium">Content</h4>
              <div className="bg-muted/30 rounded-lg p-4 whitespace-pre-wrap">
                {message.content}
              </div>
            </div> */}

            {/* Attachments (for email) */}
            {message.type === "email" && message.attachments && message.attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Attachments</h4>
                  <div className="space-y-2">
                    {message.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2 bg-muted/20 rounded">
                        <span className="font-medium">{attachment.name}</span>
                        <span className="text-muted-foreground">({attachment.type}, {(attachment.size / 1024).toFixed(1)}KB)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* AI Classification Reasoning */}
            {message.reasoning && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    🤖 AI Classification Reasoning
                  </h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm leading-relaxed">{message.reasoning}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This reasoning is stored on the blockchain and explains why this message was classified with the current priority level.
                  </p>
                </div>
              </>
            )}

            {/* Additional metadata for Slack/Teams */}
            {(message.type === "slack" || message.type === "teams") && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Additional Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Channel:</span>
                      <div className="text-muted-foreground">#{message.channel}</div>
                    </div>
                    {message.mentions && (
                      <div>
                        <span className="font-medium">Mentions:</span>
                        <div className="text-muted-foreground">You were mentioned</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Reactions for Slack */}
            {message.type === "slack" && message.reactions && message.reactions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Reactions</h4>
                <div className="flex gap-2 flex-wrap">
                  {message.reactions.map((reaction, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {reaction.emoji} {reaction.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
