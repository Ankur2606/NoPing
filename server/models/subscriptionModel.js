/**
 * Subscription model schema definitions for Firebase Firestore collections
 */

const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PENDING: 'pending',
  FAILED: 'failed'
};

const BILLING_PERIODS = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
  ONE_TIME: 'one_time'
};

// Base subscription structure
const baseSubscriptionStructure = {
  userId: "", // UID of the user who owns the subscription
  tier: SUBSCRIPTION_TIERS.FREE, // Current subscription tier
  status: SUBSCRIPTION_STATUS.ACTIVE,
  createdAt: null, // Will be set to admin.firestore.FieldValue.serverTimestamp()
  updatedAt: null, // Will be set to admin.firestore.FieldValue.serverTimestamp()
  startDate: null, // Start date of the current subscription period
  endDate: null, // End date of the current subscription period
  billingPeriod: BILLING_PERIODS.MONTHLY,
  autoRenew: false, // Whether the subscription should auto-renew
  cancelAtPeriodEnd: false, // Whether the subscription should cancel at the end of the current period
  paymentMethod: "", // bnb_direct, nowpayments
  lastPaymentId: "", // Reference to the last payment document
  paymentHistory: [], // Array of payment document IDs
  metadata: {} // Additional metadata
};

// Subscription feature limits by tier
const subscriptionFeatureLimits = {
  [SUBSCRIPTION_TIERS.FREE]: {
    messageLimit: 100, // Number of messages per month
    taskLimit: 5, // Number of tasks
    serviceLimit: 1, // Number of services
    audioTranscriptions: false, // Audio transcriptions feature
    prioritySupport: false, // Priority support
    aiPrioritization: false // AI prioritization of messages
  },
  [SUBSCRIPTION_TIERS.PRO]: {
    messageLimit: 1000,
    taskLimit: 100,
    serviceLimit: 5,
    audioTranscriptions: true,
    prioritySupport: false,
    aiPrioritization: true
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    messageLimit: -1, // Unlimited
    taskLimit: -1, // Unlimited
    serviceLimit: -1, // Unlimited
    audioTranscriptions: true,
    prioritySupport: true,
    aiPrioritization: true
  }
};

// Create a subscription object by tier
const createSubscription = (userId, tier, paymentMethod = "", paymentId = "") => {
  const now = new Date();
  let endDate = new Date();

  if (tier === SUBSCRIPTION_TIERS.FREE) {
    // Free tier doesn't expire
    endDate = null;
  } else {
    // Set end date to 30 days from now for monthly subscriptions
    endDate.setDate(now.getDate() + 30);
  }

  return {
    ...baseSubscriptionStructure,
    userId,
    tier,
    status: tier === SUBSCRIPTION_TIERS.FREE ?
      SUBSCRIPTION_STATUS.ACTIVE :
      paymentId ? SUBSCRIPTION_STATUS.ACTIVE : SUBSCRIPTION_STATUS.PENDING,
    startDate: now.toISOString(),
    endDate: endDate ? endDate.toISOString() : null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    paymentMethod,
    lastPaymentId: paymentId,
    paymentHistory: paymentId ? [paymentId] : [],
    autoRenew: tier !== SUBSCRIPTION_TIERS.FREE
  };
};

// Subscription pricing
const subscriptionPricing = {
  [SUBSCRIPTION_TIERS.FREE]: {
    [BILLING_PERIODS.MONTHLY]: 0,               // Free
    [BILLING_PERIODS.ANNUAL]: 0
  },
  [SUBSCRIPTION_TIERS.PRO]: {
    [BILLING_PERIODS.MONTHLY]: 0.05,            // 0.05 BNB per month
    [BILLING_PERIODS.ANNUAL]: 0.5               // 0.5 BNB per year (save ~16.7%)
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    [BILLING_PERIODS.MONTHLY]: 0.2,             // 0.2 BNB per month
    [BILLING_PERIODS.ANNUAL]: 2                 // 2 BNB per year (save ~16.7%)
  }
};


module.exports = {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_STATUS,
  BILLING_PERIODS,
  baseSubscriptionStructure,
  subscriptionFeatureLimits,
  subscriptionPricing,
  createSubscription
};
