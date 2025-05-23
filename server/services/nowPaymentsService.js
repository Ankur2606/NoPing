const axios = require('axios');
const { NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET, PAYMENT_WALLET_ADDRESS } = require('../config/constants');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Service for interacting with NOWPayments API
 */
class NowPaymentsService {
  constructor() {
    this.baseUrl = 'https://api.nowpayments.io/v1';
    this.apiKey = NOWPAYMENTS_API_KEY;
    this.ipnSecret = NOWPAYMENTS_IPN_SECRET;
  }

  /**
   * Make an API request to NOWPayments
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request payload
   * @returns {Promise<object>} - API response
   */
  async makeRequest(method, endpoint, data = null) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`NOWPayments API error (${endpoint}):`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  /**
   * Create a payment in NOWPayments
   * @param {number} amount - Amount in USD
   * @param {string} currency - Currency code (e.g., 'bnb')
   * @param {object} metadata - Payment metadata
   * @returns {Promise<object>} - Payment details
   */
  async createPayment(amount, currency = 'bnb', metadata = {}) {
    const paymentData = {
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: currency,
      ipn_callback_url: `${metadata.callbackUrl || process.env.SERVER_URL}/api/payments/nowpayments/webhook`,
      order_id: metadata.orderId,
      order_description: metadata.description || 'FlowSync Subscription Payment',
      case: metadata.case || 'success', // For testing
      success_url: metadata.successUrl,
      cancel_url: metadata.cancelUrl
    };

    return await this.makeRequest('POST', '/payment', paymentData);
  }

  /**
   * Get payment status from NOWPayments
   * @param {string} paymentId - NOWPayments payment ID
   * @returns {Promise<object>} - Payment status
   */
  async getPaymentStatus(paymentId) {
    return await this.makeRequest('GET', `/payment/${paymentId}`);
  }

  /**
   * Verify the authenticity of a NOWPayments IPN (Webhook)
   * @param {object} payload - Webhook payload
   * @param {string} signature - IPN signature from header
   * @returns {boolean} - Whether the webhook is authentic
   */
  verifyIpnSignature(payload, signature) {
    try {
      const sortedPayload = this.sortObject(payload);
      const jsonString = JSON.stringify(sortedPayload);
      
      const hmac = crypto.createHmac('sha512', this.ipnSecret);
      const calculatedSignature = hmac.update(jsonString).digest('hex');
      
      return calculatedSignature === signature;
    } catch (error) {
      logger.error('Failed to verify IPN signature:', error);
      return false;
    }
  }

  /**
   * Helper function to sort object for IPN verification
   * @param {object} obj - Object to sort
   * @returns {object} - Sorted object
   */
  sortObject(obj) {
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(this.sortObject.bind(this));
    
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    
    sortedKeys.forEach(key => {
      result[key] = this.sortObject(obj[key]);
    });
    
    return result;
  }
}

module.exports = new NowPaymentsService();
