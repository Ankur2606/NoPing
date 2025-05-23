/**
 * Task Service
 * 
 * Provides methods for task generation from messages and storing to Firebase
 */

const { generateTaskFromMessage } = require('./taskGenerator');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
let firebaseInitialized = false;
try {
    if (!admin.apps.length) {
        admin.initializeApp();
        firebaseInitialized = true;
    } else {
        firebaseInitialized = true;
    }
} catch (error) {
    console.warn('Firebase admin not initialized:', error.message);
}

/**
 * Convert message to task and save to Firebase
 * @param {Object} message - Message object
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Created task
 */
async function createTaskFromMessage(message, userId) {
    if (!userId) {
        throw new Error('User ID is required');
    }

    // Generate task from message
    const task = await generateTaskFromMessage(message);

    // Save to Firebase if initialized
    if (firebaseInitialized) {
        await saveTaskToFirebase(task, userId);
    } else {
        console.warn('Firebase not initialized, task was generated but not saved');
    }

    return task;
}

/**
 * Save task to Firebase
 * @param {Object} task - Task object
 * @param {String} userId - User ID
 * @returns {Promise<String>} - Task ID
 */
async function saveTaskToFirebase(task, userId) {
    try {
        // Use server timestamp for createdOn field
        const taskWithTimestamp = {
            ...task,
            createdOn: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save to Firestore
        const taskRef = admin.firestore()
            .collection('tasks')
            .doc(userId)
            .collection('userTasks')
            .doc();

        await taskRef.set(taskWithTimestamp);

        return taskRef.id;
    } catch (error) {
        console.error('Error saving task to Firebase:', error);
        throw new Error(`Failed to save task: ${error.message}`);
    }
}

/**
 * Process multiple messages and create tasks
 * @param {Array} messages - Array of message objects
 * @param {String} userId - User ID
 * @returns {Promise<Array>} - Array of created tasks
 */
async function processMessagesIntoTasks(messages, userId) {
    if (!Array.isArray(messages)) {
        throw new Error('Messages must be an array');
    }

    console.log(`Processing ${messages.length} messages into tasks for user ${userId}`);

    const results = await Promise.allSettled(
        messages.map(async(message) => {
            try {
                return await createTaskFromMessage(message, userId);
            } catch (error) {
                console.error(`Error processing message ${message.sourceId || 'unknown'}:`, error);
                throw error;
            }
        })
    );

    // Return successfully created tasks
    const createdTasks = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

    console.log(`Successfully created ${createdTasks.length} tasks out of ${messages.length} messages`);

    return createdTasks;
}

module.exports = {
    createTaskFromMessage,
    processMessagesIntoTasks,
    saveTaskToFirebase
};