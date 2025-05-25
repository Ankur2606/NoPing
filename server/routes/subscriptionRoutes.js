const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const authenticateUser = require('../middlewares/authMiddleware');

const router = express.Router();

// Get current subscription for the authenticated user
router.get('/current', authenticateUser, subscriptionController.getCurrentSubscription);

// Start a new subscription
router.post('/start', authenticateUser, subscriptionController.startSubscription);

// Cancel an existing subscription
router.post('/cancel', authenticateUser, subscriptionController.cancelSubscription);

// Update subscription with transaction ID after payment
router.patch('/:subscriptionId/confirm-payment', authenticateUser, subscriptionController.confirmPayment);

// Change subscription tier
router.post('/change-tier', authenticateUser, subscriptionController.changeSubscriptionTier);

// Get subscription history for the authenticated user
router.get('/history', authenticateUser, subscriptionController.getSubscriptionHistory);

// Get subscription pricing information
router.get('/pricing', subscriptionController.getSubscriptionPricing);

// Get all subscription plans with detailed information
router.get('/plans', subscriptionController.getSubscriptionPlans);

module.exports = router;
