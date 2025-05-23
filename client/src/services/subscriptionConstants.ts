/**
 * Subscription constants for use across the application
 */

// Subscription tier types
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

// Subscription status types
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PENDING: 'pending',
  FAILED: 'failed'
} as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

// Billing period types
export const BILLING_PERIODS = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
  ONE_TIME: 'one_time'
} as const;

export type BillingPeriod = typeof BILLING_PERIODS[keyof typeof BILLING_PERIODS];

// Payment status types
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// Payment method types
export const PAYMENT_METHODS = {
  BNB_DIRECT: 'bnb_direct',
  NOWPAYMENTS: 'nowpayments'
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

// Helper functions
export function getTierLabel(tier: SubscriptionTier): string {
  const labels = {
    [SUBSCRIPTION_TIERS.FREE]: 'Free',
    [SUBSCRIPTION_TIERS.PRO]: 'Pro',
    [SUBSCRIPTION_TIERS.ENTERPRISE]: 'Enterprise'
  };
  return labels[tier] || tier;
}

export function getBillingPeriodLabel(period: BillingPeriod): string {
  const labels = {
    [BILLING_PERIODS.MONTHLY]: 'Monthly',
    [BILLING_PERIODS.ANNUAL]: 'Annual',
    [BILLING_PERIODS.ONE_TIME]: 'One-time'
  };
  return labels[period] || period;
}

export function getStatusLabel(status: SubscriptionStatus | PaymentStatus): string {
  const labels = {
    [SUBSCRIPTION_STATUS.ACTIVE]: 'Active',
    [SUBSCRIPTION_STATUS.CANCELLED]: 'Cancelled',
    [SUBSCRIPTION_STATUS.EXPIRED]: 'Expired',
    [SUBSCRIPTION_STATUS.PENDING]: 'Pending',
    [SUBSCRIPTION_STATUS.FAILED]: 'Failed',
    [PAYMENT_STATUS.COMPLETED]: 'Completed',
    [PAYMENT_STATUS.REFUNDED]: 'Refunded'
  };
  return labels[status] || status;
}
