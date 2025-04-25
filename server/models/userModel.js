/**
 * User model schema definitions for Firebase Firestore collections
 */

// Default user profile structure
const defaultUserProfile = {
  email: "",
  displayName: "",
  photoURL: "",
  createdAt: null // Will be set to admin.firestore.FieldValue.serverTimestamp() when creating
};

// Default user preferences
const defaultUserPreferences = {
  workHours: {
    start: "09:00",
    end: "17:00"
  },
  workDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  timeZone: "UTC",
  notificationPreferences: {
    email: true,
    desktop: true,
    mobile: false,
    telegram: false
  },
  priorityKeywords: ["urgent", "important", "asap", "deadline"]
};

// Default user analytics structure
const defaultUserAnalytics = {
  lastLogin: null, // Will be set to admin.firestore.FieldValue.serverTimestamp() when creating
  loginCount: 0,
  deviceInfo: {}
};

module.exports = {
  defaultUserProfile,
  defaultUserPreferences,
  defaultUserAnalytics
};