const express = require('express');
const cors = require('cors');
const { db, auth } = require('./config/firebase');
const dotenv = require('dotenv');
const { scheduleEmailCronJob, runEmailCronJob } = require('./scripts/emailCronJob');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await auth.verifyIdToken(token);
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

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const taskRoutes = require('./routes/taskRoutes');
const serviceRoutes = require('./routes/serviceRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticateUser, userRoutes);
app.use('/api/messages', authenticateUser, messageRoutes);
app.use('/api/tasks', authenticateUser, taskRoutes);
app.use('/api/services', authenticateUser, serviceRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('FlowSync API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  runEmailCronJob();
  // Schedule the email cron job (runs every hour by default)
  // You can customize the schedule if needed
  // if (process.env.ENABLE_EMAIL_CRON !== 'false') {
  //   const runJob = scheduleEmailCronJob();
    
  //   // Optionally run the job immediately on startup
  //   if (process.env.RUN_EMAIL_CRON_ON_STARTUP === 'true') {
  //     console.log('Running email cron job on startup...');
  //     runJob();
  //   }
  // }
});

module.exports = app;