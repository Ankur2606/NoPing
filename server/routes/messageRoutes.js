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
    
    console.log('GET /api/messages - Request parameters:', { 
      uid, type, read, priority, limit, offset 
    });
    
    // Start with base query for user's messages
    let query = db.collection('messages')
      .doc(uid)
      .collection('userMessages')
      .orderBy('timestamp', 'desc');
    
    // console.log(`Querying messages for user: ${uid}`);
    
    // Apply filters if provided
    if (type && type !== 'all') {
      query = query.where('type', '==', type);
      console.log(`Added type filter: ${type}`);
    }
    
    if (read && read !== 'all') {
      const readBoolean = read === 'true';
      query = query.where('read', '==', readBoolean);
      console.log(`Added read filter: ${readBoolean}`);
    }
    
    // Handle priority filter
    if (priority && priority !== 'all') {
      // Check if priority contains comma-separated values
      if (priority.includes(',')) {
        console.log(`Multiple priorities detected: ${priority}`);
        // Cannot use multiple "where" clauses on the same field directly with Firestore
        // Instead, we'll fetch all messages and filter in memory
        const priorityValues = priority.split(',');
        console.log(`Will filter for priorities: ${JSON.stringify(priorityValues)}`);
        
        // Remove the priority filter from the query, we'll filter after fetching
        // Continue with other filters
      } else {
        // Single priority - can use direct where clause
        query = query.where('priority', '==', priority);
        console.log(`Added single priority filter: ${priority}`);
      }
    }
    
    // Log the final query (this is approximate since we can't log the actual Firestore query object)
    // console.log('Query constructed with filters applied');
    
    // Execute query to get all matching documents
    const messagesSnapshot = await query.get();
    // console.log(`Total documents fetched: ${messagesSnapshot.size}`);
    
    // Process results and apply in-memory filtering if needed
    let messages = [];
    messagesSnapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // If we have multiple priority values, filter in memory
    if (priority && priority !== 'all' && priority.includes(',')) {
      const priorityValues = priority.split(',');
      // console.log(`Filtering ${messages.length} messages for priorities: ${priorityValues}`);
      
      messages = messages.filter(message => 
        priorityValues.includes(message.priority)
      );
      
      // console.log(`After priority filtering: ${messages.length} messages remain`);
    }
    
    // Calculate total for pagination (after in-memory filtering)
    const total = messages.length;
    
    // Apply pagination in memory
    messages = messages.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    // console.log(`After pagination: ${messages.length} messages to return`);
    
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