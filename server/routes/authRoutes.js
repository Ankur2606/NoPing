const express = require('express');
const router = express.Router();
const { auth, admin, db } = require('../config/firebase');
const { saveOAuthToken, getOAuthToken } = require('../models/oauthTokenModel');
const axios = require('axios');
const querystring = require('querystring');

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google-callback';
const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email', 
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly'  // For reading emails
];

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
 * @route   GET /api/auth/google-auth-url
 * @desc    Get Google OAuth URL with requested scopes
 * @access  Public
 */
router.get('/google-auth-url', (req, res) => {
  // Create a state parameter to verify the callback
  const state = Math.random().toString(36).substring(2, 15);
  
  // Store state in session/cookie for verification later
  // In a real app, you'd save this in a session or temp storage
  // For simplicity, we're skipping that here
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES.join(' '),
    access_type: 'offline', // Get a refresh token
    prompt: 'consent', // Force to get refresh token every time
    state
  })}`;
  
  res.json({ authUrl });
});

/**
 * @route   GET /api/auth/google-callback
 * @desc    Handle Google OAuth callback and exchange code for tokens
 * @access  Public
 */
router.get('/google-callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Validate state parameter (prevent CSRF)
    // In a real app, you'd verify against stored state
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    });
    console.log('Token response:', tokenResponse.data);
    const { access_token, refresh_token, id_token, expires_in } = tokenResponse.data;
    
    // Get user info from Google using the access token instead of verifying the ID token
    const googleUserInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const { sub, email, name, picture } = googleUserInfo.data;
    
    // Get or create Firebase user based on the Google email
    let userRecord;
    
    try {
      // Try to get existing user by email
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      // User doesn't exist, create a new one
      userRecord = await admin.auth().createUser({
        email,
        displayName: name,
        photoURL: picture
      });
    }
    
    const uid = userRecord.uid;
    
    // Save the OAuth tokens
    await saveOAuthToken(uid, 
      { 
        access_token, 
        refresh_token, 
        id_token,
        expires_in 
      }, 
      'google', 
      GOOGLE_OAUTH_SCOPES
    );
    
    // Check if user exists in Firestore
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    if (!userDoc.exists) {
      // Create new user document if it doesn't exist
      await userRef.set({
        profile: {
          email,
          displayName: name || '',
          photoURL: picture || '',
          provider: 'google',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now
        }
      });
    } else {
      // Update existing user
      await userRef.update({
        'profile.lastLoginAt': now,
        'profile.updatedAt': now
      });
    }
    
    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth-success?provider=google`);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * @route   GET /api/auth/token/google
 * @desc    Get stored Google OAuth token for a user
 * @access  Private
 */
router.get('/token/google', authenticateUser, async (req, res) => {
  try {
    const { uid } = req.user;
    const token = await getOAuthToken(uid, 'google');
    if (!token) {
      return res.status(404).json({ error: 'No Google token found for this user' });
    }
    
    // Don't return the actual token to the frontend for security
    // Only return token metadata and status
    return res.status(200).json({
      provider: 'google',
      scopes: token.scopes,
      isExpired: token.isExpired,
      expiresAt: token.expires_at,
      hasEmailAccess: token.scopes.includes('https://www.googleapis.com/auth/gmail.readonly')
    });
  } catch (error) {
    console.error('Error getting Google token:', error);
    return res.status(500).json({ error: error.message });
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