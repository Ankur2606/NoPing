
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockAllMessages, mockEmails, mockSlackMessages, mockTeamsMessages } from "@/services/mockData";
import { Message } from "@/services/types";
import { Check, Clock, InboxIcon, RefreshCw, Settings, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper function to format dates
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
};

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

const Inbox = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [messages, setMessages] = useState<Message[]>(mockAllMessages);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    switch (value) {
      case "email":
        setMessages(mockEmails);
        break;
      case "slack":
        setMessages(mockSlackMessages);
        break;
      case "teams":
        setMessages(mockTeamsMessages);
        break;
      default:
        setMessages(mockAllMessages);
    }
    
    setSelectedMessage(null);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
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

  return (
    <Layout>
      <div className="space-y-4">
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
          className="space-y-4"
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
            <Card className="col-span-1 md:h-[calc(100vh-220px)] overflow-hidden">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex justify-between items-center">
                  Messages
                  <span className="text-xs bg-muted px-2 py-1 rounded-md">{messages.length} total</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-auto max-h-[calc(100vh-280px)]">
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
                            {formatDate(message.timestamp)}
                          </span>
                        </div>
                        <div className="font-medium text-sm mt-1">{subject}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {message.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-2 md:h-[calc(100vh-220px)] overflow-hidden">
              {selectedMessage ? (
                <>
                  <CardHeader className="py-4 border-b">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl">
                          {getMessageSubject(selectedMessage)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          From: {getMessageSender(selectedMessage)} • {formatDate(selectedMessage.timestamp)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
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
                      <p>{selectedMessage.content}</p>
                      
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
                      <Button variant="outline" className="ml-2">Convert to Task</Button>
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
