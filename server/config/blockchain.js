/**
 * Blockchain Configuration
 * 
 * Centralized configuration for blockchain connections and contract addresses
 */

require('dotenv').config();

const NETWORKS = {
  opbnbTestnet: {
    name: 'opBNB Testnet',
    rpcUrl: process.env.OPBNB_TESTNET_RPC || "https://opbnb-testnet-rpc.bnbchain.org",
    chainId: 5611,
    blockExplorer: 'https://opbnb-testnet.bscscan.com',
    gasPrice: '1000000000', // 1 gwei
    gasLimit: '2000000'
  },
  opbnbMainnet: {
    name: 'opBNB Mainnet',
    rpcUrl: process.env.OPBNB_MAINNET_RPC || "https://opbnb-mainnet-rpc.bnbchain.org",
    chainId: 204,
    blockExplorer: 'https://opbnb.bscscan.com',
    gasPrice: '1000000000', // 1 gwei
    gasLimit: '2000000'
  },
  bnbTestnet: {
    name: 'BSC Testnet',
    rpcUrl: process.env.BNB_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
    chainId: 97,
    blockExplorer: 'https://testnet.bscscan.com',
    gasPrice: '10000000000', // 10 gwei
    gasLimit: '3000000'
  },
  bnbMainnet: {
    name: 'BSC Mainnet',
    rpcUrl: process.env.BNB_MAINNET_RPC || "https://bsc-dataseed.binance.org",
    chainId: 56,
    blockExplorer: 'https://bscscan.com',
    gasPrice: '5000000000', // 5 gwei
    gasLimit: '3000000'
  }
};

// Default to opBNB testnet
const DEFAULT_NETWORK = process.env.BLOCKCHAIN_NETWORK || 'opbnbTestnet';

const getNetworkConfig = (networkName = DEFAULT_NETWORK) => {
  const network = NETWORKS[networkName];
  if (!network) {
    throw new Error(`Unknown network: ${networkName}. Available networks: ${Object.keys(NETWORKS).join(', ')}`);
  }
  return network;
};

const getContractAddresses = () => {
  return {
    emailClassification: process.env.EMAIL_CLASSIFICATION_CONTRACT_ADDRESS,
    emailClassificationStorage: process.env.EMAIL_CLASSIFICATION_STORAGE_CONTRACT_ADDRESS,
    emailBatchStorage: process.env.EMAIL_BATCH_STORAGE_CONTRACT_ADDRESS,
    accessControl: process.env.ACCESS_CONTROL_CONTRACT_ADDRESS
  };
};

const validateConfiguration = () => {
  const errors = [];
  
  if (!process.env.PRIVATE_KEY) {
    errors.push('PRIVATE_KEY environment variable is required');
  }
  
  const addresses = getContractAddresses();
  if (!addresses.emailClassification) {
    errors.push('EMAIL_CLASSIFICATION_CONTRACT_ADDRESS environment variable is required');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
};

module.exports = {
  NETWORKS,
  DEFAULT_NETWORK,
  getNetworkConfig,
  getContractAddresses,
  validateConfiguration
};
