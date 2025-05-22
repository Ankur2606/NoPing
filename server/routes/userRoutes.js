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
    // Log the request user object to help debug
    console.log('Request user object:', req.user);

    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uid = req.user.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`User document not found for UID: ${uid}`);
      // Instead of returning 404, let's create a basic profile for this user
      const basicProfile = {
        profile: {
          email: req.user.email || '',
          displayName: req.user.displayName || '',
          photoURL: '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      };

      await userRef.set(basicProfile);

      return res.status(200).json({
        uid: uid,
        email: req.user.email || '',
        displayName: req.user.displayName || '',
        photoURL: '',
        createdAt: new Date().toISOString(),
        message: 'New profile created'
      });
    }

    const userData = userDoc.data();

    return res.status(200).json({
      uid: uid,
      email: userData.profile?.email || req.user.email || '',
      displayName: userData.profile?.displayName || req.user.displayName || '',
      photoURL: userData.profile?.photoURL || '',
      createdAt: userData.profile?.createdAt,
      preferences: userData.profile?.preferences || {},
      telegramId: userData.profile?.telegramId || null,
      telegramChatId: userData.profile?.telegramChatId || null,
      telegramUsername: userData.profile?.telegramUsername||null,
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
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uid = req.user.uid;
    const { displayName, photoURL } = req.body;

    // Check if the user exists first
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`Creating new user profile for UID: ${uid} during profile update`);
      // Create a basic profile with the provided data
      const newProfile = {
        profile: {
          email: req.user.email || '',
          displayName: displayName || req.user.displayName || '',
          photoURL: photoURL || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      };

      await userRef.set(newProfile);

      // Update in Firebase Auth if needed
      const authUpdates = {};
      if (displayName) authUpdates.displayName = displayName;
      if (photoURL) authUpdates.photoURL = photoURL;

      if (Object.keys(authUpdates).length > 0) {
        await admin.auth().updateUser(uid, authUpdates);
      }

      return res.status(200).json({
        success: true,
        message: 'New profile created',
        error: null
      });
    }

    // For existing users, prepare updates
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

    // Add updatedAt timestamp
    updates['profile.updatedAt'] = admin.firestore.FieldValue.serverTimestamp();

    // Update in Firestore
    await userRef.update(updates);

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
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uid = req.user.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`User document not found for UID: ${uid} when fetching preferences`);
      // Create a basic profile with default preferences
      const defaultPreferences = {
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

      const basicProfile = {
        profile: {
          email: req.user.email || '',
          displayName: req.user.displayName || '',
          photoURL: '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          preferences: defaultPreferences
        }
      };

      await userRef.set(basicProfile);

      return res.status(200).json({
        ...defaultPreferences,
        message: 'Default preferences created'
      });
    }

    const userData = userDoc.data();

    // Access preferences from either the profile object or directly from userData
    const preferences = (userData.profile?.preferences || userData.preferences) || {
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


module.exports = router;