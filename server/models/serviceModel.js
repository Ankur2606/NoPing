/**
 * Service model schema definitions for Firebase Firestore collections
 */

// Default service structure
const defaultServiceStructure = {
  type: "", // "email" | "slack" | "teams" | "task"
  name: "",
  isConnected: false,
  lastSynced: null,
  errorMessage: "",
  authData: {
    tokens: {
      accessToken: "",
      refreshToken: ""
    },
    expiresAt: null,
    scopes: []
  }
};

// Create a service with default values by type
const createDefaultService = (type, name = "") => {
  return {
    ...defaultServiceStructure,
    type,
    name: name || getDefaultServiceName(type)
  };
};

// Get a default name for each service type
const getDefaultServiceName = (type) => {
  switch (type) {
    case "email":
      return "Email Service";
    case "slack":
      return "Slack";
    case "teams":
      return "Microsoft Teams";
    case "task":
      return "Task Manager";
    default:
      return "Unknown Service";
  }
};

module.exports = {
  defaultServiceStructure,
  createDefaultService
};