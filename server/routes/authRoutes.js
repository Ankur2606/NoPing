const express = require('express');
const router = express.Router();
const { auth, admin, db } = require('../config/firebase');

// Authentication middleware for routes that need it
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

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
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    let isNewUser = false;
    
    if (!userDoc.exists) {
      // Create new user document if it doesn't exist
      isNewUser = true;
      await userRef.set({
        profile: {
          email: email,
          displayName: name || '',
          photoURL: picture || '',
          provider: 'google',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          preferences: {
            notifications: true,
            theme: 'light'
          },
          completedOnboarding: false
        },
        stats: {
          totalLogins: 1,
          lastActive: now
        }
      });
    } else {
      // Update existing user with new login information and increment login count
      const userData = userDoc.data();
      const totalLogins = (userData.stats?.totalLogins || 0) + 1;
      
      await userRef.update({
        'profile.lastLoginAt': now,
        'profile.updatedAt': now,
        'profile.photoURL': picture || userData.profile?.photoURL || '',
        'profile.displayName': name || userData.profile?.displayName || '',
        'stats.totalLogins': totalLogins,
        'stats.lastActive': now
      });
    }
    
    // Get updated user data
    const updatedUserDoc = await userRef.get();
    const userData = updatedUserDoc.data();
    
    return res.status(200).json({
      user: {
        uid,
        email,
        displayName: name || '',
        photoURL: picture || '',
        isNewUser,
        profile: userData.profile || {},
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

/**
 * @route   POST /api/auth/create-profile
 * @desc    Create or update user profile after authentication
 * @access  Private (requires authentication)
 */
router.post('/create-profile', authenticateUser, async (req, res) => {
  try {
    const { uid } = req.user;
    const userData = req.body;
    
    // Validate input
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Reference to user document
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Update existing profile
      await userRef.update({
        profile: {
          ...userDoc.data().profile,
          ...userData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });
    } else {
      // Create new profile
      await userRef.set({
        profile: {
          ...userData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });
    }
    
    // Get updated user data
    const updatedUserDoc = await userRef.get();
    const profileData = updatedUserDoc.data().profile;
    
    return res.status(200).json({
      uid,
      ...profileData,
      success: true
    });
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
});

module.exports = router;