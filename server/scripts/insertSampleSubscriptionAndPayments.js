/**
 * Script to insert sample subscription and payment data for a specified user
 * 
 * Usage: 
 * - Set the USER_ID constant to the target user's ID
 * - Run: node scripts/insertSampleSubscriptionAndPayments.js
 */

const { admin, db } = require('../config/firebase');
const { 
  createSubscription, 
  SUBSCRIPTION_TIERS, 
  SUBSCRIPTION_STATUS, 
  BILLING_PERIODS 
} = require('../models/subscriptionModel');
const { createDefaultPayment } = require('../models/paymentModel');

// Set this to the user ID where you want to insert subscription and payment data
const USER_ID = 'yvcQHzhhdKgCFLAcudVJoJdn0Vu2';

// Generate a random date within the last 90 days
const getRandomRecentDate = (daysRange = 90) => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * daysRange);
  const hoursAgo = Math.floor(Math.random() * 24);
  
  now.setDate(now.getDate() - daysAgo);
  now.setHours(now.getHours() - hoursAgo);
  
  return now;
};

// Generate a random transaction hash
const generateRandomTxHash = () => {
  const characters = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < 64; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Generate a random wallet address
const generateRandomAddress = () => {
  const characters = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < 40; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Create sample payment data
async function createSamplePayments() {
  console.log('Creating sample payment data...');
  
  try {
    // Array to store payment document IDs
    const paymentDocIds = [];
    
    // Sample payment methods
    const paymentMethods = ['bnb_direct', 'nowpayments'];
    
    // Create 3 payments with different dates and amounts
    for (let i = 0; i < 3; i++) {
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const createdDate = getRandomRecentDate();
      
      // Amount in BNB (based on subscription pricing)
      let amount = 0;
      if (i === 0) amount = 0.05; // PRO monthly
      if (i === 1) amount = 0.05; // PRO monthly renewal
      if (i === 2) amount = 0.2;  // ENTERPRISE monthly upgrade
      
      // Equivalent USD amount (rough conversion, could be made dynamic)
      const amountUsd = amount * 380; // Assuming 1 BNB = $380 USD
      
      // Create base payment object
      const payment = createDefaultPayment(USER_ID, amount, amountUsd, paymentMethod);
      
      // Add additional details based on payment method
      if (paymentMethod === 'bnb_direct') {
        payment.fromAddress = generateRandomAddress();
        payment.toAddress = '0x8901B7B71D7A83868709f1F3B23c71a415a8da89'; // FlowSync receiving address
        payment.txHash = generateRandomTxHash();
        payment.blockNumber = 25000000 + Math.floor(Math.random() * 1000000);
        payment.blockConfirmations = Math.floor(Math.random() * 100) + 10;
        payment.status = 'completed';
      } else if (paymentMethod === 'nowpayments') {
        payment.paymentId = `NP${Math.floor(Math.random() * 1000000)}`;
        payment.invoiceId = `INV-${Math.floor(Math.random() * 10000)}`;
        payment.paymentUrl = `https://nowpayments.io/payment/${Math.floor(Math.random() * 100000)}`;
        payment.status = 'completed';
        payment.txHash = generateRandomTxHash();
        payment.ipnCallbacks = [
          { 
            event: 'payment_created',
            timestamp: new Date(createdDate.getTime() - 1000 * 60 * 5).toISOString() // 5 minutes before
          },
          { 
            event: 'payment_confirmed',
            timestamp: createdDate.toISOString() 
          }
        ];
      }
      
      // Set timestamps
      payment.createdAt = createdDate.toISOString();
      payment.updatedAt = createdDate.toISOString();
      
      // Add to Firestore
      const paymentRef = await db.collection('payments').add(payment);
      console.log(`Payment created with ID: ${paymentRef.id}`);
      
      // Store the payment document ID
      paymentDocIds.push(paymentRef.id);
    }
    
    return paymentDocIds;
  } catch (error) {
    console.error('Error creating sample payments:', error);
    throw error;
  }
}

// Create sample subscription data
async function createSampleSubscription(paymentDocIds) {
  console.log('Creating sample subscription data...');
  
  try {
    // Create initial FREE subscription (older)
    const freeCreatedDate = getRandomRecentDate(180); // Up to 180 days ago
    const freeSubscription = createSubscription(USER_ID, SUBSCRIPTION_TIERS.FREE);
    freeSubscription.createdAt = freeCreatedDate.toISOString();
    freeSubscription.updatedAt = freeCreatedDate.toISOString();
    freeSubscription.startDate = freeCreatedDate.toISOString();
    
    // Create a subscription document for the free tier (historical record)
    const freeSubRef = await db.collection('subscriptions').add(freeSubscription);
    console.log(`FREE subscription created with ID: ${freeSubRef.id}`);
    
    // Pro subscription start date (payment 1 date)
    const proStartDate = new Date(paymentDocIds[0].createdAt || getRandomRecentDate(60));
    
    // Create PRO subscription from the first payment
    const proSubscription = createSubscription(USER_ID, SUBSCRIPTION_TIERS.PRO, 'bnb_direct', paymentDocIds[0]);
    proSubscription.createdAt = proStartDate.toISOString();
    proSubscription.updatedAt = proStartDate.toISOString();
    proSubscription.startDate = proStartDate.toISOString();
    
    // Set end date to 30 days from start
    const proEndDate = new Date(proStartDate);
    proEndDate.setDate(proStartDate.getDate() + 30);
    proSubscription.endDate = proEndDate.toISOString();
    
    // Add payment history
    proSubscription.paymentHistory = [paymentDocIds[0]];
    proSubscription.lastPaymentId = paymentDocIds[0];
    
    // Create a subscription document for the pro tier (historical record)
    const proSubRef = await db.collection('subscriptions').add(proSubscription);
    console.log(`PRO subscription created with ID: ${proSubRef.id}`);
    
    // Calculate renewal date (payment 2 date)
    const renewalDate = new Date(proEndDate);
    
    // Create PRO subscription renewal 
    const proRenewalSubscription = {
      ...proSubscription,
      startDate: renewalDate.toISOString(),
      updatedAt: renewalDate.toISOString(),
      createdAt: proStartDate.toISOString(), // Keep original creation date
      paymentHistory: [paymentDocIds[0], paymentDocIds[1]],
      lastPaymentId: paymentDocIds[1]
    };
    
    // Calculate new end date
    const proRenewalEndDate = new Date(renewalDate);
    proRenewalEndDate.setDate(renewalDate.getDate() + 30);
    proRenewalSubscription.endDate = proRenewalEndDate.toISOString();
    
    // Update the PRO subscription document (representing renewal)
    const proRenewalSubRef = await db.collection('subscriptions').add(proRenewalSubscription);
    console.log(`PRO subscription renewal created with ID: ${proRenewalSubRef.id}`);
    
    // Enterprise upgrade date (payment 3 date)
    const upgradeDate = new Date(renewalDate);
    upgradeDate.setDate(renewalDate.getDate() + 15); // 15 days after renewal
    
    // Create ENTERPRISE subscription upgrade
    const enterpriseSubscription = createSubscription(USER_ID, SUBSCRIPTION_TIERS.ENTERPRISE, 'nowpayments', paymentDocIds[2]);
    enterpriseSubscription.createdAt = proStartDate.toISOString(); // Keep original creation date
    enterpriseSubscription.updatedAt = upgradeDate.toISOString();
    enterpriseSubscription.startDate = upgradeDate.toISOString();
    
    // Set end date to 30 days from upgrade
    const enterpriseEndDate = new Date(upgradeDate);
    enterpriseEndDate.setDate(upgradeDate.getDate() + 30);
    enterpriseSubscription.endDate = enterpriseEndDate.toISOString();
    
    // Add complete payment history
    enterpriseSubscription.paymentHistory = [paymentDocIds[0], paymentDocIds[1], paymentDocIds[2]];
    enterpriseSubscription.lastPaymentId = paymentDocIds[2];
    
    // Create a subscription document for the enterprise tier (current active subscription)
    const enterpriseSubRef = await db.collection('subscriptions').add(enterpriseSubscription);
    console.log(`ENTERPRISE subscription created with ID: ${enterpriseSubRef.id}`);
    
    // Create a current subscription reference in the user document
    await db.collection('users').doc(USER_ID).set({
      currentSubscriptionId: enterpriseSubRef.id,
      subscriptionTier: SUBSCRIPTION_TIERS.ENTERPRISE,
      subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
      subscriptionEndDate: enterpriseEndDate.toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`Updated user document with current subscription information`);
    
    return {
      freeSubId: freeSubRef.id,
      proSubId: proSubRef.id,
      proRenewalSubId: proRenewalSubRef.id,
      enterpriseSubId: enterpriseSubRef.id
    };
  } catch (error) {
    console.error('Error creating sample subscription:', error);
    throw error;
  }
}

// Main function to run the script
async function main() {
  try {
    console.log(`Inserting sample subscription and payment data for user: ${USER_ID}`);
    
    // First create the payment records
    const paymentDocIds = await createSamplePayments();
    
    // Then create the subscription records using the payment IDs
    const subscriptionIds = await createSampleSubscription(paymentDocIds);
    
    // Update payment records with subscription IDs
    await Promise.all([
      db.collection('payments').doc(paymentDocIds[0]).update({
        subscriptionId: subscriptionIds.proSubId
      }),
      db.collection('payments').doc(paymentDocIds[1]).update({
        subscriptionId: subscriptionIds.proRenewalSubId
      }),
      db.collection('payments').doc(paymentDocIds[2]).update({
        subscriptionId: subscriptionIds.enterpriseSubId
      })
    ]);
    
    console.log('Sample data insertion complete!');
    
    // Summary of what was created
    console.log('\nSummary:');
    console.log('=========');
    console.log(`Created 3 payment records: ${paymentDocIds.join(', ')}`);
    console.log(`Created 4 subscription records:`);
    console.log(`- FREE tier (historical): ${subscriptionIds.freeSubId}`);
    console.log(`- PRO tier (historical): ${subscriptionIds.proSubId}`);
    console.log(`- PRO tier renewal (historical): ${subscriptionIds.proRenewalSubId}`);
    console.log(`- ENTERPRISE tier (current): ${subscriptionIds.enterpriseSubId}`);
    console.log(`\nUser ${USER_ID} now has an active ENTERPRISE subscription`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Execute the script
main();
