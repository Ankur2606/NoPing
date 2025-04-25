
import { EmailMessage, SlackMessage, TeamsMessage, Task, ServiceConnection } from './types';

// Mock email messages
export const mockEmails: EmailMessage[] = [
  {
    id: "e1",
    type: "email",
    from: { name: "CEO", email: "ceo@company.com" },
    to: ["you@company.com"],
    subject: "Urgent: Quarterly Review",
    content: "We need to discuss the Q3 results before the board meeting tomorrow. Please prepare the financial reports and projections for review.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    priority: "critical",
    read: false,
    attachments: [
      { name: "Q3_Financial_Review.pdf", type: "pdf", size: 2500000 }
    ]
  },
  {
    id: "e2",
    type: "email",
    from: { name: "Client X", email: "client@clientx.com" },
    to: ["you@company.com", "account-team@company.com"],
    subject: "Contract Renewal",
    content: "Following up on our conversation about renewing the service contract. We'd like to proceed with the premium tier as discussed.",
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    priority: "action",
    read: false
  },
  {
    id: "e3",
    type: "email",
    from: { name: "HR Department", email: "hr@company.com" },
    to: ["all-staff@company.com"],
    subject: "Company Policy Update",
    content: "Please review the updated remote work policy effective next month. All employees should acknowledge receipt by the end of the week.",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    priority: "info",
    read: true
  }
];

// Mock Slack messages
export const mockSlackMessages: SlackMessage[] = [
  {
    id: "s1",
    type: "slack",
    channel: "product-team",
    sender: { name: "ProductManager", avatar: "https://i.pravatar.cc/150?u=pm" },
    content: "We might need to push back the launch date due to some final QA issues. @dev-team could you provide an updated timeline?",
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    priority: "action",
    mentions: true,
    read: false,
    reactions: [{ emoji: "👀", count: 3 }, { emoji: "👍", count: 2 }]
  },
  {
    id: "s2",
    type: "slack",
    channel: "general",
    sender: { name: "OfficeAdmin", avatar: "https://i.pravatar.cc/150?u=admin" },
    content: "The office will be closed for maintenance this Saturday. Please make sure to take your belongings home on Friday.",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    priority: "info",
    read: true,
    reactions: [{ emoji: "👍", count: 12 }]
  }
];

// Mock Teams messages
export const mockTeamsMessages: TeamsMessage[] = [
  {
    id: "t1",
    type: "teams",
    channel: "Marketing Strategy",
    sender: { name: "Marketing Director", email: "marketing.director@company.com" },
    content: "We need to finalize the Q4 marketing campaign budget by EOD today. @you Please share the latest numbers.",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    priority: "action",
    mentions: true,
    read: false
  }
];

// Combined messages
export const mockAllMessages = [
  ...mockEmails,
  ...mockSlackMessages,
  ...mockTeamsMessages
].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

// Mock tasks
export const mockTasks: Task[] = [
  {
    id: "task1",
    title: "Finish Q3 budget report",
    description: "Complete the final sections of the quarterly budget report",
    dueDate: new Date(Date.now() + 18000000).toISOString(), // 5 hours from now
    createdOn: new Date(Date.now() - 86400000).toISOString(),
    priority: "high",
    completed: false,
    source: "email",
    sourceMessageId: "e1",
    tags: ["finance", "quarterly"]
  },
  {
    id: "task2",
    title: "Review website design changes",
    description: "Review and approve the new homepage design mockups",
    dueDate: new Date(Date.now() + 25200000).toISOString(), // 7 hours from now
    createdOn: new Date(Date.now() - 172800000).toISOString(),
    priority: "medium",
    completed: false,
    source: "slack",
    sourceMessageId: "s1",
    tags: ["design", "website"]
  },
  {
    id: "task3",
    title: "Update team meeting agenda",
    description: "Add new discussion points to tomorrow's team meeting",
    dueDate: new Date(Date.now() + 28800000).toISOString(), // 8 hours from now
    createdOn: new Date(Date.now() - 43200000).toISOString(),
    priority: "low",
    completed: true,
    tags: ["meeting", "team"]
  }
];

// Mock service connections
export const mockServiceConnections: ServiceConnection[] = [
  {
    id: "conn1",
    type: "email",
    name: "Gmail",
    isConnected: true,
    lastSynced: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
  },
  {
    id: "conn2",
    type: "slack",
    name: "Slack",
    isConnected: true,
    lastSynced: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
  },
  {
    id: "conn3",
    type: "teams",
    name: "Microsoft Teams",
    isConnected: false,
    errorMessage: "Authentication token expired"
  },
  {
    id: "conn4",
    type: "task",
    name: "Asana",
    isConnected: false
  }
];
