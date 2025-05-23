/**
 * Payment controller for handling payment processing and verification
 */

const { admin, db } = require('../config/firebase');
const { createDefaultPayment } = require('../models/paymentModel');
const { SUBSCRIPTION_TIERS, SUBSCRIPTION_STATUS, createSubscription } = require('../models/subscriptionModel');
const { getNowPaymentsClient } = require('../services/nowPaymentsService');
const bscService = require('../services/bscService');

/**
 * Create a new BNB payment intent for direct blockchain payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createBnbPaymentIntent = async (req, res) => {
  try {
    const { uid } = req.user;
    const { amount, amountUsd, subscriptionId = null, tier = null, billingPeriod = null, metadata = {} } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Get the company wallet address
    const companyWalletAddress = process.env.PAYMENT_WALLET_ADDRESS || require('../config/constants').PAYMENT_WALLET_ADDRESS;
    
    // Create payment record
    const payment = createDefaultPayment(uid, amount, amountUsd, 'bnb_direct');
    payment.toAddress = companyWalletAddress;
    payment.metadata = {
      ...metadata,
      subscriptionId,
      tier,
      billingPeriod
    };
    
    // Save to Firestore
    const paymentRef = await db.collection('payments').add(payment);
    
    // If this payment is for a new subscription, create it
    if (tier && !subscriptionId) {
      const subscription = createSubscription(uid, tier, 'bnb_direct', paymentRef.id);
      const subscriptionRef = await db.collection('subscriptions').add(subscription);
      
      // Update payment with subscription ID
      await paymentRef.update({
        subscriptionId: subscriptionRef.id
      });
      
      payment.subscriptionId = subscriptionRef.id;
    }
    
    return res.status(201).json({
      success: true,
      payment: {
        id: paymentRef.id,
        ...payment
      },
      walletAddress: companyWalletAddress,
      error: null
    });
  } catch (error) {
    console.error('Error creating BNB payment intent:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create a new payment through NOWPayments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createNowPayment = async (req, res) => {
  try {
    const { uid } = req.user;
    const { amountUsd, currency = 'bnb', subscriptionId = null, tier = null, billingPeriod = null, metadata = {} } = req.body;
    
    if (!amountUsd || amountUsd <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount in USD is required'
      });
    }

    // Get the NOWPayments client
    const nowPaymentsClient = getNowPaymentsClient();
    
    // Generate a unique order ID
    const orderId = `order_${uid.substring(0, 8)}_${Date.now()}`;
    
    // Create invoice with NOWPayments
    const invoiceData = await nowPaymentsClient.createInvoice({
      price_amount: amountUsd,
      price_currency: 'usd',
      pay_currency: currency,
      order_id: orderId,
      order_description: tier ? `FlowSync ${tier} Subscription` : 'FlowSync Payment',
      ipn_callback_url: `${process.env.SERVER_URL}/api/payments/nowpayments/webhook`,
      success_url: `${process.env.FRONTEND_URL}/subscription/success`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`
    });
    
    // Create payment record
    const payment = createDefaultPayment(uid, 0, amountUsd, 'nowpayments');
    payment.currency = currency.toUpperCase();
    payment.metadata = {
      ...metadata,
      subscriptionId,
      tier,
      billingPeriod,
      nowpayments: {
        orderId,
        invoiceId: invoiceData.id,
        paymentUrl: invoiceData.invoice_url,
        status: invoiceData.payment_status
      }
    };
    
    // Save to Firestore
    const paymentRef = await db.collection('payments').add(payment);
    
    // If this payment is for a new subscription, create it
    if (tier && !subscriptionId) {
      const subscription = createSubscription(uid, tier, 'nowpayments', paymentRef.id);
      const subscriptionRef = await db.collection('subscriptions').add(subscription);
      
      // Update payment with subscription ID
      await paymentRef.update({
        subscriptionId: subscriptionRef.id
      });
      
      payment.subscriptionId = subscriptionRef.id;
    }
    
    return res.status(201).json({
      success: true,
      payment: {
        id: paymentRef.id,
        ...payment
      },
      invoiceUrl: invoiceData.invoice_url,
      error: null
    });
  } catch (error) {
    console.error('Error creating NOWPayments payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Handle NOWPayments webhook (IPN)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleNowPaymentsWebhook = async (req, res) => {
  try {
    const { nowPaymentsClient } = getNowPaymentsClient();
    
    // Verify the webhook signature
    const signature = req.headers['x-nowpayments-sig'];
    if (!signature) {
      console.error('Missing NOWPayments signature');
      return res.status(401).json({ error: 'Missing signature' });
    }
    
    const isValid = nowPaymentsClient.verifyWebhook(signature, req.body);
    if (!isValid) {
      console.error('Invalid NOWPayments signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const { order_id, payment_status, payment_id, pay_amount, pay_currency } = req.body;
    
    // Find the payment by order_id
    const paymentsSnapshot = await db.collection('payments')
      .where('metadata.nowpayments.orderId', '==', order_id)
      .limit(1)
      .get();
    
    if (paymentsSnapshot.empty) {
      console.error('Payment not found for order_id:', order_id);
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const paymentDoc = paymentsSnapshot.docs[0];
    const payment = paymentDoc.data();
    const paymentRef = paymentDoc.ref;
    
    // Update payment
    const updates = {
      status: payment_status === 'finished' ? 'completed' : payment_status,
      amount: parseFloat(pay_amount),
      currency: pay_currency.toUpperCase(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      'metadata.nowpayments.paymentId': payment_id,
      'metadata.nowpayments.status': payment_status
    };
    
    // Add the IPN callback to the history
    updates[`metadata.nowpayments.ipnCallbacks`] = admin.firestore.FieldValue.arrayUnion({
      timestamp: new Date().toISOString(),
      status: payment_status,
      amount: pay_amount,
      currency: pay_currency
    });
    
    await paymentRef.update(updates);
    
    // If payment is for a subscription, update the subscription
    if (payment.subscriptionId) {
      const subscriptionRef = db.collection('subscriptions').doc(payment.subscriptionId);
      const subscriptionDoc = await subscriptionRef.get();
      
      if (subscriptionDoc.exists) {
        const subscription = subscriptionDoc.data();
        const updates = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (payment_status === 'finished') {
          updates.status = SUBSCRIPTION_STATUS.ACTIVE;
          updates.lastPaymentId = paymentDoc.id;
          updates.paymentHistory = admin.firestore.FieldValue.arrayUnion(paymentDoc.id);
        } else if (['failed', 'expired', 'refunded'].includes(payment_status)) {
          // Only update status if it's pending, don't downgrade active subscriptions
          if (subscription.status === SUBSCRIPTION_STATUS.PENDING) {
            updates.status = SUBSCRIPTION_STATUS.FAILED;
          }
        }
        
        await subscriptionRef.update(updates);
      }
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling NOWPayments webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Manually verify a direct BNB payment transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyBnbPayment = async (req, res) => {
  try {
    const { paymentId, txHash, fromAddress } = req.body;
    
    if (!paymentId || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID and transaction hash are required'
      });
    }
    
    // Get the payment
    const paymentRef = db.collection('payments').doc(paymentId);
    const paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }
    
    const payment = paymentDoc.data();
    
    // Only allow verification of pending BNB payments
    if (payment.status !== 'pending' || payment.paymentMethod !== 'bnb_direct') {
      return res.status(400).json({
        success: false,
        error: 'Payment is not in a valid state for verification'
      });
    }
    
    // Verify the transaction
    const verificationResult = await bscService.verifyTransaction(txHash, fromAddress, payment.amount, payment.toAddress);
    
    if (!verificationResult.valid) {
      return res.status(400).json({
        success: false,
        error: verificationResult.reason
      });
    }
    
    // Update payment
    const updates = {
      status: 'completed',
      txHash,
      fromAddress: fromAddress || verificationResult.txDetails.from,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      blockNumber: verificationResult.txDetails.blockNumber
    };
    
    await paymentRef.update(updates);
    
    // If payment is for a subscription, activate it
    if (payment.subscriptionId) {
      const subscriptionRef = db.collection('subscriptions').doc(payment.subscriptionId);
      const subscriptionDoc = await subscriptionRef.get();
      
      if (subscriptionDoc.exists) {
        const subscription = subscriptionDoc.data();
        const updates = {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          lastPaymentId: paymentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (!subscription.paymentHistory.includes(paymentId)) {
          updates.paymentHistory = admin.firestore.FieldValue.arrayUnion(paymentId);
        }
        
        await subscriptionRef.update(updates);
      }
    }
    
    return res.status(200).json({
      success: true,
      payment: {
        id: paymentDoc.id,
        ...payment,
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error verifying BNB payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get payment history for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 10, offset = 0, status } = req.query;
    
    // Query payments
    let query = db.collection('payments')
      .where('userId', '==', uid)
      // .orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Get total count for pagination
    const countSnapshot = await query.count().get();
    const totalCount = countSnapshot.data().count;
    
    // Apply pagination
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    // Execute query
    const paymentsSnapshot = await query.get();
    const payments = [];
    
    paymentsSnapshot.forEach(doc => {
      payments.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return res.status(200).json({
      success: true,
      payments,
      total: totalCount,
      hasMore: totalCount > parseInt(offset) + payments.length
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get details for a specific payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPaymentDetails = async (req, res) => {
  try {
    const { uid } = req.user;
    const { paymentId } = req.params;
    
    const paymentRef = db.collection('payments').doc(paymentId);
    const paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }
    
    const payment = paymentDoc.data();
    
    // Ensure the payment belongs to the requesting user
    if (payment.userId !== uid) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    return res.status(200).json({
      success: true,
      payment: {
        id: paymentDoc.id,
        ...payment
      }
    });
  } catch (error) {
    console.error('Error getting payment details:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createBnbPaymentIntent,
  createNowPayment,
  handleNowPaymentsWebhook,
  verifyBnbPayment,
  getPaymentHistory,
  getPaymentDetails
};
