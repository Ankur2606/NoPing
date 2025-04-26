/**
 * Email Criticality Engine
 * 
 * Entry point for the email processing system that categorizes emails
 * into three urgency levels: Critical, Action Needed, and Informational.
 */

require('dotenv').config();
const { fetchAndProcessEmails } = require('./fetchEmail');
// Firebase is now initialized directly in the config/firebase.js file
require('./config/firebase');

// Start the email processing
console.log('Starting Email Criticality Engine...');
fetchAndProcessEmails();

// Set up a scheduled interval for email processing (every 2 hours)
const FETCH_INTERVAL = process.env.FETCH_INTERVAL || 2 * 60 * 60 * 1000; // Default: 2 hours
setInterval(fetchAndProcessEmails, FETCH_INTERVAL);