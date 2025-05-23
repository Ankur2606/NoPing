# BNB Smart Chain Testing Guide for FlowSync Contracts

This guide provides a comprehensive overview of how to test and deploy your BNB Smart Chain contracts for FlowSync.

## Testing Environment Setup

We've created a complete testing environment in `/Users/ayushmanlakshkar/Documents/flow-gen-sync/test-environment/` with the following features:

### 1. Complete Contract Testing Suite

- **Unit Tests**: Comprehensive test coverage for AccessControl.sol and PaymentProcessor.sol
- **Integration Testing**: Test interactions between contracts in a local environment
- **Scripts**: Helper scripts for common testing and deployment scenarios

### 2. Local Development Environment

Run a complete local blockchain environment with:

```bash
cd /Users/ayushmanlakshkar/Documents/flow-gen-sync/test-environment
npm run dev
```

This will:
- Start a Hardhat local blockchain
- Deploy your contracts
- Provide test accounts with ETH for testing

### 3. Interactive Testing

Test your contracts interactively with pre-built utilities:

```bash
npm run interactive
```

Example commands in the interactive console:
```javascript
// Process a payment of 0.1 ETH from user1
await utils.processPayment(accounts.user1, 0.1, '{"service":"premium"}')
  
// Check balances
await utils.getBalance(accounts.feeCollector.address) 
await utils.getBalance(accounts.owner.address)
  
// Get payment details
await contracts.PaymentProcessor.getPayment(1)
```

## Testing Your Contracts on BSC Testnet

1. Set up your `.env` file with your private key:
```
PRIVATE_KEY=your_private_key_here
FEE_PERCENTAGE=200
FEE_COLLECTOR_ADDRESS=your_fee_collector_address
```

2. Make sure you have test BNB in your wallet (from [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart))

3. Deploy to BSC Testnet:
```bash
npm run deploy:testnet
```

4. Verify your contracts on BscScan using the instructions printed after deployment

## Integration with Your Frontend

Once your contracts are deployed (either locally or on testnet), you can connect your frontend to them:

1. For local development:
   - RPC URL: http://localhost:8545
   - Chain ID: 31337

2. For BSC Testnet:
   - RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545
   - Chain ID: 97

3. Contract ABIs are available in the `artifacts` directory after compilation

4. Contract addresses are saved to:
   - `deployments.json` (for local development)
   - `deployments-testnet.json` (for testnet deployments)

## Production Deployment

When you're ready to deploy to BSC Mainnet:

1. Update your `.env` file with mainnet configuration
2. Modify `hardhat.config.js` to include BSC Mainnet
3. Run similar deployment steps to what we've set up for testnet

## Conclusion

You now have a complete environment for testing your BNB Smart Chain contracts for FlowSync. The setup supports both local development and testnet deployment, with comprehensive testing capabilities.
