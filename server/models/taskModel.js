/**
 * Task model schema definitions for Firebase Firestore collections
 */

// Default task structure
const defaultTaskStructure = {
  title: "",
  description: "",
  dueDate: null,
  createdOn: null, // Will be set to admin.firestore.FieldValue.serverTimestamp()
  priority: "medium", // "high" | "medium" | "low"
  completed: false,
  source: "manual", // "email" | "slack" | "teams" | "manual"
  sourceMessageId: "",
  tags: [], // array of string tags
  assignedTo: [] // array of user IDs
};

// Create a sample task with some default values
const createSampleTask = (userId, title = "Sample Task") => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    ...defaultTaskStructure,
    title,
    description: "This is a sample task created during initialization",
    dueDate: tomorrow, // Due tomorrow
    priority: "medium",
    tags: ["sample", "init"]
  };
};

module.exports = {
  defaultTaskStructure,
  createSampleTask
};