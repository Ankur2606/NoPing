const express = require('express');
const cors = require('cors');
const { db, auth } = require('./config/firebase');
const dotenv = require('dotenv');
const { scheduleEmailCronJob, runEmailCronJob } = require('./scripts/emailCronJob');

// Load environment variables first
dotenv.config();

// Telegram Service (load after env variables are set)
const telegramService = require('./services/telegramService');

// Environment variables already loaded above

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const taskRoutes = require('./routes/taskRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const telegramVerificationRoutes = require('./routes/telegramVerificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const authenticateUser = require('./middlewares/authMiddleware');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticateUser, userRoutes);
app.use('/api/messages', authenticateUser, messageRoutes);
app.use('/api/tasks', authenticateUser, taskRoutes);
app.use('/api/services', authenticateUser, serviceRoutes);
app.use('/api/payments', authenticateUser, paymentRoutes);
app.use('/api/subscriptions', authenticateUser, subscriptionRoutes);
// Explicitly set up the bot-verify route without authentication (must be defined before other routes)
app.all('/api/telegram/bot-verify', (req, res) => {
  const { botVerifyHealthCheck } = require('./routes/telegramVerificationRoutes');
  botVerifyHealthCheck(req, res);
});

// Set up other routes with authentication
app.use('/api/telegram', authenticateUser, telegramRoutes);
app.use('/api/telegram', authenticateUser, telegramVerificationRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('FlowSync API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize Telegram bot (if API key is set)
  if (process.env.TELEGRAM_BOT_API_KEY) {
    console.log('Telegram bot service available at:');
    console.log(`- Bot verification endpoint: http://localhost:${PORT}/api/telegram/bot-verify`);
    
    if (telegramService.bot) {
      console.log(`- Bot username: @${telegramService.bot.options.username || 'Unknown'}`);
    } else {
      console.log('- Bot initialization failed. Check your TELEGRAM_BOT_API_KEY.');
    }
  } else {
    console.log('Telegram bot service disabled (TELEGRAM_BOT_API_KEY not set)');
  }
  
  // Schedule the email cron job (runs every hour by default)
  if (process.env.ENABLE_EMAIL_CRON !== 'false') {
    const runJob = scheduleEmailCronJob();
    
    // Optionally run the job immediately on startup
    if (process.env.RUN_EMAIL_CRON_ON_STARTUP === 'true') {
      console.log('Running email cron job on startup...');
      runJob();
    }
  }
});

module.exports = app;