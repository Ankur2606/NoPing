/**
 * Test script for the Telegram bot verification endpoint
 * 
 * This script simulates a request from the Telegram bot to verify a code
 * Run this script with: node testBotVerify.js
 */
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Test data
const testData = {
  code: '123456',  // This should be a valid code from verificationCodes Map
  telegramId: 12345678,
  chatId: 12345678,
  username: 'test_user'
};

// Server URL
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

async function testBotVerify() {
  console.log('Testing bot verification endpoint...');
  console.log(`POST ${SERVER_URL}/api/telegram/bot-verify`);
  console.log('Request body:', testData);
  
  try {
    // Make request to bot-verify endpoint
    const response = await fetch(`${SERVER_URL}/api/telegram/bot-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    console.log(`Response status: ${response.status}`);
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('✅ Bot verification endpoint is working!');
    } else {
      console.log('❌ Bot verification failed! Check the error message above.');
    }
  } catch (error) {
    console.error('Error connecting to server:', error.message);
  }
}

// Also test the health check endpoint
async function testHealthCheck() {
  console.log('\nTesting health check endpoint...');
  console.log(`GET ${SERVER_URL}/api/telegram/bot-verify`);
  
  try {
    // Make request to bot-verify endpoint (GET)
    const response = await fetch(`${SERVER_URL}/api/telegram/bot-verify`);
    const data = await response.json();
    
    console.log(`Response status: ${response.status}`);
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('✅ Health check endpoint is working!');
    } else {
      console.log('❌ Health check failed! Check the error message above.');
    }
  } catch (error) {
    console.error('Error connecting to server:', error.message);
  }
}

// Run the tests
async function runTests() {
  await testHealthCheck();
  await testBotVerify();
}

runTests();
