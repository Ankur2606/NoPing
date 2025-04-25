const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile data
 * @access  Private
 */
router.get('/profile', async (req, res) => {
  try {
    const uid = req.user.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    return res.status(200).json({
      uid: uid,
      email: userData.profile.email,
      displayName: userData.profile.displayName || '',
      photoURL: userData.profile.photoURL || '',
      createdAt: userData.profile.createdAt
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { displayName, photoURL } = req.body;
    
    const updates = {};
    
    if (displayName !== undefined) {
      updates['profile.displayName'] = displayName;
    }
    
    if (photoURL !== undefined) {
      updates['profile.photoURL'] = photoURL;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No valid update fields provided' 
      });
    }
    
    // Update in Firestore
    await db.collection('users').doc(uid).update(updates);
    
    // Update in Firebase Auth if needed
    const authUpdates = {};
    if (displayName !== undefined) authUpdates.displayName = displayName;
    if (photoURL !== undefined) authUpdates.photoURL = photoURL;
    
    if (Object.keys(authUpdates).length > 0) {
      await admin.auth().updateUser(uid, authUpdates);
    }
    
    return res.status(200).json({
      success: true,
      error: null
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/user/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/preferences', async (req, res) => {
  try {
    const uid = req.user.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    // Return preferences or default values if not set
    const preferences = userData.preferences || {
      workHours: { start: "09:00", end: "17:00" },
      workDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      timeZone: "UTC",
      notificationPreferences: {
        email: true,
        desktop: true,
        mobile: false,
        telegram: false
      },
      priorityKeywords: []
    };
    
    return res.status(200).json(preferences);
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/user/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { workHours, workDays, timeZone, notificationPreferences, priorityKeywords } = req.body;
    
    const updates = {};
    const preferencesPath = 'preferences';
    
    if (workHours) {
      updates[`${preferencesPath}.workHours`] = workHours;
    }
    
    if (workDays) {
      updates[`${preferencesPath}.workDays`] = workDays;
    }
    
    if (timeZone) {
      updates[`${preferencesPath}.timeZone`] = timeZone;
    }
    
    if (notificationPreferences) {
      updates[`${preferencesPath}.notificationPreferences`] = notificationPreferences;
    }
    
    if (priorityKeywords) {
      updates[`${preferencesPath}.priorityKeywords`] = priorityKeywords;
    }
    
    // Update in Firestore
    await db.collection('users').doc(uid).update(updates);
    
    return res.status(200).json({
      success: true,
      error: null
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;