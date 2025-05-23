/**
 * Utility functions for working with payments
 */

import { PaymentHistoryItem } from './api';
import { PAYMENT_STATUS, PaymentStatus } from './subscriptionConstants';

/**
 * Format a payment amount for display
 * @param amount The payment amount
 * @param currency The currency code
 * @returns Formatted payment amount string
 */
export function formatPaymentAmount(amount: number, currency = 'BNB'): string {
  if (currency === 'USD' || currency === 'USDT') {
    return `$${amount.toFixed(2)}`;
  }
  
  return `${amount} ${currency}`;
}

/**
 * Get CSS color class based on payment status
 * @param status Payment status
 * @returns CSS class name for the status color
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  const colorMap: Record<PaymentStatus, string> = {
    [PAYMENT_STATUS.COMPLETED]: 'text-green-500',
    [PAYMENT_STATUS.PENDING]: 'text-yellow-500',
    [PAYMENT_STATUS.FAILED]: 'text-red-500',
    [PAYMENT_STATUS.REFUNDED]: 'text-blue-500'
  };
  
  return colorMap[status] || 'text-gray-500';
}

/**
 * Format a payment date for display
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export function formatPaymentDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Check if a payment is recent (within the last 24 hours)
 * @param payment Payment history item
 * @returns Boolean indicating if the payment is recent
 */
export function isRecentPayment(payment: PaymentHistoryItem): boolean {
  const paymentDate = new Date(payment.createdAt);
  const now = new Date();
  const diffTime = now.getTime() - paymentDate.getTime();
  const diffHours = diffTime / (1000 * 60 * 60);
  
  return diffHours < 24;
}

/**
 * Get a short transaction hash for display
 * @param txHash Full transaction hash
 * @param length Number of characters to show on each end
 * @returns Shortened transaction hash
 */
export function shortenTxHash(txHash: string | undefined, length = 6): string {
  if (!txHash || txHash.length < length * 2) return txHash || '';
  
  return `${txHash.substring(0, length)}...${txHash.substring(txHash.length - length)}`;
}
