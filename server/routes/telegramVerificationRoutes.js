/**
 * Routes for handling Telegram account verification and linking
 */
const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const crypto = require('crypto');
const telegramService = require('../services/telegramService');
const { verificationCodes } = require('../utils/verificationCodes');
const { checkVerificationCode } = require('../utils/telegramVerificationHelpers');

// Store verification codes in memory (consider using Redis or similar for production)

/**
 * @route   GET /api/telegram/status
 * @desc    Check if user has linked Telegram account
 * @access  Private
 */
router.get('/link-status', async (req, res) => {
  try {
    console.log('Checking Telegram status for user:', req.user);
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uid = req.user.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(200).json({ isLinked: false });
    }

    const userData = userDoc.data();
    const profile = userData.profile || {};

    const isLinked = !!(profile.telegramId && profile.telegramChatId);
    
    return res.status(200).json({
      isLinked,
      username: profile.telegramUsername || null,
    });
  } catch (error) {
    console.error('Error checking Telegram status:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/telegram/generate-code
 * @desc    Generate verification code for linking Telegram
 * @access  Private
 */
router.post('/generate-code', async (req, res) => {
  try {
    console.log('Generating verification code for user:', req);
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uid = req.user.uid;
    
    // Generate a random 6-digit code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    
    // Store the code with user ID and expiration (15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    verificationCodes.set(verificationCode, {
      uid,
      email: req.user.email,
      expiresAt
    });
    
    return res.status(200).json({
      verificationCode,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error generating verification code:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/telegram/verify-code
 * @desc    Server-side verification of code (this will typically be called by the Telegram bot)
 * @access  Private
 */
// router.post('/verify-code', verifyTelegramCode);

/**
 * @route   POST /api/telegram/unlink
 * @desc    Unlink Telegram account
 * @access  Private
 */
router.post('/unlink', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uid = req.user.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // First, update the user's Telegram preferences to false
    await userRef.update({
      'profile.telegramId': admin.firestore.FieldValue.delete(),
      'profile.telegramChatId': admin.firestore.FieldValue.delete(),
      'profile.telegramUsername': admin.firestore.FieldValue.delete(),
      'profile.notificationPreferences.telegram': false,
      'profile.updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    return res.status(200).json({
      success: true,
      error: null
    });
  } catch (error) {
    console.error('Error unlinking Telegram:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/telegram/test-message
 * @desc    Send a test message to the linked Telegram account
 * @access  Private
 */
router.post('/test-message', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uid = req.user.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userData = userDoc.data();
    const profile = userData.profile || {};

    if (!profile.telegramChatId) {
      return res.status(400).json({ 
        success: false,
        error: 'No linked Telegram account found' 
      });
    }
    
    // Send test message
    try {
      await telegramService.bot.sendMessage(
        profile.telegramChatId,
        `🔔 *Test Notification*\n\nThis is a test notification from FlowSync. If you're seeing this message, your Telegram integration is working correctly!`,
        { parse_mode: 'Markdown' }
      );
      
      return res.status(200).json({
        success: true,
        error: null
      });
    } catch (error) {
      console.error('Failed to send test message:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send test message'
      });
    }
  } catch (error) {
    console.error('Error sending test message:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Simple health check handler for the bot verification endpoint
 * 
 * @route   GET /api/telegram/bot-verify
 * @desc    Check if the bot verification endpoint is working
 * @access  Public
 */
const botVerifyHealthCheck = (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Bot verification endpoint is working',
      info: 'This endpoint accepts POST requests from the Telegram bot to verify user codes'
    });
  }
  
  // Pass to the regular handler for POST requests
  botVerifyHandler(req, res);
};

/**
 * This endpoint will be called by the Telegram bot when a user submits a verification code
 * It needs to be accessible to the bot without user authentication
 * In production, you might want to add an API key or other security measure
 * 
 * @route   POST /api/telegram/bot-verify
 * @desc    Verify and link a Telegram account from the bot
 * @access  Bot only (no auth)
 */
const botVerifyHandler = async (req, res) => {
  try {
    const { code, telegramId, chatId, username } = req.body;
    
    if (!code || !telegramId || !chatId) {
      return res.status(400).json({ 
        success: false,
        error: 'Code, telegramId and chatId are required' 
      });
    }
    
    const verification = verificationCodes.get(code);
    
    if (!verification) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid verification code' 
      });
    }
    
    if (new Date() > new Date(verification.expiresAt)) {
      // Clean up expired code
      verificationCodes.delete(code);
      
      return res.status(400).json({ 
        success: false,
        error: 'Verification code has expired' 
      });
    }
    
    // Code is valid, get user from verification
    const uid = verification.uid;
    const userRef = db.collection('users').doc(uid);
    
    // Update user with Telegram information
    await userRef.update({
      'profile.telegramId': telegramId,
      'profile.telegramChatId': chatId,
      'profile.telegramUsername': username || null,
      'profile.notificationPreferences.telegram': true,
      'profile.updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Clean up used code
    verificationCodes.delete(code);
    
    return res.status(200).json({
      success: true,
      error: null,
      email: verification.email
    });
  } catch (error) {
    console.error('Error in bot verification:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Expose the handler functions directly on the router
router.botVerifyHandler = botVerifyHandler;
router.botVerifyHealthCheck = botVerifyHealthCheck;

module.exports = router;
