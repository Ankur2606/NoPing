# Web3 Payment Integration Guide

This guide explains how to use the Web3 payment system with the Solidity smart contracts in FlowSync.

## Overview

FlowSync now supports blockchain payments using the BNB Smart Chain through two main contracts:
- **PaymentProcessor.sol**: Handles one-time payments
- **SubscriptionManager.sol**: Manages subscription-based payments

## Setup

### 1. Deploy Smart Contracts

Deploy the smart contracts to BNB testnet or mainnet:

```bash
# In the test-environment directory
npx hardhat compile
npx hardhat run scripts/deploy.js --network bnbTestnet
```

When deploying the PaymentProcessor contract, you need to specify:
1. The AccessControl contract address
2. The initial payee address (the address that will receive all payments)

Example deployment:
```javascript
// deploy.js snippet
const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
const paymentProcessor = await PaymentProcessor.deploy(
  accessControl.address,
  "0xYourPaymentReceiverAddress" // Address that will receive all payments
);
```

### 2. Configure Contract Addresses

Add the deployed contract addresses to your `.env` file:

```
VITE_PAYMENT_PROCESSOR_ADDRESS=0x123456789abcdef123456789abcdef123456789a
VITE_SUBSCRIPTION_MANAGER_ADDRESS=0xabcdef123456789abcdef123456789abcdef1234
VITE_PAYMENT_RECEIVER_ADDRESS=0x987654321abcdef987654321abcdef987654321a
```

### 3. Install Dependencies

Make sure to install the required dependencies:

```bash
# In the client directory
npm install ethers@5.7.2
```

## Usage

### Making Payments

Users can make payments in two ways:
1. **Direct Payment**: One-time payment using PaymentProcessor (payments go to a fixed address)
2. **Subscription**: Recurring payment using SubscriptionManager

The payment flow is:
1. User selects a subscription plan
2. User connects their wallet (MetaMask, etc.)
3. User completes transaction through the blockchain
4. Funds are automatically sent to the pre-configured payment receiver address
5. Backend processes the payment confirmation

> **Note:** The PaymentProcessor contract uses a fixed payee address that can only be updated by the contract owner. This ensures all payments are directed to your application's wallet.

### Backend Integration

After a successful payment, the backend will:
1. Verify the transaction on the blockchain
2. Update the user's subscription status
3. Record payment details in Firebase

## Testing

You can test the payment system using the BNB testnet:

1. Get testnet BNB from [BNB Chain Faucet](https://testnet.binance.org/faucet-smart)
2. Connect MetaMask to BNB testnet
3. Make a test payment in the application

## Troubleshooting

Common issues:
- **Transaction failed**: Check if user has sufficient BNB
- **Contract interaction failed**: Verify contract addresses are correct
- **Missing payment confirmation**: Check if events are being emitted correctly

## Contract Security

The contracts implement security best practices:
- Access control for admin functions
- Input validation
- Proper error handling
- Secure fund transfers

For security concerns, please contact the development team.
