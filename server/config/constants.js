/**
 * Application constants including API keys, wallet addresses, and contract information
 */
module.exports = {
  // BSC Network Configuration
  BNB_RPC_URL: process.env.BNB_RPC_URL || 'https://bsc-dataseed.binance.org/',
  BNB_CHAIN_ID: 56, // BSC Mainnet
  BNB_TEST_CHAIN_ID: 97, // BSC Testnet

  // Smart Contract Information
  BNB_CONTRACT_ADDRESS: process.env.BNB_CONTRACT_ADDRESS,
  BNB_CONTRACT_ABI: process.env.BNB_CONTRACT_ABI ? JSON.parse(process.env.BNB_CONTRACT_ABI) : null,
  
  // Payment Wallet
  PAYMENT_WALLET_ADDRESS: process.env.PAYMENT_WALLET_ADDRESS,
  
  // NOWPayments Integration
  NOWPAYMENTS_API_KEY: process.env.NOWPAYMENTS_API_KEY,
  NOWPAYMENTS_IPN_SECRET: process.env.NOWPAYMENTS_IPN_SECRET,
  
  // Payment Configuration
  PAYMENT_EXPIRATION_TIME: 30 * 60 * 1000, // 30 minutes in milliseconds
  
  // Subscription Pricing (in BNB)
  SUBSCRIPTION_PRICES: {
    FREE: { monthly: 0, annual: 0 },
    PRO: { monthly: 0.05, annual: 0.5 },
    ENTERPRISE: { monthly: 0.2, annual: 2.0 }
  },

  // Subscription Features
  SUBSCRIPTION_FEATURES: {
    FREE: {
      apiCallsPerMonth: 100,
      projectsLimit: 2,
      customModelsAllowed: false,
      supportResponse: '48h'
    },
    PRO: {
      apiCallsPerMonth: 1000,
      projectsLimit: 10,
      customModelsAllowed: true,
      supportResponse: '24h'
    },
    ENTERPRISE: {
      apiCallsPerMonth: 10000,
      projectsLimit: 'Unlimited',
      customModelsAllowed: true,
      supportResponse: '4h'
    }
  }
};
