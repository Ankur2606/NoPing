#!/usr/bin/env node

/**
 * Test script for the voice briefing cron job
 * Run this script to test the voice briefing functionality directly
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { 
  runJobDirectly, 
  getUsersWithTelegram, 
  getMessagesFromLast12Hours 
} = require('./voiceBriefingCronJob');

async function testVoiceBriefingCron() {
  console.log('🧪 Testing Voice Briefing Cron Job...\n');
  
  try {
    // Test 1: Check if we can get users with Telegram
    console.log('1️⃣ Testing getUsersWithTelegram...');
    const users = await getUsersWithTelegram();
    console.log(`✅ Found ${users.length} users with Telegram integration`);
    
    if (users.length > 0) {
      console.log('👥 Sample users:');
      users.slice(0, 3).forEach(user => {
        console.log(`   - User ID: ${user.userId}, Chat ID: ${user.telegramChatId}`);
      });
    }
    
    console.log('');
    
    // Test 2: Check messages for first user (if any)
    if (users.length > 0) {
      const firstUser = users[0];
      console.log(`2️⃣ Testing getMessagesFromLast12Hours for user ${firstUser.userId}...`);
      const messages = await getMessagesFromLast12Hours(firstUser.userId);
      console.log(`✅ Found ${messages.length} messages from last 12 hours`);
      
      if (messages.length > 0) {
        console.log('📧 Sample messages:');
        messages.slice(0, 3).forEach(msg => {
          console.log(`   - ${msg.subject || msg.title || 'No Subject'} (${msg.priority || 'normal'})`);
        });
      }
      
      console.log('');
    }
    
    // Test 3: Run the full job
    console.log('3️⃣ Running the full voice briefing job...');
    const result = await runJobDirectly();
    
    console.log('\n🎉 Test completed successfully!');
    console.log('📊 Job Results:');
    console.log(`   - Total users: ${result.totalUsers}`);
    console.log(`   - Processed users: ${result.processedUsers}`);
    console.log(`   - Briefings sent: ${result.briefingsSent}`);
    console.log(`   - Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testVoiceBriefingCron()
    .then(() => {
      console.log('\n✅ All tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  testVoiceBriefingCron
};
