const express = require('express');
const router = express.Router();
const { auth, admin, db } = require('../config/firebase');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create the user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || null,
    });

    // Initialize user document in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      profile: {
        email: userRecord.email,
        displayName: userRecord.displayName || '',
        photoURL: userRecord.photoURL || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });

    // Return the new user data
    return res.status(201).json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || '',
      },
      error: null
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({
      user: null,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login existing user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // For login, we would typically use Firebase client SDK on the frontend
    // This backend route is just for demonstration or token validation
    // In a real implementation, you would validate credentials here
    
    // For demo purposes, we'll find the user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    return res.status(200).json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || '',
      },
      error: null
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(401).json({
      user: null,
      error: 'Invalid credentials'
    });
  }
});

/**
 * @route   POST /api/auth/google-signin
 * @desc    Sign in with Google (token verification)
 * @access  Public
 */
router.post('/google-signin', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }
    
    // Verify the Google ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    
    // Check if user exists in Firestore
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create new user document if it doesn't exist
      await userRef.set({
        profile: {
          email: email,
          displayName: name || '',
          photoURL: picture || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });
    }
    
    return res.status(200).json({
      user: {
        uid,
        email,
        displayName: name || '',
        photoURL: picture || '',
      },
      error: null
    });
  } catch (error) {
    console.error('Error with Google sign-in:', error);
    return res.status(401).json({
      user: null,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current user (token invalidation)
 * @access  Private
 */
router.post('/logout', async (req, res) => {
  try {
    // Firebase handles token invalidation on the client side
    // This endpoint is for server-side cleanup if needed
    
    // For demonstration purposes, we'll just return success
    res.status(200).json({
      success: true,
      error: null
    });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;