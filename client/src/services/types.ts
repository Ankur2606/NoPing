/* eslint-disable @typescript-eslint/no-explicit-any */

// General message types
export interface BaseMessage {
  id: string;
  content: string;
  timestamp: any;
  priority?: "critical" | "action" | "info";
  read?: boolean;
  reasoning?: string;
}

export interface EmailMessage extends BaseMessage {
  type: "email";
  from: {
    name: string;
    email: string;
  };
  to: string[];
  subject: string;
  attachments?: {
    name: string;
    type: string;
    size: number;
  }[];
}

export interface SlackMessage extends BaseMessage {
  type: "slack";
  channel: string;
  sender: {
    name: string;
    avatar?: string;
  };
  reactions?: {
    emoji: string;
    count: number;
  }[];
  mentions?: boolean;
}

export interface TeamsMessage extends BaseMessage {
  type: "teams";
  channel: string;
  sender: {
    name: string;
    email: string;
  };
  mentions?: boolean;
}

export type Message = EmailMessage | SlackMessage | TeamsMessage;

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  createdOn: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  source?: "email" | "slack" | "teams" | "manual";
  sourceMessageId?: string;
  tags?: string[];
  assignedTo?: string[];
}

// Service connection types
export interface ServiceConnection {
  id: string;
  type: "email" | "slack" | "teams" | "task";
  name: string;
  isConnected: boolean;
  lastSynced?: string;
  errorMessage?: string;
}

// User preferences
export interface UserPreferences {
  workHours: {
    start: string;
    end: string;
  };
  workDays: string[];
  timeZone: string;
  notificationPreferences: {
    email: boolean;
    desktop: boolean;
    mobile: boolean;
    telegram: boolean;
  };
  priorityKeywords: string[];
}
