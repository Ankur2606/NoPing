/**
 * Message model schema definitions for Firebase Firestore collections
 */

// Base message structure
const baseMessageStructure = {
  type: "", // "email" | "slack" | "teams"
  content: "",
  timestamp: null, // Will be set to admin.firestore.FieldValue.serverTimestamp()
  priority: "info", // "critical" | "action" | "info"
  read: false,
  sourceId: ""
};

// Email specific message fields
const emailMessageFields = {
  from: {
    name: "",
    email: ""
  },
  to: [], // array of email addresses
  subject: "",
  attachments: [] // array of attachment objects
};

// Slack specific message fields
const slackMessageFields = {
  channel: "",
  sender: {
    name: "",
    avatar: ""
  },
  mentions: false,
  reactions: [] // array of reaction objects
};

// Teams specific message fields
const teamsMessageFields = {
  channel: "",
  sender: {
    name: "",
    email: ""
  },
  mentions: false
};

// Create a default message template by type
const createDefaultMessage = (type) => {
  let template = { ...baseMessageStructure, type };
  
  switch (type) {
    case "email":
      return { ...template, ...emailMessageFields };
    case "slack":
      return { ...template, ...slackMessageFields };
    case "teams":
      return { ...template, ...teamsMessageFields };
    default:
      return template;
  }
};

module.exports = {
  createDefaultMessage,
  baseMessageStructure,
  emailMessageFields,
  slackMessageFields,
  teamsMessageFields
};