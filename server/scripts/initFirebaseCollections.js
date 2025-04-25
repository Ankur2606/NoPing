/**
 * Firebase Collections Initialization Script
 * 
 * This script initializes the Firestore collections with their proper structure
 * as defined in the application documentation.
 */

const { admin, db } = require('../config/firebase');
const { defaultUserProfile, defaultUserPreferences, defaultUserAnalytics } = require('../models/userModel');
const { createDefaultMessage } = require('../models/messageModel');
const { createSampleTask } = require('../models/taskModel');
const { createDefaultService } = require('../models/serviceModel');
const { createDefaultNotification } = require('../models/notificationModel');

// Sample user ID for initialization (replace with actual user ID in production)
const SAMPLE_USER_ID = 'sample-user-123';

/**
 * Initialize users collection with default structure
 */
async function initUsersCollection() {
  console.log('Initializing Users collection...');
  
  try {
    const userRef = db.collection('users').doc(SAMPLE_USER_ID);
    
    // Create user profile sub-collection
    await userRef.set({
      // Base document can be empty or contain summary info
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Set profile data
    const profileData = {
      ...defaultUserProfile,
      email: 'user@example.com',
      displayName: 'Sample User',
      photoURL: 'https://via.placeholder.com/150',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await userRef.collection('profile').doc('info').set(profileData);
    
    // Set preferences data
    await userRef.collection('preferences').doc('settings').set(defaultUserPreferences);
    
    // Set analytics data
    const analyticsData = {
      ...defaultUserAnalytics,
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      loginCount: 1
    };
    await userRef.collection('analytics').doc('stats').set(analyticsData);
    
    console.log('Users collection initialized successfully');
  } catch (error) {
    console.error('Error initializing Users collection:', error);
  }
}

/**
 * Initialize messages collection with sample messages
 */
async function initMessagesCollection() {
  console.log('Initializing Messages collection...');
  
  try {
    const messagesRef = db.collection('messages').doc(SAMPLE_USER_ID).collection('items');
    
    // Create sample email message
    const emailMessage = createDefaultMessage('email');
    emailMessage.content = 'Welcome to FlowSync! This is a sample email message.';
    emailMessage.timestamp = admin.firestore.FieldValue.serverTimestamp();
    emailMessage.priority = 'action';
    emailMessage.from = {
      name: 'FlowSync Team',
      email: 'team@flowsync.example.com'
    };
    emailMessage.to = ['user@example.com'];
    emailMessage.subject = 'Welcome to FlowSync';
    
    await messagesRef.doc('sample-email-1').set(emailMessage);
    
    // Create sample Slack message
    const slackMessage = createDefaultMessage('slack');
    slackMessage.content = 'Hey there! This is a sample Slack message.';
    slackMessage.timestamp = admin.firestore.FieldValue.serverTimestamp();
    slackMessage.channel = 'general';
    slackMessage.sender = {
      name: 'SlackBot',
      avatar: 'https://via.placeholder.com/50'
    };
    
    await messagesRef.doc('sample-slack-1').set(slackMessage);
    
    // Create sample MS Teams message
    const teamsMessage = createDefaultMessage('teams');
    teamsMessage.content = 'Hello from Teams! This is a sample Teams message.';
    teamsMessage.timestamp = admin.firestore.FieldValue.serverTimestamp();
    teamsMessage.priority = 'critical';
    teamsMessage.channel = 'FlowSync Team';
    teamsMessage.sender = {
      name: 'Teams Bot',
      email: 'bot@teams.example.com'
    };
    
    await messagesRef.doc('sample-teams-1').set(teamsMessage);
    
    console.log('Messages collection initialized successfully');
  } catch (error) {
    console.error('Error initializing Messages collection:', error);
  }
}

/**
 * Initialize tasks collection with sample tasks
 */
async function initTasksCollection() {
  console.log('Initializing Tasks collection...');
  
  try {
    const tasksRef = db.collection('tasks').doc(SAMPLE_USER_ID).collection('items');
    
    // Create sample tasks with different priorities and due dates
    const task1 = createSampleTask(SAMPLE_USER_ID, 'Complete project setup');
    task1.priority = 'high';
    task1.createdOn = admin.firestore.FieldValue.serverTimestamp();
    
    const task2 = createSampleTask(SAMPLE_USER_ID, 'Review documentation');
    task2.priority = 'medium';
    task2.createdOn = admin.firestore.FieldValue.serverTimestamp();
    
    const task3 = createSampleTask(SAMPLE_USER_ID, 'Schedule team meeting');
    task3.priority = 'low';
    task3.createdOn = admin.firestore.FieldValue.serverTimestamp();
    task3.completed = true;
    
    // Add the tasks to Firestore
    await tasksRef.doc('sample-task-1').set(task1);
    await tasksRef.doc('sample-task-2').set(task2);
    await tasksRef.doc('sample-task-3').set(task3);
    
    console.log('Tasks collection initialized successfully');
  } catch (error) {
    console.error('Error initializing Tasks collection:', error);
  }
}

/**
 * Initialize services collection with available service integrations
 */
async function initServicesCollection() {
  console.log('Initializing Services collection...');
  
  try {
    const servicesRef = db.collection('services').doc(SAMPLE_USER_ID).collection('integrations');
    
    // Create service entries for each type
    const emailService = createDefaultService('email', 'Gmail');
    const slackService = createDefaultService('slack');
    const teamsService = createDefaultService('teams');
    const taskService = createDefaultService('task', 'Asana');
    
    // Add the services to Firestore
    await servicesRef.doc('gmail').set(emailService);
    await servicesRef.doc('slack').set(slackService);
    await servicesRef.doc('teams').set(teamsService);
    await servicesRef.doc('asana').set(taskService);
    
    console.log('Services collection initialized successfully');
  } catch (error) {
    console.error('Error initializing Services collection:', error);
  }
}

/**
 * Initialize notifications collection with sample notifications
 */
async function initNotificationsCollection() {
  console.log('Initializing Notifications collection...');
  
  try {
    const notificationsRef = db.collection('notifications').doc(SAMPLE_USER_ID).collection('items');
    
    // Create sample notifications
    const messageNotif = createDefaultNotification(
      'message',
      'New Email Received',
      'You have a new email from FlowSync Team'
    );
    messageNotif.timestamp = admin.firestore.FieldValue.serverTimestamp();
    messageNotif.sourceId = 'sample-email-1';
    
    const taskNotif = createDefaultNotification(
      'task',
      'Task Due Soon',
      'Your task "Complete project setup" is due tomorrow'
    );
    taskNotif.timestamp = admin.firestore.FieldValue.serverTimestamp();
    taskNotif.sourceId = 'sample-task-1';
    
    const systemNotif = createDefaultNotification(
      'system',
      'Welcome to FlowSync',
      'Thank you for using FlowSync! Set up your preferences to get started.'
    );
    systemNotif.timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Add the notifications to Firestore
    await notificationsRef.doc('sample-notif-1').set(messageNotif);
    await notificationsRef.doc('sample-notif-2').set(taskNotif);
    await notificationsRef.doc('sample-notif-3').set(systemNotif);
    
    console.log('Notifications collection initialized successfully');
  } catch (error) {
    console.error('Error initializing Notifications collection:', error);
  }
}

/**
 * Initialize analytics collection with sample data
 */
async function initAnalyticsCollection() {
  console.log('Initializing Analytics collection...');
  
  try {
    const analyticsRef = db.collection('analytics').doc(SAMPLE_USER_ID);
    
    // Create message stats
    const messageStats = {
      totalReceived: 3,
      totalRead: 1,
      byPriority: {
        critical: 1,
        action: 1,
        info: 1
      },
      byType: {
        email: 1,
        slack: 1,
        teams: 1
      }
    };
    
    // Create task stats
    const taskStats = {
      totalCreated: 3,
      totalCompleted: 1,
      byPriority: {
        high: 1,
        medium: 1,
        low: 1
      }
    };
    
    // Add analytics data
    await analyticsRef.set({
      messageStats,
      taskStats,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Analytics collection initialized successfully');
  } catch (error) {
    console.error('Error initializing Analytics collection:', error);
  }
}

/**
 * Main function to initialize all collections
 */
async function initializeFirebaseCollections() {
  try {
    console.log('Starting Firebase collections initialization process...');
    
    // Initialize all collections
    await initUsersCollection();
    await initMessagesCollection();
    await initTasksCollection();
    await initServicesCollection();
    await initNotificationsCollection();
    await initAnalyticsCollection();
    
    console.log('All Firebase collections initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during initialization process:', error);
    process.exit(1);
  }
}

// Run the initialization process
initializeFirebaseCollections();