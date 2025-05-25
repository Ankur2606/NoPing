# Daily Blockchain Sync Setup Guide

This guide will help you set up the daily cron job that syncs email classifications to the blockchain.

## Prerequisites

1. **Node.js Dependencies**: Make sure all required packages are installed
2. **Firebase**: Properly configured Firebase connection
3. **Email Classification Contract**: Deployed EmailClassification smart contract
4. **Private Key**: Wallet private key with sufficient gas tokens
5. **Environment Variables**: Properly configured environment variables

## Step 1: Install Dependencies

Navigate to the server directory and install required packages:

```bash
cd server
npm install ethers node-cron
```

## Step 2: Deploy Email Classification Contract

First, deploy the EmailClassification contract to your chosen network:

```bash
cd ../contract
npx hardhat run scripts/deploy.js --network opbnbTestnet
```

Save the deployed contract address from the output.

## Step 3: Configure Environment Variables

Add the following variables to your `.env` file in the server directory:

```env
# Blockchain Configuration
PRIVATE_KEY=your_wallet_private_key_here
EMAIL_CLASSIFICATION_CONTRACT_ADDRESS=deployed_contract_address_here

# Optional: Network Configuration (defaults to opBNB testnet)
OPBNB_TESTNET_RPC=https://opbnb-testnet-rpc.bnbchain.org
OPBNB_CHAIN_ID=5611
GAS_LIMIT=2000000
GAS_PRICE=1000000000

# Email Classification API (if not already set)
NEBIUS_API_KEY=your_nebius_api_key_here

# Firebase Configuration (if not already set)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_service_account_private_key
```

## Step 4: Test the Configuration

Run the test script to verify everything is working:

```bash
# Basic test (checks config and fetches messages)
node scripts/testBlockchainSync.js

# Full test (includes actual blockchain transactions)
node scripts/testBlockchainSync.js --full-test
```

## Step 5: Manual Test Run

Before setting up the cron job, test a manual sync:

```bash
node scripts/dailyBlockchainSyncCronJob.js
```

This will run the sync process once and exit.

## Step 6: Set Up the Cron Job

### Option A: Using the Built-in Scheduler

The script includes a built-in cron scheduler. To start it:

```bash
# Run in the background
nohup node scripts/dailyBlockchainSyncCronJob.js > logs/blockchain-sync.log 2>&1 &
```

### Option B: Using System Cron

Add to your system crontab:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2:00 AM
0 2 * * * cd /path/to/your/server && node scripts/dailyBlockchainSyncCronJob.js >> logs/blockchain-sync.log 2>&1
```

### Option C: Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start the process
pm2 start scripts/dailyBlockchainSyncCronJob.js --name "blockchain-sync"

# Save PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

## Step 7: Monitor the Process

### View Logs

```bash
# If using nohup
tail -f logs/blockchain-sync.log

# If using PM2
pm2 logs blockchain-sync

# If using system cron
tail -f logs/blockchain-sync.log
```

### Check Process Status

```bash
# If using PM2
pm2 status

# If using nohup, find the process
ps aux | grep dailyBlockchainSyncCronJob
```

## Configuration Details

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRIVATE_KEY` | ✅ | - | Wallet private key for blockchain transactions |
| `EMAIL_CLASSIFICATION_CONTRACT_ADDRESS` | ✅ | - | Deployed contract address |
| `OPBNB_TESTNET_RPC` | ❌ | opbnb-testnet-rpc.bnbchain.org | RPC endpoint |
| `OPBNB_CHAIN_ID` | ❌ | 5611 | Chain ID |
| `GAS_LIMIT` | ❌ | 2000000 | Transaction gas limit |
| `GAS_PRICE` | ❌ | 1000000000 | Transaction gas price (1 gwei) |
| `NEBIUS_API_KEY` | ✅ | - | API key for email classification |

### Schedule Configuration

The cron job runs daily at 2:00 AM UTC. To change the schedule, modify the cron expression in `dailyBlockchainSyncCronJob.js`:

```javascript
// Current: Daily at 2:00 AM UTC
cron.schedule('0 2 * * *', ...)

// Examples:
// Every 6 hours: '0 */6 * * *'
// Twice daily (6 AM and 6 PM): '0 6,18 * * *'
// Weekly on Sundays at 3 AM: '0 3 * * 0'
```

## Troubleshooting

### Common Issues

1. **"Private key required" Error**
   - Ensure `PRIVATE_KEY` is set in your environment variables
   - Make sure the private key doesn't include the "0x" prefix

2. **"Contract address required" Error**
   - Deploy the EmailClassification contract first
   - Set `EMAIL_CLASSIFICATION_CONTRACT_ADDRESS` in your environment

3. **"Insufficient funds" Error**
   - Your wallet needs gas tokens (BNB for BSC/opBNB networks)
   - Get testnet tokens from the appropriate faucet

4. **Firebase Connection Issues**
   - Verify Firebase configuration in `config/firebase.js`
   - Check service account permissions

5. **Classification API Errors**
   - Verify `NEBIUS_API_KEY` is correct
   - Check API rate limits and quotas

### Debug Mode

To run with more detailed logging:

```bash
NODE_ENV=development node scripts/dailyBlockchainSyncCronJob.js
```

### Emergency Stop

If you need to stop the process:

```bash
# If using PM2
pm2 stop blockchain-sync

# If using nohup, find and kill the process
pkill -f dailyBlockchainSyncCronJob
```

## Production Considerations

1. **Database Backup**: Regular Firebase backups
2. **Key Security**: Store private keys securely (consider using a key management service)
3. **Monitoring**: Set up alerts for failed transactions
4. **Rate Limiting**: Monitor API usage for the classification service
5. **Gas Optimization**: Monitor gas prices and adjust accordingly
6. **Error Handling**: Set up notifications for repeated failures

## Support

For issues or questions:
1. Check the logs first
2. Run the test script to isolate problems
3. Verify all environment variables are set correctly
4. Ensure sufficient wallet balance for gas fees
