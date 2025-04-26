/**
 * Firebase configuration for Email Criticality Engine
 * 
 * Sets up Firebase Admin SDK connection to Firestore database
 * Using the same pattern as the server implementation
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

let firebaseConfig = {};

// If individual credential environment variables are provided, use them
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

// If the database URL is provided, add it to the config
if (process.env.FIREBASE_DATABASE_URL) {
  firebaseConfig.databaseURL = process.env.FIREBASE_DATABASE_URL;
}

// Initialize Firebase Admin
let app;
try {
  if (Object.keys(firebaseConfig).length > 0) {
    // Initialize with explicit credentials if provided
    app = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: firebaseConfig.databaseURL
    });
  } else {
    // Otherwise, rely on the GOOGLE_APPLICATION_CREDENTIALS environment variable
    // or the service account file path
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                             path.resolve(__dirname, './serviceAccountKey.json');
    
    app = admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://flow-gen-sync.firebaseio.com'
    });
  }
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

const getFirestore = () => admin.firestore();
const getAuth = () => admin.auth();

module.exports = {
  admin,
  getFirestore,
  getAuth,
  // For backwards compatibility with our other implementation
  initializeFirebase: () => Promise.resolve(app)
};