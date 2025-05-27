import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Message } from "@/services/types";
import { Check, Clock, InboxIcon, RefreshCw, Settings, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { messagesApi } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from 'react-router-dom';
import { formatTimeAgo } from "@/lib/utils";

// Helper function to get source icon
const getSourceIcon = (message: Message) => {
  switch (message.type) {
    case "email":
      return "✉️";
    case "slack":
      return "💬";
    case "teams":
      return "👥";
    default:
      return "📄";
  }
};

// Helper function to get priority icon and class
const getPriorityInfo = (priority: string | undefined) => {
  switch (priority) {
    case "critical":
      return { icon: "🔴", className: "priority-critical" };
    case "action":
      return { icon: "🟠", className: "priority-action" };
    case "info":
      return { icon: "🟢", className: "priority-info" };
    default:
      return { icon: "⚪", className: "" };
  }
};

// Helper function to check if content is HTML
const isHtmlContent = (content: string): boolean => {
  return /<[a-z][\s\S]*>/i.test(content);
};

// Helper function to check if content needs HTML entity cleanup
const needsHtmlEntityCleanup = (content: string): boolean => {
  return /&[a-zA-Z]+;|&nbsp;|&zwnj;|&zwsp;/.test(content);
};

// Helper function to check if content is Markdown
const isMarkdownContent = (content: string): boolean => {
  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m,           // Headers (#, ##, ###, etc.)
    /\*\*.*?\*\*/,           // Bold text
    /\*.*?\*/,               // Italic text
    /`.*?`/,                 // Inline code
    /```[\s\S]*?```/,        // Code blocks
    /^\s*[-*+]\s+/m,         // Unordered lists
    /^\s*\d+\.\s+/m,         // Ordered lists
    /\[.*?\]\(.*?\)/,        // Links
    /!\[.*?\]\(.*?\)/,       // Images
    /^\s*>\s+/m,             // Blockquotes
    /^\s*\|.*\|.*\|/m,       // Tables
    /^---+$/m,               // Horizontal rules
    /~~.*?~~/,               // Strikethrough
  ];
  
  return markdownPatterns.some(pattern => pattern.test(content));
};

// Helper function to clean HTML entities and format text content
const cleanHtmlEntities = (content: string): string => {
  let cleaned = content;
    // Common HTML entities
  const entities = {
    '&nbsp;': ' ',
    '&zwnj;': '',
    '&zwsp;': '',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&hellip;': '...',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"'
  };
  
  // Replace HTML entities
  Object.entries(entities).forEach(([entity, replacement]) => {
    cleaned = cleaned.replace(new RegExp(entity, 'g'), replacement);
  });
  
  // Clean up excessive whitespace and line breaks
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Add line breaks for better readability
  cleaned = cleaned.replace(/(\. )([A-Z])/g, '$1\n\n$2'); // Add breaks after sentences
  cleaned = cleaned.replace(/(Apply now|Today|Internship)(\s+)/g, '$1\n\n'); // Break after common patterns
  cleaned = cleaned.replace(/(\d+\s*days?\s*ago|\d+\s*weeks?\s*ago|Today)(\s+)/g, '$1\n');
  
  return cleaned;
};

