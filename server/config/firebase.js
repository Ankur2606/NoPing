/**
 * Firebase Admin SDK configuration
 * 
 * For production, store the serviceAccountKey securely and use environment variables
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
if (Object.keys(firebaseConfig).length > 0) {
  // Initialize with explicit credentials if provided
  app = admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    databaseURL: firebaseConfig.databaseURL
  });
} else {
  // Otherwise, rely on the GOOGLE_APPLICATION_CREDENTIALS environment variable
  // or the service account file path
  app = admin.initializeApp({
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://flow-gen-sync.firebaseio.com'
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = {
  admin,
  db,
  auth
};