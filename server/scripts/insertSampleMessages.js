/**
 * Script to insert 5 sample messages for a specified user
 * 
 * Usage: 
 * - Set the USER_ID constant to the target user's ID
 * - Run: node scripts/insertSampleMessages.js
 */

const { admin, db } = require('../config/firebase');
const { createDefaultMessage } = require('../models/messageModel');

// Set this to the user ID where you want to insert messages
const USER_ID = 'ehe7kbIMGaZCmU9vSNhCoZW9s9H2'; // Replace this with an actual user ID

// Generate a random date within the last 7 days
const getRandomRecentDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 7); // 0-7 days ago
  const hoursAgo = Math.floor(Math.random() * 24); // 0-24 hours ago
  const minutesAgo = Math.floor(Math.random() * 60); // 0-60 minutes ago
  
  now.setDate(now.getDate() - daysAgo);
  now.setHours(now.getHours() - hoursAgo);
  now.setMinutes(now.getMinutes() - minutesAgo);
  
  return admin.firestore.Timestamp.fromDate(now);
};

// Sample email messages
const sampleEmails = [
  {
    type: "email",
    from: { name: "Project Manager", email: "pm@company.com" },
    to: ["you@company.com"],
    subject: "Weekly Status Update Required",
    content: "Please submit your weekly status report by end of day. We need to compile all team updates for the executive meeting tomorrow.",
    priority: "critical",
    read: false,
    attachments: [
      { name: "StatusTemplate.xlsx", type: "xlsx", size: 45000 }
    ]
  },
  {
    type: "email",
    from: { name: "HR Department", email: "hr@company.com" },
    to: ["all-staff@company.com"],
    subject: "New Benefits Portal Launch",
    content: "We're excited to announce the launch of our new employee benefits portal. Please log in and verify your information by the end of the month.",
    priority: "info",
    read: false
  }
];

// Sample Slack messages
const sampleSlackMessages = [
  {
    type: "slack",
    channel: "team-notifications",
    sender: { name: "DevOps", avatar: "https://i.pravatar.cc/150?u=devops" },
    content: "URGENT: The production database is experiencing high load. We're investigating the issue and will provide updates every 30 minutes.",
    priority: "critical",
    read: false,
    mentions: true,
    reactions: [{ emoji: "👀", count: 5 }, { emoji: "🚨", count: 3 }]
  },
  {
    type: "slack",
    channel: "general",
    sender: { name: "CEO", avatar: "https://i.pravatar.cc/150?u=ceo" },
    content: "I'd like to congratulate the product team on the successful launch of our new feature. The initial metrics are very promising!",
    priority: "action",
    read: false,
    reactions: [{ emoji: "🎉", count: 24 }, { emoji: "👍", count: 18 }]
  }
];

// Sample Teams message
const sampleTeamsMessage = {
  type: "teams",
  channel: "Project Fusion",
  sender: { name: "Technical Lead", email: "techlead@company.com" },
  content: "The client has requested changes to the dashboard layout. Please review the attached mockups and provide feedback in our meeting tomorrow.",
  priority: "action",
  mentions: true,
  read: false
};

/**
 * Create and insert the messages for the specified user
 */
async function insertSampleMessages() {
  try {
    console.log(`Inserting sample messages for user ID: ${USER_ID}`);
    const messagesRef = db.collection('messages').doc(USER_ID).collection('userMessages');
    
    // Insert email messages
    for (const emailData of sampleEmails) {
      const timestamp = getRandomRecentDate();
      await messagesRef.add({
        ...emailData,
        timestamp
      });
      console.log(`Added email message: ${emailData.subject}`);
    }
    
    // Insert Slack messages
    for (const slackData of sampleSlackMessages) {
      const timestamp = getRandomRecentDate();
      await messagesRef.add({
        ...slackData,
        timestamp
      });
      console.log(`Added Slack message from channel: ${slackData.channel}`);
    }
    
    // Insert Teams message
    const teamsTimestamp = getRandomRecentDate();
    await messagesRef.add({
      ...sampleTeamsMessage,
      timestamp: teamsTimestamp
    });
    console.log(`Added Teams message from channel: ${sampleTeamsMessage.channel}`);
    
    console.log('Successfully inserted 5 sample messages!');
    process.exit(0);
  } catch (error) {
    console.error('Error inserting sample messages:', error);
    process.exit(1);
  }
}

// Execute the function
insertSampleMessages();