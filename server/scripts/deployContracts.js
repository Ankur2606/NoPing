// Deployment script for FlowSync payment contracts
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Contract compilation and deployment
async function deployContracts() {
  try {
    console.log('Starting contract deployment...');
    
    // Connect to BSC network
    const web3 = new Web3(process.env.BNB_RPC_URL);
    
    // Get deployer account
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Deployer private key not found in environment variables');
    }
    
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    const deployerAddress = account.address;
    
    console.log(`Deployer address: ${deployerAddress}`);
    
    // Check balance
    const balance = await web3.eth.getBalance(deployerAddress);
    const balanceBnb = web3.utils.fromWei(balance, 'ether');
    console.log(`Deployer balance: ${balanceBnb} BNB`);
    
    if (parseFloat(balanceBnb) < 0.1) {
      console.warn('Warning: Low deployer balance, might not be enough for deployment');
    }
    
    // Load contract data
    const accessControlData = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/AccessControl.json')));
    const paymentProcessorData = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/PaymentProcessor.json')));
    const subscriptionManagerData = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/SubscriptionManager.json')));
    const escrowContractData = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/EscrowContract.json')));
    
    // Deploy AccessControl
    console.log('Deploying AccessControl contract...');
    const AccessControl = new web3.eth.Contract(accessControlData.abi);
    const accessControlTx = AccessControl.deploy({
      data: accessControlData.bytecode,
      arguments: []
    });
    
    const accessControlGasEstimate = await accessControlTx.estimateGas();
    const deployedAccessControl = await accessControlTx.send({
      from: deployerAddress,
      gas: Math.floor(accessControlGasEstimate * 1.2) // Add 20% buffer
    });
    
    const accessControlAddress = deployedAccessControl.options.address;
    console.log(`AccessControl deployed at: ${accessControlAddress}`);
    
    // Deploy PaymentProcessor
    console.log('Deploying PaymentProcessor contract...');
    const feeCollector = process.env.FEE_COLLECTOR_ADDRESS || deployerAddress;
    const feePercentage = 250; // 2.5% fee
    
    const PaymentProcessor = new web3.eth.Contract(paymentProcessorData.abi);
    const paymentProcessorTx = PaymentProcessor.deploy({
      data: paymentProcessorData.bytecode,
      arguments: [feeCollector, feePercentage]
    });
    
    const paymentProcessorGasEstimate = await paymentProcessorTx.estimateGas();
    const deployedPaymentProcessor = await paymentProcessorTx.send({
      from: deployerAddress,
      gas: Math.floor(paymentProcessorGasEstimate * 1.2)
    });
    
    const paymentProcessorAddress = deployedPaymentProcessor.options.address;
    console.log(`PaymentProcessor deployed at: ${paymentProcessorAddress}`);
    
    // Deploy SubscriptionManager
    console.log('Deploying SubscriptionManager contract...');
    const SubscriptionManager = new web3.eth.Contract(subscriptionManagerData.abi);
    const subscriptionManagerTx = SubscriptionManager.deploy({
      data: subscriptionManagerData.bytecode,
      arguments: [paymentProcessorAddress]
    });
    
    const subscriptionManagerGasEstimate = await subscriptionManagerTx.estimateGas();
    const deployedSubscriptionManager = await subscriptionManagerTx.send({
      from: deployerAddress,
      gas: Math.floor(subscriptionManagerGasEstimate * 1.2)
    });
    
    const subscriptionManagerAddress = deployedSubscriptionManager.options.address;
    console.log(`SubscriptionManager deployed at: ${subscriptionManagerAddress}`);
    
    // Deploy EscrowContract
    console.log('Deploying EscrowContract...');
    const EscrowContract = new web3.eth.Contract(escrowContractData.abi);
    const escrowContractTx = EscrowContract.deploy({
      data: escrowContractData.bytecode,
      arguments: [accessControlAddress]
    });
    
    const escrowContractGasEstimate = await escrowContractTx.estimateGas();
    const deployedEscrowContract = await escrowContractTx.send({
      from: deployerAddress,
      gas: Math.floor(escrowContractGasEstimate * 1.2)
    });
    
    const escrowContractAddress = deployedEscrowContract.options.address;
    console.log(`EscrowContract deployed at: ${escrowContractAddress}`);
    
    // Grant roles
    console.log('Setting up roles...');
    const accessControlContract = new web3.eth.Contract(
      accessControlData.abi,
      accessControlAddress
    );
    
    // Get role constants
    const PAYMENT_MANAGER_ROLE = await accessControlContract.methods.PAYMENT_MANAGER_ROLE().call();
    
    // Grant payment manager role to deployer
    await accessControlContract.methods.grantRole(PAYMENT_MANAGER_ROLE, deployerAddress).send({
      from: deployerAddress
    });
    
    // Save deployment info
    const deploymentInfo = {
      network: process.env.NETWORK_NAME || 'bsc-testnet',
      deployedAt: new Date().toISOString(),
      deployer: deployerAddress,
      contracts: {
        AccessControl: {
          address: accessControlAddress,
          abi: accessControlData.abi
        },
        PaymentProcessor: {
          address: paymentProcessorAddress,
          abi: paymentProcessorData.abi
        },
        SubscriptionManager: {
          address: subscriptionManagerAddress,
          abi: subscriptionManagerData.abi
        },
        EscrowContract: {
          address: escrowContractAddress,
          abi: escrowContractData.abi
        }
      }
    };
    
    // Create deployment directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save deployment info to file
    fs.writeFileSync(
      path.join(deploymentsDir, `deployment-${deploymentInfo.network}-${Date.now()}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    // Update .env file with contract addresses
    const envAdditions = `
# Contract Addresses
ACCESS_CONTROL_ADDRESS=${accessControlAddress}
PAYMENT_PROCESSOR_ADDRESS=${paymentProcessorAddress}
SUBSCRIPTION_MANAGER_ADDRESS=${subscriptionManagerAddress}
ESCROW_CONTRACT_ADDRESS=${escrowContractAddress}
    `;
    
    fs.appendFileSync(path.join(__dirname, '../.env'), envAdditions);
    
    console.log('Deployment completed successfully!');
    console.log(`Deployment info saved to: ${deploymentsDir}`);
    
    return deploymentInfo;
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}

// Run deployment
if (require.main === module) {
  deployContracts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else {
  module.exports = deployContracts;
}
