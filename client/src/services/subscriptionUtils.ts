/**
 * Utility functions for working with subscriptions
 */

import { 
  SUBSCRIPTION_TIERS, 
  SUBSCRIPTION_STATUS,
  BILLING_PERIODS,
  SubscriptionTier,
  BillingPeriod
} from './subscriptionConstants';
import { Subscription } from './api';

/**
 * Check if a subscription is active
 * @param subscription Subscription object
 * @returns boolean indicating if subscription is active
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === SUBSCRIPTION_STATUS.ACTIVE;
}

/**
 * Check if a subscription has a specific feature
 * @param subscription Subscription object
 * @param featureName Name of the feature to check
 * @returns boolean indicating if the subscription has the feature
 */
export function hasSubscriptionFeature(
  subscription: Subscription | null, 
  featureName: keyof Subscription['features']
): boolean {
  if (!subscription || !subscription.features) return false;
  
  const featureValue = subscription.features[featureName];
  if (typeof featureValue === 'boolean') return featureValue;
  if (typeof featureValue === 'number') return featureValue !== 0; // Any non-zero value means feature is available
  
  return false;
}

/**
 * Calculate subscription pricing based on tier and billing period
 * @param tier Subscription tier
 * @param billingPeriod Billing period
 * @param pricingData Pricing data from the API
 * @returns The price for the subscription
 */
export function calculateSubscriptionPrice(
  tier: SubscriptionTier,
  billingPeriod: BillingPeriod,
  pricingData: { [tier: string]: { [billingPeriod: string]: number } }
): number {
  if (tier === SUBSCRIPTION_TIERS.FREE) return 0;
  
  try {
    return pricingData[tier][billingPeriod] || 0;
  } catch (error) {
    console.error('Error calculating subscription price:', error);
    return 0;
  }
}

/**
 * Format a price for display
 * @param price Price to format
 * @param currency Currency code
 * @returns Formatted price string
 */
export function formatPrice(price: number, currency = 'BNB'): string {
  return `${price} ${currency}`;
}

/**
 * Get remaining days in a subscription
 * @param subscription Subscription object
 * @returns Number of days remaining, or null if no end date
 */
export function getSubscriptionDaysRemaining(subscription: Subscription | null): number | null {
  if (!subscription || !subscription.endDate) return null;
  
  const endDate = new Date(subscription.endDate);
  const now = new Date();
  
  // Calculate difference in days
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
