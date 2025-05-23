/**
 * Payment model schema definitions for Firebase Firestore collections
 */

// Base payment structure
const basePaymentStructure = {
  userId: "", // UID of the user who made the payment
  amount: 0, // Amount in BNB
  amountUsd: 0, // Equivalent amount in USD at time of payment
  currency: "BNB", // BNB, USDT, etc.
  status: "pending", // pending, completed, failed, refunded
  txHash: "", // Transaction hash on the blockchain
  createdAt: null, // Will be set to admin.firestore.FieldValue.serverTimestamp()
  updatedAt: null, // Will be set to admin.firestore.FieldValue.serverTimestamp()
  paymentMethod: "bnb_direct", // bnb_direct, nowpayments
  paymentGateway: "", // direct_wallet, nowpayments
  subscriptionId: "", // Reference to the subscription document if this payment is for a subscription
  metadata: {} // Additional metadata specific to the payment gateway
};

// Direct BNB payment fields
const bnbDirectPaymentFields = {
  fromAddress: "", // Wallet address of the payer
  toAddress: "", // Wallet address of the receiver (FlowSync)
  network: "bsc", // bsc, bsc_testnet
  blockNumber: 0, // Block number where the transaction was confirmed
  blockConfirmations: 0 // Number of confirmations
};

// NOWPayments specific payment fields
const nowPaymentsFields = {
  paymentId: "", // NOWPayments payment ID
  invoiceId: "", // NOWPayments invoice ID
  paymentUrl: "", // NOWPayments payment URL for the customer
  ipnCallbacks: [] // Array of IPN callback events from NOWPayments
};

// Create a default payment object by type
const createDefaultPayment = (userId, amount, amountUsd, method = "bnb_direct") => {
  const basePayment = {
    ...basePaymentStructure,
    userId,
    amount,
    amountUsd,
    paymentMethod: method,
    paymentGateway: method === "bnb_direct" ? "direct_wallet" : "nowpayments",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (method === "bnb_direct") {
    return {
      ...basePayment,
      ...bnbDirectPaymentFields
    };
  }
  
  if (method === "nowpayments") {
    return {
      ...basePayment,
      ...nowPaymentsFields
    };
  }
  
  return basePayment;
};

module.exports = {
  basePaymentStructure,
  bnbDirectPaymentFields,
  nowPaymentsFields,
  createDefaultPayment
};
