/**
 * Script to insert 5 sample tasks for a specified user
 * 
 * Usage: 
 * - Set the USER_ID constant to the target user's ID
 * - Run: node scripts/insertSampleTasks.js
 */

const { admin, db } = require('../config/firebase');
const { createSampleTask } = require('../models/taskModel');

// Set this to the user ID where you want to insert tasks
const USER_ID = 'ehe7kbIMGaZCmU9vSNhCoZW9s9H2'; // Replace this with an actual user ID

// Generate a random date within the next 7 days
const getRandomFutureDate = () => {
  const now = new Date();
  const daysAhead = Math.floor(Math.random() * 7) + 1; // 1-7 days ahead
  const hoursAhead = Math.floor(Math.random() * 24); // 0-24 hours ahead
  const minutesAhead = Math.floor(Math.random() * 60); // 0-60 minutes ahead
  
  now.setDate(now.getDate() + daysAhead);
  now.setHours(now.getHours() + hoursAhead);
  now.setMinutes(now.getMinutes() + minutesAhead);
  
  return admin.firestore.Timestamp.fromDate(now);
};

// Generate a date for today with random hour
const getTodayWithRandomTime = () => {
  const now = new Date();
  const hour = Math.floor(Math.random() * 12) + 9; // 9 AM - 9 PM
  const minute = Math.floor(Math.random() * 60); // 0-59 minutes
  
  now.setHours(hour, minute, 0, 0);
  
  return admin.firestore.Timestamp.fromDate(now);
};

// Sample tasks with varying priorities and due dates
const sampleTasks = [
  {
    title: "Complete quarterly financial report",
    description: "Compile all financial data from Q1 and prepare summary for management meeting",
    priority: "high",
    completed: false,
    tags: ["finance", "quarterly", "report"]
  },
  {
    title: "Review new product specifications",
    description: "Review the technical specifications for the upcoming product launch and provide feedback to the product team",
    priority: "medium",
    completed: false,
    tags: ["product", "review"]
  },
  {
    title: "Prepare presentation for client meeting",
    description: "Create slides for the upcoming client meeting highlighting our recent achievements and future plans",
    priority: "high", 
    completed: false,
    tags: ["client", "presentation"]
  },
  {
    title: "Schedule team building event",
    description: "Research venues and activities for the quarterly team building event",
    priority: "low",
    completed: true,
    tags: ["team", "event"]
  },
  {
    title: "Update department wiki with new procedures",
    description: "Document the new approval process and update the internal wiki with step-by-step instructions",
    priority: "medium",
    completed: false,
    tags: ["documentation", "procedures"]
  }
];

/**
 * Create and insert the tasks for the specified user
 */
async function insertSampleTasks() {
  try {
    console.log(`Inserting sample tasks for user ID: ${USER_ID}`);
    const tasksRef = db.collection('tasks').doc(USER_ID).collection('userTasks');
    
    // First two tasks due today
    for (let i = 0; i < 2; i++) {
      const task = { ...sampleTasks[i] };
      task.dueDate = getTodayWithRandomTime();
      task.createdOn = admin.firestore.FieldValue.serverTimestamp();
      task.source = "manual";
      task.sourceMessageId = null;
      task.assignedTo = [];
      
      await tasksRef.add(task);
      console.log(`Added task due today: ${task.title}`);
    }
    
    // Remaining tasks with future due dates
    for (let i = 2; i < sampleTasks.length; i++) {
      const task = { ...sampleTasks[i] };
      task.dueDate = getRandomFutureDate();
      task.createdOn = admin.firestore.FieldValue.serverTimestamp();
      task.source = "manual";
      task.sourceMessageId = null;
      task.assignedTo = [];
      
      await tasksRef.add(task);
      console.log(`Added task with future due date: ${task.title}`);
    }
    
    // Update analytics collection to reflect new tasks
    const analyticsRef = db.collection('analytics').doc(USER_ID);
    const analyticsDoc = await analyticsRef.get();
    
    if (analyticsDoc.exists) {
      // Count tasks by priority
      const highPriority = sampleTasks.filter(t => t.priority === "high").length;
      const mediumPriority = sampleTasks.filter(t => t.priority === "medium").length;
      const lowPriority = sampleTasks.filter(t => t.priority === "low").length;
      const completedCount = sampleTasks.filter(t => t.completed).length;
      
      await analyticsRef.update({
        'taskStats.totalCreated': admin.firestore.FieldValue.increment(sampleTasks.length),
        'taskStats.totalCompleted': admin.firestore.FieldValue.increment(completedCount),
        'taskStats.byPriority.high': admin.firestore.FieldValue.increment(highPriority),
        'taskStats.byPriority.medium': admin.firestore.FieldValue.increment(mediumPriority),
        'taskStats.byPriority.low': admin.firestore.FieldValue.increment(lowPriority),
        'lastUpdated': admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create analytics document if it doesn't exist
      const highPriority = sampleTasks.filter(t => t.priority === "high").length;
      const mediumPriority = sampleTasks.filter(t => t.priority === "medium").length;
      const lowPriority = sampleTasks.filter(t => t.priority === "low").length;
      const completedCount = sampleTasks.filter(t => t.completed).length;
      
      await analyticsRef.set({
        taskStats: {
          totalCreated: sampleTasks.length,
          totalCompleted: completedCount,
          byPriority: {
            high: highPriority,
            medium: mediumPriority,
            low: lowPriority
          }
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    console.log(`Successfully inserted ${sampleTasks.length} sample tasks!`);
    process.exit(0);
  } catch (error) {
    console.error('Error inserting sample tasks:', error);
    process.exit(1);
  }
}

// Execute the function
insertSampleTasks();