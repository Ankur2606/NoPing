/**
 * Task Generator Module
 * 
 * Analyzes messages from various sources (email, Slack, Teams) and generates appropriate tasks.
 * Uses AI to extract relevant task information from message content.
 */

// Export main functions from all modules
const { generateTaskFromMessage } = require('./taskGenerator');
const { createTaskFromMessage, processMessagesIntoTasks, saveTaskToFirebase } = require('./taskService');
const { runExamples } = require('./example');

module.exports = {
    // Core task generation function
    generateTaskFromMessage,

    // Task service functions
    createTaskFromMessage,
    processMessagesIntoTasks,
    saveTaskToFirebase,

    // Examples for testing
    runExamples
};