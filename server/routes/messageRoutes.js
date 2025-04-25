const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const { createDefaultMessage } = require('../models/messageModel');

/**
 * @route   GET /api/messages
 * @desc    Get all messages with filters
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { type, read, priority, limit = 10, offset = 0 } = req.query;
    
    // Start with base query for user's messages
    let query = db.collection('messages')
      .doc(uid)
      .collection('userMessages')
      .orderBy('timestamp', 'desc');
    
    // Apply filters if provided
    if (type && type !== 'all') {
      query = query.where('type', '==', type);
    }
    
    if (read && read !== 'all') {
      query = query.where('read', '==', read === 'true');
    }
    
    if (priority && priority !== 'all') {
      query = query.where('priority', '==', priority);
    }
    
    // Get total count (for pagination)
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply pagination
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    // Execute query
    const messagesSnapshot = await query.get();
    
    // Process results
    const messages = [];
    messagesSnapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return res.status(200).json({
      messages,
      total,
      hasMore: total > parseInt(offset) + messages.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/messages/:id
 * @desc    Get single message by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const uid = req.user.uid;
    const messageId = req.params.id;
    
    const messageRef = db.collection('messages')
      .doc(uid)
      .collection('userMessages')
      .doc(messageId);
    
    const messageDoc = await messageRef.get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    return res.status(200).json({
      id: messageDoc.id,
      ...messageDoc.data()
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/messages/:id/read
 * @desc    Mark message as read/unread
 * @access  Private
 */
router.put('/:id/read', async (req, res) => {
  try {
    const uid = req.user.uid;
    const messageId = req.params.id;
    const { read } = req.body;
    
    if (read === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Read status is required'
      });
    }
    
    const messageRef = db.collection('messages')
      .doc(uid)
      .collection('userMessages')
      .doc(messageId);
    
    // Check if message exists
    const messageDoc = await messageRef.get();
    if (!messageDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    // Update read status
    await messageRef.update({
      read: Boolean(read)
    });
    
    // Update analytics
    const analyticsRef = db.collection('analytics').doc(uid);
    const analyticsDoc = await analyticsRef.get();
    
    if (analyticsDoc.exists) {
      const analyticsData = analyticsDoc.data();
      const currentReadCount = (analyticsData.messageStats?.totalRead || 0);
      
      // Increment or decrement based on new read status
      const readDelta = read ? 1 : -1;
      
      await analyticsRef.update({
        'messageStats.totalRead': admin.firestore.FieldValue.increment(readDelta)
      });
    }
    
    return res.status(200).json({
      success: true,
      error: null
    });
  } catch (error) {
    console.error('Error updating message read status:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/messages/:id/convert-to-task
 * @desc    Convert a message to a task
 * @access  Private
 */
router.post('/:id/convert-to-task', async (req, res) => {
  try {
    const uid = req.user.uid;
    const messageId = req.params.id;
    const { title, dueDate, priority, tags } = req.body;
    
    // Get the message to convert
    const messageRef = db.collection('messages')
      .doc(uid)
      .collection('userMessages')
      .doc(messageId);
    
    const messageDoc = await messageRef.get();
    if (!messageDoc.exists) {
      return res.status(404).json({
        error: 'Message not found'
      });
    }
    
    const messageData = messageDoc.data();
    
    // Create task from message data
    const taskData = {
      title: title || (messageData.subject || messageData.content.substring(0, 50) + '...'),
      description: messageData.content,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdOn: admin.firestore.FieldValue.serverTimestamp(),
      priority: priority || 'medium',
      completed: false,
      source: messageData.type,
      sourceMessageId: messageId,
      tags: tags || []
    };
    
    // Add task to Firestore
    const taskRef = await db.collection('tasks')
      .doc(uid)
      .collection('userTasks')
      .add(taskData);
    
    // Return the created task
    return res.status(201).json({
      task: {
        id: taskRef.id,
        ...taskData,
        createdOn: new Date().toISOString() // For immediate response, actual timestamp will be set in Firestore
      },
      error: null
    });
  } catch (error) {
    console.error('Error converting message to task:', error);
    return res.status(500).json({
      task: null,
      error: error.message
    });
  }
});

module.exports = router;