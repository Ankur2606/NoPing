# Contract Deployment Instructions for BSC Testnet

This guide will help you compile, deploy, and set up your payment contracts on BSC Testnet.

## Prerequisites

1. **Get Testnet BNB**
   - Visit [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart)
   - Enter your wallet address to receive free testnet BNB

2. **Set up your wallet in .env file**
   - Add your private key to DEPLOYER_PRIVATE_KEY in .env
   - Add your wallet address as PAYMENT_WALLET_ADDRESS in .env
   - ⚠️ Never share your private key or commit it to version control

## Step 1: Install dependencies

```bash
cd /Users/ayushmanlakshkar/Documents/flow-gen-sync/server
npm install
```

## Step 2: Compile your contracts

```bash
npm run compile-contracts
```

## Step 3: Deploy your contracts

```bash
node scripts/deployContracts.js
```

If successful, the deployment script will output the addresses of your deployed contracts. Update your .env file with these values:

```
BNB_CONTRACT_ADDRESS=your_deployed_contract_address
```

## Step 4: Set up NowPayments (optional)

1. Register at [NOWPayments.io](https://nowpayments.io)
2. Create an API key in your dashboard
3. Update your .env file with your API key and IPN secret

## Using Direct BNB Payments

If you want to use direct BNB payments without NOWPayments:

1. You can use the existing BscService in the codebase
2. The service already has methods for:
   - Verifying transactions (`verifyTransaction`)
   - Getting transaction details (`getTransactionDetails`)
   - Converting USD to BNB (`convertUSDtoBNB`)

3. To accept payments directly, your flow will be:
   - Present your wallet address to the user
   - User sends BNB to the address
   - User submits transaction hash to your API
   - Your backend verifies the transaction using `verifyTransaction`
   - Grant access to services upon successful verification
