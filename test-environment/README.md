# Testing BNB Smart Chain Contracts Locally

This directory contains a complete local testing environment for FlowSync payment contracts on the BNB Smart Chain.

## Setup

1. Install dependencies:

```bash
cd /Users/ayushmanlakshkar/Documents/flow-gen-sync/test-environment
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env` (if needed)
   - Set the appropriate values in `.env`

## Quick Start

Start a complete development environment with one command:

```bash
npm run dev
```

This will:
1. Start a local Hardhat blockchain
2. Deploy your contracts to the local blockchain
3. Provide you with instructions for testing

## Available Commands

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Start Local Node

```bash
npm run node
```

### Deploy to Local Node

In a separate terminal:

```bash
npm run deploy
```

### Run Test Payment Scenario

```bash
npm run test:payments
```

### Interactive Testing

Start an interactive session to test contracts:

```bash
npm run interactive
```

### Deploy to BSC Testnet

```bash
npm run deploy:testnet
```

## Contract Overview

- **AccessControl.sol**: Role-based access control for FlowSync contracts
- **PaymentProcessor.sol**: Handles BNB payments with fee distribution
- **SubscriptionManager.sol**: Manages subscription plans and user subscriptions
- **EscrowContract.sol**: Handles escrow payments (if applicable)

## Testing Flow

1. Run the local hardhat node with `npm run node`
2. Deploy contracts with `npm run deploy`
3. Interact with contracts using scripts or the hardhat console
4. Verify functionality before deployment to testnet or mainnet

## Interactive Testing Usage

The interactive script provides useful utilities for contract testing:

```bash
npm run interactive

# Example commands in the interactive console:
> await utils.processPayment(accounts.user1, 0.1, '{"service":"premium"}')
> await utils.getBalance(accounts.feeCollector.address)
> await contracts.PaymentProcessor.feePercentage()
```

## Connection with MetaMask

To connect MetaMask to your local development environment:

1. Add a new network in MetaMask:
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

2. Import test accounts using their private keys:
   - The private keys are displayed when running `npm run dev`
   - These accounts come pre-loaded with ETH for testing

## Testing BSC Testnet Deployment

1. Set up your wallet:
   - Add your wallet private key to `.env` file
   - Make sure you have test BNB in your wallet (from [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart))

2. Deploy to BSC Testnet:
   ```bash
   npm run deploy:testnet
   ```

3. Verify contracts on BSC Testnet Explorer:
   - Follow the verification instructions output by the deploy script
```
