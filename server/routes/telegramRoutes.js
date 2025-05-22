/**
 * Routes for handling Telegram-related functionality
 */
const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');
const { 
  sendMP3ToUserByUid, 
  sendDocumentToUserByUid, 
  sendMessageToUserByUid,
  broadcastMP3 
} = require('../utils/telegramUtils');
const fs = require('fs');
const path = require('path');

/**
 * @route   GET /api/telegram/status
 * @desc    Check if Telegram bot is running
 * @access  Private
 */
router.get('/bot-status', async (req, res) => {
  try {
    // Check if telegramService.bot exists and is running
    if (!telegramService.bot) {
      return res.status(503).json({
        success: false,
        status: 'not_running',
        error: 'Telegram bot is not running (API key may be missing)'
      });
    }
    
    return res.status(200).json({
      success: true,
      status: 'running',
      botInfo: {
        username: telegramService.bot.options.username,
        polling: telegramService.bot.isPolling()
      }
    });
  } catch (error) {
    console.error('Error checking Telegram bot status:', error);
    return res.status(500).json({ 
      success: false, 
      status: 'error',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/telegram/send-mp3
 * @desc    Send MP3 file to a user via Telegram
 * @access  Private
 */
router.post('/send-mp3', async (req, res) => {
  try {
    // const { filePath } = req.body;
    const filePath = '/Users/ayushmanlakshkar/Documents/flow-gen-sync/server/mp3/Vocali.se_4870_WhatsApp-Video-2024-08-02-at-02.46.17_music.mp3'

    const uid = req.user.uid;
    console.log('Sending MP3 file to user:', uid, filePath);
    if (!uid || !filePath) {
      return res.status(400).json({
        success: false,
        error: 'User ID and file path are required'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Send the file
    const success = await sendMP3ToUserByUid(uid, filePath);
    
    if (success) {
      return res.status(200).json({
        success: true,
        message: 'MP3 file sent successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Failed to send MP3 file. User may not have Telegram integration enabled.'
      });
    }
  } catch (error) {
    console.error('Error sending MP3 file via Telegram:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/telegram/broadcast-mp3
 * @desc    Broadcast MP3 file to all Telegram users
 * @access  Private (Admin only)
 */
router.post('/broadcast-mp3', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Broadcast the file
    const results = await broadcastMP3(filePath);
    
    return res.status(200).json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('Error broadcasting MP3 file via Telegram:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/telegram/send-document
 * @desc    Send a document file to a user via Telegram
 * @access  Private
 */
router.post('/send-document', async (req, res) => {
  try {
    const { uid, filePath, caption } = req.body;
    
    if (!uid || !filePath) {
      return res.status(400).json({
        success: false,
        error: 'User ID and file path are required'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Send the file
    const success = await sendDocumentToUserByUid(uid, filePath, caption || '');
    
    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Document sent successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Failed to send document. User may not have Telegram integration enabled.'
      });
    }
  } catch (error) {
    console.error('Error sending document via Telegram:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/telegram/send-message
 * @desc    Send a text message to a user via Telegram
 * @access  Private
 */
router.post('/send-message', async (req, res) => {
  try {
    const { uid, message, parseMode } = req.body;
    
    if (!uid || !message) {
      return res.status(400).json({
        success: false,
        error: 'User ID and message are required'
      });
    }
    
    const options = {};
    if (parseMode) {
      options.parse_mode = parseMode;
    }
    
    // Send the message
    const success = await sendMessageToUserByUid(uid, message, options);
    
    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Message sent successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Failed to send message. User may not have Telegram integration enabled.'
      });
    }
  } catch (error) {
    console.error('Error sending message via Telegram:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
