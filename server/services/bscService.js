const Web3 = require('web3');
const { BNB_RPC_URL, BNB_CONTRACT_ABI, BNB_CONTRACT_ADDRESS, PAYMENT_WALLET_ADDRESS } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Service for interacting with the Binance Smart Chain (BSC) network
 */
class BscService {
  constructor() {
    this.web3 = new Web3(new Web3.providers.HttpProvider(BNB_RPC_URL));
    if (BNB_CONTRACT_ADDRESS && BNB_CONTRACT_ABI) {
      this.contract = new this.web3.eth.Contract(BNB_CONTRACT_ABI, BNB_CONTRACT_ADDRESS);
    }
  }

  /**
   * Get the BNB balance of a wallet address
   * @param {string} address - The wallet address to check
   * @returns {Promise<string>} - The balance in BNB as a string
   */
  async getBnbBalance(address) {
    try {
      const balanceWei = await this.web3.eth.getBalance(address);
      const balanceBnb = this.web3.utils.fromWei(balanceWei, 'ether');
      return balanceBnb;
    } catch (error) {
      logger.error(`Failed to get BNB balance for ${address}:`, error);
      throw new Error(`Failed to get BNB balance: ${error.message}`);
    }
  }

  /**
   * Get the details of a BNB transaction
   * @param {string} txHash - The transaction hash to check
   * @returns {Promise<object>} - Transaction details
   */
  async getTransactionDetails(txHash) {
    try {
      const tx = await this.web3.eth.getTransaction(txHash);
      if (!tx) {
        throw new Error('Transaction not found');
      }
      
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      const value = this.web3.utils.fromWei(tx.value, 'ether');
      
      return {
        hash: tx.hash,
        from: tx.from.toLowerCase(),
        to: tx.to.toLowerCase(),
        value,
        blockNumber: tx.blockNumber,
        status: receipt ? (receipt.status ? 'confirmed' : 'failed') : 'pending',
        gasUsed: receipt ? receipt.gasUsed : null
      };
    } catch (error) {
      logger.error(`Failed to get transaction details for ${txHash}:`, error);
      throw new Error(`Failed to get transaction details: ${error.message}`);
    }
  }

  /**
   * Verify a BNB payment transaction
   * @param {string} txHash - The transaction hash
   * @param {string} expectedSender - The expected sender address
   * @param {number} expectedAmount - The expected amount in BNB
   * @param {string} expectedRecipient - The expected recipient address (our payment wallet)
   * @returns {Promise<boolean>} - Whether the transaction is valid
   */
  async verifyTransaction(txHash, expectedSender, expectedAmount, expectedRecipient = PAYMENT_WALLET_ADDRESS) {
    try {
      const txDetails = await this.getTransactionDetails(txHash);
      
      // Check status
      if (txDetails.status !== 'confirmed') {
        return { valid: false, reason: 'Transaction not confirmed' };
      }
      
      // Check sender
      if (expectedSender && txDetails.from !== expectedSender.toLowerCase()) {
        return { valid: false, reason: 'Transaction sender does not match expected sender' };
      }
      
      // Check recipient
      if (expectedRecipient && txDetails.to !== expectedRecipient.toLowerCase()) {
        return { valid: false, reason: 'Transaction recipient does not match expected recipient' };
      }
      
      // Check amount with a small tolerance (0.0001 BNB) for gas calculations
      const amountDiff = Math.abs(parseFloat(txDetails.value) - parseFloat(expectedAmount));
      if (amountDiff > 0.0001) {
        return { 
          valid: false, 
          reason: `Transaction amount ${txDetails.value} BNB does not match expected amount ${expectedAmount} BNB` 
        };
      }
      
      return { valid: true, txDetails };
    } catch (error) {
      logger.error(`Failed to verify transaction ${txHash}:`, error);
      return { valid: false, reason: error.message };
    }
  }
  
  /**
   * Get the current BNB price in USD
   * @returns {Promise<number>} - The current BNB price
   */
  async getBnbPriceUSD() {
    try {
      // Using Binance API for price (can be replaced with any reliable price oracle)
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      logger.error('Failed to get BNB price:', error);
      throw new Error(`Failed to get BNB price: ${error.message}`);
    }
  }
  
  /**
   * Convert USD to BNB
   * @param {number} usdAmount - Amount in USD
   * @returns {Promise<number>} - Equivalent amount in BNB
   */
  async convertUSDtoBNB(usdAmount) {
    try {
      const bnbPrice = await this.getBnbPriceUSD();
      return usdAmount / bnbPrice;
    } catch (error) {
      logger.error(`Failed to convert ${usdAmount} USD to BNB:`, error);
      throw new Error(`Failed to convert USD to BNB: ${error.message}`);
    }
  }
}

module.exports = new BscService();
