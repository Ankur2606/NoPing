const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with filters
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { completed, priority, dueDate, limit = 10, offset = 0 } = req.query;
    
    // Start with base query for user's tasks
    let query = db.collection('tasks')
      .doc(uid)
      .collection('userTasks')
      .orderBy('dueDate', 'asc');
    
    // Apply filters if provided
    if (completed && completed !== 'all') {
      query = query.where('completed', '==', completed === 'true');
    }
    
    if (priority && priority !== 'all') {
      query = query.where('priority', '==', priority);
    }
    
    // Handle dueDate filter
    if (dueDate && dueDate !== 'all') {
      const now = new Date();
      let startDate = new Date(now.setHours(0, 0, 0, 0));
      let endDate;
      
      switch (dueDate) {
        case 'today':
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'tomorrow':
          startDate = new Date(now.setDate(now.getDate() + 1));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          endDate = new Date(now);
          endDate.setDate(now.getDate() + 7);
          endDate.setHours(23, 59, 59, 999);
          break;
      }
      
      query = query.where('dueDate', '>=', startDate);
      if (endDate) {
        query = query.where('dueDate', '<=', endDate);
      }
    }
    
    // Get total count (for pagination)
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply pagination
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    // Execute query
    const tasksSnapshot = await query.get();
    
    // Process results
    const tasks = [];
    tasksSnapshot.forEach(doc => {
      tasks.push({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate ? doc.data().dueDate.toDate().toISOString() : null,
        createdOn: doc.data().createdOn ? doc.data().createdOn.toDate().toISOString() : null
      });
    });
    
    return res.status(200).json({
      tasks,
      total,
      hasMore: total > parseInt(offset) + tasks.length
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const uid = req.user.uid;
    const taskId = req.params.id;
    
    const taskRef = db.collection('tasks')
      .doc(uid)
      .collection('userTasks')
      .doc(taskId);
    
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const taskData = taskDoc.data();
    
    return res.status(200).json({
      id: taskDoc.id,
      ...taskData,
      dueDate: taskData.dueDate ? taskData.dueDate.toDate().toISOString() : null,
      createdOn: taskData.createdOn ? taskData.createdOn.toDate().toISOString() : null
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { title, description, dueDate, priority, tags, assignedTo } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Prepare task data
    const taskData = {
      title,
      description: description || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdOn: admin.firestore.FieldValue.serverTimestamp(),
      priority: priority || 'medium',
      completed: false,
      source: 'manual',
      sourceMessageId: null,
      tags: tags || [],
      assignedTo: assignedTo || []
    };
    
    // Add task to Firestore
    const taskRef = await db.collection('tasks')
      .doc(uid)
      .collection('userTasks')
      .add(taskData);
    
    // Update analytics
    const analyticsRef = db.collection('analytics').doc(uid);
    const analyticsDoc = await analyticsRef.get();
    
    if (analyticsDoc.exists) {
      await analyticsRef.update({
        'taskStats.totalCreated': admin.firestore.FieldValue.increment(1),
        [`taskStats.byPriority.${priority || 'medium'}`]: admin.firestore.FieldValue.increment(1)
      });
    } else {
      // Create analytics document if it doesn't exist
      await analyticsRef.set({
        taskStats: {
          totalCreated: 1,
          totalCompleted: 0,
          byPriority: {
            high: priority === 'high' ? 1 : 0,
            medium: priority === 'medium' ? 1 : 0,
            low: priority === 'low' ? 1 : 0
          }
        }
      });
    }
    
    // Return the created task
    return res.status(201).json({
      id: taskRef.id,
      ...taskData,
      createdOn: new Date().toISOString() // For immediate response
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const uid = req.user.uid;
    const taskId = req.params.id;
    const { title, description, dueDate, priority, tags, assignedTo } = req.body;
    
    const taskRef = db.collection('tasks')
      .doc(uid)
      .collection('userTasks')
      .doc(taskId);
    
    // Check if task exists
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Prepare update data
    const updates = {};
    
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) updates.priority = priority;
    if (tags !== undefined) updates.tags = tags;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    
    // Update task
    await taskRef.update(updates);
    
    // Get updated task
    const updatedTaskDoc = await taskRef.get();
    const updatedTaskData = updatedTaskDoc.data();
    
    return res.status(200).json({
      id: taskId,
      ...updatedTaskData,
      dueDate: updatedTaskData.dueDate ? updatedTaskData.dueDate.toDate().toISOString() : null,
      createdOn: updatedTaskData.createdOn ? updatedTaskData.createdOn.toDate().toISOString() : null
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/tasks/:id/complete
 * @desc    Toggle task complete status
 * @access  Private
 */
router.put('/:id/complete', async (req, res) => {
  try {
    const uid = req.user.uid;
    const taskId = req.params.id;
    const { completed } = req.body;
    
    if (completed === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Completed status is required'
      });
    }
    
    const taskRef = db.collection('tasks')
      .doc(uid)
      .collection('userTasks')
      .doc(taskId);
    
    // Check if task exists
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const taskData = taskDoc.data();
    const wasCompleted = taskData.completed;
    const newCompletedState = Boolean(completed);
    
    // Update only if state changed
    if (wasCompleted !== newCompletedState) {
      // Update task
      await taskRef.update({
        completed: newCompletedState
      });
      
      // Update analytics
      const analyticsRef = db.collection('analytics').doc(uid);
      
      await analyticsRef.update({
        'taskStats.totalCompleted': admin.firestore.FieldValue.increment(newCompletedState ? 1 : -1)
      });
    }
    
    return res.status(200).json({
      success: true,
      error: null
    });
  } catch (error) {
    console.error('Error updating task completion status:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.uid;
    const taskId = req.params.id;
    
    const taskRef = db.collection('tasks')
      .doc(uid)
      .collection('userTasks')
      .doc(taskId);
    
    // Check if task exists
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Get task data before deletion for analytics update
    const taskData = taskDoc.data();
    
    // Delete the task
    await taskRef.delete();
    
    // Update analytics if the task was completed
    if (taskData.completed) {
      const analyticsRef = db.collection('analytics').doc(uid);
      await analyticsRef.update({
        'taskStats.totalCompleted': admin.firestore.FieldValue.increment(-1),
        [`taskStats.byPriority.${taskData.priority}`]: admin.firestore.FieldValue.increment(-1)
      });
    }
    
    return res.status(200).json({
      success: true,
      error: null
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;