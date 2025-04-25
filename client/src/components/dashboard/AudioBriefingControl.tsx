import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface MessageHistory {
  id: string;
  message: string;
  timestamp: string;
  status: "delivered" | "failed" | "pending";
}

// Mock data for message history
const initialMessages: MessageHistory[] = [
  {
    id: "1",
    message: "Daily summary briefing sent to Telegram",
    timestamp: "Today, 9:00 AM",
    status: "delivered"
  },
  {
    id: "2",
    message: "Meeting reminder with Product team",
    timestamp: "Yesterday, 2:30 PM",
    status: "delivered"
  },
  {
    id: "3",
    message: "Task deadline notification",
    timestamp: "Apr 24, 4:15 PM",
    status: "delivered"
  },
  {
    id: "4",
    message: "Weekend analytics report",
    timestamp: "Apr 22, 10:00 AM", 
    status: "delivered"
  }
];

export function AudioBriefingControl() {
  const [audioBriefingEnabled, setAudioBriefingEnabled] = useState(true);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>(initialMessages);

  const handleToggleChange = (checked: boolean) => {
    setAudioBriefingEnabled(checked);
    // In a real implementation, this would also update the backend setting
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Audio Briefing</CardTitle>
        <div className="flex items-center space-x-2">
          <Label htmlFor="audio-briefing" className="text-sm text-muted-foreground">
            {audioBriefingEnabled ? "On" : "Off"}
          </Label>
          <Switch 
            id="audio-briefing" 
            checked={audioBriefingEnabled} 
            onCheckedChange={handleToggleChange} 
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {audioBriefingEnabled 
            ? "Telegram messages will be sent automatically for important notifications." 
            : "Telegram message notifications are currently disabled."}
        </p>
        
        <Separator className="my-2" />
        
        <div className="mt-3">
          <h4 className="text-sm font-medium mb-2">Message History</h4>
          <div className="space-y-2 max-h-[160px] overflow-auto">
            {messageHistory.map((message) => (
              <div 
                key={message.id}
                className="flex items-start justify-between text-sm p-2 rounded-md border"
              >
                <div className="flex-1">
                  <p className="font-medium">{message.message}</p>
                  <p className="text-xs text-muted-foreground">{message.timestamp}</p>
                </div>
                <div className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs font-medium",
                  message.status === "delivered" && "bg-green-500/10 text-green-600",
                  message.status === "failed" && "bg-red-500/10 text-red-600",
                  message.status === "pending" && "bg-yellow-500/10 text-yellow-600"
                )}>
                  {message.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}