/**
 * Test script for Telegram bot functionality
 * 
 * This script allows you to test the Telegram bot integration without
 * having to start the entire server.
 * 
 * Usage:
 * node scripts/testTelegramBot.js
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { db, admin } = require('../config/firebase');

// Make sure we have the API key
if (!process.env.TELEGRAM_BOT_API_KEY) {
  console.error('TELEGRAM_BOT_API_KEY is not defined in .env file');
  process.exit(1);
}

// Create a bot instance
const bot = new TelegramBot(process.env.TELEGRAM_BOT_API_KEY, { polling: true });

console.log('🤖 Telegram bot test script started');
console.log('Press Ctrl+C to exit');

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const username = msg.from.username || 'User';
    
    console.log(`Received /start command from ${username} (ID: ${msg.from.id}, Chat ID: ${chatId})`);
    
    // Save user to database
    await saveTelegramUser(msg.from.id, chatId, username);
    
    // Reply to the user
    bot.sendMessage(chatId, `Hi @${username}, you're now subscribed!`);
  } catch (error) {
    console.error('Error handling /start command:', error);
  }
});

// Handle /link command
bot.onText(/\/link (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const email = match[1];
    
    console.log(`Received /link command from ${msg.from.username} with email ${email}`);
    
    if (!email.includes('@')) {
      bot.sendMessage(chatId, 'Please provide a valid email address. Usage: /link your@email.com');
      return;
    }
    
    // Look for user with this email
    const usersSnapshot = await db.collection('users')
      .where('profile.email', '==', email)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      bot.sendMessage(chatId, 'No user found with this email address. Please make sure you have registered on FlowSync.');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    
    // Update user with Telegram info
    await userDoc.ref.update({
      'profile.telegramId': msg.from.id,
      'profile.telegramChatId': chatId,
      'profile.telegramUsername': msg.from.username,
      'profile.notificationPreferences.telegram': true,
      'profile.updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Linked Telegram user ${msg.from.username} with Firebase user ${email}`);
    bot.sendMessage(chatId, `Your Telegram account has been successfully linked with FlowSync!`);
  } catch (error) {
    console.error('Error handling /link command:', error);
    bot.sendMessage(msg.chat.id, 'An error occurred while linking your account. Please try again later.');
  }
});

// Save a Telegram user to Firebase
async function saveTelegramUser(telegramId, chatId, username) {
  try {
    // Check if there is a user with Telegram ID
    const telegramUsersSnapshot = await db.collection('telegramUsers')
      .where('telegramId', '==', telegramId)
      .get();
    
    if (!telegramUsersSnapshot.empty) {
      // User exists, update the chat ID
      const telegramUserDoc = telegramUsersSnapshot.docs[0];
      await telegramUserDoc.ref.update({
        chatId,
        username,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Updated Telegram user ${username} with chatId ${chatId}`);
      return;
    }
    
    // New user, create record
    await db.collection('telegramUsers').add({
      telegramId,
      chatId,
      username,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Added new Telegram user ${username} with chatId ${chatId}`);
  } catch (error) {
    console.error('Error saving Telegram user:', error);
  }
}

// Send test message function
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "This is a test message. Your bot is working correctly!");
});

// Send help message
bot.onText(/\/help/, (msg) => {
  const helpText = 
    "🤖 *FlowSync Telegram Bot Test* 🤖\n\n" +
    "Available commands:\n\n" +
    "/start - Subscribe to notifications\n" +
    "/link your@email.com - Link your Telegram account with FlowSync\n" +
    "/test - Test the bot's functionality\n" +
    "/help - Show this help message";
  
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// Log errors
bot.on('polling_error', (error) => {
  console.error('Telegram polling error:', error);
});

console.log('Bot is now listening for commands...');
console.log('Try sending /start, /link, /test, or /help to your bot');
