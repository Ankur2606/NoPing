/**
 * Notification model schema definitions for Firebase Firestore collections
 */

// Default notification structure
const defaultNotificationStructure = {
  type: "", // "message" | "task" | "system"
  title: "",
  content: "",
  read: false,
  timestamp: null, // Will be set to admin.firestore.FieldValue.serverTimestamp()
  sourceId: "",
  sourceType: "" // "message" | "task" | "system"
};

// Create a notification with default values by type
const createDefaultNotification = (type, title = "", content = "") => {
  return {
    ...defaultNotificationStructure,
    type,
    title: title || `New ${type}`,
    content: content || `You have a new ${type}`,
    sourceType: type === "system" ? "system" : type
  };
};

module.exports = {
  defaultNotificationStructure,
  createDefaultNotification
};