// Helper function to format URLs and make them clickable
const formatUrls = (content: string): string => {
  // Replace URLs with clickable links
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  return content.replace(urlRegex, (url) => {
    // Clean up URL (remove trailing punctuation)
    const cleanUrl = url.replace(/[.,;:!?]+$/, '');
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${cleanUrl}</a>`;
  });
};
const parseMarkdownToHtml = (content: string): string => {
  let html = content;
  
  // Headers
  html = html.replace(/^#{6}\s+(.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#{5}\s+(.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4}\s+(.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^#{3}\s+(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#{2}\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#{1}\s+(.*)$/gm, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Strikethrough
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />');
  
  // Blockquotes
  html = html.replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');
  
  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr />');
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br />');
  
  // Unordered lists
  html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
  
  // Basic table support
  html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split('|').map(cell => cell.trim());
    const cellsHtml = cells.map(cell => `<td>${cell}</td>`).join('');
    return `<tr>${cellsHtml}</tr>`;
  });
  html = html.replace(/(<tr>.*<\/tr>)/s, '<table class="border-collapse border border-gray-300">$1</table>');
  
  // Wrap in paragraph if no block elements
  if (!html.includes('<h') && !html.includes('<p') && !html.includes('<ul') && !html.includes('<ol') && !html.includes('<blockquote') && !html.includes('<pre')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
};

// Helper function to safely render content (HTML, Markdown, or plain text)
const renderMessageContent = (content: string) => {
  if (isHtmlContent(content)) {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  } else if (isMarkdownContent(content)) {
    const htmlContent = parseMarkdownToHtml(content);
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} className="markdown-content" />;
  } else if (needsHtmlEntityCleanup(content)) {
    // Clean HTML entities and format URLs for plain text with entities
    const cleanedContent = cleanHtmlEntities(content);
    const formattedContent = formatUrls(cleanedContent);
    return (
      <div 
        className="whitespace-pre-wrap" 
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
    );
  }
  
  // Regular plain text
  const formattedContent = formatUrls(content);
  return (
    <div 
      className="whitespace-pre-wrap" 
      dangerouslySetInnerHTML={{ __html: formattedContent }}
    />
  );
};

const Inbox = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalMessages, setTotalMessages] = useState(0);

  // Load messages from API
  const fetchMessages = useCallback(async (type: "email" | "slack" | "teams" | "all" = 'all') => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params: {
        type?: "email" | "slack" | "teams" | "all";
        limit?: number;
        offset?: number;
      } = {
        limit: 50  // Fetch more messages initially
      };
      
      // If not fetching all messages, add type filter
      if (type !== 'all') {
        params.type = type;
      }
      
      const response = await messagesApi.getMessages(params);
      
      setMessages(response.messages || []);
      setTotalMessages(response.total || 0);
      
      // Check for message ID in URL search params and select that message if present
      const messageId = searchParams.get('message');
      if (messageId) {
        const selectedMsg = response.messages.find(msg => msg.id === messageId);
        if (selectedMsg) {
          setSelectedMessage(selectedMsg);
          
          // Mark as read if not already read
          if (!selectedMsg.read) {
            await messagesApi.markAsRead(messageId, true);
          }
        }
      }
      
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, searchParams, toast]);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, []);

  const handleTabChange = (value: "email" | "slack" | "teams" | "all") => {
    setActiveTab(value);
    setSelectedMessage(null);
    
    // Update search params to remove message ID when switching tabs
    if (searchParams.has('message')) {
      searchParams.delete('message');
      setSearchParams(searchParams);
    }
    
    // Fetch messages for the selected tab
    fetchMessages(value);
  };

  const handleRefresh = () => {
    fetchMessages(activeTab as "email" | "slack" | "teams" | "all");
  };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    
    // Update URL to include selected message ID
    searchParams.set('message', message.id);
    setSearchParams(searchParams);
    
    // Mark as read if not already read
    if (!message.read) {
      try {
        await messagesApi.markAsRead(message.id, true);
        
        // Update the local message state to show as read
        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, read: true } : msg
        ));
      } catch (err) {
        console.error("Error marking message as read:", err);
      }
    }
  };

  const handleMarkAsRead = async () => {
    if (!selectedMessage) return;
    
    try {
      await messagesApi.markAsRead(selectedMessage.id, true);
      
      // Update local state
      setSelectedMessage(prev => prev ? { ...prev, read: true } : null);
      setMessages(prev => prev.map(msg => 
        msg.id === selectedMessage.id ? { ...msg, read: true } : msg
      ));
      
      toast({
        title: "Success",
        description: "Message marked as read"
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

  const handleConvertToTask = async () => {
    if (!selectedMessage) return;
    
    try {
      const result = await messagesApi.convertToTask(selectedMessage.id, {
        priority: selectedMessage.priority === 'critical' ? 'high' : 
                 selectedMessage.priority === 'action' ? 'medium' : 'low'
      });

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Success",
        description: "Message converted to task successfully"
      });
    } catch (err) {
      console.error("Error converting message to task:", err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const getMessageSender = (message: Message) => {
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

  const getMessageSubject = (message: Message) => {
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
  
  // Show loading state while initializing
  if (isLoading && messages.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </Layout>
    );
  }
  
  // Show error state if there was an error
  if (error && messages.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Failed to load messages</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Unified Inbox</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Customize
            </Button>
          </div>
        </div>
        
        <Tabs 
          defaultValue="all" 
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="slack">Slack</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Action
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Info
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="col-span-1 md:h-[calc(100vh-180px)] overflow-hidden">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex justify-between items-center">
                  Messages
                  <span className="text-xs bg-muted px-2 py-1 rounded-md">{totalMessages} total</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-auto max-h-[calc(100vh-240px)]">
                {isLoading && messages.length > 0 ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length > 0 ? (
                  <div className="divide-y">
                    {messages.map((message) => {
                      const priorityInfo = getPriorityInfo(message.priority);
                      const sourceIcon = getSourceIcon(message);
                      const sender = getMessageSender(message);
                      const subject = getMessageSubject(message);
                      
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                            selectedMessage?.id === message.id && "bg-muted",
                            !message.read && "border-l-2 border-l-flowsync-purple"
                          )}
                          onClick={() => handleSelectMessage(message)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span>{priorityInfo.icon}</span>
                              <span>{sourceIcon}</span>
                            </div>
                            <span className={cn("font-medium", priorityInfo.className)}>
                              {sender}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {formatTimeAgo(message.timestamp)}
                            </span>
                          </div>
                          <div className="font-medium text-sm mt-1">{subject}</div>
                          {/* <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {message.content}
                          </div> */}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages found
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="col-span-2 md:h-[calc(100vh-180px)] overflow-hidden">
              {selectedMessage ? (
                <>
                  <CardHeader className="py-4 border-b">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">
                          {getMessageSubject(selectedMessage)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          From: {getMessageSender(selectedMessage)} • {formatTimeAgo(selectedMessage.timestamp)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={selectedMessage.read}
                          onClick={handleMarkAsRead}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Read
                        </Button>
                        <Button variant="outline" size="sm">
                          <Star className="h-4 w-4 mr-1" />
                          Star
                        </Button>
                        <Button variant="outline" size="sm">
                          <Clock className="h-4 w-4 mr-1" />
                          Snooze
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 overflow-auto max-h-[calc(100vh-330px)]">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {renderMessageContent(selectedMessage.content)}
                      
                      {selectedMessage.type === "email" && selectedMessage.attachments && (
                        <div className="mt-6 border-t pt-4">
                          <h3 className="text-sm font-medium mb-2">Attachments</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedMessage.attachments.map((attachment, index) => (
                              <div 
                                key={index}
                                className="border rounded-md p-2 flex items-center gap-2"
                              >
                                <span className="text-muted-foreground">📎</span>
                                <div>
                                  <p className="text-sm font-medium">{attachment.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(attachment.size / 1000000).toFixed(1)} MB
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedMessage.type === "slack" && selectedMessage.reactions && (
                        <div className="mt-4 flex gap-2">
                          {selectedMessage.reactions.map((reaction, index) => (
                            <div key={index} className="bg-muted rounded-full px-2 py-1 text-xs flex items-center gap-1">
                              <span>{reaction.emoji}</span>
                              <span>{reaction.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-8">
                      <Button>Reply</Button>
                      <Button 
                        variant="outline" 
                        className="ml-2"
                        onClick={handleConvertToTask}
                      >
                        Convert to Task
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <InboxIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">Select a message</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose a message from the list to view its contents
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Inbox;
