/**
 * Subscription controller for managing user subscriptions
 */

const { admin, db } = require('../config/firebase');
const { SUBSCRIPTION_TIERS, SUBSCRIPTION_STATUS, BILLING_PERIODS, createSubscription, subscriptionFeatureLimits, subscriptionPricing } = require('../models/subscriptionModel');

/**
 * Get the current active subscription for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentSubscription = async (req, res) => {
  try {
    console.log('dhjfbhdfv');
    const { uid } = req.user;
    console.log('Fetching current subscription for user:', uid);
    // Query for active subscription
    const subscriptionsSnapshot = await db.collection('subscriptions')
      .where('userId', '==', uid)
      .where('status', '==', SUBSCRIPTION_STATUS.ACTIVE)
      // .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    console.log('Subscriptions snapshot:', subscriptionsSnapshot);
    if (subscriptionsSnapshot.empty) {
      console.log('No active subscription found, creating free tier subscription');
      // No active subscription found, create a free tier subscription
      const freeSubscription = createSubscription(uid, SUBSCRIPTION_TIERS.FREE);
      const subscriptionRef = await db.collection('subscriptions').add(freeSubscription);
      console.log('Created new free subscription:', subscriptionRef.id);
      return res.status(200).json({
        success: true,
        subscription: {
          id: subscriptionRef.id,
          ...freeSubscription,
          features: subscriptionFeatureLimits[SUBSCRIPTION_TIERS.FREE]
        }
      });
    }
    console.log('Active subscription found:', subscriptionsSnapshot.docs[0].id);
    // Return existing subscription
    const subscriptionDoc = subscriptionsSnapshot.docs[0];
    const subscription = subscriptionDoc.data();
    console.log('Subscription data:', subscription);
    // Check if subscription has expired
    const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
    if (endDate && endDate < new Date() && subscription.tier !== SUBSCRIPTION_TIERS.FREE) {
      // Subscription has expired, update status
      await subscriptionDoc.ref.update({
        status: SUBSCRIPTION_STATUS.EXPIRED,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
      
      // Create a new free tier subscription
      const freeSubscription = createSubscription(uid, SUBSCRIPTION_TIERS.FREE);
      const newSubscriptionRef = await db.collection('subscriptions').add(freeSubscription);
      
      return res.status(200).json({
        success: true,
        subscription: {
          id: newSubscriptionRef.id,
          ...freeSubscription,
          features: subscriptionFeatureLimits[SUBSCRIPTION_TIERS.FREE],
          previousSubscription: {
            id: subscriptionDoc.id,
            ...subscription
          }
        }
      });
    }
    
    // Return active subscription with features
    return res.status(200).json({
      success: true,
      subscription: {
        id: subscriptionDoc.id,
        ...subscription,
        features: subscriptionFeatureLimits[subscription.tier]
      }
    });
  } catch (error) {
    console.error('Error getting current subscription:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Start a new subscription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const startSubscription = async (req, res) => {
  try {
    const { uid } = req.user;
    const { tier, billingPeriod = BILLING_PERIODS.MONTHLY, paymentMethod = 'bnb_direct' } = req.body;
    
    if (!tier || !Object.values(SUBSCRIPTION_TIERS).includes(tier)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tier. Must be one of: ${Object.values(SUBSCRIPTION_TIERS).join(', ')}`
      });
    }
    
    if (!Object.values(BILLING_PERIODS).includes(billingPeriod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid billing period. Must be one of: ${Object.values(BILLING_PERIODS).join(', ')}`
      });
    }
    
    // If free tier is selected, create subscription immediately
    if (tier === SUBSCRIPTION_TIERS.FREE) {
      const freeSubscription = createSubscription(uid, SUBSCRIPTION_TIERS.FREE);
      const subscriptionRef = await db.collection('subscriptions').add(freeSubscription);
      
      return res.status(200).json({
        success: true,
        subscription: {
          id: subscriptionRef.id,
          ...freeSubscription,
          features: subscriptionFeatureLimits[SUBSCRIPTION_TIERS.FREE]
        },
        requiresPayment: false
      });
    }
    
    // For paid tiers, create a pending subscription
    const pendingSubscription = createSubscription(uid, tier);
    pendingSubscription.status = SUBSCRIPTION_STATUS.PENDING;
    pendingSubscription.billingPeriod = billingPeriod;
    pendingSubscription.paymentMethod = paymentMethod;
    
    const subscriptionRef = await db.collection('subscriptions').add(pendingSubscription);
    
    // Get pricing for this tier
    const price = subscriptionPricing[tier][billingPeriod];
    
    return res.status(200).json({
      success: true,
      subscription: {
        id: subscriptionRef.id,
        ...pendingSubscription,
        features: subscriptionFeatureLimits[tier]
      },
      price,
      requiresPayment: true
    });
  } catch (error) {
    console.error('Error starting subscription:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel a subscription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelSubscription = async (req, res) => {
  try {
    const { uid } = req.user;
    const { subscriptionId } = req.params;
    const { cancelImmediately = false } = req.body;
    
    // Get the subscription
    const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
    const subscriptionDoc = await subscriptionRef.get();
    
    if (!subscriptionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    const subscription = subscriptionDoc.data();
    
    // Ensure the subscription belongs to the requesting user
    if (subscription.userId !== uid) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Cannot cancel free subscriptions
    if (subscription.tier === SUBSCRIPTION_TIERS.FREE) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel free subscription'
      });
    }
    
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      autoRenew: false
    };
    
    if (cancelImmediately) {
      updates.status = SUBSCRIPTION_STATUS.CANCELLED;
      
      // Create a new free tier subscription
      const freeSubscription = createSubscription(uid, SUBSCRIPTION_TIERS.FREE);
      await db.collection('subscriptions').add(freeSubscription);
    } else {
      updates.cancelAtPeriodEnd = true;
    }
    
    await subscriptionRef.update(updates);
    
    return res.status(200).json({
      success: true,
      message: cancelImmediately ? 
        'Subscription cancelled successfully' :
        'Subscription will be cancelled at the end of the current period'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Change subscription tier
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const changeSubscriptionTier = async (req, res) => {
  try {
    const { uid } = req.user;
    const { subscriptionId } = req.params;
    const { newTier, billingPeriod } = req.body;
    
    if (!newTier || !Object.values(SUBSCRIPTION_TIERS).includes(newTier)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tier. Must be one of: ${Object.values(SUBSCRIPTION_TIERS).join(', ')}`
      });
    }
    
    // Get the subscription
    const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
    const subscriptionDoc = await subscriptionRef.get();
    
    if (!subscriptionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    const subscription = subscriptionDoc.data();
    
    // Ensure the subscription belongs to the requesting user
    if (subscription.userId !== uid) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // If downgrading to free tier
    if (newTier === SUBSCRIPTION_TIERS.FREE) {
      // Mark current subscription as cancelled
      await subscriptionRef.update({
        status: SUBSCRIPTION_STATUS.CANCELLED,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        autoRenew: false
      });
      
      // Create new free subscription
      const freeSubscription = createSubscription(uid, SUBSCRIPTION_TIERS.FREE);
      const newSubscriptionRef = await db.collection('subscriptions').add(freeSubscription);
      
      return res.status(200).json({
        success: true,
        subscription: {
          id: newSubscriptionRef.id,
          ...freeSubscription,
          features: subscriptionFeatureLimits[SUBSCRIPTION_TIERS.FREE]
        },
        requiresPayment: false,
        message: 'Downgraded to free tier successfully'
      });
    }
    
    // For upgrades or changes between paid tiers
    const newBillingPeriod = billingPeriod || subscription.billingPeriod;
    
    // Create a new pending subscription
    const pendingSubscription = createSubscription(uid, newTier);
    pendingSubscription.status = SUBSCRIPTION_STATUS.PENDING;
    pendingSubscription.billingPeriod = newBillingPeriod;
    pendingSubscription.paymentMethod = subscription.paymentMethod;
    
    const newSubscriptionRef = await db.collection('subscriptions').add(pendingSubscription);
    
    // Get pricing for new tier
    const price = subscriptionPricing[newTier][newBillingPeriod];
    
    return res.status(200).json({
      success: true,
      subscription: {
        id: newSubscriptionRef.id,
        ...pendingSubscription,
        features: subscriptionFeatureLimits[newTier]
      },
      price,
      requiresPayment: true,
      message: `Subscription will be changed to ${newTier} tier after payment`
    });
  } catch (error) {
    console.error('Error changing subscription tier:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get subscription history for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubscriptionHistory = async (req, res) => {
  try {
    const { uid } = req.user;
    
    // Query subscriptions
    const subscriptionsSnapshot = await db.collection('subscriptions')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    const subscriptions = [];
    
    subscriptionsSnapshot.forEach(doc => {
      const subscription = doc.data();
      subscriptions.push({
        id: doc.id,
        ...subscription,
        features: subscriptionFeatureLimits[subscription.tier]
      });
    });
    
    return res.status(200).json({
      success: true,
      subscriptions
    });
  } catch (error) {
    console.error('Error getting subscription history:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get subscription pricing information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubscriptionPricing = async (req, res) => {
  try {
    // Calculate USD prices based on current BNB price
    // In a real implementation, you would fetch the current BNB price from an API
    const bnbPriceUsd = 372; // Example price - in a real app, you'd fetch this from an API
    
    const pricingWithUsd = {};
    
    for (const tier in subscriptionPricing) {
      pricingWithUsd[tier] = {};
      
      for (const period in subscriptionPricing[tier]) {
        const bnbPrice = subscriptionPricing[tier][period];
        pricingWithUsd[tier][period] = {
          bnb: bnbPrice,
          usd: Math.round(bnbPrice * bnbPriceUsd * 100) / 100
        };
      }
    }
    
    return res.status(200).json({
      success: true,
      pricing: pricingWithUsd,
      features: subscriptionFeatureLimits,
      bnbPriceUsd
    });
  } catch (error) {
    console.error('Error getting subscription pricing:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all subscription plans with detailed information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubscriptionPlans = async (req, res) => {
  try {
    // Calculate USD prices based on current BNB price
    const bnbPriceUsd = 372; // Example price - in a real app, you'd fetch this from an API
    
    const plans = [];
    
    // Create detailed plan objects for each tier
    for (const tier in SUBSCRIPTION_TIERS) {
      const tierName = SUBSCRIPTION_TIERS[tier];
      const features = subscriptionFeatureLimits[tierName];
      const pricing = {};
      
      for (const period in subscriptionPricing[tierName]) {
        const bnbPrice = subscriptionPricing[tierName][period];
        pricing[period] = {
          bnb: bnbPrice,
          usd: Math.round(bnbPrice * bnbPriceUsd * 100) / 100
        };
      }
      
      // Create a user-friendly display name and description for each tier
      let displayName, description, highlight;
      
      switch (tierName) {
        case SUBSCRIPTION_TIERS.FREE:
          displayName = 'Free Plan';
          description = 'Basic access for personal use';
          highlight = 'Get started at no cost';
          break;
        case SUBSCRIPTION_TIERS.PRO:
          displayName = 'Pro Plan';
          description = 'Enhanced features for power users';
          highlight = 'Our most popular plan';
          break;
        case SUBSCRIPTION_TIERS.ENTERPRISE:
          displayName = 'Enterprise Plan';
          description = 'Unlimited access for businesses';
          highlight = 'Best value for teams';
          break;
      }
      
      plans.push({
        id: tierName,
        displayName,
        description,
        highlight,
        features,
        pricing,
        popular: tierName === SUBSCRIPTION_TIERS.PRO
      });
    }
    
    return res.status(200).json({
      success: true,
      plans,
      bnbPriceUsd
    });
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getCurrentSubscription,
  startSubscription,
  cancelSubscription,
  changeSubscriptionTier,
  getSubscriptionHistory,
  getSubscriptionPricing,
  getSubscriptionPlans
};
