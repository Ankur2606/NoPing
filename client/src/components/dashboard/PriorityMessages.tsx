
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  source: "email" | "slack" | "teams";
  sender: string;
  subject: string;
  preview: string;
  time: string;
  priority: "critical" | "action" | "info";
}

const mockMessages: Message[] = [
  {
    id: "1",
    source: "email",
    sender: "CEO",
    subject: "Quarterly Review Meeting",
    preview: "We need to discuss the Q3 results before the board meeting tomorrow.",
    time: "1h ago",
    priority: "critical"
  },
  {
    id: "2",
    source: "slack",
    sender: "Product Team",
    subject: "Feature Launch Delay",
    preview: "We might need to push back the launch date due to some final QA issues.",
    time: "3h ago",
    priority: "action"
  },
  {
    id: "3",
    source: "email",
    sender: "Client X",
    subject: "Contract Renewal",
    preview: "Following up on our conversation about renewing the service contract.",
    time: "5h ago",
    priority: "action"
  },
  {
    id: "4",
    source: "teams",
    sender: "HR Department",
    subject: "Company Policy Update",
    preview: "Please review the updated remote work policy effective next month.",
    time: "2d ago",
    priority: "info"
  }
];

export function PriorityMessages() {
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
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Priority Messages</CardTitle>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Check className="h-3.5 w-3.5" />
          <span>Mark all read</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "relative flex flex-col space-y-1 rounded-lg border p-4 animate-fade-in",
                message.priority === "critical" && "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10",
                message.priority === "action" && "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10",
                message.priority === "info" && "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/5"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span>{priorityIcons[message.priority]}</span>
                  <span>{sourceIcons[message.source]}</span>
                </div>
                <span className={cn(
                  "font-medium",
                  message.priority === "critical" && "priority-critical",
                  message.priority === "action" && "priority-action",
                  message.priority === "info" && "priority-info"
                )}>
                  {message.sender}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {message.time}
                </span>
              </div>
              <div className="font-medium">{message.subject}</div>
              <div className="text-sm text-muted-foreground">{message.preview}</div>
              <div className="mt-2 flex items-center gap-2">
                <Button variant="outline" size="sm">
                  View
                </Button>
                <Button variant="ghost" size="sm">
                  Mark Read
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
