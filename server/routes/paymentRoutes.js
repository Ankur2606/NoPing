const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Public routes for webhooks and callbacks
router.post('/nowpayments/webhook', paymentController.handleNowPaymentsWebhook);

// Protected routes that require authentication
router.post('/bnb/create', paymentController.createBnbPaymentIntent);
router.post('/nowpayments/create', paymentController.createNowPayment);
router.post('/bnb/verify', paymentController.verifyBnbPayment);
router.get('/history', paymentController.getPaymentHistory);
router.get('/:paymentId', paymentController.getPaymentDetails);

module.exports = router;
